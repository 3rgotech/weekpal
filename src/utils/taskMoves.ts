import { Dayjs } from "dayjs";
import { weekCodeToDate } from "./dayjs";
import Task, { WeeklyTask } from "../data/task";
import { DayOfWeek, TaskLocation } from "../types";

/**
 * The one-tap moves a task offers, in the order they are shown.
 *
 * These are the shortcuts worth a menu entry — not every possible destination, which is what
 * dragging (or the day pills on a phone) is for. `today` and `tomorrow` are alternatives to each
 * other: a task already sitting on today offers tomorrow, everything else offers today. Offering
 * both would mean one of them was always a no-op.
 */
export type TaskMove =
    | 'today'
    | 'tomorrow'
    | 'nextMonday'
    | 'nextWeekSameDay'
    | 'thisWeek'
    | 'someday';

const weekOf = (date: Dayjs): string => date.format("GGGG[w]WW");

const dayOf = (date: Dayjs): DayOfWeek => `${date.isoWeekday()}` as DayOfWeek;

/** The undated bucket at the top of a week — day 0, which is no weekday at all. */
const isUndated = (task: Task): boolean =>
    task instanceof WeeklyTask && `${task.dayOfWeek}` === "0";

const isOnDate = (task: Task, date: Dayjs): boolean =>
    task instanceof WeeklyTask
    && !isUndated(task)
    && task.weekCode === weekOf(date)
    && `${task.dayOfWeek}` === `${date.isoWeekday()}`;

/**
 * Where a move lands the task.
 *
 * `nextWeekSameDay` counts from the task's own week rather than from today, so it means "one more
 * week than you gave it" — moving a task that already slipped two weeks ago lands it two weeks
 * ago plus one, not next week. Every other move counts from now, because they name a date.
 */
export function moveTarget(task: Task, move: TaskMove, now: Dayjs): TaskLocation {
    switch (move) {
        case 'today':
            return { weekCode: weekOf(now), dayOfWeek: dayOf(now) };

        case 'tomorrow': {
            const tomorrow = now.add(1, "day");

            return { weekCode: weekOf(tomorrow), dayOfWeek: dayOf(tomorrow) };
        }

        case 'nextMonday': {
            const monday = now.add(1, "week").startOf("isoWeek");

            return { weekCode: weekOf(monday), dayOfWeek: dayOf(monday) };
        }

        case 'nextWeekSameDay': {
            // Counted off the week code rather than the task's date: the undated bucket has no
            // real date (day 0 would resolve to the Sunday before the week), and it advances as a
            // bucket like any other column.
            const weekly = task as WeeklyTask;
            const nextWeek = weekCodeToDate(weekly.weekCode).add(1, "week");

            return { weekCode: weekOf(nextWeek), dayOfWeek: weekly.dayOfWeek };
        }

        case 'thisWeek':
            return { weekCode: weekOf(now), dayOfWeek: "0" };

        case 'someday':
            return { weekCode: null, dayOfWeek: null };
    }
}

/**
 * Which moves are worth offering for this task.
 *
 * A move that would leave the task exactly where it is gets left out rather than shown and
 * ignored: a menu whose entries sometimes do nothing is a menu people stop trusting.
 */
export function availableMoves(task: Task, now: Dayjs): TaskMove[] {
    const weekly = task instanceof WeeklyTask ? task : null;
    const moves: TaskMove[] = [];

    moves.push(isOnDate(task, now) ? 'tomorrow' : 'today');
    moves.push('nextMonday');

    // Someday has no week to advance from.
    if (weekly) {
        moves.push('nextWeekSameDay');
    }

    if (!(weekly && isUndated(weekly) && weekly.weekCode === weekOf(now))) {
        moves.push('thisWeek');
    }

    if (weekly) {
        moves.push('someday');
    }

    return moves;
}
