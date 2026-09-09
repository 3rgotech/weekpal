import { describe, expect, it } from "@jest/globals";
import {
    ESTIMATE_CHIPS,
    chipLabel,
    formatEstimate,
    formatTotal,
    totalEstimate,
} from "../estimate";
import { WeeklyTask } from "../../data/task";

/**
 * *(rt §5)* An estimate is a guess and should look like one; absence is information.
 *
 * Both rules are easy to break by accident — a `?? 0` in the wrong place turns "no guess" into
 * "no work", and the capacity maths inherits the lie — so they are pinned here rather than
 * trusted to review.
 */
const task = (n: number, estimatedMinutes: number | null = null) => new WeeklyTask({
    id: `01930000-0000-7000-8000-00000000000${n}`,
    title: `Task ${n}`,
    weekCode: "2026w37",
    dayOfWeek: "2",
    order: n,
    subtasks: [],
    estimatedMinutes,
});

describe("a single estimate", () => {
    it("shows nothing at all when there is no guess", () => {
        // Not "0m", not a dash, not a placeholder. Flagging the unestimated punishes the common
        // case — a task somebody typed in four seconds and never intends to size.
        expect(formatEstimate(null)).toBeNull();
        expect(formatEstimate(undefined)).toBeNull();
        expect(formatEstimate(0)).toBeNull();
    });

    it("reads in minutes below the hour", () => {
        expect(formatEstimate(5)).toBe("~5m");
        expect(formatEstimate(45)).toBe("~45m");
    });

    it("reads in hours above it", () => {
        expect(formatEstimate(60)).toBe("~1h");
        expect(formatEstimate(240)).toBe("~4h");
    });

    it("rounds to the nearest half hour rather than to the minute", () => {
        // 107 minutes is "~2h": wrong by thirteen minutes and right about what it is, which is
        // the trade this whole feature makes.
        expect(formatEstimate(90)).toBe("~1.5h");
        // 100 is nearer 90 than 120, so it rounds down — the nearest half hour, not the nearest
        // hour up.
        expect(formatEstimate(100)).toBe("~1.5h");
        expect(formatEstimate(107)).toBe("~2h");
    });

    it("never claims a precision nobody has", () => {
        // The thing being avoided is "1h 47m". Once the board looks precise, people argue with
        // it instead of using it.
        for (const minutes of [61, 77, 107, 193, 431]) {
            expect(formatEstimate(minutes)).toMatch(/^~\d+(\.5)?h$/);
        }
    });

    it("always says it is approximate", () => {
        expect(formatEstimate(30)?.startsWith("~")).toBe(true);
        expect(formatEstimate(120)?.startsWith("~")).toBe(true);
    });
});

describe("the chips", () => {
    it("offers six, small end included", () => {
        // Small tasks are the ones that evaporate from memory; putting five minutes on the board
        // is capture rather than estimation.
        expect([...ESTIMATE_CHIPS]).toEqual([5, 15, 30, 60, 120, 240]);
    });

    it("labels them exactly, with no tilde", () => {
        // A chip is a value being chosen, not a guess being reported.
        expect(chipLabel(5)).toBe("5m");
        expect(chipLabel(30)).toBe("30m");
        expect(chipLabel(60)).toBe("1h");
        expect(chipLabel(240)).toBe("4h");
    });
});

describe("adding up a day", () => {
    it("counts the tasks that carry no guess", () => {
        const total = totalEstimate([task(1, 30), task(2), task(3, 60), task(4)]);

        expect(total.minutes).toBe(90);
        expect(total.unestimated).toBe(2);
        expect(total.partial).toBe(true);
    });

    it("marks a partial total with a plus", () => {
        // The `+` is doing real work: a day with three unestimated tasks does not take an hour
        // and a half, it takes *at least* that. Dropping it turns a floor into a claim.
        expect(formatTotal(totalEstimate([task(1, 60), task(2, 30), task(3)]))).toBe("~1.5h+");
    });

    it("states a complete total plainly", () => {
        expect(formatTotal(totalEstimate([task(1, 60), task(2, 60)]))).toBe("~2h");
    });

    it("says nothing about a day nobody has estimated", () => {
        // "0h planned · 6 unestimated" would be a reproach for not having filled something in,
        // which is exactly the nudge this refuses to make.
        expect(formatTotal(totalEstimate([task(1), task(2)]))).toBeNull();
    });

    it("says nothing about an empty day", () => {
        expect(formatTotal(totalEstimate([]))).toBeNull();
    });

    it("treats a zero estimate as no estimate", () => {
        // A fake zero is the lie the capacity maths would inherit.
        const total = totalEstimate([task(1, 0), task(2, 60)]);

        expect(total.unestimated).toBe(1);
        expect(total.minutes).toBe(60);
    });
});
