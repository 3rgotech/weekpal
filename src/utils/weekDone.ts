import Task from "../data/task";
import { DayOfWeek } from "../types";
import { Weekday } from "./week";
import { dayTasks, isDayDone } from "./dayDone";

/**
 * When a whole week counts as finished.
 *
 * *(rt §3)* The rarer mark — at most 52 a year, and rarity is what buys it ceremony — so the bar
 * is set on what the week actually asked of you:
 *
 * - every day on the board is either finished or was never used (an empty Saturday does not hold
 *   the week open, and does not count towards it either);
 * - at least one day was actually finished — a week with nothing in it has not been got through,
 *   and "zero tasks is not an achievement";
 * - nothing is left open in *this week*, the bucket the days drain into.
 *
 * *Some day* never counts: it is not a promise about this week. Project backlogs never count
 * anywhere, for the same reason as on a single day.
 *
 * @see PROGRESS.md R9
 */
export function isWeekDone(tasks: Task[], visibleDays: Weekday[]): boolean {
    const days = visibleDays.map((day) => `${day}` as DayOfWeek);

    const everyDaySettled = days.every((day) => dayTasks(tasks, day).length === 0 || isDayDone(tasks, day));
    const someDayFinished = days.some((day) => isDayDone(tasks, day));
    const bucketClear = dayTasks(tasks, "0").every((task) => task.completed);

    return everyDaySettled && someDayFinished && bucketClear;
}
