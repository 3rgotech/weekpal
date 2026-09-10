import { describe, expect, it } from "@jest/globals";
import { ambientBadge, ambientTitle } from "../ambient";

/**
 * *(rt §9)* The tab is already open, so notify inside it. Push is reserved for a time *and* a
 * consequence; everything else is silent and in-tab.
 *
 * The rules worth pinning are the ones about staying quiet — a channel that always says something
 * is a channel nobody reads.
 */
describe("the tab title", () => {
    it("says nothing when there is nothing to say", () => {
        expect(ambientTitle({ leftovers: 0, dayDone: null })).toBe("WeekPal");
    });

    it("carries the count of what is waiting", () => {
        expect(ambientTitle({ leftovers: 2, dayDone: null })).toBe("(2) WeekPal");
    });

    it("caps the count like the board's own badge does", () => {
        // Past nine the exact number stops being a fact anybody acts on differently.
        expect(ambientTitle({ leftovers: 14, dayDone: null })).toBe("(9+) WeekPal");
    });

    it("announces a finished day", () => {
        expect(ambientTitle({ leftovers: 0, dayDone: "Tuesday done" })).toBe("WeekPal — Tuesday done");
    });

    it("lets a finished day beat a leftover count", () => {
        // Both are often true at once. The count will still be there tomorrow; the day is
        // finished only today, and greeting a good day with a nag teaches the wrong lesson.
        expect(ambientTitle({ leftovers: 5, dayDone: "Tuesday done" })).toBe("WeekPal — Tuesday done");
    });
});

describe("the favicon badge", () => {
    it("stays clean when there is nothing to report", () => {
        expect(ambientBadge({ leftovers: 0, dayDone: null })).toBe("none");
    });

    it("shows a dot for something waiting", () => {
        // Hollow, because it is a fact rather than an achievement.
        expect(ambientBadge({ leftovers: 3, dayDone: null })).toBe("dot");
    });

    it("goes solid for a finished day", () => {
        expect(ambientBadge({ leftovers: 0, dayDone: "Tuesday done" })).toBe("solid");
    });

    it("agrees with the title about which wins", () => {
        expect(ambientBadge({ leftovers: 5, dayDone: "Tuesday done" })).toBe("solid");
    });
});
