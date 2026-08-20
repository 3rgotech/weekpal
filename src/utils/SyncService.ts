import { WeekpalDB } from "../store/db";
import Task from "../data/task";
import {
    ICategoryAdapter,
    INoteAdapter,
    IProjectAdapter,
    ITaskAdapter,
    PendingChange,
    SyncFailureKind,
} from "../types";
import { newId } from "./id";
import { reportSyncFailure, reportSyncHealth } from "./syncStatus";

interface SyncAdapters {
    task?: ITaskAdapter | null;
    category?: ICategoryAdapter | null;
    project?: IProjectAdapter | null;
    note?: INoteAdapter | null;
}

/** A queued write that cannot succeed as-is. Thrown so the caller can classify it. */
export class SyncError extends Error {
    constructor(message: string, public readonly kind: SyncFailureKind) {
        super(message);
        this.name = 'SyncError';
    }
}

const MAX_ATTEMPTS = 5;

/**
 * The offline write queue.
 *
 * Writes go to IndexedDB first and are queued here; the queue drains when the network allows.
 * Four things in the previous implementation cancelled that design out, and this one is shaped
 * around not repeating them:
 *
 * 1. Every store built its own SyncService over a single `localStorage.pendingChanges` key, each
 *    holding a private in-memory copy of the array. Whichever store saved last erased the
 *    others' entries. There is now one instance (see `SyncService.shared`) and the queue lives
 *    in a Dexie table, so it is transactional with the data it describes.
 * 2. `processChange` returned early when it could not handle an entry — missing adapter, missing
 *    record, missing id — and the caller read "did not throw" as success and dropped the entry.
 *    Every early return was silent data loss. It now throws, always.
 * 3. Stores sent each write twice: once by queueing it, once by calling the adapter inline.
 *    Two un-awaited requests raced and duplicated rows. Queueing is now the only path.
 * 4. A permanently-failing entry blocked the queue forever, because failures were not
 *    distinguished. A 422 is never going to succeed, so it is dead-lettered; a 500 or a network
 *    error is, so it stays and blocks — which is what preserves ordering.
 */
export class SyncService {
    private static instance: SyncService | null = null;

    private isSyncing = false;
    private readonly onlineListener: () => void;

    private constructor(private db: WeekpalDB, private adapters: SyncAdapters) {
        this.onlineListener = () => { void this.syncPendingChanges(); };
        window.addEventListener('online', this.onlineListener);
    }

    /**
     * The single queue for the whole application.
     *
     * Adapters are re-bound rather than a second instance created, because `DataContext`
     * rebuilds its stores whenever the adapters change and each new instance would otherwise
     * register another `online` listener and open another database connection.
     */
    static shared(db: WeekpalDB, adapters: SyncAdapters): SyncService {
        if (SyncService.instance === null) {
            SyncService.instance = new SyncService(db, adapters);
        } else {
            SyncService.instance.adapters = adapters;
        }

        return SyncService.instance;
    }

    /** Test seam: drop the singleton and its listener. */
    static reset(): void {
        SyncService.instance?.dispose();
        SyncService.instance = null;
    }

    dispose(): void {
        window.removeEventListener('online', this.onlineListener);
    }

    private get isOnline(): boolean {
        return navigator.onLine;
    }

    async enqueue(change: Omit<PendingChange, 'id' | 'timestamp' | 'attempts'>): Promise<void> {
        await this.db.pendingChanges.put({
            ...change,
            id: newId(),
            timestamp: Date.now(),
            attempts: 0,
        });

        if (this.isOnline) {
            await this.syncPendingChanges();
        }
    }

