import { describe, expect, it } from "@jest/globals";
import { getDayJs, weekCodeToDate } from "../dayjs";

/**
 * Week codes used to be parsed with `dayjs(code, "GGGG[w]WW")`, which dayjs does not support: it
 * ignored the code, returned **today**, and reported `isValid()`. Every week resolved to the
 * current one, so a task's date was right only in the week you were already looking at.
 */
describe("weekCodeToDate", () => {
    it("finds the Monday of a week in the middle of a year", () => {
        expect(weekCodeToDate("2026w30").format("YYYY-MM-DD")).toBe("2026-07-20");
    });

    it("does not depend on today", () => {
        // The old form inherited today's month and year, so this was the failing case: a code far
        // from now came back as now.
        const far = weekCodeToDate("2020w02");

        expect(far.format("YYYY-MM-DD")).toBe("2020-01-06");
        expect(far.isSame(getDayJs()(), "year")).toBe(false);
    });

    it("puts week 1 where ISO puts it, even when it starts in December", () => {
        // 2025's first ISO week begins on 30 December 2024 — the whole reason the format carries
        // an ISO year rather than a calendar one.
        expect(weekCodeToDate("2025w01").format("YYYY-MM-DD")).toBe("2024-12-30");
        expect(weekCodeToDate("2027w01").format("YYYY-MM-DD")).toBe("2027-01-04");
    });

    it("round-trips whatever the app formatted", () => {
        const dayjs = getDayJs();
        const code = dayjs("2026-12-31").format("GGGG[w]WW");

        // 1 January 2026 is a Thursday, so ISO 2026 runs to 53 weeks and the week of 31 December
        // is 2026w53 — which starts in December and ends in January. Week 53 exists at all only
        // in the ISO calendar, and is the case a "52 weeks in a year" parser gets wrong.
        expect(code).toBe("2026w53");
        expect(weekCodeToDate(code).format("YYYY-MM-DD")).toBe("2026-12-28");
    });
});
