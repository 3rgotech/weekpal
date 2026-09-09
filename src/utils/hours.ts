import Event from "../data/event";
import Task from "../data/task";
import { CapacityLevel, capacityLevel } from "./capacity";
import { totalEstimate } from "./estimate";

/**
 * What is actually left of a day, and whether the work will fit in it.
 *
 * *(rt §5)* **Six tasks on a day with four hours of meetings is catastrophic; six on an empty day
 * is a Tuesday.** Counting tasks fires the same warning for both, so people learn that the
 * warning means nothing — which is worse than having no warning, because it also teaches them to
 * ignore the next one.
 *
 * This measures the thing the day is actually short of. Declared work against the hours no
 * meeting has already taken.
 *
 * It only ever *adds* to the existing count-based gauge; it never replaces it. Someone who never
 * estimates anything sees exactly the board they saw before, because a day with no estimates
 * yields no hours gauge at all.
 *
 * @see PROGRESS.md R18
 */

/** How long a working day is, before anything is booked into it. */
export const WORKING_DAY_CHOICES = [0, 4, 6, 7, 8, 9, 10, 12];

/** Minutes past midnight, or null for anything unparseable. `"09:30"` and `"09:30:00"` both work. */
export function minutesOfDay(hour: string | null | undefined): number | null {
    if (!hour) {
        return null;
    }

    const match = /^(\d{1,2}):(\d{2})/.exec(hour);

    if (!match) {
        return null;
    }

    const hours = Number(match[1]);
    const minutes = Number(match[2]);

    if (hours > 23 || minutes > 59) {
        return null;
    }

    return hours * 60 + minutes;
}

/**
 * How many minutes of a day are already spoken for.
 *
 * **Overlapping events are counted once.** Two meetings booked over each other take an hour of
 * your day, not two, and double-counting them would report a day as more than full while it
 * still had an afternoon in it — the fastest way to make this number untrustworthy.
 *
 * An all-day event contributes nothing rather than the whole day: "Family day" and "Q3 launch"
 * are both all-day, and only one of them means no work will happen. Guessing wrong in the
 * direction of *no work is possible* would blank out the board.
 */
export function bookedMinutes(events: Event[]): number {
    const spans: Array<[number, number]> = [];

    for (const event of events) {
        const start = minutesOfDay(event.startHour);
        const end = minutesOfDay(event.endHour);

        if (start === null || end === null || end <= start) {
            continue;
        }

        spans.push([start, end]);
    }

    if (spans.length === 0) {
        return 0;
    }

    spans.sort((a, b) => a[0] - b[0]);

    let booked = 0;
    let [openFrom, openTo] = spans[0];

    for (const [start, end] of spans.slice(1)) {
        if (start > openTo) {
            booked += openTo - openFrom;
            [openFrom, openTo] = [start, end];

            continue;
        }

        openTo = Math.max(openTo, end);
    }

    return booked + (openTo - openFrom);
}

export interface DayHours {
    /** Minutes of declared work. */
    planned: number;
    /** Minutes left after meetings. Never negative — a day booked solid has none, not fewer than none. */
    available: number;
    booked: number;
    unestimated: number;
    level: CapacityLevel;
}

/**
 * Measure a day, or decline to.
 *
 * Null in the two cases where an answer would be invented rather than derived: the working day
 * is not configured, or nothing on the day carries an estimate. **A day of unestimated tasks is
 * not an empty day**, and reporting it as `0h of 8h` would be the fake-zero lie in a different
 * costume.
 */
export function dayHours(
    tasks: Task[],
    events: Event[],
    workingDayHours: number,
): DayHours | null {
    if (!Number.isFinite(workingDayHours) || workingDayHours <= 0) {
        return null;
    }

    const total = totalEstimate(tasks);

    if (total.minutes <= 0) {
        return null;
    }

    const booked = bookedMinutes(events);
    const available = Math.max(0, workingDayHours * 60 - booked);

    return {
        planned: total.minutes,
        available,
        booked,
        unestimated: total.unestimated,
        /*
         * The same two-step scale the count-based warning uses, so a board never shows two
         * different vocabularies for "this is too much". A day with no time left is `over` the
         * moment anything is planned into it, which is exactly the finding.
         */
        level: capacityLevel(total.minutes, available === 0 ? 1 : available),
    };
}
