import { WeekpalDB } from "../store/db";
import Task from "../data/task";
import {
    ICategoryAdapter,
    INoteAdapter,
    IProjectAdapter,
    ITaskAdapter,
    PendingChange,
    SyncFailureKind,
    TaskWriteResult,
    WriteIntent,
} from "../types";
import { newId } from "./id";
import { reportSuperseded, reportSyncFailure, reportSyncHealth } from "./syncStatus";
import { mergeDirty } from "./taskDirty";
import { isResyncRequired, markSynced, resyncFromServer } from "./resyncFence";
import { isReachable, probe, probeIfStale } from "./connectivity";
import { broadcastToTabs, isLeaderTab, subscribeToLeadership, subscribeToTabMessages } from "./tabLeader";

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
 *
 * A fifth followed from the first, and is why {@see tabLeader} exists: one instance per
 * application is not one instance per *machine*. An always-open board becomes several tabs, each
 * with its own singleton draining the same shared Dexie queue, racing on the same rows. Only the
 * tab holding the `weekpal-sync` lock sends anything now; the rest queue and say so.
 */
export class SyncService {
    private static instance: SyncService | null = null;

    /**
     * Drains run one at a time, and every caller waits for its own turn.
     *
     * A plain `isSyncing` boolean was wrong in both directions. Set *after* the connectivity
     * probe, two callers arriving in the same tick both slipped past it and sent every queued
     * entry twice. Set *before* it, the second caller returned immediately — which made
     * `enqueue`'s `await` a lie, because a write queued while an unrelated drain was in flight
     * was never attempted and then waited for whatever trigger happened to come next.
     *
     * A promise chain is both answers at once: no two drains overlap, and awaiting this is
     * awaiting the moment *your* write has had its turn.
     */
    private chain: Promise<void> = Promise.resolve();
    private readonly onlineListener: () => void;

    private readonly unsubscribeFromTabs: () => void;

    private readonly unsubscribeFromLeadership: () => void;

    private constructor(private db: WeekpalDB, private adapters: SyncAdapters) {
        // The browser saying "online" is the prompt to check, not the answer: coming back on a
        // captive portal fires this event too. Confirm with the API before draining the queue.
        this.onlineListener = () => { void probe().then(() => this.syncPendingChanges()); };
        window.addEventListener('online', this.onlineListener);

        // A follower has queued something and cannot send it itself. Without this the write sits
        // until whatever the leader's next trigger happens to be, which on a board left open is
        // "the next time the user does something in that other tab" — possibly never.
        this.unsubscribeFromTabs = subscribeToTabMessages((message) => {
            if (message.kind === 'flush') {
                void this.syncPendingChanges();
            }
        });

        /*
         * Drain on promotion — and this covers the first moments of every page load.
         *
         * Claiming the Web Lock is asynchronous, so a tab is *not* the leader for the first tick
         * or two of its life. Writes made in that window queue correctly and then sit there,
         * because the only things that trigger a drain are a new write, coming back online, and
         * a nudge from another tab — and a single-tab board may do none of those again for
         * hours. The queue was not lost, but it was silent, which is the same thing to a user.
         *
         * Fires on the initial subscribe too, which is what makes the ordinary case work: by the
         * time this runs the lock is usually already held.
         */
        this.unsubscribeFromLeadership = subscribeToLeadership((leader) => {
            if (leader) {
                void this.syncPendingChanges();
            }
        });
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
        this.unsubscribeFromTabs();
        this.unsubscribeFromLeadership();
    }

    /**
     * The cached answer from {@see connectivity}: the machine has a network *and* the API
     * answered the last time we asked.
     */
    private get isOnline(): boolean {
        return isReachable();
    }

    async enqueue(change: Omit<PendingChange, 'id' | 'timestamp' | 'attempts'>): Promise<void> {
        const merged = await this.coalesce(change);

        if (!merged) {
            await this.db.pendingChanges.put({
                ...change,
                id: newId(),
                timestamp: Date.now(),
                attempts: 0,
            });
        }

        if (!this.isOnline) {
            return;
        }

        if (isLeaderTab()) {
            await this.syncPendingChanges();

            return;
        }

        // Not our queue to drain. The row is already in Dexie, which every tab shares, so the
        // leader has everything it needs — it just has to be told to look now.
        broadcastToTabs({ kind: 'flush' });
    }

