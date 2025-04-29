import Task, { WeeklyTask, SomedayTask } from "../data/task";
import { ITaskAdapter, ITaskStore } from "../types";
import { getDayJs } from "../utils/dayjs";
import BaseStore from "./BaseStore";
import { WeekpalDB } from "./db";


class TaskStore extends BaseStore implements ITaskStore {

    declare protected adapter: ITaskAdapter | null;

    constructor(adapter?: ITaskAdapter) {
        super(adapter);
    }

    async list(weekCode: string): Promise<Task[]> {
        if (this.shouldSync('tasks') && navigator.onLine) {
            try {
                const response = await this.adapter?.getWeek(weekCode) ?? { weeklyTasks: [], somedayTasks: [] };
                if (response.weeklyTasks && response.somedayTasks) {
                    // Separate weekly and someday tasks
                    const { weeklyTasks, somedayTasks } = response;

                    // Store tasks in their respective tables
                    if (weeklyTasks.length > 0) {
                        await this.db.weeklyTasks.bulkPut(weeklyTasks);
                    }
                    if (somedayTasks.length > 0) {
                        await this.db.somedayTasks.bulkPut(somedayTasks);
                    }

                    this.setLastSync('tasks');
                }
            } catch (error) {
                console.error("Error getting tasks for week " + weekCode + " : ", error);
            }
        }

        // Fetch tasks from both tables
        const weeklyTasks = await this.db.weeklyTasks.where('weekCode').equals(weekCode).toArray();

        const dayjs = getDayJs();
        const [isoYear, isoWeek] = weekCode.split('w');
        const startOfWeek = dayjs().set('year', parseInt(isoYear)).isoWeek(parseInt(isoWeek)).startOf("isoWeek").toDate();
        const endOfWeek = dayjs().set('year', parseInt(isoYear)).isoWeek(parseInt(isoWeek)).endOf("isoWeek").toDate();

        console.log(endOfWeek.toISOString());

        const allSomedayTasks = await this.db.somedayTasks
            .toArray();
        const somedayTasks = allSomedayTasks.filter((task) => (
            (!!task.createdAt && task.createdAt.isBefore(endOfWeek)) &&
            (!task.completedAt || task.completedAt.isSameOrAfter(startOfWeek))
        ));

        // Combine and return all tasks
        return [...weeklyTasks, ...somedayTasks];
    }

    async reload(task: number | Task): Promise<Task | null> {
        const taskId = typeof task === 'number' ? task : task.id;
        if (!taskId) {
            return null;
        }

        // Determine which table to check based on task type
        if (task instanceof WeeklyTask || (typeof task === 'number')) {
            const reloadedTask = await this.db.weeklyTasks.get(taskId);
            if (reloadedTask) return reloadedTask;
        }

        if (task instanceof SomedayTask || (typeof task === 'number')) {
            const reloadedTask = await this.db.somedayTasks.get(taskId);
            if (reloadedTask) return reloadedTask;
        }

        return null;
    }

    async create(task: WeeklyTask | SomedayTask): Promise<Task> {
        // Store in the appropriate table based on task type
        if (task instanceof WeeklyTask) {
            await this.db.weeklyTasks.add(task);
        } else if (task instanceof SomedayTask) {
            await this.db.somedayTasks.add(task);
        }

        // Make sure the task has an ID (assigned by IndexedDB)
        const savedTask = await this.reload(task);
        if (!savedTask || !savedTask.id) {
            return task; // Return original if reload fails
        }

        // Track this as a pending change
        if (this.syncService) {
            this.syncService.addPendingChange({
                id: savedTask.id,
                type: 'create',
                entityType: 'task'
            });
        }

        // Try to sync immediately if we can
        if (this.canSync()) {
            try {
                const serverId = await this.adapter?.create(savedTask);
                if (serverId) {
                    savedTask.serverId = serverId;
                    // Update the task with the server ID
                    if (savedTask instanceof WeeklyTask) {
                        await this.db.weeklyTasks.put(savedTask);
                    } else if (savedTask instanceof SomedayTask) {
                        await this.db.somedayTasks.put(savedTask);
                    }
                }
            } catch (error) {
                console.error("Error creating task : ", error);
                // Error is already tracked in pendingChanges, will retry later
            }
        }

        return savedTask;
    }

    async update(task: Task): Promise<Task> {
        // Update in the appropriate table based on task type
        if (task instanceof WeeklyTask) {
            await this.db.weeklyTasks.put(task);
        } else if (task instanceof SomedayTask) {
            await this.db.somedayTasks.put(task);
        }

        // Track this as a pending change if it has a local ID
        if (task.id && this.syncService) {
            this.syncService.addPendingChange({
                id: task.id,
                type: 'update',
                entityType: 'task'
            });
        }

        // Try to sync immediately if possible
        if (this.canSync() && task.serverId) {
            try {
                await this.adapter?.update(task);
            } catch (error) {
                console.error("Error updating task : ", error);
                // Error is already tracked in pendingChanges, will retry later
            }
        }

        const updatedTask = await this.reload(task);
        return updatedTask ?? task;
    }

    async delete(task: Task): Promise<void> {
        if (!task.id) {
            return;
        }

        // Store the server ID before deletion for sync purposes
        const taskData = {
            serverId: task.serverId,
            taskType: task.taskType
        };

        // Track this as a pending change if it has a server ID
        if (task.serverId && this.syncService) {
            this.syncService.addPendingChange({
                id: task.id,
                type: 'delete',
                entityType: 'task',
                data: taskData
            });
        }

        // Delete from the appropriate table based on task type
        if (task instanceof WeeklyTask) {
            await this.db.weeklyTasks.delete(task.id);
        } else if (task instanceof SomedayTask) {
            await this.db.somedayTasks.delete(task.id);
        }

        // Try to sync immediately if possible
        if (this.canSync() && task.serverId) {
            try {
                await this.adapter?.delete(task);
            } catch (error) {
                console.error("Error deleting task : ", error);
                // Error is already tracked in pendingChanges, will retry later
            }
        }
    }
}

export default TaskStore;