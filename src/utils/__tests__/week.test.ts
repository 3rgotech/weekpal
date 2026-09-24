import { describe, expect, it } from "@jest/globals";
import { getDayJs } from "../dayjs";
import {
    Weekday,
    boardDayOrder,
    dateOfDay,
    dateOfWeekDay,
    dayOffset,
    normaliseWeekStart,
    normaliseWorkingDays,
    orderedWeekdays,
    toggleWorkingDay,
    weekAnchor,
    weekCodeOf,
    weekLayout,
    columnTemplate,
    weekStart,
} from "../week";

const dayjs = getDayJs();

const MONDAY: Weekday = 1;
const SATURDAY: Weekday = 6;
const SUNDAY: Weekday = 7;

/** 2026w16 runs Monday 13 April to Sunday 19 April. */
const WEDNESDAY = dayjs("2026-04-15");

describe("orderedWeekdays", () => {
    it("runs Monday to Sunday for a Monday start", () => {
        expect(orderedWeekdays(MONDAY)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    });

    it("rotates so the chosen day leads", () => {
        expect(orderedWeekdays(SUNDAY)).toEqual([7, 1, 2, 3, 4, 5, 6]);
        expect(orderedWeekdays(SATURDAY)).toEqual([6, 7, 1, 2, 3, 4, 5]);
    });
});

describe("dayOffset", () => {
    it("is the column a day is drawn in", () => {
        expect(dayOffset(1, MONDAY)).toBe(0);
        expect(dayOffset(7, MONDAY)).toBe(6);
        expect(dayOffset(7, SUNDAY)).toBe(0);
        expect(dayOffset(6, SUNDAY)).toBe(6);
    });
});

describe("weekStart", () => {
    it("is the ISO Monday when the week starts on Monday", () => {
        expect(weekStart(WEDNESDAY, MONDAY).format("YYYY-MM-DD")).toBe("2026-04-13");
    });

    it("is the Sunday before when the week starts on Sunday", () => {
        expect(weekStart(WEDNESDAY, SUNDAY).format("YYYY-MM-DD")).toBe("2026-04-12");
    });

    it("is the day itself when the week starts on that day", () => {
        const sunday = dayjs("2026-04-19");

        expect(weekStart(sunday, SUNDAY).format("YYYY-MM-DD")).toBe("2026-04-19");
    });
});

/**
 * The rule the whole feature rests on: a week is still an ISO week whatever day it is drawn
 * from, so nothing stored ever has to move when this setting changes.
 */
describe("weekAnchor and weekCodeOf", () => {
    it("names the week by the Monday inside it", () => {
        expect(weekAnchor(WEDNESDAY, MONDAY).format("YYYY-MM-DD")).toBe("2026-04-13");
        expect(weekAnchor(WEDNESDAY, SUNDAY).format("YYYY-MM-DD")).toBe("2026-04-13");
        expect(weekAnchor(WEDNESDAY, SATURDAY).format("YYYY-MM-DD")).toBe("2026-04-13");
    });

    it("gives every start day the same code for a midweek date", () => {
        expect(weekCodeOf(WEDNESDAY, MONDAY)).toBe("2026w16");
        expect(weekCodeOf(WEDNESDAY, SUNDAY)).toBe("2026w16");
        expect(weekCodeOf(WEDNESDAY, SATURDAY)).toBe("2026w16");
    });

    it("moves a Sunday into the following week when the week opens on Sunday", () => {
        // Sunday 19 April closes ISO week 16 and opens the Sunday-start week that runs to
        // Saturday 25 — which is week 17. Without this, "today" would fall outside the week the
        // board is showing every Sunday.
        const sunday = dayjs("2026-04-19");

        expect(weekCodeOf(sunday, MONDAY)).toBe("2026w16");
        expect(weekCodeOf(sunday, SUNDAY)).toBe("2026w17");
    });
});

describe("dateOfDay", () => {
    it("lays the week out on seven consecutive dates, whatever it starts on", () => {
        for (const start of [MONDAY, SATURDAY, SUNDAY] as Weekday[]) {
            const first = weekStart(WEDNESDAY, start);
            const dates = orderedWeekdays(start)
                .map((day) => dateOfDay(first, day, start).format("YYYY-MM-DD"));

            expect(dates).toEqual([0, 1, 2, 3, 4, 5, 6]
                .map((offset) => first.add(offset, "day").format("YYYY-MM-DD")));
        }
    });

    it("puts every day on its own weekday", () => {
        const first = weekStart(WEDNESDAY, SUNDAY);

        expect(dateOfDay(first, 7, SUNDAY).isoWeekday()).toBe(7);
        expect(dateOfDay(first, 3, SUNDAY).format("YYYY-MM-DD")).toBe("2026-04-15");
    });
});

describe("dateOfWeekDay", () => {
    it("is the ISO date under a Monday start", () => {
        expect(dateOfWeekDay(dayjs("2026-04-13"), 7, MONDAY).format("YYYY-MM-DD"))
            .toBe("2026-04-19");
    });

    it("agrees with the week a date is filed under", () => {
        // Round trip: a date's week and weekday, drawn back out, is the date again.
        for (const start of [MONDAY, SATURDAY, SUNDAY] as Weekday[]) {
            for (let offset = 0; offset < 14; offset++) {
                const date = dayjs("2026-04-13").add(offset, "day");
                const monday = weekAnchor(date, start);
                const drawn = dateOfWeekDay(monday, date.isoWeekday() as Weekday, start);

                expect(drawn.format("YYYY-MM-DD")).toBe(date.format("YYYY-MM-DD"));
            }
        }
    });
});

describe("weekLayout", () => {
    const shape = (layout: ReturnType<typeof weekLayout>) =>
        layout.columns.map((column) => column.days);

    it("keeps the board the app has always drawn by default", () => {
        const layout = weekLayout([1, 2, 3, 4, 5], true, MONDAY);

        expect(shape(layout)).toEqual([[1], [2], [3], [4], [5], [6, 7]]);
        expect(layout.columnCount).toBe(6);
    });

    it("gives seven columns to someone who works every day", () => {
        const layout = weekLayout([1, 2, 3, 4, 5, 6, 7], true, MONDAY);

        expect(shape(layout)).toEqual([[1], [2], [3], [4], [5], [6], [7]]);
        expect(layout.columns.every((column) => column.working)).toBe(true);
        expect(layout.columnCount).toBe(7);
    });

    it("drops the days that are hidden", () => {
        const layout = weekLayout([1, 2, 3, 4, 5], false, MONDAY);

        expect(shape(layout)).toEqual([[1], [2], [3], [4], [5]]);
        expect(layout.visible).toEqual([1, 2, 3, 4, 5]);
        expect(layout.columnCount).toBe(5);
    });

    it("leaves every column where it falls in the week, never at the end", () => {
        // Sunday opens the week and Saturday closes it, and neither is worked — so the run of
        // non-working days is split by the working ones between them, not swept into one column.
        const layout = weekLayout([1, 2, 3, 4, 5], true, SUNDAY);

        expect(shape(layout)).toEqual([[7], [1], [2], [3], [4], [5], [6]]);
        expect(layout.visible).toEqual([7, 1, 2, 3, 4, 5, 6]);
    });

    it("groups whatever is not worked, not just a weekend", () => {
        const layout = weekLayout([2, 4], true, MONDAY);

        expect(shape(layout)).toEqual([[1], [2], [3], [4], [5, 6, 7]]);
        expect(layout.columns.map((column) => column.working))
            .toEqual([false, true, false, true, false]);
        expect(layout.columnCount).toBe(5);
    });

    it("never draws more than seven columns", () => {
        for (const start of [MONDAY, SATURDAY, SUNDAY] as Weekday[]) {
            const layout = weekLayout([1, 2, 3, 4, 5, 6, 7], true, start);

            expect(layout.columnCount).toBe(7);
        }
    });
});

describe("boardDayOrder", () => {
    it("ends with the two undated buckets", () => {
        expect(boardDayOrder(weekLayout([1, 2, 3, 4, 5], true, MONDAY)))
            .toEqual(["1", "2", "3", "4", "5", "6", "7", "0", "someday"]);
    });

    it("leaves out the days the board is not drawing", () => {
        expect(boardDayOrder(weekLayout([1, 2, 3, 4, 5], false, MONDAY)))
            .toEqual(["1", "2", "3", "4", "5", "0", "someday"]);
    });

    it("runs in the user's own week order", () => {
        expect(boardDayOrder(weekLayout([1, 2, 3, 4, 5], true, SUNDAY)))
            .toEqual(["7", "1", "2", "3", "4", "5", "6", "0", "someday"]);
    });
});

describe("toggleWorkingDay", () => {
    it("adds a day in week order, wherever it was tapped", () => {
        expect(toggleWorkingDay([1, 2, 3, 4, 5], 7)).toEqual([1, 2, 3, 4, 5, 7]);
        expect(toggleWorkingDay([2, 5], 3)).toEqual([2, 3, 5]);
    });

    it("removes a day", () => {
        expect(toggleWorkingDay([1, 2, 3, 4, 5], 5)).toEqual([1, 2, 3, 4]);
    });

    it("refuses to remove the last one, which would leave no board", () => {
        expect(toggleWorkingDay([3], 3)).toEqual([3]);
    });
});

describe("normalising what came out of storage", () => {
    it("sorts and de-duplicates a working week", () => {
        expect(normaliseWorkingDays([7, 3, 1, 3])).toEqual([1, 3, 7]);
    });

    it("falls back to the working week rather than to no board at all", () => {
        expect(normaliseWorkingDays([])).toEqual([1, 2, 3, 4, 5]);
        expect(normaliseWorkingDays([0, 8, 99])).toEqual([1, 2, 3, 4, 5]);
        expect(normaliseWorkingDays("every day")).toEqual([1, 2, 3, 4, 5]);
        expect(normaliseWorkingDays(undefined)).toEqual([1, 2, 3, 4, 5]);
    });

    it("keeps a week start only if it is a day", () => {
        expect(normaliseWeekStart(7)).toBe(7);
        expect(normaliseWeekStart(0)).toBe(1);
        expect(normaliseWeekStart("sunday")).toBe(1);
        expect(normaliseWeekStart(undefined)).toBe(1);
    });
});

describe("named layouts (R14)", () => {
    const workweek = [1, 2, 3, 4, 5] as const;
    const days = (layout: ReturnType<typeof weekLayout>) => layout.columns.map((column) => column.days);

    it("compressed stacks the days off together, as the board always has", () => {
        expect(days(weekLayout([...workweek], true, 1, "compressed"))).toEqual([[1], [2], [3], [4], [5], [6, 7]]);
    });

    it("classic gives every day a column of its own", () => {
        expect(days(weekLayout([...workweek], true, 1, "classic"))).toEqual([[1], [2], [3], [4], [5], [6], [7]]);
    });

    it("front-loaded widens the first three days and pairs the rest in a 2×2 grid", () => {
        const layout = weekLayout([...workweek], true, 1, "front");

        expect(days(layout)).toEqual([[1], [2], [3], [4, 6], [5, 7]]);
        expect(layout.columns.map((column) => column.weight)).toEqual([2, 2, 2, 1, 1]);
        expect(columnTemplate(layout)).toBe("minmax(0, 2fr) minmax(0, 2fr) minmax(0, 2fr) minmax(0, 1fr) minmax(0, 1fr)");
    });

    it("front-loaded with three days or fewer is simply a column each", () => {
        expect(days(weekLayout([1, 2, 3], false, 1, "front"))).toEqual([[1], [2], [3]]);
    });

    it("two rows puts the days and this week in one grid, read along the rows or down the columns", () => {
        const rows = weekLayout([...workweek], true, 1, "rows");
        const columns = weekLayout([...workweek], true, 1, "columns");

        expect(rows.grid).toEqual({ cells: ["1", "2", "3", "4", "5", "6", "7", "0"], columnCount: 4, flow: "row" });
        expect(columns.grid?.flow).toBe("column");
    });

    it("two rows shrinks to fit a shorter week", () => {
        expect(weekLayout([...workweek], false, 1, "rows").grid?.columnCount).toBe(3);
    });

    it("respects the chosen working days and week start in every preset", () => {
        expect(weekLayout([2, 3, 4, 5, 6], false, 2, "classic").visible).toEqual([2, 3, 4, 5, 6]);
        expect(weekLayout([...workweek], true, 1, "compressed").grid).toBeNull();
    });
});
