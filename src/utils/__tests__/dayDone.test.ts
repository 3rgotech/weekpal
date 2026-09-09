import { describe, expect, it } from "@jest/globals";
import dayjs from "dayjs";
import { isDayDone } from "../dayDone";
import { WeeklyTask, SomedayTask } from "../../data/task";

/**
 * What earns the diagonal.
 *
 * The rarest mark on the board and the only celebratory one, so the question of what counts as
 * finished matters more than how the stroke is drawn.
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

const done = (n: number, overrides: Record<string, any> = {}) =>
    task(n, { completedAt: dayjs(), ...overrides });

describe("a finished day", () => {
    it("is one where everything is ticked", () => {
        expect(isDayDone([done(1), done(2)], "2")).toBe(true);
    });

    it("is not one with anything left", () => {
        expect(isDayDone([done(1), task(2)], "2")).toBe(false);
    });

    it("is never an empty day", () => {
        // A day with nothing in it has not been finished, it has been unused — and most people's
        // Saturday would otherwise arrive pre-congratulated.
        expect(isDayDone([], "2")).toBe(false);
    });

    it("is not earned by another day's work", () => {
        expect(isDayDone([done(1, { dayOfWeek: "3" })], "2")).toBe(false);
    });

    it("ignores a project's backlog", () => {
        // Those tasks were never promised this day, which is why they count nowhere else either.
        const backlog = new SomedayTask({
            id: "01930000-0000-7000-8000-0000000000bb",
            title: "In a project",
            projectId: "01930000-0000-7000-8000-0000000000cc",
            order: 1,
            subtasks: [],
        });

        expect(isDayDone([backlog as any], "someday")).toBe(false);
    });

    it("stops being finished when something is added", () => {
        // The mark clears until the new task is done or moved out — it is a statement about the
        // day as it stands, not a trophy that has been awarded.
        const finished = [done(1), done(2)];

        expect(isDayDone(finished, "2")).toBe(true);
        expect(isDayDone([...finished, task(3)], "2")).toBe(false);
    });

    it("stops being finished when something is unticked", () => {
        expect(isDayDone([done(1), task(2)], "2")).toBe(false);
    });
});
