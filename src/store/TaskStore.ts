import Task, { WeeklyTask, SomedayTask } from "../data/task";
import { ITaskAdapter, ITaskStore } from "../types";
import { getDayJs } from "../utils/dayjs";
import BaseStore from "./BaseStore";
import { WeekpalDB } from "./db";


class TaskStore extends BaseStore implements ITaskStore {

    declare protected adapter: ITaskAdapter | null;
    private db: WeekpalDB;

    constructor(adapter?: ITaskAdapter) {
        super(adapter);
        this.db = new WeekpalDB();
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
        console.log(task);
        // Store in the appropriate table based on task type
        if (task instanceof WeeklyTask) {
            await this.db.weeklyTasks.add(task);
        } else if (task instanceof SomedayTask) {
            await this.db.somedayTasks.add(task);
        }

        if (this.canSync()) {
            try {
                const serverId = await this.adapter?.create(task);
                if (serverId) {
                    task.serverId = serverId;
                    // Update the task with the server ID
                    if (task instanceof WeeklyTask) {
                        await this.db.weeklyTasks.put(task);
                    } else if (task instanceof SomedayTask) {
                        await this.db.somedayTasks.put(task);
                    }
                }
            } catch (error) {
                console.error("Error creating task : ", error);
            }
        }
        return task;
    }

    async update(task: Task): Promise<Task> {
        // Update in the appropriate table based on task type
        if (task instanceof WeeklyTask) {
            await this.db.weeklyTasks.put(task);
        } else if (task instanceof SomedayTask) {
            await this.db.somedayTasks.put(task);
        }

        if (this.canSync()) {
            try {
                await this.adapter?.update(task);
            } catch (error) {
                console.error("Error updating task : ", error);
            }
        }

        const updatedTask = await this.reload(task);
        return updatedTask ?? task;
    }

    async delete(task: Task): Promise<void> {
        if (!task.id) {
            return;
        }

        // Delete from the appropriate table based on task type
        if (task instanceof WeeklyTask) {
            await this.db.weeklyTasks.delete(task.id);
        } else if (task instanceof SomedayTask) {
            await this.db.somedayTasks.delete(task.id);
        }

        if (this.canSync()) {
            try {
                await this.adapter?.delete(task);
            } catch (error) {
                console.error("Error deleting task : ", error);
            }
        }
    }

}

export default TaskStore;