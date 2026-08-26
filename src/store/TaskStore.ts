import Task, { WeeklyTask, SomedayTask } from "../data/task";
import Event from "../data/event";
import { DayOfWeek, ITaskAdapter, ITaskStore } from "../types";
import { getDayJs } from "../utils/dayjs";
import { classifyFailure } from "../utils/SyncService";
import { reportSyncFailure, reportSyncHealth } from "../utils/syncStatus";
import BaseStore from "./BaseStore";

class TaskStore extends BaseStore implements ITaskStore {

    private adapter: ITaskAdapter | null;

    constructor(adapter?: ITaskAdapter | null) {
        super('task', adapter);
        this.adapter = adapter ?? null;
    }

    async list(weekCode: string): Promise<Task[]> {
        if (this.shouldSync('tasks', 'task')) {
            await this.pull(weekCode);
        }

        const weeklyTasks = await this.db.weeklyTasks.where('weekCode').equals(weekCode).toArray();
        const somedayTasks = await this.visibleSomedayTasks(weekCode);

        return [...weeklyTasks, ...somedayTasks];
    }

    /**
     * Everything still outstanding from weeks that have already ended, oldest first.
     *
     * Deliberately not derived from what the board has cached: the local database only holds
     * the weeks this browser has opened, so a task abandoned in a week nobody has revisited is
     * missing from it entirely — which is precisely the task the weekly review exists to
     * surface. The server is asked when it can be reached, and its answer is cached so the
     * review still works on the next load without a connection.
     */
    async leftovers(): Promise<WeeklyTask[]> {
        const current = getDayJs()().format('GGGG[w]WW');
        const local = await this.localLeftovers(current);

        if (!this.canSync('task') || !this.adapter) {
            return local;
        }

        try {
            const { tasks, since } = await this.adapter.leftovers();
            const pending = await this.syncService.pendingEntityIds('task');

            const incoming = tasks
                .filter((task): task is WeeklyTask => task.taskType === 'weekly')
                .filter((task) => !pending.has(task.id));

            await this.db.transaction('rw', this.db.weeklyTasks, this.db.somedayTasks, async () => {
                await this.db.somedayTasks.bulkDelete(incoming.map((task) => task.id));

                if (incoming.length > 0) {
                    await this.db.weeklyTasks.bulkPut(incoming);
                }
            });

            reportSyncHealth('ok');

            // The server's answer, plus the rows it could not have known about: anything edited
            // offline whose write is still queued. Nothing is deleted locally on the strength of
            // an omission here — a task missing from this list has usually been completed
            // elsewhere, not deleted, and the week pull is what reconciles that properly.
            const returned = new Set(incoming.map((task) => task.id));
            const queued = local.filter((task) => pending.has(task.id) && !returned.has(task.id));

            // `since` is the oldest week the server looked at. Weeks behind it are hidden by the
            // plan's history window, and a cached copy must not be the way around it.
            const visible = [...incoming, ...queued]
                .filter((task) => since === '' || task.weekCode >= since);

            return this.sortLeftovers(visible);
        } catch (error) {
            reportSyncFailure(classifyFailure(error));
            console.error('Could not read the tasks left behind:', error);

            return local;
        }
    }

    /**
     * Where a task dropped into a bucket should sit: after everything already waiting there.
     *
     * Answered from the cache alone, without a pull. The bucket being filled is always in the
     * current week or Someday, which the board has just loaded, and an order is a hint the next
     * drag rewrites anyway — not worth a request.
     */
    async nextOrder(weekCode: string | null, dayOfWeek: DayOfWeek | null): Promise<number> {
        if (weekCode === null) {
            const someday = await this.db.somedayTasks.toArray();

            return someday.filter((task) => !task.belongsToProject && !task.completedAt).length;
        }

        const week = await this.db.weeklyTasks.where('weekCode').equals(weekCode).toArray();

        return week.filter((task) => `${task.dayOfWeek}` === `${dayOfWeek}` && !task.completedAt).length;
    }

    /** What the cache alone can answer: unfinished tasks sitting in a week that has ended. */
    private async localLeftovers(current: string): Promise<WeeklyTask[]> {
        const rows = await this.db.weeklyTasks.toArray();

        return this.sortLeftovers(rows.filter((task) => task.weekCode < current && !task.completedAt));
    }

