import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it } from "@jest/globals";
import TaskStore from "../TaskStore";
import BaseStore from "../BaseStore";
import Event from "../../data/event";
import { ITaskAdapter } from "../../types";
import { noteCalendarsVersion } from "../../utils/calendarFence";

jest.mock("../../utils/env", () => ({ getEnvConfig: () => ({ dataSource: "api" }) }));
jest.mock("../../utils/connectivity", () => ({ isReachable: jest.fn(() => true) }));
jest.mock("../../utils/monitoring", () => ({ setOutboxReader: jest.fn() }));

const event = (id: string, weekCode: string) => new Event({ id, title: id, weekCode, dayOfWeek: "1" });

let served: Event[] = [];
const adapter = {
    getWeek: jest.fn(async () => ({ tasks: [], events: served })),
} as unknown as ITaskAdapter;

beforeEach(() => {
    localStorage.clear();
    BaseStore.resetShared();
    served = [];
});

afterEach(() => {
    BaseStore.resetShared();
});

describe("events after a calendar change", () => {
    it("keeps other weeks' events while the calendars have not changed", async () => {
        const store = new TaskStore(adapter);
        const db = (store as unknown as { db: { events: { bulkPut(rows: Event[]): Promise<unknown>; toArray(): Promise<Event[]> } } }).db;
        await db.events.bulkPut([event("next-week", "2026w43"), event("this-week", "2026w42")]);

        served = [event("this-week", "2026w42")];
        await store.list("2026w42");

        expect((await db.events.toArray()).map((row) => row.id).sort()).toEqual(["next-week", "this-week"]);
    });

    it("drops every week's cached events, and pulls at once, when the calendars changed", async () => {
        const store = new TaskStore(adapter);
        const db = (store as unknown as { db: { events: { bulkPut(rows: Event[]): Promise<unknown>; toArray(): Promise<Event[]> } } }).db;
        await db.events.bulkPut([event("removed-next-week", "2026w43"), event("removed-this-week", "2026w42")]);

        // Pulled a moment ago: without the fence, the throttle would answer from the cache.
        store.setLastSync("tasks");
        noteCalendarsVersion("01KVERSIONB");

        served = [event("kept", "2026w42")];
        await store.list("2026w42");

        expect(adapter.getWeek).toHaveBeenCalled();
        expect((await db.events.toArray()).map((row) => row.id)).toEqual(["kept"]);
    });
});
