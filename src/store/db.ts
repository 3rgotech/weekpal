import Dexie from "dexie";
import { Transaction } from "dexie";
import Category from "../data/category";
import { WeeklyTask, SomedayTask } from "../data/task";
import { getDayJs } from "../utils/dayjs";
import Event from "../data/event";
import { getEnvConfig } from "../utils/env";

const testCategories = [
    { name: 'Work', color: 'red' },
    { name: 'Sport', color: 'blue' },
    { name: 'Hobbies', color: 'green' },
    { name: 'Shopping', color: 'purple' },
    { name: 'Matt\'s calendar', color: 'orange' },
    { name: 'Work calendar', color: 'pink' },
]

const dayjs = getDayJs();
const currentWeek = dayjs().format('GGGG[w]WW');

const testEvents = [
    {
        title: 'Doctor\'s appointment',
        weekCode: currentWeek,
        dayOfWeek: '1',
        calendarId: 1,
        categoryId: 5,
        startHour: '10:00',
        endHour: '11:00'
    },
    {
        title: 'Prepare customer meeting with Jack',
        weekCode: currentWeek,
        dayOfWeek: '1',
        calendarId: 2,
        categoryId: 6,
        startHour: '14:00',
        endHour: '15:00'
    },
    {
        title: 'Teacher meeting',
        weekCode: currentWeek,
        dayOfWeek: '2',
        calendarId: 3,
        startHour: '18:00',
        endHour: '20:00'
    },
    {
        title: 'Family Day',
        weekCode: currentWeek,
        dayOfWeek: '6',
        calendarId: 1,
        categoryId: 5
    },
    {
        title: 'Meeting with customer about the new product features to launch in Q3 2025',
        weekCode: currentWeek,
        dayOfWeek: '4',
        calendarId: 2,
        categoryId: 6,
        startHour: '10:00',
        endHour: '12:00'
    },
];

const testWeeklyTasks = [
    {
        title: 'Generate app mockups',
        weekCode: currentWeek,
        dayOfWeek: '1',
        categoryId: 1,
        order: 1
    },
    {
        title: 'Buy new sneakers',
        weekCode: currentWeek,
        dayOfWeek: '1',
        categoryId: 4,
        order: 2
    },
    {
        title: '5k run',
        weekCode: currentWeek,
        dayOfWeek: '3',
        categoryId: 2,
        order: 1
    },
    {
        title: 'Buy groceries',
        weekCode: currentWeek,
        dayOfWeek: '4',
        categoryId: 4,
        order: 1
    },
    {
        title: 'Buy meat for family day',
        weekCode: currentWeek,
        dayOfWeek: '5',
        categoryId: 4,
        order: 1
    },
    {
        title: 'Mow lawn',
        weekCode: currentWeek,
        dayOfWeek: '0',
        categoryId: 3,
        order: 1
    }
];

const testSomedayTasks = [
    {
        title: 'Book eye doctor appointment',
        categoryId: null,
        order: 1
    },
    {
        title: 'Flip mattress',
        categoryId: null,
        order: 2
    },
];

export class WeekpalDB extends Dexie {
    weeklyTasks!: Dexie.Table<WeeklyTask, number>;
    somedayTasks!: Dexie.Table<SomedayTask, number>;
    categories!: Dexie.Table<Category, number>;
    events!: Dexie.Table<Event, number>;

    constructor() {
        const dataSource = getEnvConfig().dataSource;
        if (dataSource === 'test') {
            super("WeekpalDB_test");
        } else if (dataSource === 'demo') {
            super("WeekpalDB_demo");
        } else {
            super("WeekpalDB");
        }

        this.version(1).stores({
            categories: '++id, &serverId, name',
            weeklyTasks: '++id, &serverId, title, categoryId, weekCode, dayOfWeek, order',
            somedayTasks: '++id, &serverId, title, categoryId, order',
            events: '++id, title, weekCode, categoryId'
        });

        // Custom hooks to convert the objects to class instances
        this.weeklyTasks.hook('reading', (task) => new WeeklyTask(task));
        this.somedayTasks.hook('reading', (task) => new SomedayTask(task));
        this.categories.hook('reading', (category) => new Category(category));
        this.events.hook('reading', (event) => new Event(event));

        this.on("populate", function (transaction: Transaction) {
            if (dataSource === 'test' || dataSource === 'demo') {
                (transaction.db as WeekpalDB).categories.bulkAdd(
                    testCategories.map((c) => (new Category(c)))
                );
                (transaction.db as WeekpalDB).events.bulkAdd(
                    testEvents.map((e) => (new Event(e)))
                );
                (transaction.db as WeekpalDB).weeklyTasks.bulkAdd(
                    testWeeklyTasks.map((t) => (new WeeklyTask(t)))
                );
                (transaction.db as WeekpalDB).somedayTasks.bulkAdd(
                    testSomedayTasks.map((t) => (new SomedayTask(t)))
                );
            }
        });
    }
}