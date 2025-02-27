import Task from "../data/task";
import { ITaskAdapter, ITaskStore } from "../types";
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
                const adapterTasks = await this.adapter?.getWeek(weekCode);
                if (adapterTasks) {
                    await this.db.tasks.bulkPut(adapterTasks);
                    this.setLastSync('tasks');
                }
            } catch (error) {
                console.error("Error getting tasks for week " + weekCode + " : ", error);
            }
        }

        const tasks = await this.db.tasks.where('weekCode').equals(weekCode).toArray();
        return tasks;
    }

    async reload(task: number | Task): Promise<Task | null> {
        const reloadedTask = await this.db.tasks.get(typeof task === 'number' ? task : task.id);
        return reloadedTask ?? null;
    }

    async create(task: Task): Promise<Task> {
        await this.db.tasks.add(task);
        if (this.canSync()) {
            try {
                const serverId = await this.adapter?.create(task);
                if (serverId) {
                    task.serverId = serverId;
                    await this.db.tasks.put(task);
                }
            } catch (error) {
                console.error("Error creating task : ", error);
            }
        }
        return task;
    }

    async update(task: Task): Promise<Task> {
        await this.db.tasks.put(task);
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
        await this.db.tasks.delete(task.id);
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