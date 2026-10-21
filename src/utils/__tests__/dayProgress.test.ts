import { describe, expect, it } from "@jest/globals";
import dayjs from "dayjs";
import { dayProgress } from "../dayProgress";
import { WeeklyTask } from "../../data/task";

/**
 * What the line under a day's name counts when the day has no limit: its tasks, and how many are
 * done. It replaced a rail relative to the week's heaviest day, which read as progress and was not.
 */
const task = (n: number, overrides: Record<string, any> = {}) => new WeeklyTask({
    id: `01930000-0000-7000-8000-00000000000${n}`,
    title: `Task ${n}`,
    weekCode: "2026w43",
    dayOfWeek: "3",
    order: n,
    subtasks: [],
    ...overrides,
});

const done = (n: number) => task(n, { completedAt: dayjs() });

describe("a day's progress", () => {
    it("counts the day's tasks and the ones done", () => {
        expect(dayProgress([task(1), done(2), task(3)], "3")).toEqual({ done: 1, total: 3 });
    });

    it("is a single open slot for one unestimated task, whatever the rest of the week carries", () => {
        // The case that made the old rail misleading: one task on Wednesday drew two thirds of a
        // bar because Tuesday was heavier.
        const tuesday = [task(1, { dayOfWeek: "2", estimatedMinutes: 15 }), task(2, { dayOfWeek: "2" })];

        expect(dayProgress([...tuesday, task(3)], "3")).toEqual({ done: 0, total: 1 });
    });

    it("leaves out project backlogs, which were never promised the day", () => {
        expect(dayProgress([task(1), task(2, { projectId: "01930000-0000-7000-8000-0000000000aa" })], "3"))
            .toEqual({ done: 0, total: 1 });
    });

    it("is nothing for an empty day, and nothing for the undated buckets", () => {
        expect(dayProgress([task(1)], "4")).toBeNull();
        expect(dayProgress([task(1, { dayOfWeek: "0" })], "0")).toBeNull();
    });
});
