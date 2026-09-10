import { describe, expect, it } from "@jest/globals";
import { availableMoves, dropOrder, moveTarget, relieveTarget } from "../taskMoves";
import { getDayJs } from "../dayjs";
import { SomedayTask, WeeklyTask } from "../../data/task";

/**
 * The menu's move targets, pinned to a fixed "now".
 *
 * Wednesday 26 August 2026 is ISO week 2026w35, so a move to next Monday lands in 2026w36 — the
 * kind of boundary the week code exists to get right and a naive `+7 days` gets wrong.
 */
const NOW = getDayJs()("2026-08-26");

const weekly = (weekCode: string, dayOfWeek: string) => new WeeklyTask({
    title: "Ring the plumber",
    weekCode,
    dayOfWeek,
});

describe("where a move sends a task", () => {
    it("puts today on today, and tomorrow on tomorrow", () => {
        const task = weekly("2026w30", "2");

        expect(moveTarget(task, "today", NOW)).toEqual({ weekCode: "2026w35", dayOfWeek: "3" });
        expect(moveTarget(task, "tomorrow", NOW)).toEqual({ weekCode: "2026w35", dayOfWeek: "4" });
    });

    it("crosses into the following week for next Monday", () => {
        const task = weekly("2026w35", "3");

        expect(moveTarget(task, "nextMonday", NOW)).toEqual({ weekCode: "2026w36", dayOfWeek: "1" });
    });

    it("counts next week off the task's own week, not off today", () => {
        // A task abandoned five weeks ago moves to six weeks ago, not to next week: the item says
        // "give it one more week", and reading it as "next week from now" would silently turn a
        // nudge into a rescue.
        const task = weekly("2026w30", "2");

        expect(moveTarget(task, "nextWeekSameDay", NOW)).toEqual({ weekCode: "2026w31", dayOfWeek: "2" });
    });

    it("advances the undated bucket as a bucket", () => {
        // Day 0 has no weekday: its `date` would resolve to the Sunday before the week, so a move
        // built on that date would land the task in the wrong week entirely.
        const task = weekly("2026w30", "0");

        expect(moveTarget(task, "nextWeekSameDay", NOW)).toEqual({ weekCode: "2026w31", dayOfWeek: "0" });
    });

    it("lands this week in the undated bucket, and some day nowhere", () => {
        const task = weekly("2026w30", "2");

        expect(moveTarget(task, "thisWeek", NOW)).toEqual({ weekCode: "2026w35", dayOfWeek: "0" });
        expect(moveTarget(task, "someday", NOW)).toEqual({ weekCode: null, dayOfWeek: null });
    });
});

describe("which moves are worth offering", () => {
    it("offers tomorrow to a task already on today, and today to every other", () => {
        expect(availableMoves(weekly("2026w35", "3"), NOW)).toContain("tomorrow");
        expect(availableMoves(weekly("2026w35", "3"), NOW)).not.toContain("today");

        expect(availableMoves(weekly("2026w35", "5"), NOW)).toContain("today");
        expect(availableMoves(weekly("2026w35", "5"), NOW)).not.toContain("tomorrow");
    });

    it("leaves out the moves a someday task cannot make", () => {
        const moves = availableMoves(new SomedayTask({ title: "Flip mattress" }), NOW);

        // No week to advance from, and it is already where "some day" would put it.
        expect(moves).not.toContain("nextWeekSameDay");
        expect(moves).not.toContain("someday");
        expect(moves).toEqual(["today", "nextMonday", "thisWeek"]);
    });

    it("leaves out this week for a task already sitting in it", () => {
        expect(availableMoves(weekly("2026w35", "0"), NOW)).not.toContain("thisWeek");
        // The same bucket a week ago is a real move, so it stays.
        expect(availableMoves(weekly("2026w34", "0"), NOW)).toContain("thisWeek");
    });
});

