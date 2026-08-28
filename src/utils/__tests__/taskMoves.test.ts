import { describe, expect, it } from "@jest/globals";
import { availableMoves, moveTarget } from "../taskMoves";
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
