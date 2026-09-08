import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { isResyncRequired, lastSyncedAt, markSynced } from "../resyncFence";

/**
 * Starting again when the local copy has drifted beyond reconciling.
 *
 * The assertion that matters most here is a negative one: the outbox survives. Everything else
 * can be fetched from the server again; queued writes are the only copy of work the user has
 * already done, and clearing them in the name of a clean cache would destroy it.
 *
 * @see PROGRESS.md R28(d)
 */
jest.mock("../env", () => ({ getEnvConfig: () => ({ dataSource: "test" }) }));

beforeEach(() => {
    jest.resetModules();
    localStorage.clear();
});

afterEach(async () => {
    const { WeekpalDB } = await import("../../store/db");
    await new WeekpalDB().delete();
});

describe("recognising the answer", () => {
    it("reads the server's reason", () => {
        expect(isResyncRequired({ reason: "resync_required" })).toBe(true);
    });

    it("is not fooled by another kind of conflict", () => {
        // A 409 also means "this id belongs to someone else", which must not wipe anything.
        expect(isResyncRequired({ reason: "task", id: "abc" })).toBe(false);
        expect(isResyncRequired(undefined)).toBe(false);
        expect(isResyncRequired("resync_required")).toBe(false);
    });
});

describe("remembering when we last synced", () => {
    it("has no answer before the first sync", () => {
        expect(lastSyncedAt()).toBeUndefined();
    });

    it("remembers the moment it is told about", () => {
        markSynced(new Date("2026-09-08T12:00:00.000Z"));

        expect(lastSyncedAt()).toBe("2026-09-08T12:00:00.000Z");
    });
});

describe("starting again", () => {
    it("clears the cached rows and keeps the queue", async () => {
        const { WeekpalDB } = await import("../../store/db");
        const { resyncFromServer } = await import("../resyncFence");
        const db = new WeekpalDB();
        await db.open();

        await db.somedayTasks.put({ id: "a", title: "From the server", order: 0 } as never);
        await db.categories.put({ id: "c", name: "Work", color: "red" } as never);
        await db.pendingChanges.put({
            id: "queued", entityType: "task", entityId: "b",
            type: "upsert", timestamp: Date.now(), attempts: 0,
        } as never);

        await resyncFromServer(db);

        expect(await db.somedayTasks.count()).toBe(0);
        expect(await db.categories.count()).toBe(0);
        // The whole point. These are writes the user made that have not reached anyone.
        expect(await db.pendingChanges.count()).toBe(1);

        db.close();
    });

    it("forces the next read to go to the server", async () => {
        const { WeekpalDB } = await import("../../store/db");
        const { resyncFromServer } = await import("../resyncFence");
        const db = new WeekpalDB();
        await db.open();

        localStorage.setItem("tasks-last-sync", String(Date.now()));
        localStorage.setItem("categories-last-sync", String(Date.now()));

        await resyncFromServer(db);

        // Otherwise the five-minute throttle answers from a table that is now empty and merely
        // looks quiet.
        expect(localStorage.getItem("tasks-last-sync")).toBeNull();
        expect(localStorage.getItem("categories-last-sync")).toBeNull();

        db.close();
    });

    it("records that it has just synced", async () => {
        const { WeekpalDB } = await import("../../store/db");
        const { resyncFromServer } = await import("../resyncFence");
        const db = new WeekpalDB();
        await db.open();

        await resyncFromServer(db);

        // Or the very next write would be refused by the same fence, for ever.
        expect(lastSyncedAt()).toBeDefined();

        db.close();
    });
});
