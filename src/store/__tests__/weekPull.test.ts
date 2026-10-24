import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it } from "@jest/globals";
import TaskStore from "../TaskStore";
import BaseStore from "../BaseStore";
import { ITaskAdapter } from "../../types";

jest.mock("../../utils/env", () => ({ getEnvConfig: () => ({ dataSource: "api" }) }));
jest.mock("../../utils/connectivity", () => ({ isReachable: jest.fn(() => true) }));
jest.mock("../../utils/monitoring", () => ({ setOutboxReader: jest.fn() }));

const getWeek = jest.fn(async (_weekCode: string) => ({ tasks: [], events: [] }));
const adapter = { getWeek } as unknown as ITaskAdapter;

beforeEach(() => {
    localStorage.clear();
    BaseStore.resetShared();
    getWeek.mockClear();
});

afterEach(() => {
    BaseStore.resetShared();
});

describe("the week pull throttle", () => {
    it("answers the same week from the cache within five minutes", async () => {
        const store = new TaskStore(adapter);

        await store.list("2026w43");
        await store.list("2026w43");

        expect(getWeek).toHaveBeenCalledTimes(1);
    });

    it("still pulls a different week, which the last pull said nothing about", async () => {
        // Tasks put in next week on another device never reached a phone that had just pulled
        // this week: the throttle answered for the table, not for the week asked about.
        const store = new TaskStore(adapter);

        await store.list("2026w43");
        await store.list("2026w44");

        expect(getWeek.mock.calls.map(([week]) => week)).toEqual(["2026w43", "2026w44"]);
    });
});
