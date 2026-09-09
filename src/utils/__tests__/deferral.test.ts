import { describe, expect, it } from "@jest/globals";
import { deferralLabel, deferralTier, hasEscapeHatch } from "../deferral";

/**
 * How loudly a card admits it has been carried.
 *
 * Every threshold here was argued rather than picked, so each one is pinned: a mark that appears
 * too early is on every card and means nothing, and one that escalates without a ceiling turns a
 * heavy deferrer's whole board into a wall of maximum.
 */
describe("tiers", () => {
    it("says nothing about a task nobody has moved", () => {
        expect(deferralTier(0)).toBe("none");
    });

    it("says nothing about one deferral", () => {
        // Moving a task once is Tuesday. A badge here would be a badge on almost every card.
        expect(deferralTier(1)).toBe("none");
    });

    it("whispers at two", () => {
        expect(deferralTier(2)).toBe("muted");
    });

    it("fills at three and four", () => {
        expect(deferralTier(3)).toBe("pill");
        expect(deferralTier(4)).toBe("pill");
    });

    it("goes near-black from five", () => {
        expect(deferralTier(5)).toBe("heavy");
        expect(deferralTier(40)).toBe("heavy");
    });

    it("has exactly three visible steps", () => {
        // A fourth would have to escalate in size, and a badge that grows changes the card's
        // metrics — a column of cards whose heights disagree reads as damage.
        const tiers = new Set([0, 1, 2, 3, 4, 5, 9, 50].map(deferralTier));

        expect(tiers.size).toBe(4); // three marks, plus "no mark"
    });

    it("treats a missing count as none", () => {
        expect(deferralTier(null)).toBe("none");
        expect(deferralTier(undefined)).toBe("none");
    });
});

describe("the label", () => {
    it("counts up to the cap", () => {
        expect(deferralLabel(2)).toBe("2");
        expect(deferralLabel(6)).toBe("6");
    });

    it("stops counting after it", () => {
        // Otherwise the number keeps climbing and starts measuring the person rather than
        // telling them anything.
        expect(deferralLabel(7)).toBe("7+");
        expect(deferralLabel(23)).toBe("7+");
    });

    it("is a bare number, never a sentence about the reader", () => {
        // The mark describes the task. "You postponed this" is an accusation, and the board has
        // no business making one.
        expect(deferralLabel(3)).toMatch(/^\d+\+?$/);
    });
});

describe("the escape hatch", () => {
    it("stays shut below the top tier", () => {
        expect(hasEscapeHatch(4)).toBe(false);
    });

    it("opens at the top tier and stays open", () => {
        // Permanently, not on hover: the offer arrives when the task has earned it, rather than
        // when the user goes looking for it.
        expect(hasEscapeHatch(5)).toBe(true);
        expect(hasEscapeHatch(12)).toBe(true);
    });

    it("appears exactly where the heavy fill does", () => {
        // The badge becomes a button at the moment it turns near-black. Two thresholds that
        // drifted apart would mean a card that looks urgent and does nothing when pressed.
        for (const count of [0, 1, 2, 3, 4, 5, 6, 9]) {
            expect(hasEscapeHatch(count)).toBe(deferralTier(count) === "heavy");
        }
    });
});
