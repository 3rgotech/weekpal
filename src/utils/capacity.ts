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
 * Tick or untick one category in the set counted toward the day's limit.
 *
 * The set is stored the way the board's filter stores its own: **empty means every category**.
 * That keeps the default honest — a limit nobody has narrowed counts everything — but it means
 * the first untick has to expand to the full set before removing one, or the change would read
 * as its own opposite.
 *
 * Unticking the last one is refused. Counting nothing is a limit that can never be reached, and
 * it is also indistinguishable from counting everything once stored.
 */
export function toggleCountedCategory(counted: string[], id: string, all: string[]): string[] {
    const current = counted.length === 0 ? all : counted;

    if (current.includes(id)) {
        if (current.length === 1) {
            return counted;
        }

        const next = current.filter((held) => held !== id);

        return next.length === all.length ? [] : next;
    }

    const next = [...current, id];

    // Everything ticked is no restriction, and is stored as such rather than as a list that
    // silently stops matching the day a new category is created.
    return next.length === all.length ? [] : next;
}

/**
 * One thing being counted against one number: the whole day, or a single category within it.
 *
 * `label` is null for the day as a whole, and the category's name otherwise — which is what the
 * tooltip reads out, and why the count is worth showing at all when several are in play.
 */
export interface Gauge {
    key: string;
    label: string | null;
    planned: number;
    limit: number;
}

export interface ReadGauge extends Gauge {
    level: CapacityLevel;
}

const SEVERITY: Record<CapacityLevel, number> = { ok: 0, at: 1, over: 2 };

/** Every gauge that is actually measuring something, worst first. */
export function readGauges(gauges: Gauge[]): ReadGauge[] {
    return gauges
        .filter((gauge) => showsCapacity(gauge.limit))
        .map((gauge) => ({ ...gauge, level: capacityLevel(gauge.planned, gauge.limit) }))
        .sort((a, b) => (
            SEVERITY[b.level] - SEVERITY[a.level]
            // Then by how far past its number it is, so the column names the day's real problem
            // rather than whichever category happened to sort first.
            || (b.planned - b.limit) - (a.planned - a.limit)
        ));
}

/**
 * The one gauge a column shows.
 *
 * A day can be over on its own total and on two categories at once, and the heading has room for
 * one small number. The worst is the one worth surfacing; the rest are in the tooltip.
 */
export function worstGauge(gauges: Gauge[]): ReadGauge | null {
    return readGauges(gauges)[0] ?? null;
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
