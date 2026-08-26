/**
 * @jest-environment node
 *
 * Node rather than jsdom for the same reason as the other adapter tests: ky needs Node's fetch
 * stack, which jsdom does not expose.
 */
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import APITaskAdapter from "../api/APITaskAdapter";
import { WeeklyTask } from "../../data/task";

const TASK = "01931c8f-7a2e-7c31-9f11-000000000001";

let calls: string[];

const respondWith = (payload: unknown) => {
  (globalThis as any).fetch = jest.fn(async (request: any) => {
    calls.push(request.url);

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  });
};

beforeEach(() => {
  calls = [];
});

describe("reading what was left behind", () => {
  it("asks the leftovers endpoint and maps the rows into tasks", async () => {
    respondWith({
      data: [{
        id: TASK,
        title: "Ring the plumber",
        week_number: "2026w30",
        day_of_week: 3,
        order: 1,
        completed_at: null,
      }],
      meta: { since: "2026w22" },
    });

    const { tasks, since } = await new APITaskAdapter("https://api.test/api/v1", undefined).leftovers();

    expect(calls).toEqual(["https://api.test/api/v1/tasks/leftovers"]);
    expect(since).toBe("2026w22");
    expect(tasks).toHaveLength(1);
    expect(tasks[0]).toBeInstanceOf(WeeklyTask);
    expect((tasks[0] as WeeklyTask).weekCode).toBe("2026w30");
    // The board keys its columns by string, so the day arrives as one.
    expect((tasks[0] as WeeklyTask).dayOfWeek).toBe("3");
  });

  it("treats a missing window as no window rather than guessing one", async () => {
    // An empty `since` tells the store it has no server-side scope to trust, which is what keeps
    // it from hiding cached rows it has no evidence about.
    respondWith({ data: [] });

    const { tasks, since } = await new APITaskAdapter("https://api.test/api/v1", undefined).leftovers();

    expect(tasks).toEqual([]);
    expect(since).toBe("");
  });
});
