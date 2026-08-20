import { describe, expect, it } from "@jest/globals";
import { subtaskProgressLabel } from "../settings";
import { WeeklyTask } from "../../data/task";

/**
 * The `subtaskDisplay` setting has been on both sides of the API since contract v1 with nothing
 * reading it. This is the reading.
 */
describe("subtaskProgressLabel", () => {
    it("shows a rounded percentage", () => {
        expect(subtaskProgressLabel("percentage", 1, 3)).toBe("33%");
        expect(subtaskProgressLabel("percentage", 2, 3)).toBe("67%");
        expect(subtaskProgressLabel("percentage", 3, 3)).toBe("100%");
    });

    it("shows a count", () => {
        expect(subtaskProgressLabel("number", 2, 5)).toBe("2/5");
    });

    it("shows nothing when the setting is off", () => {
        expect(subtaskProgressLabel("none", 2, 5)).toBeNull();
    });

    it("shows nothing for a task with no subtasks, whatever the setting", () => {
        // Otherwise every single-line task on the board carries a meaningless 0% or 0/0.
        expect(subtaskProgressLabel("percentage", 0, 0)).toBeNull();
        expect(subtaskProgressLabel("number", 0, 0)).toBeNull();
    });
});

describe("Task.subtaskProgress", () => {
    it("counts the ticked ones", () => {
        const task = new WeeklyTask({
            title: "Refit the kitchen",
            weekCode: "2026w30",
            dayOfWeek: "1",
            subtasks: [
                { title: "Measure", completed: true },
                { title: "Order units", completed: true },
                { title: "Fit them", completed: false },
            ],
        });

        expect(task.subtaskProgress).toEqual({ done: 2, total: 3 });
    });

    it("reports nothing done for a task without subtasks", () => {
        const task = new WeeklyTask({ title: "Post the letter", weekCode: "2026w30", dayOfWeek: "1" });

        expect(task.subtaskProgress).toEqual({ done: 0, total: 0 });
    });

    it("keeps subtasks as an array through a round trip, not a JSON string", () => {
        // The old adapter stringified this into a JSON body field, so the server stored a string
        // where it expected a list (API-CONTRACT.md §4).
        const task = new WeeklyTask({
            title: "Ship it",
            weekCode: "2026w30",
            dayOfWeek: "2",
            subtasks: [{ title: "Write tests", completed: false }],
        });

        expect(Array.isArray(task.toApiPayload().subtasks)).toBe(true);
        expect(task.toApiPayload().subtasks).toEqual([{ title: "Write tests", completed: false }]);
    });
});
