import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import TaskStore from "../TaskStore";
import { ITaskAdapter, WeekSummary } from "../../types";

// `db` reads the data source when it opens, and `env` reads `import.meta.env`, which jest cannot
// parse as CommonJS. The store under test never touches the database here.
jest.mock("../../utils/env", () => ({ getEnvConfig: () => ({ dataSource: "test" }) }));

jest.mock("../../utils/connectivity", () => ({
    isReachable: jest.fn(() => true),
}));

const { isReachable } = jest.requireMock("../../utils/connectivity") as { isReachable: jest.Mock<() => boolean> };

const summary: WeekSummary = { week: "2026w36", done: 14, moved: 5, left: 2 };

const adapter = {
    weekSummary: jest.fn(async (_week: string) => summary),
} as unknown as ITaskAdapter;

beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    isReachable.mockReturnValue(true);
});

describe("summing up a week", () => {
    it("asks the server and keeps the answer", async () => {
        const store = new TaskStore(adapter);

        expect(await store.weekSummary("2026w36")).toEqual(summary);
        expect(JSON.parse(localStorage.getItem("week-summary-2026w36") ?? "null")).toEqual(summary);
    });

    it("answers from the last copy when the server cannot be reached", async () => {
        localStorage.setItem("week-summary-2026w36", JSON.stringify(summary));
        isReachable.mockReturnValue(false);
        const store = new TaskStore(adapter);

        expect(await store.weekSummary("2026w36")).toEqual(summary);
        expect(adapter.weekSummary).not.toHaveBeenCalled();
    });

    it("answers from the last copy when the request fails", async () => {
        localStorage.setItem("week-summary-2026w36", JSON.stringify(summary));
        (adapter.weekSummary as jest.Mock).mockImplementationOnce(async () => { throw new Error("down"); });
        jest.spyOn(console, "error").mockImplementation(() => undefined);
        const store = new TaskStore(adapter);

        expect(await store.weekSummary("2026w36")).toEqual(summary);
    });

    it("says nothing rather than guessing", async () => {
        // No adapter, nothing cached: null, and the line is not drawn.
        const store = new TaskStore(null);

        expect(await store.weekSummary("2026w36")).toBeNull();
    });

    it("ignores a cached copy that is not the right shape", async () => {
        localStorage.setItem("week-summary-2026w36", JSON.stringify({ week: "2026w36", done: "many" }));
        isReachable.mockReturnValue(false);
        const store = new TaskStore(adapter);

        expect(await store.weekSummary("2026w36")).toBeNull();
    });
});
