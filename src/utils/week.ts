import { Dayjs } from "dayjs";
import { DayOfWeek, LayoutPreset } from "../types";

/** An ISO weekday: Monday is 1, Sunday is 7. The numbering `tasks.day_of_week` is stored in. */
export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export const WEEKDAYS: Weekday[] = [1, 2, 3, 4, 5, 6, 7];

/** Monday to Friday, which is the working week the board has always drawn. */
export const DEFAULT_WORKING_DAYS: Weekday[] = [1, 2, 3, 4, 5];

export const DEFAULT_WEEK_STARTS_ON: Weekday = 1;

export function isWeekday(value: unknown): value is Weekday {
    return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 7;
}

/**
 * A stored working-day set, made safe to render from.
 *
 * Anything unusable falls back to Monday–Friday rather than to nothing: a board with no day
 * columns is not a board, and this value arrives from localStorage and from a free-form JSON
 * column on the server, neither of which the client can vouch for.
 */
export function normaliseWorkingDays(value: unknown): Weekday[] {
    if (!Array.isArray(value)) {
        return DEFAULT_WORKING_DAYS;
    }

    const days = [...new Set(value.map(Number).filter(isWeekday))].sort((a, b) => a - b);

    return days.length > 0 ? days : DEFAULT_WORKING_DAYS;
}

export function normaliseWeekStart(value: unknown): Weekday {
    const day = Number(value);

    return isWeekday(day) ? day : DEFAULT_WEEK_STARTS_ON;
}

/** Where ISO weekday `day` sits in a week that opens on `weekStartsOn` — 0 is the first column. */
export function dayOffset(day: Weekday, weekStartsOn: Weekday): number {
    return (day - weekStartsOn + 7) % 7;
}

/** The seven ISO weekdays in the order this user reads them. */
export function orderedWeekdays(weekStartsOn: Weekday): Weekday[] {
    return WEEKDAYS.map((_, index) => ((((weekStartsOn - 1 + index) % 7) + 1) as Weekday));
}

/** The date in the first column of the week `date` falls in. */
export function weekStart(date: Dayjs, weekStartsOn: Weekday): Dayjs {
    return date.subtract(dayOffset(date.isoWeekday() as Weekday, weekStartsOn), "day");
}

/**
 * The ISO Monday that names the displayed week containing `date`.
 *
 * Weeks are stored as ISO week codes (`2026w16`) and days as ISO weekday numbers, and none of
 * that changes when someone starts their week on a Sunday — only which column each day is drawn
 * in, and which dates those columns carry. So a displayed week is still identified by the Monday
 * inside it, and every stored `(week, day)` pair still addresses exactly one cell.
 *
 * The consequence worth knowing: under a Sunday start, ISO weekday 7 of week N is drawn as the
 * Sunday that *opens* week N rather than the one that closes it. That is what "the week starts on
 * Sunday" means, and it keeps the seven columns on seven consecutive dates — which rotating the
 * columns without re-dating them would not.
 */
export function weekAnchor(date: Dayjs, weekStartsOn: Weekday): Dayjs {
    return weekStart(date, weekStartsOn).add(dayOffset(1, weekStartsOn), "day");
}

/** The week code of the displayed week containing `date`. */
export function weekCodeOf(date: Dayjs, weekStartsOn: Weekday): string {
    return weekAnchor(date, weekStartsOn).format("GGGG[w]WW");
}

/** The date a day column carries, in the week whose first column is `start`. */
export function dateOfDay(start: Dayjs, day: Weekday, weekStartsOn: Weekday): Dayjs {
    return start.add(dayOffset(day, weekStartsOn), "day");
}

/**
 * The date a stored `(week code, ISO weekday)` pair is drawn on.
 *
 * The inverse of {@link weekCodeOf}, and the reason it exists separately from `Task.date`: that
 * getter answers with the ISO date, which is the same thing only for a week that starts on
 * Monday.
 */
export function dateOfWeekDay(isoMonday: Dayjs, day: Weekday, weekStartsOn: Weekday): Dayjs {
    return dateOfDay(isoMonday.subtract(dayOffset(1, weekStartsOn), "day"), day, weekStartsOn);
}

/**
 * Which day columns the board draws, and how.
 *
 * A working day gets a column to itself, full height. Days that are not worked share a column
 * with the ones next to them — which is the shape the board has always had for the weekend,
 * generalised: a Saturday you do not work is worth a glance, not a sixth of the screen.
 *
 * The columns stay in date order, so a run of non-working days sits where it falls in the week
 * rather than being swept to the end. That matters beyond looks: this order is also what `j` and
 * `k` walk and what `d` defers along, and a board whose keyboard jumps backwards through the week
 * is one nobody can follow. Work all seven days and there is nothing to group, so the week is
 * seven equal columns.
 */
export interface WeekColumn {
    /** The days drawn in this column. More than one only for days that are not worked. */
    days: Weekday[];
    working: boolean;
    /** Relative width against the other columns — 1 unless a preset widens some (Front-Loaded). */
    weight: number;
}