    /**
     * Oldest first, then down the week and through each day's order — the same reading order as
     * the board, so a leftover sits where the eye expects it.
     *
     * Week codes compare as strings because the format is fixed-width and ISO-year first.
     */
    private sortLeftovers(tasks: WeeklyTask[]): WeeklyTask[] {
        return [...tasks].sort((a, b) => (
            a.weekCode.localeCompare(b.weekCode)
            || `${a.dayOfWeek}`.localeCompare(`${b.dayOfWeek}`)
            || (a.order ?? 0) - (b.order ?? 0)
        ));
    }

    /**
     * Replace the local copy of this week with the server's, which is authoritative.
     *
     * The response is the complete live set for the scope, so anything local that is missing
     * from it has been deleted somewhere else and is removed here. Without that step a task
     * deleted on one device stayed on the other forever, because the pull only ever wrote rows
     * and never took any away.
     *
     * Rows with a queued write are left alone in both directions: the local copy is newer than
     * whatever the server is describing, and overwriting it would silently discard an edit made
     * offline.
     */
    private async pull(weekCode: string): Promise<void> {
        if (!this.adapter) {
            return;
        }

        try {
            const { tasks, events } = await this.adapter.getWeek(weekCode);
            const pending = await this.syncService.pendingEntityIds('task');

            const incoming = tasks.filter((task) => !pending.has(task.id));
            const returnedIds = new Set(tasks.map((task) => task.id));

            const weekly = incoming.filter((task): task is WeeklyTask => task.taskType === 'weekly');
            const someday = incoming.filter((task): task is SomedayTask => task.taskType === 'someday');

            const staleWeekly = (await this.db.weeklyTasks.where('weekCode').equals(weekCode).toArray())
                .filter((task) => !returnedIds.has(task.id) && !pending.has(task.id))
                .map((task) => task.id);

            // Project backlogs are exempt from the sweep. The week payload deliberately excludes
            // them (API-CONTRACT.md §4b) so a long backlog is not refetched with every week —
            // which means "missing from the response" does not mean "deleted" for those rows.
            // Without this, opening any week would wipe every cached backlog task.
            const staleSomeday = (await this.db.somedayTasks.toArray())
                .filter((task) => !returnedIds.has(task.id) && !pending.has(task.id) && !task.belongsToProject)
                .map((task) => task.id);

            await this.db.transaction('rw', this.db.weeklyTasks, this.db.somedayTasks, async () => {
                await this.db.weeklyTasks.bulkDelete(staleWeekly);
                await this.db.somedayTasks.bulkDelete(staleSomeday);

                // A task may have moved between the two tables since the last pull.
                await this.db.somedayTasks.bulkDelete(weekly.map((task) => task.id));
                await this.db.weeklyTasks.bulkDelete(someday.map((task) => task.id));

                if (weekly.length > 0) await this.db.weeklyTasks.bulkPut(weekly);
                if (someday.length > 0) await this.db.somedayTasks.bulkPut(someday);
            });

            await this.reconcileEvents(weekCode, events);

            this.setLastSync('tasks');
            reportSyncHealth('ok');
        } catch (error) {
            // A failed pull is survivable — the local copy is still there — but it must not be
            // silent. A 403 here is the retention gate saying this week is outside the plan.
            reportSyncFailure(classifyFailure(error));
            console.error(`Could not pull week ${weekCode}:`, error);
        }
    }

    /**
     * Store the week's events, replacing whatever was held for that week.
     *
     * Events arrive in the task payload because they are fetched together — one
     * request describes a week — so the task pull is what writes them. `EventStore`
     * only ever reads, and has no adapter of its own: nothing in WeekPal writes
     * back to a calendar provider.
     *
     * A plain replace, with none of the pending-mutation care the task reconcile
     * needs: events are a read-only projection of the provider's data, so there is
     * never a local edit to protect.
     */
    private async reconcileEvents(weekCode: string, events: Event[]): Promise<void> {
        const stale = (await this.db.events.where('weekCode').equals(weekCode).toArray())
            .map((event) => event.id);

        await this.db.transaction('rw', this.db.events, async () => {
            await this.db.events.bulkDelete(stale);

            if (events.length > 0) {
                await this.db.events.bulkPut(events);
            }
        });
    }

