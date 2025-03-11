import Dexie, { Transaction } from "dexie";
import Category from "../data/category";
import Task from "../data/task";

const testCategories = [
    { name: 'Travail', color: 'red' },
    { name: 'Sport', color: 'blue' },
    { name: 'Loisirs', color: 'green' },
    { name: 'Cuisine', color: 'yellow' },
    { name: 'Shopping', color: 'purple' }
]


export class WeekpalDB extends Dexie {
    tasks!: Dexie.Table<Task, number>;
    categories!: Dexie.Table<Category, number>;

    constructor() {
        super("WeekpalDB");
        this.version(1).stores({
            categories: '++id, &serverId, name',
            tasks: '++id, &serverId, title, categoryId, weekCode, order'
        });
        this.tasks.hook('reading', (task) => {
            console.log(task);
            const obj = new Task(task);
            console.log(obj);
            return obj;
        });
        this.categories.mapToClass(Category);
        this.on("populate", function (transaction: Transaction) {
            (transaction.db as WeekpalDB).categories.bulkAdd(
                testCategories.map((c) => (new Category(c)))
            );
        });
    }
}