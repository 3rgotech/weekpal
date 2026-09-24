import { describe, expect, it } from "@jest/globals";
import { WeeklyTask } from "../../data/task";
import { isWeekDone } from "../weekDone";

const task = (dayOfWeek: string, completed: boolean, extra: Record<string, unknown> = {}) => new WeeklyTask({
    id: `${dayOfWeek}-${Math.random()}`,
    title: "t",
    weekCode: "2026w39",
    dayOfWeek,
    order: 0,
    // `completed` is derived from the completion date.
    completedAt: completed ? "2026-09-22T10:00:00Z" : null,
    ...extra,
});

const workweek = [1, 2, 3, 4, 5] as const;

describe("isWeekDone", () => {
    it("is done when every used day is finished and nothing is left in this week", () => {
        expect(isWeekDone([task("1", true), task("3", true), task("0", true)], [...workweek])).toBe(true);
    });

    it("is not done while any day still has something open", () => {
        expect(isWeekDone([task("1", true), task("2", false)], [...workweek])).toBe(false);
    });

    it("is not done while the this-week bucket holds an open task", () => {
        expect(isWeekDone([task("1", true), task("0", false)], [...workweek])).toBe(false);
    });

    it("never fires on an empty week", () => {
        expect(isWeekDone([], [...workweek])).toBe(false);
        expect(isWeekDone([task("0", true)], [...workweek])).toBe(false);
    });

    it("ignores some day, and days that are not on the board", () => {
        expect(isWeekDone([task("1", true), task("someday", false), task("6", false)], [...workweek])).toBe(true);
    });
});