    /**
     * Someday tasks visible from a given week: created before it ended, and not completed before
     * it began.
     *
     * The rule lives here and only here. The backend used to apply the same predicate in
     * `SomedayTask::scopeForWeek()`, and the two drifted; the API now returns every live someday
     * task and lets the client decide what to show.
     */
    private async visibleSomedayTasks(weekCode: string): Promise<SomedayTask[]> {
        const dayjs = getDayJs();
        const [isoYear, isoWeek] = weekCode.split('w');
        const reference = dayjs().set('year', parseInt(isoYear, 10)).isoWeek(parseInt(isoWeek, 10));
        const startOfWeek = reference.startOf("isoWeek").toDate();
        const endOfWeek = reference.endOf("isoWeek").toDate();

        // `projectId === null` is what separates a true someday task from a project's backlog.
        // Both live in this table because neither has a week; only the first belongs in the
        // board's "Some day" list, and the other is shown in the projects drawer.
        //
        // Filtered in memory rather than through the `projectId` index: IndexedDB cannot index
        // null, so rows with no project are absent from that index entirely and a `.equals(null)`
        // query would quietly return nothing at all.
        const all = (await this.db.somedayTasks.toArray()).filter((task) => !task.belongsToProject);

        return all.filter((task) => (
            (!!task.createdAt && task.createdAt.isBefore(endOfWeek)) &&
            (!task.completedAt || task.completedAt.isSameOrAfter(startOfWeek))
        ));
    }

    async reload(task: string | Task): Promise<Task | null> {
        const taskId = typeof task === 'string' ? task : task.id;
        if (!taskId) {
            return null;
        }

        return (await this.db.weeklyTasks.get(taskId))
            ?? (await this.db.somedayTasks.get(taskId))
            ?? null;
    }

    /**
     * Create and update are the same operation.
     *
     * The row is written locally, then queued once. It is deliberately *not* also sent inline:
     * doing both fired two un-awaited requests that raced each other, and before client-minted
     * ids that produced duplicate rows on the server.
     */
    private async put(task: Task): Promise<Task> {
        await this.db.transaction('rw', this.db.weeklyTasks, this.db.somedayTasks, async () => {
            // A move changes which table the task belongs in while keeping its id.
            if (task.taskType === 'weekly') {
                await this.db.somedayTasks.delete(task.id);
                await this.db.weeklyTasks.put(task as WeeklyTask);
            } else {
                await this.db.weeklyTasks.delete(task.id);
                await this.db.somedayTasks.put(task as SomedayTask);
            }
        });

        await this.syncService.enqueue({
            entityType: 'task',
            entityId: task.id,
            type: 'upsert',
        });

        return (await this.reload(task)) ?? task;
    }

    async create(task: Task): Promise<Task> {
        return this.put(task);
    }

    async update(task: Task): Promise<Task> {
        return this.put(task);
    }

    async delete(task: Task): Promise<void> {
        await this.db.transaction('rw', this.db.weeklyTasks, this.db.somedayTasks, async () => {
            await this.db.weeklyTasks.delete(task.id);
            await this.db.somedayTasks.delete(task.id);
        });

        await this.syncService.enqueue({
            entityType: 'task',
            entityId: task.id,
            type: 'delete',
        });
    }

    /**
     * Persist a whole reordered set as one queued write.
     *
     * Dragging a task re-indexes its siblings. Sending them one request at a time let the board
     * settle half-applied if the connection dropped mid-burst; queued together they reach the
     * server in a single batch upsert, which the backend applies in one transaction.
     */
    async putMany(tasks: Task[]): Promise<void> {
        if (tasks.length === 0) {
            return;
        }

        if (tasks.length === 1) {
            await this.put(tasks[0]);
            return;
        }

        await this.db.transaction('rw', this.db.weeklyTasks, this.db.somedayTasks, async () => {
            for (const task of tasks) {
                if (task.taskType === 'weekly') {
                    await this.db.somedayTasks.delete(task.id);
                    await this.db.weeklyTasks.put(task as WeeklyTask);
                } else {
                    await this.db.weeklyTasks.delete(task.id);
                    await this.db.somedayTasks.put(task as SomedayTask);
                }
            }
        });

        await this.syncService.enqueue({
            entityType: 'task',
            entityId: tasks[0].id,
            entityIds: tasks.map((task) => task.id),
            type: 'upsert',
        });
    }
}

export default TaskStore;
