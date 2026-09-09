import Task from "../data/task";

/**
 * How long a task is expected to take, and how honestly to say so.
 *
 * *(rt §5)* Two rules run through everything here, and both were argued rather than assumed.
 *
 * **An estimate is a guess and should look like one.** `~2h`, never `1h 47m`. A number carried
 * to the minute claims a precision nobody has, and once the board looks precise people start
 * arguing with it instead of using it.
 *
 * **Absence is information.** An unestimated task renders *nothing* — no zero, no placeholder,
 * no badge, no nudge. A fake zero is a lie the capacity maths inherits, and flagging the
 * unestimated punishes the common case, which is a task somebody typed in four seconds and never
 * intends to size.
 *
 * @see PROGRESS.md R15, R16
 */

/**
 * Six fixed chips.
 *
 * The small end is deliberate: small tasks are the ones that evaporate from memory, and putting
 * five minutes on the board is capture rather than estimation. The large end matters because the
 * four-hour task is the one that gets deferred three weeks running — R19's badge and this are
 * describing the same task from two directions.
 *
 * **No editable-presets setting.** *(rt §5)* Wrong axis: the person who needs the 5-minute chip
 * and the person who needs half a day are the same person on different days. If drift shows up
 * in real use, derive the chips from that user's own most-used values — do not ask them to
 * configure it in advance.
 */
export const ESTIMATE_CHIPS = [5, 15, 30, 60, 120, 240] as const;

/** Matches the column: `unsignedSmallInteger`, and one minute is the smallest honest guess. */
export const MIN_ESTIMATE = 1;

export const MAX_ESTIMATE = 65535;

/**
 * A single estimate, rounded and soft.
 *
 * Minutes below an hour; hours above it, with a half only where it reads naturally. 90 minutes
 * is `~1.5h` and 100 minutes is `~2h` — the second is *wrong by ten minutes and right about what
 * it is*, which is the trade this whole feature makes.
 */
export function formatEstimate(minutes: number | null | undefined): string | null {
    if (minutes === null || minutes === undefined || minutes <= 0) {
        // Not "0m", and not a dash. Nothing.
        return null;
    }

    if (minutes < 60) {
        return `~${minutes}m`;
    }

    const hours = minutes / 60;
    const rounded = Math.round(hours * 2) / 2;

    return `~${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)}h`;
}

/** What a chip says on its face. Chips are exact values, so they carry no `~`. */
export function chipLabel(minutes: number): string {
    return minutes < 60 ? `${minutes}m` : `${minutes / 60}h`;
}

export interface EstimateTotal {
    /** Minutes across the tasks that carry an estimate. */
    minutes: number;
    /** How many carry none. */
    unestimated: number;
    /** True when at least one task is unestimated, which is what earns the `+`. */
    partial: boolean;
}

/**
 * Add up what is known, and count what is not.
 *
 * **Never sums partial data into a confident total.** A day with four estimated tasks and three
 * unestimated ones does not take six hours; it takes at least six hours. The `+` in the rendered
 * total is doing real work, and dropping it would turn a floor into a claim.
 */
export function totalEstimate(tasks: Task[]): EstimateTotal {
    let minutes = 0;
    let unestimated = 0;

    for (const task of tasks) {
        const estimate = task.estimatedMinutes;

        if (estimate === null || estimate === undefined || estimate <= 0) {
            unestimated++;

            continue;
        }

        minutes += estimate;
    }

    return { minutes, unestimated, partial: unestimated > 0 };
}

/**
 * The total as a string, or null when there is nothing honest to say.
 *
 * Null for a day with no estimates at all — a header reading "0h planned · 6 unestimated" would
 * be a reproach for not having filled something in, which is exactly the nudge R16 refuses.
 */
export function formatTotal(total: EstimateTotal): string | null {
    if (total.minutes <= 0) {
        return null;
    }

    const base = formatEstimate(total.minutes);

    return total.partial ? `${base}+` : base;
}