    /**
     * Drain the queue oldest-first, stopping at the first entry that still needs retrying.
     *
     * Stopping preserves ordering — a create must reach the server before the update that
     * follows it — which is why only *permanent* failures are allowed to skip ahead.
     */
    async syncPendingChanges(): Promise<void> {
        if (!this.isOnline || this.isSyncing) {
            return;
        }

        this.isSyncing = true;

        try {
            const queue = await this.db.pendingChanges
                .orderBy('timestamp')
                .filter((change) => !change.deadLettered)
                .toArray();

            for (const change of queue) {
                try {
                    await this.processChange(change);
                    await this.db.pendingChanges.delete(change.id);

                    // A write got through, so whatever was refusing us has stopped.
                    reportSyncHealth('ok');
                } catch (error) {
                    const kind = classifyFailure(error);
                    reportSyncFailure(kind);

                    if (kind === 'permanent' || kind === 'conflict') {
                        // Nothing about retrying this will change the outcome. Set it aside so
                        // the rest of the queue can move.
                        await this.db.pendingChanges.update(change.id, {
                            deadLettered: true,
                            attempts: change.attempts + 1,
                            lastError: String(error),
                        });
                        continue;
                    }

                    if (kind === 'unauthorized' || kind === 'forbidden') {
                        // Not the write's fault, and not something retrying fixes — the user
                        // needs to sign in again, or the week is outside their plan. Keep the
                        // entry untouched (no attempt counted, so it cannot age into a dead
                        // letter) and stop until the situation changes.
                        await this.db.pendingChanges.update(change.id, { lastError: String(error) });
                        break;
                    }

                    const attempts = change.attempts + 1;
                    await this.db.pendingChanges.update(change.id, {
                        attempts,
                        lastError: String(error),
                        deadLettered: attempts >= MAX_ATTEMPTS,
                    });

                    // Transient: keep the entry and stop, so ordering survives.
                    break;
                }
            }
        } finally {
            this.isSyncing = false;
        }
    }

    /**
     * Send one queued write.
     *
     * Every path either completes the request or throws. Returning quietly is what used to make
     * the caller delete the entry as though it had succeeded.
     */
    private async processChange(change: PendingChange): Promise<void> {
        const { entityType, entityId, type, data } = change;

        // Ahead of the shared delete path: a note is addressed by task *and* id, so its adapter
        // takes two arguments and cannot go through the one-argument `delete` below.
        if (entityType === 'note') {
            return this.processNoteChange(change);
        }

        if (type === 'delete') {
            const adapter = this.adapterFor(entityType);
            await adapter.delete(entityId);
            return;
        }

        if (entityType === 'task') {
            const ids = change.entityIds ?? [entityId];

            if (ids.length > 1) {
                // A reorder. One request, so the board cannot settle half-applied if the
                // connection drops partway through.
                const tasks = (await Promise.all(ids.map((id) => this.findTask(id))))
                    .filter((task): task is Task => task !== undefined);

                if (tasks.length === 0) {
                    throw new SyncError('None of the reordered tasks are in the local database.', 'permanent');
                }

                const stored = await this.taskAdapter().upsertMany(tasks);
                for (const task of stored) {
                    await this.writeBackTask(task);
                }
                return;
            }

            const task = await this.findTask(entityId);
            if (!task) {
                throw new SyncError(`Task ${entityId} is no longer in the local database.`, 'permanent');
            }

            const stored = await this.taskAdapter().upsert(task);
            await this.writeBackTask(stored);
            return;
        }

        if (entityType === 'category') {
            const category = await this.db.categories.get(entityId);
            if (!category) {
                throw new SyncError(`Category ${entityId} is no longer in the local database.`, 'permanent');
            }

            const stored = await this.categoryAdapter().upsert(category);
            await this.db.categories.put(stored);
            return;
        }

        if (entityType === 'project') {
            const adapter = this.projectAdapter();
            if (!data) {
                throw new SyncError(`Project ${entityId} was queued without a payload.`, 'permanent');
            }

            await adapter.upsert(data as any);
            return;
        }

        throw new SyncError(`Unknown entity type "${entityType}".`, 'permanent');
    }

