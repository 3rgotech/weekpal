import Dexie from "dexie";
import Category from "../data/category";
import Task from "../data/task";

export class CategoryDB extends Dexie {
    categories!: Dexie.Table<Category, number>;

    constructor() {
        super("CategoryDB");
        this.version(1).stores({
            categories: '++id, &serverId, name'
        });
        this.categories.mapToClass(Category);
    }
}

export class TaskDB extends Dexie {
    tasks!: Dexie.Table<Task, number>;

    constructor() {
        super("TaskDB");
        this.version(1).stores({
            tasks: '++id, &serverId, name, categoryId, weekCode'
        });
        this.tasks.mapToClass(Task);
    }
}