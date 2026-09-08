import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";

/**
 * The outbox, once it carries claims.
 *
 * Two things matter here and neither is visible from a single write: that queueing three
 * gestures against one task does not throw away two of them, and that what the server answers
 * is actually acted on rather than assumed.
 *
 * @see PROGRESS.md R27
 */
let dataSource = "test";
jest.mock("../env", () => ({ getEnvConfig: () => ({ dataSource }) }));
jest.mock("../connectivity", () => ({
    isReachable: () => true,
    probe: async () => true,
    probeIfStale: async () => true,
}));
jest.mock("../tabLeader", () => ({
    isLeaderTab: () => true,
    broadcastToTabs: () => undefined,
    subscribeToTabMessages: () => () => undefined,
}));

const TASK_ID = "01930000-0000-7000-8000-00000000aaaa";

let results: any[] = [];
let sentIntents: any[] = [];

const adapter = {
    upsert: jest.fn(async (_task: any, intent: any) => {
        sentIntents.push(intent);

        return results.shift() ?? { id: TASK_ID, status: "applied", task: null };
    }),
    upsertMany: jest.fn(async (tasks: any[], intent: any) => {
        sentIntents.push(intent);

        return tasks.map(() => results.shift() ?? { id: TASK_ID, status: "applied", task: null });
    }),
    delete: jest.fn(async () => undefined),
};

const load = async () => {
    const { WeekpalDB } = await import("../../store/db");
    const { SyncService } = await import("../SyncService");
    const db = new WeekpalDB();
    await db.open();

    return { db, service: SyncService.shared(db, { task: adapter as never }) };
};

beforeEach(() => {
    jest.resetModules();
    results = [];
    sentIntents = [];
    adapter.upsert.mockClear();
    adapter.upsertMany.mockClear();
});

afterEach(async () => {
    const { SyncService } = await import("../SyncService");
    SyncService.reset();
    const { WeekpalDB } = await import("../../store/db");
    await new WeekpalDB().delete();
});

describe("coalescing", () => {
    it("folds a second write to the same task into the first", async () => {
        const { db, service } = await load();
        // Offline for this part: enqueue would otherwise drain immediately and there would be
        // nothing left to fold into.
        const drain = jest.spyOn(service, "syncPendingChanges").mockResolvedValue(undefined);

        await service.enqueue({
            entityType: "task", entityId: TASK_ID, type: "upsert",
            dirty: { title: "2026-09-08T10:00:00.000000Z" },
        });
        await service.enqueue({
            entityType: "task", entityId: TASK_ID, type: "upsert",
            dirty: { position: "2026-09-08T11:00:00.000000Z" },
        });

        const queued = await db.pendingChanges.toArray();

        // One entry, both claims. Since the payload is read from the database at flush time,
        // two entries would have sent byte-identical bodies — only the claims differ.
        expect(queued).toHaveLength(1);
        expect(Object.keys(queued[0].dirty ?? {}).sort()).toEqual(["position", "title"]);

        drain.mockRestore();
    });

    it("does not fold a delete into an upsert", async () => {
        const { db, service } = await load();
        const drain = jest.spyOn(service, "syncPendingChanges").mockResolvedValue(undefined);

        await service.enqueue({ entityType: "task", entityId: TASK_ID, type: "upsert", dirty: {} });
        await service.enqueue({ entityType: "task", entityId: TASK_ID, type: "delete" });

        // Different verbs, and the order between them is the whole meaning.
        expect(await db.pendingChanges.count()).toBe(2);

        drain.mockRestore();
    });

    it("keeps writes to different tasks apart", async () => {
        const { db, service } = await load();
        const drain = jest.spyOn(service, "syncPendingChanges").mockResolvedValue(undefined);

        await service.enqueue({ entityType: "task", entityId: TASK_ID, type: "upsert", dirty: {} });
        await service.enqueue({
            entityType: "task", entityId: "01930000-0000-7000-8000-00000000bbbb",
            type: "upsert", dirty: {},
        });

        expect(await db.pendingChanges.count()).toBe(2);

        drain.mockRestore();
    });
});

describe("acting on what the server answered", () => {
    it("deletes a task the server says is gone", async () => {
        // The always-open tab flushing a queue written before the purge. Told "no such id" it
        // would recreate everything it had just been told to forget.
        const { db, service } = await load();
        await db.somedayTasks.put({ id: TASK_ID, title: "Purged", order: 0 } as never);

        results = [{ id: TASK_ID, status: "gone", task: null }];

        await service.enqueue({ entityType: "task", entityId: TASK_ID, type: "upsert", dirty: {} });

        expect(await db.somedayTasks.get(TASK_ID)).toBeUndefined();
    });

    it("counts the changes that were superseded", async () => {
        const { db, service } = await load();
        // The queue reads the row from the database at flush time, so there has to be one.
        await db.somedayTasks.put({ id: TASK_ID, title: "Contested", order: 0 } as never);
        const { getSupersededCount, resetSyncHealth } = await import("../syncStatus");
        resetSyncHealth();

        await service.enqueue({
            entityType: "task", entityId: TASK_ID, type: "upsert",
            dirty: { title: "2026-09-08T10:00:00.000000Z" },
        });

        // Nothing was superseded on that one.
        expect(getSupersededCount()).toBe(0);

        results = [{
            id: TASK_ID, status: "partial", task: null,
            superseded: {
                title: { field: "title", winner: "Theirs", at: "" },
                position: { field: "position", winner: {}, at: "" },
            },
        }];

        await service.enqueue({
            entityType: "task", entityId: TASK_ID, type: "upsert",
            dirty: { title: "2026-09-08T11:00:00.000000Z" },
        });

        // The user is about to see something they did not type. That is worth saying out loud.
        expect(getSupersededCount()).toBe(2);
    });

    it("sends the claims it was given, keyed by task", async () => {
        const { db, service } = await load();
        await db.somedayTasks.put({ id: TASK_ID, title: "Queued", order: 0 } as never);

        await service.enqueue({
            entityType: "task", entityId: TASK_ID, type: "upsert",
            dirty: { title: "2026-09-08T10:00:00.000000Z" },
            mutationId: "01930000-0000-7000-8000-00000000cccc",
            deviceId: "01930000-0000-7000-8000-00000000dddd",
        });

        expect(sentIntents[0]).toEqual({
            dirty: { [TASK_ID]: { title: "2026-09-08T10:00:00.000000Z" } },
            mutationId: "01930000-0000-7000-8000-00000000cccc",
            deviceId: "01930000-0000-7000-8000-00000000dddd",
        });
    });
});
