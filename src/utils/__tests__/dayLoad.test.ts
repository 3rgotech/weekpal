import { describe, expect, it } from "@jest/globals";
import dayjs from "dayjs";
import { DEFAULT_TASK_WEIGHT, dayShares, dayWeight, taskWeight } from "../dayLoad";
import { WeeklyTask, SomedayTask } from "../../data/task";

/**
 * *(rt §10)* The *am I ahead* half of the two-second glance.
 *
 * Relative, not a quota — which makes the normalisation the whole feature. Getting it wrong in
 * either direction produces a bar that is always full or never full, and both are furniture that
 * says nothing.
 */
const task = (n: number, overrides: Record<string, any> = {}) => new WeeklyTask({
    id: `01930000-0000-7000-8000-00000000000${n}`,
    title: `Task ${n}`,
    weekCode: "2026w37",
    dayOfWeek: "2",
    order: n,
    subtasks: [],
    ...overrides,
});

const WEEKDAYS = ["1", "2", "3", "4", "5"] as any[];

describe("what a task weighs", () => {
    it("uses its estimate when it has one", () => {
        expect(taskWeight(task(1, { estimatedMinutes: 120 }))).toBe(120);
    });

    it("falls back to a flat default when it has none", () => {
        // The one place estimates are invented, and defensible only because the output is a
        // ranking: every unestimated task is wrong by the same amount.
        expect(taskWeight(task(1))).toBe(DEFAULT_TASK_WEIGHT);
    });

    it("treats a zero estimate as no estimate", () => {
        expect(taskWeight(task(1, { estimatedMinutes: 0 }))).toBe(DEFAULT_TASK_WEIGHT);
    });
});

describe("what a day weighs", () => {
    it("adds up what is still to do", () => {
        const tasks = [task(1, { estimatedMinutes: 60 }), task(2, { estimatedMinutes: 30 })];

        expect(dayWeight(tasks, "2")).toBe(90);
    });

    it("drops completed work", () => {
        // The bar is about what is ahead. A day that has been finished should empty out rather
        // than stay heavy.
        const tasks = [
            task(1, { estimatedMinutes: 60 }),
            task(2, { estimatedMinutes: 60, completedAt: dayjs() }),
        ];

        expect(dayWeight(tasks, "2")).toBe(60);
    });

    it("ignores a project's backlog", () => {
        const backlog = new SomedayTask({
            id: "01930000-0000-7000-8000-0000000000bb",
            title: "In a project",
            projectId: "01930000-0000-7000-8000-0000000000cc",
            order: 1,
            subtasks: [],
        });

        expect(dayWeight([backlog as any], "someday")).toBe(0);
    });

    it("ignores other days", () => {
        expect(dayWeight([task(1, { dayOfWeek: "4" })], "2")).toBe(0);
    });
});

describe("each day against the heaviest", () => {
    it("gives the heaviest day a full bar", () => {
        const shares = dayShares([
            task(1, { dayOfWeek: "1", estimatedMinutes: 240 }),
            task(2, { dayOfWeek: "2", estimatedMinutes: 60 }),
        ], WEEKDAYS);

        expect(shares.get("1" as any)).toBe(1);
        expect(shares.get("2" as any)).toBe(0.25);
    });

    it("fills every bar when the week is level", () => {
        // A flat rail is the honest picture of a uniformly loaded week. Normalising so the
        // average were half full would invent a lighter day that does not exist.
        const shares = dayShares([
            task(1, { dayOfWeek: "1", estimatedMinutes: 60 }),
            task(2, { dayOfWeek: "2", estimatedMinutes: 60 }),
            task(3, { dayOfWeek: "3", estimatedMinutes: 60 }),
        ], ["1", "2", "3"] as any[]);

        expect([...shares.values()]).toEqual([1, 1, 1]);
    });

    it("shows relief as a gap", () => {
        const shares = dayShares([
            task(1, { dayOfWeek: "1", estimatedMinutes: 240 }),
            task(2, { dayOfWeek: "2", estimatedMinutes: 30 }),
        ], WEEKDAYS);

        expect(shares.get("2" as any)).toBeLessThan(0.2);
        expect(shares.get("3" as any)).toBe(0);
    });

    it("ranks a board with no estimates by task count", () => {
        // The graceful degradation that matters, because that is every board on day one.
        const shares = dayShares([
            task(1, { dayOfWeek: "1" }), task(2, { dayOfWeek: "1" }),
            task(3, { dayOfWeek: "1" }), task(4, { dayOfWeek: "1" }),
            task(5, { dayOfWeek: "2" }),
        ], WEEKDAYS);

        expect(shares.get("1" as any)).toBe(1);
        expect(shares.get("2" as any)).toBe(0.25);
    });

    it("draws nothing when nothing is planned", () => {
        // A row of empty rails would be furniture that says nothing.
        expect(dayShares([], WEEKDAYS).size).toBe(0);
    });

    it("lets a hidden day set no scale", () => {
        // A day the user cannot see must not make every visible bar shorter for a reason nobody
        // can find.
        const tasks = [
            task(1, { dayOfWeek: "1", estimatedMinutes: 60 }),
            task(2, { dayOfWeek: "6", estimatedMinutes: 600 }),
        ];

        expect(dayShares(tasks, ["1", "2"] as any[]).get("1" as any)).toBe(1);
    });

    it("never rates the undated buckets", () => {
        // "Some day" has no size worth comparing to a Tuesday, and the this-week bucket is the
        // overflow the days drain into rather than a day of its own.
        const shares = dayShares([
            task(1, { dayOfWeek: "1", estimatedMinutes: 60 }),
        ], ["1", "0", "someday"] as any[]);

        expect(shares.has("0" as any)).toBe(false);
        expect(shares.has("someday" as any)).toBe(false);
    });
});