describe("making room in a column that is over its limit", () => {
    it("hands a weekday's task to the undated bucket, keeping its week", () => {
        // Out of the day, not out of the week: the day columns drain into "this week".
        expect(relieveTarget(weekly("2026w35", "3"), "2026w35"))
            .toEqual({ weekCode: "2026w35", dayOfWeek: "0" });
    });

    it("hands the undated bucket's task to Some day, which is the next thing out", () => {
        expect(relieveTarget(weekly("2026w35", "0"), "2026w35"))
            .toEqual({ weekCode: null, dayOfWeek: null });
    });

    it("promotes a Some day task inwards, since nothing is further out", () => {
        // What makes a shortlist a shortlist rather than a pile.
        expect(relieveTarget(new SomedayTask({ title: "Learn the cello" }), "2026w35"))
            .toEqual({ weekCode: "2026w35", dayOfWeek: "0" });
    });
});

describe("where a drop lands, in a single file", () => {
    // A card 40px tall sitting at y=100, so its middle is 120. One column, so every card shares
    // the same horizontal centre — which is what makes the vertical axis the only one that means
    // anything here.
    const over = { top: 100, left: 0, width: 200, height: 40 };
    const ORDER = 5;
    const at = (activeTop: number) =>
        dropOrder({ top: activeTop, left: 0, width: 200, height: 40 }, over, ORDER);

    it("goes before the card while the dragged one is above its middle", () => {
        expect(at(100)).toBe(5);
        expect(at(119)).toBe(5);
    });

    it("goes after the card once past its middle", () => {
        expect(at(121)).toBe(6);
        expect(at(140)).toBe(6);
    });

    it("uses the middle, not the bottom edge", () => {
        // The bug this replaces: the old rule asked whether the dragged card had cleared the
        // target's *bottom*, so a whole row of travel still counted as "above" and a task aimed
        // between the second and third landed between the first and second.
        const justPastMiddle = over.top + over.height / 2 + 1;

        expect(at(justPastMiddle)).toBe(6);
        // Under that rule this same position was still "above" — it needed to pass 140.
        expect(justPastMiddle).toBeLessThan(over.top + over.height);
    });

    it("treats the first card like any other", () => {
        const first = { top: 100, left: 0, width: 200, height: 40 };

        expect(dropOrder({ top: 105, left: 0, width: 200, height: 40 }, first, 0)).toBe(0);
        expect(dropOrder({ top: 125, left: 0, width: 200, height: 40 }, first, 0)).toBe(1);
    });

    it("survives a dragged card taller than the one under it", () => {
        // Cards are as tall as their titles make them, so a three-line task dropped onto a
        // one-line one is the ordinary case rather than an edge one.
        const tall = { top: 100, left: 0, width: 200, height: 120 };

        expect(dropOrder(tall, over, ORDER)).toBe(6);
    });
});

describe("where a drop lands, across a grid", () => {
    /*
     * The undated buckets lay their cards out in a grid on a wide screen, so two cards can share
     * a top edge and be separated only horizontally. A vertical-only rule reads every drop onto a
     * right-hand neighbour as "still above it" and inserts before, whichever way the card was
     * actually dragged — which is the failure this half exists to prevent.
     */
    const ROW_Y = 100;
    const card = (left: number, top = ROW_Y) => ({ top, left, width: 180, height: 40 });

    const middle = card(200);
    const ORDER = 5;

    it("goes after the card when dragged past it to the right", () => {
        expect(dropOrder(card(300), middle, ORDER)).toBe(6);
    });

    it("goes before the card when dragged past it to the left", () => {
        expect(dropOrder(card(100), middle, ORDER)).toBe(5);
    });

    it("still uses the vertical axis for a card on another row", () => {
        // Reading order is rows first: anything on the row below comes after everything on this
        // one, however far to the left it sits.
        expect(dropOrder(card(0, ROW_Y + 60), middle, ORDER)).toBe(6);
        expect(dropOrder(card(600, ROW_Y - 60), middle, ORDER)).toBe(5);
    });

    it("reads a card sitting exactly on another as going before it", () => {
        // Neither past it nor above it. "Before" is as good an answer as "after", and it is the
        // one the single-file rule has always given.
        expect(dropOrder(card(200), middle, ORDER)).toBe(5);
    });
});
