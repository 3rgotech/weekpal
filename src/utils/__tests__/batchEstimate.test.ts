import { describe, expect, it } from "@jest/globals";
import dayjs from "dayjs";
import { chipForKey, nextAfter, unestimatedIn } from "../batchEstimate";
import { WeeklyTask, SomedayTask } from "../../data/task";

/**
 * *(rt §5)* The bargain: the board never asks at capture, so there has to be a moment where
 * answering is fast. These pin what that moment is about and how it ends.
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

describe("what a run is about", () => {
    it("takes the day's tasks that carry no guess", () => {
        const tasks = [task(1), task(2, { estimatedMinutes: 30 }), task(3)];

        expect(unestimatedIn(tasks, "2").map((t) => t.id)).toEqual([
            "01930000-0000-7000-8000-000000000001",
            "01930000-0000-7000-8000-000000000003",
        ]);
    });

    it("leaves other days alone", () => {
        expect(unestimatedIn([task(1, { dayOfWeek: "4" })], "2")).toEqual([]);
    });

    it("does not ask about finished work", () => {
        // Sizing something already done is arithmetic about the past.
        expect(unestimatedIn([task(1, { completedAt: dayjs() })], "2")).toEqual([]);
    });

    it("does not ask about a project's backlog", () => {
        const backlog = new SomedayTask({
            id: "01930000-0000-7000-8000-0000000000bb",
            title: "In a project",
            projectId: "01930000-0000-7000-8000-0000000000cc",
            order: 1,
            subtasks: [],
        });

        expect(unestimatedIn([backlog as any], "someday")).toEqual([]);
    });

    it("has nothing to ask on a fully estimated day", () => {
        expect(unestimatedIn([task(1, { estimatedMinutes: 60 })], "2")).toEqual([]);
    });
});

describe("the temporary numeric verbs", () => {
    it("maps 1 to 6 onto the six chips", () => {
        expect(chipForKey("1")).toBe(5);
        expect(chipForKey("3")).toBe(30);
        expect(chipForKey("6")).toBe(240);
    });

    it("ignores anything outside them", () => {
        // A verb set that needed its own parsing rules would be a new grammar, which is exactly
        // what this is not allowed to be.
        expect(chipForKey("0")).toBeNull();
        expect(chipForKey("7")).toBeNull();
        expect(chipForKey("j")).toBeNull();
        expect(chipForKey("")).toBeNull();
    });
});

describe("where the selection goes next", () => {
    it("takes the task that moved into the answered one's place", () => {
        const remaining = [task(2), task(3)];

        expect(nextAfter(remaining, 0)).toBe("01930000-0000-7000-8000-000000000002");
    });

    it("stops at the end rather than wrapping", () => {
        // Wrapping would silently re-offer something just skipped, and make the end of the run
        // impossible to feel.
        const remaining = [task(1), task(2)];

        expect(nextAfter(remaining, 5)).toBe("01930000-0000-7000-8000-000000000002");
    });

    it("has nowhere to go once the column is done", () => {
        expect(nextAfter([], 0)).toBeNull();
    });
});
