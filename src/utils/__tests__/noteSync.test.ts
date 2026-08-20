import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import SyncService from "../SyncService";
import Note from "../../data/note";
import { WeekpalDB } from "../../store/db";

/**
 * How a queued note reaches the server.
 *
 * Notes are the one entity whose route is nested — `tasks/{task}/notes/{id}` — so they cannot go
 * through the shared single-argument delete path the other entities use. These tests pin the two
 * things that makes fragile: that a note is routed to its own adapter at all, and that a delete
 * still knows which task it belonged to after the local row is gone.
 *
 * The database is a stub rather than a real Dexie: IndexedDB is not available under jest here,
 * and the queue behaviour under test is SyncService's, not Dexie's.
 */
const TASK = "01931c8f-7a2e-7c31-9f11-000000000001";
const NOTE_ID = "01931c8f-7a2e-7c31-9f11-000000000002";

let queue: any[];
let notes: Map<string, Note>;
let adapter: {
    list: jest.Mock<any>;
    upsert: jest.Mock<any>;
    delete: jest.Mock<any>;
};

const fakeDb = () => ({
    pendingChanges: {
        put: async (change: any) => { queue.push(change); },
        delete: async (id: string) => { queue = queue.filter((c) => c.id !== id); },
        update: async (id: string, patch: any) => {
            queue = queue.map((c) => (c.id === id ? { ...c, ...patch } : c));
        },
        orderBy: () => ({
            filter: (fn: (c: any) => boolean) => ({
                toArray: async () => queue.filter(fn),
            }),
        }),
    },
    taskNotes: {
        get: async (id: string) => notes.get(id),
        put: async (note: Note) => { notes.set(note.id, note); },
    },
}) as unknown as WeekpalDB;

beforeEach(() => {
    queue = [];
    notes = new Map();
    adapter = {
        list: jest.fn(async () => []),
        upsert: jest.fn(async (note: any) => note),
        delete: jest.fn(async () => undefined),
    };
    SyncService.reset();
});

describe("queued note writes", () => {
    it("sends an upsert to the note adapter", async () => {
        const note = new Note({ id: NOTE_ID, taskId: TASK, body: "Ring the plumber" });
        notes.set(note.id, note);

        const sync = SyncService.shared(fakeDb(), { note: adapter as any });
        await sync.enqueue({ entityType: "note", entityId: note.id, type: "upsert", data: { taskId: TASK } });

        expect(adapter.upsert).toHaveBeenCalledTimes(1);
        expect(queue).toHaveLength(0);
    });

    it("deletes using the task id snapshotted on the queue entry", async () => {
        // The local row is already gone — which is exactly why the task id has to travel on the
        // queue entry. Without it there is no URL to send the delete to.
        const sync = SyncService.shared(fakeDb(), { note: adapter as any });
        await sync.enqueue({ entityType: "note", entityId: NOTE_ID, type: "delete", data: { taskId: TASK } });

        expect(adapter.delete).toHaveBeenCalledWith(TASK, NOTE_ID);
        expect(queue).toHaveLength(0);
    });

    it("dead-letters a delete that lost its task id rather than retrying it forever", async () => {
        const sync = SyncService.shared(fakeDb(), { note: adapter as any });
        await sync.enqueue({ entityType: "note", entityId: NOTE_ID, type: "delete" });

        expect(adapter.delete).not.toHaveBeenCalled();
        // Permanent, so it steps aside instead of blocking every write behind it.
        expect(queue[0].deadLettered).toBe(true);
    });

    it("keeps the entry when no note adapter is configured, rather than dropping the note", async () => {
        const note = new Note({ id: NOTE_ID, taskId: TASK, body: "Offline note" });
        notes.set(note.id, note);

        const sync = SyncService.shared(fakeDb(), {});
        await sync.enqueue({ entityType: "note", entityId: note.id, type: "upsert", data: { taskId: TASK } });

        // Transient: a local-only session may be given an adapter later, and the note must
        // still be there when it is.
        expect(queue).toHaveLength(1);
        expect(queue[0].deadLettered).toBeFalsy();
    });
});
