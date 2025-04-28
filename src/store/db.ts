import Dexie from "dexie";
import { Transaction } from "dexie";
import Category from "../data/category";
import { WeeklyTask, SomedayTask } from "../data/task";
import { getDayJs } from "../utils/dayjs";
import Event from "../data/event";

const testCategories = [
    { name: 'Travail', color: 'red' },
    { name: 'Sport', color: 'blue' },
    { name: 'Loisirs', color: 'green' },
    { name: 'Cuisine', color: 'yellow' },
    { name: 'Shopping', color: 'purple' },
    { name: 'Calendrier personnel', color: 'orange' },
    { name: 'Calendrier professionnel', color: 'pink' },
]

const dayjs = getDayJs();
const currentWeek = dayjs().format('GGGG[w]WW');

const testEvents = [
    {
        title: 'Test event 1',
        weekCode: currentWeek,
        dayOfWeek: '1',
        calendarId: 1,
        categoryId: 6,
        startHour: '10:00',
        endHour: '11:00'
    },
    {
        title: 'Test event 2',
        weekCode: currentWeek,
        dayOfWeek: '1',
        calendarId: 2,
        categoryId: 7,
        startHour: '14:00',
        endHour: '15:00'
    },
    {
        title: 'Test event without category',
        weekCode: currentWeek,
        dayOfWeek: '2',
        calendarId: 3,
        startHour: '10:00',
        endHour: '12:00'
    },
    {
        title: 'Test event without hours',
        weekCode: currentWeek,
        dayOfWeek: '3',
        calendarId: 2,
        categoryId: 7
    },
    {
        title: 'Test event with a very very very very very very long title',
        weekCode: currentWeek,
        dayOfWeek: '4',
        calendarId: 2,
        categoryId: 7,
        startHour: '10:00',
        endHour: '12:00'
    },
];

export class WeekpalDB extends Dexie {
    weeklyTasks!: Dexie.Table<WeeklyTask, number>;
    somedayTasks!: Dexie.Table<SomedayTask, number>;
    categories!: Dexie.Table<Category, number>;
    events!: Dexie.Table<Event, number>;

    constructor() {
        super("WeekpalDB");

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
            (transaction.db as WeekpalDB).categories.bulkAdd(
                testCategories.map((c) => (new Category(c)))
            );
            (transaction.db as WeekpalDB).events.bulkAdd(
                testEvents.map((e) => (new Event(e)))
            );
        });
    }
}