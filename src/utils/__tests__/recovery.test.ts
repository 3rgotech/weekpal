import { describe, expect, it } from "@jest/globals";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import { isPastDay, recoverableTasks } from "../recovery";
import { WeeklyTask, SomedayTask } from "../../data/task";

dayjs.extend(isoWeek);

/**
 * The *what did I forget* half of the two-second glance.
 *
 * The mark is the only asymmetry in the week, so what counts as "past" and what counts as
 * "unfinished" both have to be exactly right — a false positive puts a reproach on a column that
 * did nothing wrong.
 */
const today = dayjs("2026-09-09");

const task = (overrides: Record<string, any> = {}) => new WeeklyTask({
    id: `01930000-0000-7000-8000-00000000000${overrides.n ?? 1}`,
    title: "A task",
    weekCode: "2026w37",
    dayOfWeek: "2",
    order: 1,
    subtasks: [],
    ...overrides,
});

describe("which days are past", () => {
    it("counts yesterday", () => {
        expect(isPastDay(today.subtract(1, "day"), today)).toBe(true);
    });

    it("does not count today", () => {
        // A day still in progress has nothing to recover, and marking it would put a reproach on
        // the column the user is actually working in.
        expect(isPastDay(today, today)).toBe(false);
    });

    it("does not count tomorrow", () => {
        expect(isPastDay(today.add(1, "day"), today)).toBe(false);
    });

    it("compares whole days, not the moment", () => {
        // 23:59 today is still today.
        expect(isPastDay(today.hour(23).minute(59), today.hour(9))).toBe(false);
    });

    it("never counts an undated bucket", () => {
        // Some day is not late, it is undated — and that distinction is the entire reason the
        // bucket exists.
        expect(isPastDay(null, today)).toBe(false);
    });
});

describe("what a past day would hand over", () => {
    it("takes the unfinished tasks of that day", () => {
        const tasks = [task({ n: 1 }), task({ n: 2 }), task({ n: 3, dayOfWeek: "4" })];

        expect(recoverableTasks(tasks, "2")).toHaveLength(2);
    });

    it("leaves completed tasks where they are", () => {
        // They are a record of a day that went well. Dragging them forward would erase that.
        const done = task({ n: 2, completedAt: dayjs() });

        expect(recoverableTasks([task({ n: 1 }), done], "2")).toHaveLength(1);
    });

    it("leaves a project's backlog alone", () => {
        // Those were never promised this day, so nothing about them has slipped.
        const backlog = new SomedayTask({
            id: "01930000-0000-7000-8000-000000000009",
            title: "In a project",
            projectId: "01930000-0000-7000-8000-0000000000aa",
            order: 1,
            subtasks: [],
        });

        expect(recoverableTasks([backlog as any], "someday")).toHaveLength(0);
    });

    it("says nothing about a day that finished everything", () => {
        const done = task({ n: 1, completedAt: dayjs() });

        expect(recoverableTasks([done], "2")).toEqual([]);
    });
});
