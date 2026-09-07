import { describe, expect, it } from "@jest/globals";
import { capacityLevel, normaliseDayCapacity, readGauges, showsCapacity, worstGauge } from "../capacity";

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

describe("choosing what a column says", () => {
    const gauge = (key: string, planned: number, limit: number, label: string | null = key) =>
        ({ key, label, planned, limit });

    it("ignores anything without a limit", () => {
        // A category with no limit is never counted against anything — that is what makes
        // "cap my work tasks, ignore my hobbies" work.
        expect(readGauges([gauge("hobby", 40, 0), gauge("work", 1, 6)]).map((g) => g.key))
            .toEqual(["work"]);
    });

    it("surfaces the worst level, not the first", () => {
        const worst = worstGauge([
            gauge("day", 6, 6),        // at
            gauge("work", 13, 6),      // over
        ]);

        expect(worst?.key).toBe("work");
        expect(worst?.level).toBe("over");
    });

    it("breaks a tie on how far past the number it is", () => {
        const worst = worstGauge([
            gauge("study", 7, 6),
            gauge("work", 11, 6),
        ]);

        expect(worst?.key).toBe("work");
    });

    it("still reports a day that is merely full", () => {
        expect(worstGauge([gauge("day", 2, 6)])?.level).toBe("ok");
    });

    it("says nothing when nothing is limited", () => {
        expect(worstGauge([gauge("day", 12, 0)])).toBeNull();
        expect(worstGauge([])).toBeNull();
    });
});
