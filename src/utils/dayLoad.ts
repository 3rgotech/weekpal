import Task from "../data/task";
import { DayOfWeek } from "../types";

/**
 * How heavy each day is, against the heaviest day on screen.
 *
 * *(rt §10)* The *am I ahead* half of the two-second glance. **Relative, not a quota** — it
 * answers "which day is the problem" rather than "is this day too full", which the capacity
 * count already answers. The two are deliberately different questions: a day can be under its
 * limit and still be twice its neighbour.
 *
 * **When every day is equal, every bar is full.** That reads as a flat rail, which is the honest
 * picture of a uniformly loaded week — relief is what shows up as a gap. Normalising so that the
 * *average* were half full would invent a lighter day that does not exist.
 *
 * Weight comes from `estimated_minutes` where it exists and a flat default where it does not, so
 * a board with no estimates at all degrades to a relative *task count* rather than to nothing.
 * That default is the one place estimates are invented — and it is defensible here precisely
 * because the output is a comparison: every unestimated task is wrong by the same amount, so the
 * days still rank correctly against each other. R16's totals refuse the same trick, because a
 * total is a claim about hours rather than a ranking.
 *
 * @see PROGRESS.md R10
 */

/**
 * What an unestimated task is assumed to weigh.
 *
 * Half an hour: long enough that a day of ten of them outweighs a day of two, short enough that
 * one unestimated task cannot dominate a day of real estimates. Its exact value never reaches
 * the screen — only the ratios do.
 */
export const DEFAULT_TASK_WEIGHT = 30;

export function taskWeight(task: Task): number {
    const estimate = task.estimatedMinutes;

    return estimate !== null && estimate !== undefined && estimate > 0
        ? estimate
        : DEFAULT_TASK_WEIGHT;
}

/**
 * The weight of one day: what is still to do on it.
 *
 * Completed work is excluded — the bar is about what is ahead, and a day that has been finished
 * should empty out rather than stay heavy. Project backlogs are excluded for the reason they are
 * excluded everywhere: they were never promised this day.
 */
export function dayWeight(tasks: Task[], dayOfWeek: DayOfWeek): number {
    return tasks
        .filter((task) => task.dayOfWeek === dayOfWeek && !task.completed && !task.belongsToProject)
        .reduce((total, task) => total + taskWeight(task), 0);
}

/**
 * Each day's share of the heaviest day, from 0 to 1.
 *
 * Only the days passed in — a day the user has hidden is not on screen, and letting it set the
 * scale would make every visible bar shorter for a reason nobody can see.
 *
 * An empty map when nothing is planned: with no load anywhere there is no comparison to draw,
 * and a row of empty rails would be furniture that says nothing.
 */
export function dayShares(tasks: Task[], days: DayOfWeek[]): Map<DayOfWeek, number> {
    const weights = new Map<DayOfWeek, number>();

    for (const day of days) {
        // Weekdays only. "Some day" has no size worth comparing to a Tuesday, and the this-week
        // bucket is the overflow the days drain into rather than a day of its own.
        if (day === "0" || day === "someday") {
            continue;
        }

        weights.set(day, dayWeight(tasks, day));
    }

    const heaviest = Math.max(0, ...weights.values());

    if (heaviest <= 0) {
        return new Map();
    }

    const shares = new Map<DayOfWeek, number>();

    for (const [day, weight] of weights) {
        shares.set(day, weight / heaviest);
    }

    return shares;
}
