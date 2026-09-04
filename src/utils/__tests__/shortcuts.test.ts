import { describe, expect, it } from "@jest/globals";
import { SomedayTask, WeeklyTask } from "../../data/task";
import { boardOrder, deferTarget, isTypingTarget, nextTask } from "../shortcuts";
import { boardDayOrder, weekLayout } from "../week";

const weekly = (title: string, dayOfWeek: string, order: number) =>
    new WeeklyTask({ id: title, title, weekCode: "2026w10", dayOfWeek, order });

describe("the order the keys walk the board in", () => {
    it("reads the week the way the board lays it out", () => {
        const tasks = [
            new SomedayTask({ id: "s", title: "s", order: 0 }),
            weekly("undated", "0", 0),
            weekly("tuesday", "2", 0),
            weekly("monday", "1", 0),
        ];

        expect(boardOrder(tasks).map((task) => task.title))
            .toEqual(["monday", "tuesday", "undated", "s"]);
    });

    it("keeps each day in its own order", () => {
        const tasks = [weekly("second", "1", 1), weekly("first", "1", 0)];

        expect(boardOrder(tasks).map((task) => task.title)).toEqual(["first", "second"]);
    });

    it("follows the board when the week starts somewhere other than Monday", () => {
        const order = boardDayOrder(weekLayout([1, 2, 3, 4, 5], true, 7));
        const tasks = [weekly("monday", "1", 0), weekly("sunday", "7", 0)];

        expect(boardOrder(tasks, order).map((task) => task.title))
            .toEqual(["sunday", "monday"]);
    });

    it("never reaches a task on a day the board is not drawing", () => {
        const order = boardDayOrder(weekLayout([1, 2, 3, 4, 5], false, 1));
        const tasks = [weekly("monday", "1", 0), weekly("saturday", "6", 0)];

        expect(boardOrder(tasks, order).map((task) => task.title)).toEqual(["monday"]);
    });
});

describe("moving the selection", () => {
    const ordered = [weekly("a", "1", 0), weekly("b", "1", 1), weekly("c", "2", 0)];

    it("starts at the near end when nothing is selected", () => {
        expect(nextTask(ordered, null, 1)?.title).toBe("a");
        expect(nextTask(ordered, null, -1)?.title).toBe("c");
    });

    it("steps forwards and backwards", () => {
        expect(nextTask(ordered, "a", 1)?.title).toBe("b");
        expect(nextTask(ordered, "b", -1)?.title).toBe("a");
    });

    it("stops at the ends rather than wrapping around", () => {
        // Wrapping from Sunday back to Monday reads as a jump to somewhere else entirely.
        expect(nextTask(ordered, "c", 1)?.title).toBe("c");
        expect(nextTask(ordered, "a", -1)?.title).toBe("a");
    });

    it("has nothing to select on an empty board", () => {
        expect(nextTask([], null, 1)).toBeNull();
    });
});

describe("where a deferred task goes", () => {
    it("moves a weekday task to the next day of the same week", () => {
        expect(deferTarget(weekly("a", "3", 0))).toEqual({ weekCode: "2026w10", dayOfWeek: "4" });
    });

    it("sends Sunday to Some day, since the week has no next day", () => {
        expect(deferTarget(weekly("a", "7", 0))).toEqual({ weekCode: null, dayOfWeek: null });
    });

    it("sends the undated bucket to Some day too", () => {
        expect(deferTarget(weekly("a", "0", 0))).toEqual({ weekCode: null, dayOfWeek: null });
    });

    it("leaves a Some day task where it is, having nowhere further to go", () => {
        expect(deferTarget(new SomedayTask({ id: "s", title: "s" }))).toBeNull();
    });

    it("skips the days the board is not drawing", () => {
        // Friday with the weekend hidden has no Saturday to fall onto, so it falls out of the
        // week — deferring onto a column nobody can see would lose the task in plain sight.
        const order = boardDayOrder(weekLayout([1, 2, 3, 4, 5], false, 1));

        expect(deferTarget(weekly("a", "5", 0), order))
            .toEqual({ weekCode: null, dayOfWeek: null });
        expect(deferTarget(weekly("a", "1", 0), order))
            .toEqual({ weekCode: "2026w10", dayOfWeek: "2" });
    });

    it("follows the user's week rather than the calendar's", () => {
        // Under a Sunday start, Sunday opens the week: it defers to Monday, and Saturday is the
        // day with nowhere left to go.
        const order = boardDayOrder(weekLayout([1, 2, 3, 4, 5], true, 7));

        expect(deferTarget(weekly("a", "7", 0), order))
            .toEqual({ weekCode: "2026w10", dayOfWeek: "1" });
        expect(deferTarget(weekly("a", "6", 0), order))
            .toEqual({ weekCode: null, dayOfWeek: null });
    });
});

describe("keystrokes that belong to something else", () => {
    it("stands down inside a text field", () => {
        expect(isTypingTarget(document.createElement("input"))).toBe(true);
        expect(isTypingTarget(document.createElement("textarea"))).toBe(true);
        expect(isTypingTarget(document.createElement("select"))).toBe(true);
    });

    it("stands down inside anything editable", () => {
        const editable = document.createElement("div");
        editable.contentEditable = "true";
        // jsdom does not derive `isContentEditable` from the attribute.
        Object.defineProperty(editable, "isContentEditable", { value: true });

        expect(isTypingTarget(editable)).toBe(true);
    });

    it("acts on the board otherwise", () => {
        expect(isTypingTarget(document.createElement("div"))).toBe(false);
        expect(isTypingTarget(null)).toBe(false);
    });
});
