import { describe, expect, it } from "@jest/globals";
import { capacityLevel, normaliseDayCapacity, showsCapacity } from "../capacity";

describe("capacityLevel", () => {
    it("says nothing while a day is under its limit", () => {
        expect(capacityLevel(0, 6)).toBe("ok");
        expect(capacityLevel(5, 6)).toBe("ok");
    });

    it("warns from the limit, not after it", () => {
        // Six of six is a full day. Waiting for the seventh would mean the warning never appears
        // for anyone who plans exactly to their own number.
        expect(capacityLevel(6, 6)).toBe("at");
        expect(capacityLevel(11, 6)).toBe("at");
    });

    it("escalates at twice the limit", () => {
        expect(capacityLevel(12, 6)).toBe("over");
        expect(capacityLevel(30, 6)).toBe("over");
    });

    it("stays quiet when there is no limit", () => {
        // The default. A board nobody has configured must never colour a heading.
        expect(capacityLevel(100, 0)).toBe("ok");
        expect(capacityLevel(100, -3)).toBe("ok");
    });

    it("handles a limit of one, where full and over are one apart", () => {
        expect(capacityLevel(0, 1)).toBe("ok");
        expect(capacityLevel(1, 1)).toBe("at");
        expect(capacityLevel(2, 1)).toBe("over");
    });
});

describe("showsCapacity", () => {
    it("counts only once there is something to count against", () => {
        expect(showsCapacity(0)).toBe(false);
        expect(showsCapacity(6)).toBe(true);
    });
});

describe("normaliseDayCapacity", () => {
    it("keeps a usable limit", () => {
        expect(normaliseDayCapacity(6)).toBe(6);
        expect(normaliseDayCapacity("6")).toBe(6);
    });

    it("reads anything unusable as the feature being off", () => {
        expect(normaliseDayCapacity(0)).toBe(0);
        expect(normaliseDayCapacity(-2)).toBe(0);
        expect(normaliseDayCapacity(2.5)).toBe(0);
        expect(normaliseDayCapacity("six")).toBe(0);
        expect(normaliseDayCapacity(undefined)).toBe(0);
        expect(normaliseDayCapacity(null)).toBe(0);
    });
});
