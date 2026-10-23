import { afterEach, describe, expect, it } from "@jest/globals";
import { getDayJs, weekCodeToDate } from "../dayjs";

describe("getDayJs", () => {
    afterEach(() => {
        getDayJs("en");
    });

    it("keeps the board's language when called without one", () => {
        const french = getDayJs("fr");

        // What a week change does: name the week's Monday, with no language in hand.
        weekCodeToDate("2026w43");
        getDayJs();

        expect(french().isoWeekday(1).format("dd")).toBe("Lu");
    });
});
