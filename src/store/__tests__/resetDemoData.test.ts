import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";

/**
 * `db` reads the data source when it constructs a connection, so the environment has to answer
 * before the module is imported — and `env` itself reads `import.meta.env`, which jest cannot
 * parse as CommonJS.
 */
let dataSource = "demo";
jest.mock("../../utils/env", () => ({ getEnvConfig: () => ({ dataSource }) }));

const load = async () => {
    const module = await import("../db");

    return module;
};

const openDemo = async () => {
    const { WeekpalDB } = await load();
    const db = new WeekpalDB();
    await db.open();

    return db;
};

beforeEach(() => {
    dataSource = "demo";
    jest.resetModules();
});

afterEach(async () => {
    const { WeekpalDB } = await load();
    const db = new WeekpalDB();
    await db.delete();
});

describe("resetting the demo", () => {
    it("seeds the sample week when the database is created", async () => {
        const db = await openDemo();

        expect(await db.weeklyTasks.count()).toBeGreaterThan(0);
        expect(await db.categories.count()).toBeGreaterThan(0);

        db.close();
    });

    it("leaves exactly one copy of the fixtures, however many times it runs", async () => {
        // The defect this exists for: the reset used to delete the database, which waits on the
        // page's own open connection. The delete landed around the reload, the fresh page created
        // the database itself, and `populate` ran a second time — a reset demo came back holding
        // two of every task.
        const { resetDemoData } = await load();
        const first = await openDemo();
        const seededWeekly = await first.weeklyTasks.count();
        const seededSomeday = await first.somedayTasks.count();
        first.close();

        await resetDemoData();
        await resetDemoData();

        const db = await openDemo();

        expect(await db.weeklyTasks.count()).toBe(seededWeekly);
        expect(await db.somedayTasks.count()).toBe(seededSomeday);
        expect(await db.categories.count()).toBeGreaterThan(0);

        // Fixture ids are minted at construction, so a second seeding would not collide — it
        // would sit alongside the first, which is exactly how the duplicates got there.
        const titles = (await db.weeklyTasks.toArray()).map((task) => task.title);
        expect(new Set(titles).size).toBe(titles.length);

        db.close();
    });

    it("throws away whatever the visitor did", async () => {
        const { WeekpalDB, resetDemoData } = await load();
        const db = await openDemo();

        await db.projects.put({ id: "p1", name: "Kitchen refit", categoryId: null } as never);
        await db.pendingChanges.put({
            id: "c1",
            entityType: "task",
            entityId: "t1",
            type: "upsert",
            timestamp: Date.now(),
            attempts: 0,
        } as never);
        db.close();

        await resetDemoData();

        const after = new WeekpalDB();
        await after.open();

        expect(await after.projects.count()).toBe(0);
        expect(await after.pendingChanges.count()).toBe(0);
        // The week itself comes back, rather than being left empty.
        expect(await after.weeklyTasks.count()).toBeGreaterThan(0);

        after.close();
    });

    it("refuses to run against the real database", async () => {
        dataSource = "api";
        const { resetDemoData } = await load();

        await expect(resetDemoData()).rejects.toThrow("demo");
    });
});
