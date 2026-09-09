import { Dayjs } from "dayjs";
import { DayOfWeek } from "../types";
import Task from "../data/task";

/**
 * What a past day is still holding.
 *
 * *(rt §10)* The board asks two questions in the two-second glance: **am I ahead** (R10's share
 * bar) and **what did I forget**. This is the second one, and it is the only asymmetric mark in
 * the week — every other column is drawn the same whatever its date, because the week is meant
 * to be read as one shape rather than as a countdown.
 *
 * A past day is the one place that symmetry should break. Work left on Tuesday when it is
 * Thursday is not neutral information: it is the single most actionable thing on the board, and
 * without a mark it is indistinguishable from a day that went perfectly.
 *
 * @see PROGRESS.md R12
 */

/**
 * Strictly before today. Today itself is not "past" — a day still in progress has nothing to
 * recover, and marking it would put a reproach on the column the user is working in.
 *
 * Undated buckets have no date at all and are never past: Some day is not late, it is undated,
 * and that distinction is the whole reason the bucket exists.
 */
export function isPastDay(date: Dayjs | null, today: Dayjs): boolean {
    if (date === null) {
        return false;
    }

    return date.isBefore(today, "day");
}

/**
 * The tasks a past day would hand to today.
 *
 * Completed ones are left where they are — they are a record of a day that went well, and
 * dragging them forward would erase that. Project backlog items too: they were never promised
 * this day, so nothing about them has slipped.
 */
export function recoverableTasks(tasks: Task[], dayOfWeek: DayOfWeek): Task[] {
    return tasks.filter((task) => (
        task.dayOfWeek === dayOfWeek
        && !task.completed
        && !task.belongsToProject
    ));
}
