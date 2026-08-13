import Dexie from "dexie";
import { Transaction } from "dexie";
import Category from "../data/category";
import { WeeklyTask, SomedayTask } from "../data/task";
import { getDayJs } from "../utils/dayjs";
import Event from "../data/event";
import { getEnvConfig } from "../utils/env";
import { PendingChange } from "../types";

/**
 * Fixture ids are fixed rather than minted.
 *
 * Records used to be linked by autoincrement position (`categoryId: 1` meant "the first
 * category inserted"). Now that ids are UUIDs generated at construction time, the fixtures have
 * to name what they point at, or every seeded task would reference a category that never existed.
 *
 * They are valid v7 UUIDs so nothing downstream has to special-case them.
 */
const CATEGORY_IDS = {
    work: '01930000-0000-7000-8000-000000000001',
    sport: '01930000-0000-7000-8000-000000000002',
    hobbies: '01930000-0000-7000-8000-000000000003',
    shopping: '01930000-0000-7000-8000-000000000004',
    mattsCalendar: '01930000-0000-7000-8000-000000000005',
    workCalendar: '01930000-0000-7000-8000-000000000006',
} as const;

const testCategories = [
    { id: CATEGORY_IDS.work, name: 'Work', color: 'red' },
    { id: CATEGORY_IDS.sport, name: 'Sport', color: 'blue' },
    { id: CATEGORY_IDS.hobbies, name: 'Hobbies', color: 'green' },
    { id: CATEGORY_IDS.shopping, name: 'Shopping', color: 'purple' },
    { id: CATEGORY_IDS.mattsCalendar, name: 'Matt\'s calendar', color: 'orange' },
    { id: CATEGORY_IDS.workCalendar, name: 'Work calendar', color: 'pink' },
]

const dayjs = getDayJs();
const currentWeek = dayjs().format('GGGG[w]WW');

const testEvents = [
    {
        title: 'Doctor\'s appointment',
        weekCode: currentWeek,
        dayOfWeek: '1',
        calendarId: 1,
        categoryId: CATEGORY_IDS.mattsCalendar,
        startHour: '10:00',
        endHour: '11:00'
    },
    {
        title: 'Prepare customer meeting with Jack',
        weekCode: currentWeek,
        dayOfWeek: '1',
        calendarId: 2,
        categoryId: CATEGORY_IDS.workCalendar,
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
        categoryId: CATEGORY_IDS.mattsCalendar
    },
    {
        title: 'Meeting with customer about the new product features to launch in Q3 2025',
        weekCode: currentWeek,
        dayOfWeek: '4',
        calendarId: 2,
        categoryId: CATEGORY_IDS.workCalendar,
        startHour: '10:00',
        endHour: '12:00'
    },
];

const testWeeklyTasks = [
    {
        title: 'Generate app mockups',
        weekCode: currentWeek,
        dayOfWeek: '1',
        categoryId: CATEGORY_IDS.work,
        order: 1
    },
    {
        title: 'Buy new sneakers',
        weekCode: currentWeek,
        dayOfWeek: '1',
        categoryId: CATEGORY_IDS.shopping,
        order: 2
    },
    {
        title: '5k run',
        weekCode: currentWeek,
        dayOfWeek: '3',
        categoryId: CATEGORY_IDS.sport,
        order: 1
    },
    {
        title: 'Buy groceries',
        weekCode: currentWeek,
        dayOfWeek: '4',
        categoryId: CATEGORY_IDS.shopping,
        order: 1
    },
    {
        title: 'Buy meat for family day',
        weekCode: currentWeek,
        dayOfWeek: '5',
        categoryId: CATEGORY_IDS.shopping,
        order: 1
    },
    {
        title: 'Mow lawn',
        weekCode: currentWeek,
        dayOfWeek: '0',
        categoryId: CATEGORY_IDS.hobbies,
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
    weeklyTasks!: Dexie.Table<WeeklyTask, string>;
    somedayTasks!: Dexie.Table<SomedayTask, string>;
    categories!: Dexie.Table<Category, string>;
    events!: Dexie.Table<Event, string>;
    pendingChanges!: Dexie.Table<PendingChange, string>;

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

        // v2 — client-minted UUIDs as the only identity.
        //
        // `id` is a plain string primary key rather than `++id`: it is generated in the browser
        // before the row is stored, so IndexedDB must not assign one. `&serverId` goes with it,
        // because there is no second identifier left to index.
        //
        // No upgrade function: v1 shipped to nobody, and the test/demo databases are rebuilt
        // from fixtures. Any v1 rows would keep their numeric keys, which the API would reject
        // as non-UUIDs — the queue dead-letters them rather than corrupting anything.
        this.version(2).stores({
            categories: 'id, name',
            weeklyTasks: 'id, title, categoryId, projectId, weekCode, dayOfWeek, order',
            somedayTasks: 'id, title, categoryId, projectId, order',
            events: 'id, title, weekCode, categoryId',
            // The offline write queue. Moved out of localStorage, where every store overwrote
            // the others' entries, into a table that is transactional with the data it describes.
            pendingChanges: 'id, entityId, timestamp'
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