    /**
     * Fold a new write into one already queued for the same rows, if there is one.
     *
     * Typing a title, then dragging the card, then ticking it produces three entries for one
     * task — and since the payload is read from the database at flush time, all three would send
     * byte-identical bodies. Only the claims differ, so only the claims need keeping.
     *
     * The union takes the **later stamp per field**, never the later entry. "Newest entry wins"
     * would drop claims on fields the newest gesture did not touch, which is precisely the loss
     * the map exists to prevent.
     *
     * Deletes are never folded into an upsert, and vice versa: they are different verbs and the
     * order between them is the whole meaning.
     */
    private async coalesce(change: Omit<PendingChange, 'id' | 'timestamp' | 'attempts'>): Promise<boolean> {
        if (change.type !== 'upsert' || change.entityType !== 'task') {
            return false;
        }

        const signature = [...(change.entityIds ?? [change.entityId])].sort().join(',');

        const existing = (await this.db.pendingChanges
            .filter((queued) => queued.entityType === 'task'
                && queued.type === 'upsert'
                && !queued.deadLettered
                && [...(queued.entityIds ?? [queued.entityId])].sort().join(',') === signature)
            .toArray())
            // The oldest matching entry keeps its place in the queue, so a write that has been
            // waiting does not lose its ordering to one made just now.
            .sort((a, b) => a.timestamp - b.timestamp)[0];

        if (!existing) {
            return false;
        }

        await this.db.pendingChanges.update(existing.id, {
            dirty: mergeDirty(existing.dirty, change.dirty ?? {}),
            // The gesture id follows the claims: whichever mutation the merged entry ends up
            // representing, it must be one the server has not already seen.
            mutationId: change.mutationId ?? existing.mutationId,
            deviceId: change.deviceId ?? existing.deviceId,
        });

        return true;
    }

    /**
     * Drain the queue oldest-first, stopping at the first entry that still needs retrying.
     *
     * Stopping preserves ordering — a create must reach the server before the update that
     * follows it — which is why only *permanent* failures are allowed to skip ahead.
     */
    async syncPendingChanges(): Promise<void> {
        // The guard that makes the whole thing work. Every tab still calls this — on `online`,
        // on a store write, on a nudge from a sibling — and every tab but one returns here.
        if (!isLeaderTab()) {
            return;
        }

        // Caught rather than propagated: a rejection left on the chain would poison every drain
        // after it. Failures inside a drain are already classified and recorded per entry.
        this.chain = this.chain.then(() => this.drain()).catch(() => undefined);

        return this.chain;
    }

