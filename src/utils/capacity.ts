/**
 * How full a day is against what its owner said they can take.
 *
 * `at` is the day being full, `over` is it being twice full — two steps rather than a gradient,
 * because the point is to be noticed while planning, not to be read precisely.
 */
export type CapacityLevel = "ok" | "at" | "over";

/** What the settings modal offers for a day. 0 is the setting turned off, and is the default. */
export const DAY_CAPACITIES = [0, 3, 4, 5, 6, 7, 8, 10, 12];

/**
 * What it offers for Some day — the same scale, carried further.
 *
 * A shortlist holds more than a Tuesday does before it stops being a shortlist, and the number
 * people reach for here is a round one rather than a considered one.
 */
export const SOMEDAY_LIMITS = [0, 5, 10, 15, 20, 25, 30, 40, 50];

/**
 * The warning a day column should carry.
 *
 * Deliberately soft: nothing is refused, nothing is moved, and the count is not a quota. A day
 * that is over is still a day you can add to — the board's job here is to say "you have planned
 * thirteen things for Wednesday" at the moment you are doing it, which is the only moment the
 * answer is still cheap to change.
 *
 * A limit of 0 — or anything below it — is the feature switched off, and never warns.
 */
export function capacityLevel(planned: number, limit: number): CapacityLevel {
    if (limit <= 0) {
        return "ok";
    }

    if (planned >= limit * 2) {
        return "over";
    }

    return planned >= limit ? "at" : "ok";
}

/**
 * A stored limit made safe to render from.
 *
 * Arrives from localStorage and from a free-form JSON column, so anything that is not a
 * non-negative whole number is read as the feature being off rather than as a broken board.
 */
export function normaliseDayCapacity(value: unknown): number {
    const limit = Number(value);

    return Number.isInteger(limit) && limit > 0 ? limit : 0;
}

/**
 * Whether a day should show its count at all.
 *
 * Only once a limit exists: a bare number on every column all week is clutter for someone who
 * never asked to be counted, and the count only means anything against something.
 */
export function showsCapacity(limit: number): boolean {
    return limit > 0;
}
