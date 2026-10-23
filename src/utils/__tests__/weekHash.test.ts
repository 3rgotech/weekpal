import { describe, expect, it } from "@jest/globals";
import { dateOfWeekCode, weekFromHash } from "../weekHash";
import { getDayJs } from "../dayjs";

describe("the week in the address", () => {
    it("reads a week code", () => {
        expect(weekFromHash("#2026w43")).toBe("2026w43");
    });

    it("ignores anything that is not one", () => {
        expect(weekFromHash("")).toBeNull();
        expect(weekFromHash("#pricing")).toBeNull();
        expect(weekFromHash("#2026w4")).toBeNull();
    });

    it("refuses a week the year does not have", () => {
        expect(weekFromHash("#2026w00")).toBeNull();
        expect(weekFromHash("#2026w54")).toBeNull();
        // 2026 has 53 ISO weeks; 2027 does not.
        expect(weekFromHash("#2026w53")).toBe("2026w53");
        expect(weekFromHash("#2027w53")).toBeNull();
    });

    it("opens another week on its Monday, and this week on today", () => {
        const today = getDayJs()();
        const thisWeek = today.format("GGGG[w]WW");

        expect(dateOfWeekCode("2026w43", "2026w10").format("YYYY-MM-DD")).toBe("2026-10-19");
        expect(dateOfWeekCode(thisWeek, thisWeek).isSame(today, "day")).toBe(true);
    });
});