    /** One pass over the queue. Never called directly — {@see syncPendingChanges} serialises it. */
    private async drain(): Promise<void> {
        // Re-check before spending requests on a queue that cannot be delivered. Only when
        // the cached answer has aged out, so a burst of writes does not probe once per write.
        if (!await probeIfStale()) {
            return;
        }

        const queue = await this.db.pendingChanges
            .orderBy('timestamp')
            .filter((change) => !change.deadLettered)
            .toArray();

        let applied = 0;

        for (const change of queue) {
            try {
                await this.processChange(change);
                await this.db.pendingChanges.delete(change.id);
                applied++;

                // A write got through, so whatever was refusing us has stopped.
                reportSyncHealth('ok');
            } catch (error) {
                const kind = classifyFailure(error);

                /*
                 * "We disagree about what exists" rather than "this write is wrong".
                 *
                 * Handled before the conflict branch below, which would otherwise dead-letter
                 * the entry — and this entry is fine. It is the local *cache* that is
                 * unusable, so the cache is thrown away and the write stays queued to be
                 * resolved against the server's own rows on the next attempt.
                 */
                if (kind === 'conflict' && await this.handleResync(error)) {
                    break;
                }

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

                // Transient: keep the entry and stop, so ordering survives. Re-probe too —
                // this is usually the first sign the API has gone away underneath us, and
                // without it the indicator keeps claiming everything is fine until the
                // cached answer expires.
                void probe();
                break;
            }
        }

        if (applied > 0) {
            // Only after something actually reached the server. Stamping on every attempt
            // would let a board that has been failing for a month claim it synced a moment
            // ago, which is precisely the lie the resync fence exists to catch.
            markSynced();

            // Write-back has moved rows underneath the other tabs. They re-read Dexie rather
            // than being handed a copy — the database is the message, and shipping the row
            // alongside it is how the two versions start to disagree.
        broadcastToTabs({ kind: 'changed' });
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
            const intent = this.intentFor(change);

            if (ids.length > 1) {
                // A reorder. One request, so the board cannot settle half-applied if the
                // connection drops partway through.
                const tasks = (await Promise.all(ids.map((id) => this.findTask(id))))
                    .filter((task): task is Task => task !== undefined);

                if (tasks.length === 0) {
                    throw new SyncError('None of the reordered tasks are in the local database.', 'permanent');
                }

                await this.applyResults(await this.taskAdapter().upsertMany(tasks, intent));
                return;
            }

            const task = await this.findTask(entityId);
            if (!task) {
                throw new SyncError(`Task ${entityId} is no longer in the local database.`, 'permanent');
            }

            await this.applyResults([await this.taskAdapter().upsert(task, intent)]);
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
            // Read back from the table, as categories do, rather than replaying the queued
            // snapshot: the adapter takes a Project and calls `toApiPayload()` on it, which a
            // plain object lifted out of the queue does not have. Nothing consumed projects when
            // this was written, so the snapshot path had never actually run.
            const project = await this.db.projects.get(entityId);
            if (!project) {
                throw new SyncError(`Project ${entityId} is no longer in the local database.`, 'permanent');
            }

            const stored = await this.projectAdapter().upsert(project);
            await this.db.projects.put(stored);
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
     * Throw the cached copy away when the server says it is beyond reconciling.
     *
     * Returns whether this was that case, so the caller can stop the drain: every remaining
     * entry would get the same answer, and the tables they read from have just been emptied.
     * The queue itself survives — see `resyncFromServer`, which never touches it.
     */
    private async handleResync(error: unknown): Promise<boolean> {
        const body = await this.responseBody(error);

        if (!isResyncRequired(body)) {
            return false;
        }

        await resyncFromServer(this.db);
        broadcastToTabs({ kind: 'changed' });

        return true;
    }

    /** The JSON body of a failed request, or undefined if there is not one to read. */
    private async responseBody(error: unknown): Promise<unknown> {
        const response = (error as { response?: { json?: () => Promise<unknown> } })?.response;

        if (!response?.json) {
            return undefined;
        }

        try {
            return await response.json();
        } catch {
            return undefined;
        }
    }

    /**
     * What the queue entry asserts, shaped for the adapter.
     *
     * The dirty map is stored flat on the entry because a single-task write has only one set of
     * claims; the adapter wants it keyed by task, so a reorder can carry a different claim per
     * row. For a multi-row entry every task shares the same claim — they were all moved by one
     * gesture, which is what a reorder is.
     */
    private intentFor(change: PendingChange): WriteIntent {
        const ids = change.entityIds ?? [change.entityId];
        const dirty = change.dirty ?? {};

        return {
            dirty: Object.fromEntries(ids.map((id) => [id, dirty])),
            mutationId: change.mutationId,
            deviceId: change.deviceId,
        };
    }

    /**
     * Take the server at its word, row by row.
     *
     * Three outcomes need doing something about. A `gone` row is deleted locally — the task was
     * purged, and recreating it is exactly what the husk exists to prevent. A row that came back
     * is written over the local copy, which is what makes the two converge. And anything
     * superseded is counted, so the user can be told their screen changed for a reason instead
     * of watching it repaint on its own.
     */
    private async applyResults(results: TaskWriteResult[]): Promise<void> {
        let superseded = 0;

        for (const result of results) {
            if (result.status === 'gone') {
                await this.db.weeklyTasks.delete(result.id);
                await this.db.somedayTasks.delete(result.id);
                continue;
            }

            superseded += Object.keys(result.superseded ?? {}).length;

            const task = result.task ? Task.createFromApiData(result.task) : null;

            if (task) {
                await this.writeBackTask(task);
            }
        }

        reportSuperseded(superseded);
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
