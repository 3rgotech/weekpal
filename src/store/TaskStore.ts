import Task, { WeeklyTask, SomedayTask } from "../data/task";
import { ITaskAdapter, ITaskStore } from "../types";
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
            const { tasks } = await this.adapter.getWeek(weekCode);
            const pending = await this.syncService.pendingEntityIds('task');

            const incoming = tasks.filter((task) => !pending.has(task.id));
            const returnedIds = new Set(tasks.map((task) => task.id));

            const weekly = incoming.filter((task): task is WeeklyTask => task.taskType === 'weekly');
            const someday = incoming.filter((task): task is SomedayTask => task.taskType === 'someday');

            const staleWeekly = (await this.db.weeklyTasks.where('weekCode').equals(weekCode).toArray())
                .filter((task) => !returnedIds.has(task.id) && !pending.has(task.id))
                .map((task) => task.id);

            const staleSomeday = (await this.db.somedayTasks.toArray())
                .filter((task) => !returnedIds.has(task.id) && !pending.has(task.id))
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

        const all = await this.db.somedayTasks.toArray();

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