    /**
     * Notes, which hang off a task rather than standing on their own.
     *
     * The task id is snapshotted onto the queue entry when the change is enqueued: a queued
     * delete outlives the local row it refers to, so by the time it is sent there is nothing
     * left to read the task id from.
     */
    private async processNoteChange(change: PendingChange): Promise<void> {
        const { entityId, type, data } = change;
        const adapter = this.noteAdapter();

        const taskId = (data?.taskId as string | undefined)
            ?? (await this.db.taskNotes.get(entityId))?.taskId;

        if (!taskId) {
            throw new SyncError(`Note ${entityId} was queued without the task it belongs to.`, 'permanent');
        }

        if (type === 'delete') {
            await adapter.delete(taskId, entityId);
            return;
        }

        const note = await this.db.taskNotes.get(entityId);
        if (!note) {
            throw new SyncError(`Note ${entityId} is no longer in the local database.`, 'permanent');
        }

        const stored = await adapter.upsert(note);
        await this.db.taskNotes.put(stored as any);
    }

    /**
     * The server's version of the row wins, so write it back.
     *
     * A task may also have crossed between the weekly and someday tables — a move is now an
     * update rather than a delete-and-recreate — so clear both before storing.
     */
    private async writeBackTask(task: Task): Promise<void> {
        await this.db.weeklyTasks.delete(task.id);
        await this.db.somedayTasks.delete(task.id);

        if (task.taskType === 'weekly') {
            await this.db.weeklyTasks.put(task as any);
        } else {
            await this.db.somedayTasks.put(task as any);
        }
    }

    private async findTask(id: string): Promise<Task | undefined> {
        return (await this.db.weeklyTasks.get(id)) ?? (await this.db.somedayTasks.get(id));
    }

    private adapterFor(entityType: PendingChange['entityType']) {
        switch (entityType) {
            case 'task': return this.taskAdapter();
            case 'category': return this.categoryAdapter();
            case 'project': return this.projectAdapter();
            // Notes never reach here — processChange routes them before the shared delete path,
            // because their adapter is addressed by task as well as id.
            case 'note': return this.noteAdapter() as never;
        }
    }

    private taskAdapter(): ITaskAdapter {
        if (!this.adapters.task) {
            throw new SyncError('No task adapter is configured.', 'transient');
        }
        return this.adapters.task;
    }

    private categoryAdapter(): ICategoryAdapter {
        if (!this.adapters.category) {
            throw new SyncError('No category adapter is configured.', 'transient');
        }
        return this.adapters.category;
    }

    private projectAdapter(): IProjectAdapter {
        if (!this.adapters.project) {
            throw new SyncError('No project adapter is configured.', 'transient');
        }
        return this.adapters.project;
    }

    private noteAdapter(): INoteAdapter {
        if (!this.adapters.note) {
            throw new SyncError('No note adapter is configured.', 'transient');
        }
        return this.adapters.note;
    }

    /** Ids with a queued write, which a server pull must not overwrite. */
    async pendingEntityIds(entityType: PendingChange['entityType']): Promise<Set<string>> {
        const changes = await this.db.pendingChanges
            .filter((change) => change.entityType === entityType && !change.deadLettered)
            .toArray();

        return new Set(changes.flatMap((change) => change.entityIds ?? [change.entityId]));
    }

    async isEntityPendingSync(entityType: PendingChange['entityType'], id: string): Promise<boolean> {
        return (await this.pendingEntityIds(entityType)).has(id);
    }

    async getPendingChangesCount(): Promise<number> {
        return this.db.pendingChanges.filter((change) => !change.deadLettered).count();
    }

    async getDeadLetters(): Promise<PendingChange[]> {
        return this.db.pendingChanges.filter((change) => change.deadLettered === true).toArray();
    }
}

/**
 * Map a failure to what the client should do about it (API-CONTRACT.md §6).
 *
 * Getting this wrong in either direction is costly: treat a permanent failure as transient and
 * the queue jams behind it; treat a transient one as permanent and the write is thrown away.
 */
export function classifyFailure(error: unknown): SyncFailureKind {
    if (error instanceof SyncError) {
        return error.kind;
    }

    const status = (error as any)?.response?.status ?? (error as any)?.status;

    if (typeof status !== 'number') {
        // No response at all — the network, not the server.
        return 'transient';
    }

    if (status === 401) return 'unauthorized';
    if (status === 403) return 'forbidden';
    if (status === 409) return 'conflict';
    if (status === 422) return 'permanent';
    if (status === 429 || status >= 500) return 'transient';
    if (status >= 400) return 'permanent';

    return 'transient';
}

export default SyncService;
