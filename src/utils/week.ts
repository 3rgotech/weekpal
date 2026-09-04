import { Dayjs } from "dayjs";
import { DayOfWeek } from "../types";

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
}

export interface WeekLayout {
    columns: WeekColumn[];
    /** Every day drawn, in date order. */
    visible: Weekday[];
    /** How many columns wide the board is — never more than seven. */
    columnCount: number;
}

export function weekLayout(
    workingDays: Weekday[],
    showNonWorkingDays: boolean,
    weekStartsOn: Weekday,
): WeekLayout {
    const visible = orderedWeekdays(weekStartsOn)
        .filter((day) => showNonWorkingDays || workingDays.includes(day));

    const columns = visible.reduce<WeekColumn[]>((built, day) => {
        const working = workingDays.includes(day);
        const last = built[built.length - 1];

        // Only non-working days join the column before them, and only another non-working one.
        if (!working && last !== undefined && !last.working) {
            last.days.push(day);

            return built;
        }

        return [...built, { days: [day], working }];
    }, []);

    return { columns, visible, columnCount: columns.length };
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
