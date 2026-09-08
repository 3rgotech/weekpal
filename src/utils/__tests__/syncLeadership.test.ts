import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";

/**
 * The queue belongs to one tab.
 *
 * `tabLeader` is tested on its own; this file is about the consequence — that a follower stores
 * its write and stops, and that the row is still there for the leader to send. The bug being
 * prevented is two tabs sending the same entry, which produces a duplicate the server has no way
 * to recognise as one.
 */
let dataSource = "test";
jest.mock("../env", () => ({ getEnvConfig: () => ({ dataSource }) }));

// Reachable without a request: the point here is what the leader guard does, not what the
// network does, and a real probe would make the outcome depend on a fetch jsdom cannot serve.
jest.mock("../connectivity", () => ({
    isReachable: () => true,
    probe: async () => true,
    probeIfStale: async () => true,
}));

let leading = true;
const broadcasts: unknown[] = [];
jest.mock("../tabLeader", () => ({
    isLeaderTab: () => leading,
    broadcastToTabs: (message: unknown) => {
        broadcasts.push(message);
    },
    subscribeToTabMessages: () => () => undefined,
    // Fires immediately with the current answer, which is what `SyncService` relies on to
    // drain a queue that accumulated before the lock was granted.
    subscribeToLeadership: (listener: (leader: boolean) => void) => {
        listener(leading);

        return () => undefined;
    },
}));

const upsert = jest.fn(async (task: unknown) => task);

const load = async () => {
    const { WeekpalDB } = await import("../../store/db");
    const { SyncService } = await import("../SyncService");
    const db = new WeekpalDB();
    await db.open();

    const service = SyncService.shared(db, {
        task: { upsert, upsertMany: async (tasks: unknown[]) => tasks, delete: async () => undefined } as never,
    });

    return { db, service };
};

beforeEach(() => {
    jest.resetModules();
    leading = true;
    broadcasts.length = 0;
    upsert.mockClear();
});

afterEach(async () => {
    const { SyncService } = await import("../SyncService");
    SyncService.reset();
    const { WeekpalDB } = await import("../../store/db");
    await new WeekpalDB().delete();
});

describe("only the leader drains the queue", () => {
    it("keeps a follower's write in the queue instead of sending it", async () => {
        const { db, service } = await load();
        leading = false;

        await service.enqueue({ entityType: "task", entityId: "a-task", type: "delete" });

        // Stored, not sent. Nothing is lost by being a follower — the row is in the shared
        // database, which is the only place it needed to reach.
        expect(upsert).not.toHaveBeenCalled();
        expect(await db.pendingChanges.count()).toBe(1);
    });

    it("asks the leader to flush rather than flushing itself", async () => {
        const { service } = await load();
        leading = false;

        await service.enqueue({ entityType: "task", entityId: "a-task", type: "delete" });

        // Without this the write waits for whatever the leader's next trigger happens to be,
        // which on a board left open all week may be nothing at all.
        expect(broadcasts).toEqual([{ kind: "flush" }]);
    });

    it("does nothing when a follower is asked to sync directly", async () => {
        const { db, service } = await load();
        await db.pendingChanges.put({
            id: "queued", entityType: "task", entityId: "a-task",
            type: "delete", timestamp: Date.now(), attempts: 0,
        } as never);

        leading = false;
        await service.syncPendingChanges();

        expect(await db.pendingChanges.count()).toBe(1);
    });

    it("lets the leader send and then tells the other tabs", async () => {
        const { db, service } = await load();

        await service.enqueue({ entityType: "task", entityId: "a-task", type: "delete" });

        expect(await db.pendingChanges.count()).toBe(0);
        // The followers are showing rows the write-back has just moved underneath them.
        expect(broadcasts).toContainEqual({ kind: "changed" });
    });

    it("says nothing to the other tabs when the queue was empty", async () => {
        const { service } = await load();

        await service.syncPendingChanges();

        // A drain that applied nothing changed nothing. Broadcasting anyway would have every
        // idle tab re-reading the database on every one of the leader's ticks.
        expect(broadcasts).toEqual([]);
    });
});