/**
 * The two-row presets' grid: the days and *this week* as cells of one grid, with *Some day*
 * spanning the full width underneath. `flow` is the reading order — along each row, or down
 * each column.
 */
export interface WeekGrid {
    cells: DayOfWeek[];
    columnCount: number;
    flow: "row" | "column";
}

export interface WeekLayout {
    columns: WeekColumn[];
    /** Every day drawn, in date order. */
    visible: Weekday[];
    /** How many columns wide the board is — never more than seven. */
    columnCount: number;
    /**
     * Set by the two-row presets, which draw the days and *this week* as one grid instead of a
     * row of columns over the two buckets. `columns` is still filled in (one per day) for
     * whatever does not draw the grid — the printed sheet keeps its own shape.
     */
    grid: WeekGrid | null;
}

/**
 * The board's shape, from the working days and the named preset (R14).
 *
 * - `compressed` — the board everyone has: a column per working day, the days off stacked into
 *   the columns between them.
 * - `classic` — a column for every day on the board, nothing stacked.
 * - `front` — the first three days in wide columns, the rest in a 2×2 grid (pairs stacked).
 * - `rows` / `columns` — the days and *this week* as a two-row grid, read along the rows or
 *   down the columns, with *Some day* the full width underneath.
 *
 * Working-day choice is free and every preset respects it; the presets are Pro, and the caller
 * passes `compressed` for an account without a plan.
 */
export function weekLayout(
    workingDays: Weekday[],
    showNonWorkingDays: boolean,
    weekStartsOn: Weekday,
    preset: LayoutPreset = "compressed",
): WeekLayout {
    const visible = orderedWeekdays(weekStartsOn)
        .filter((day) => showNonWorkingDays || workingDays.includes(day));

    const single = (day: Weekday, weight = 1): WeekColumn => ({ days: [day], working: workingDays.includes(day), weight });

    let columns: WeekColumn[];
    let grid: WeekGrid | null = null;

    if (preset === "classic" || preset === "rows" || preset === "columns") {
        columns = visible.map((day) => single(day));

        if (preset !== "classic") {
            const cells: DayOfWeek[] = [...visible.map((day) => `${day}` as DayOfWeek), "0"];
            grid = { cells, columnCount: Math.ceil(cells.length / 2), flow: preset === "rows" ? "row" : "column" };
        }
    } else if (preset === "front" && visible.length > 3) {
        // Three wide columns, then the rest paired top-and-bottom: Thu over Sat, Fri over Sun.
        // Paired in reading order across the pair of columns, so the grid reads left to right.
        const rest = visible.slice(3);
        const pairColumns = Math.ceil(rest.length / 2);
        const paired: WeekColumn[] = Array.from({ length: pairColumns }, (_, index) => {
            const days = [rest[index], rest[index + pairColumns]].filter((day): day is Weekday => day !== undefined);

            return { days, working: days.every((day) => workingDays.includes(day)), weight: 1 };
        });

        columns = [...visible.slice(0, 3).map((day) => single(day, 2)), ...paired];
    } else if (preset === "front") {
        columns = visible.map((day) => single(day));
    } else {
        columns = visible.reduce<WeekColumn[]>((built, day) => {
            const working = workingDays.includes(day);
            const last = built[built.length - 1];

            // Only non-working days join the column before them, and only another non-working one.
            if (!working && last !== undefined && !last.working) {
                last.days.push(day);

                return built;
            }

            return [...built, { days: [day], working, weight: 1 }];
        }, []);
    }

    return { columns, visible, columnCount: columns.length, grid };
}

/** The `grid-template-columns` for a row of columns, honouring their weights. */
export function columnTemplate(layout: WeekLayout): string {
    // Equal columns keep the short form the board has always used.
    if (layout.columns.every((column) => column.weight === 1)) {
        return `repeat(${layout.columnCount}, minmax(0, 1fr))`;
    }

    return layout.columns.map((column) => `minmax(0, ${column.weight}fr)`).join(" ");
}

/**
 * Turning a working day on, or off.
 *
 * Off is refused when it is the last one left: the board draws a column per working day, and no
 * columns at all is not a state worth being able to reach by tapping one button too many. Kept
 * here rather than in the settings modal so the rule can be reasoned about — and tested —
 * without a provider around it.
 */
export function toggleWorkingDay(workingDays: Weekday[], day: Weekday): Weekday[] {
    if (!workingDays.includes(day)) {
        return [...workingDays, day].sort((a, b) => a - b);
    }

    if (workingDays.length === 1) {
        return workingDays;
    }

    return workingDays.filter((working) => working !== day);
}

/**
 * The board's buckets in reading order: the day columns it is showing, then the two undated ones.
 *
 * What `j` and `k` walk, and what `d` defers along — both of which should follow the board rather
 * than a fixed Monday-to-Sunday, or they would step onto days nobody can see.
 */
export function boardDayOrder(layout: WeekLayout): DayOfWeek[] {
    return [...layout.visible.map((day) => `${day}` as DayOfWeek), "0", "someday"];
}
