import Task from "../data/task";
import { DayOfWeek } from "../types";

/** How far through its own tasks a day is. */
export interface DayProgress {
    done: number;
    total: number;
}

/**
 * The day's tasks, and how many of them are done.
 *
 * What the line under a day's name shows when the day has no limit: a progress bar of the day
 * itself. It replaced a rail that measured the day against the week's heaviest one, which looked
 * exactly like progress and was not — one unestimated task on an otherwise empty day drew a bar
 * two thirds full.
 *
 * Off the unfiltered list, like the day's other numbers: narrowing the board to one category does
 * not change what the day is carrying. Project backlogs are left out, as everywhere: they were
 * never promised this day. Null for the undated buckets, which have no "through the day" to show,
 * and for a day with nothing on it, which draws no empty rail.
 */
export function dayProgress(tasks: Task[], dayOfWeek: DayOfWeek): DayProgress | null {
    if (dayOfWeek === "0" || dayOfWeek === "someday") {
        return null;
    }

    const day = tasks.filter((task) => task.dayOfWeek === dayOfWeek && !task.belongsToProject);

    if (day.length === 0) {
        return null;
    }

    return { done: day.filter((task) => task.completed).length, total: day.length };
}
