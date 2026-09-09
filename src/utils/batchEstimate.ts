import Task from "../data/task";
import { DayOfWeek } from "../types";
import { ESTIMATE_CHIPS } from "./estimate";

/**
 * Estimating a column, one task at a time.
 *
 * *(rt §5)* **Never asked at capture** — quick-add stays type-enter-gone. This is the other half
 * of that bargain: if the board will not interrupt you to ask, there has to be a moment you can
 * choose where answering is fast. The moment is a day header, and the unit is a column.
 *
 * **Desktop is a mode the column enters, not a surface that covers it.** That was argued and it
 * matters: a modal would hide the neighbouring days, and the neighbouring days are where the
 * "actually, move this to Wednesday" instinct fires. Sizing a day and rebalancing it are the
 * same sitting.
 *
 * **No new keyboard grammar.** The board already has select-then-act — `j`/`k` browse, a letter
 * acts. This adds a temporary numeric verb set (1–6 for the six chips) and nothing else. `j`/`k`
 * still browse, because skipping something you do not want to size is just moving.
 *
 * @see PROGRESS.md R17
 */

/** Which tasks a run of batch estimation is about. */
export function unestimatedIn(tasks: Task[], dayOfWeek: DayOfWeek): Task[] {
    return tasks.filter((task) => (
        task.dayOfWeek === dayOfWeek
        && !task.completed
        && !task.belongsToProject
        // The point of the mode. A task that already carries a guess is not asked about again —
        // it is dimmed in place rather than removed, so the column keeps its shape.
        && (task.estimatedMinutes === null || task.estimatedMinutes === undefined)
    ));
}

/**
 * The chip a number key selects, or null.
 *
 * `1`–`6` only. Deliberately not `0`, and not a two-digit escape: a numeric verb set that needed
 * its own parsing rules would be a new grammar, which is the thing this is not allowed to be.
 */
export function chipForKey(key: string): number | null {
    const index = Number(key);

    if (!Number.isInteger(index) || index < 1 || index > ESTIMATE_CHIPS.length) {
        return null;
    }

    return ESTIMATE_CHIPS[index - 1];
}

/**
 * Where the selection goes after a task is answered.
 *
 * Forward, then stop — never wrapping to the top. Wrapping would silently re-offer a task the
 * user has just skipped and make the end of the run impossible to feel; stopping at the end is
 * what tells them the column is done.
 *
 * The answered task has usually left the list by the time this is asked (it now has an estimate),
 * so the "next" task is the one that has taken its index.
 */
export function nextAfter(remaining: Task[], answeredIndex: number): string | null {
    if (remaining.length === 0) {
        return null;
    }

    const index = Math.min(answeredIndex, remaining.length - 1);

    return remaining[index]?.id ?? null;
}
