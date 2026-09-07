import { Dayjs } from "dayjs";
import { weekCodeToDate } from "./dayjs";
import Task, { WeeklyTask } from "../data/task";
import { DayOfWeek, TaskLocation } from "../types";
import { DEFAULT_WEEK_STARTS_ON, Weekday, weekCodeOf } from "./week";

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

/**
 * Which stored week a date lands in.
 *
 * Depends on where the user's week starts: under a Sunday start, a Sunday opens the following
 * week rather than closing the one before it, so "today" on a Sunday means a different week code
 * than the ISO calendar alone would give.
 */
const weekOf = (date: Dayjs, weekStartsOn: Weekday): string => weekCodeOf(date, weekStartsOn);

const dayOf = (date: Dayjs): DayOfWeek => `${date.isoWeekday()}` as DayOfWeek;

/** The undated bucket at the top of a week — day 0, which is no weekday at all. */
const isUndated = (task: Task): boolean =>
    task instanceof WeeklyTask && `${task.dayOfWeek}` === "0";

const isOnDate = (task: Task, date: Dayjs, weekStartsOn: Weekday): boolean =>
    task instanceof WeeklyTask
    && !isUndated(task)
    && task.weekCode === weekOf(date, weekStartsOn)
    && `${task.dayOfWeek}` === `${date.isoWeekday()}`;

/**
 * Where a move lands the task.
 *
 * `nextWeekSameDay` counts from the task's own week rather than from today, so it means "one more
 * week than you gave it" — moving a task that already slipped two weeks ago lands it two weeks
 * ago plus one, not next week. Every other move counts from now, because they name a date.
 */
export function moveTarget(
    task: Task,
    move: TaskMove,
    now: Dayjs,
    weekStartsOn: Weekday = DEFAULT_WEEK_STARTS_ON,
): TaskLocation {
    switch (move) {
        case 'today':
            return { weekCode: weekOf(now, weekStartsOn), dayOfWeek: dayOf(now) };

        case 'tomorrow': {
            const tomorrow = now.add(1, "day");

            return { weekCode: weekOf(tomorrow, weekStartsOn), dayOfWeek: dayOf(tomorrow) };
        }

        case 'nextMonday': {
            const monday = now.add(1, "week").startOf("isoWeek");

            return { weekCode: weekOf(monday, weekStartsOn), dayOfWeek: dayOf(monday) };
        }

        case 'nextWeekSameDay': {
            // Counted off the week code rather than the task's date: the undated bucket has no
            // real date (day 0 would resolve to the Sunday before the week), and it advances as a
            // bucket like any other column.
            const weekly = task as WeeklyTask;
            const nextWeek = weekCodeToDate(weekly.weekCode).add(1, "week");

            return { weekCode: weekOf(nextWeek, weekStartsOn), dayOfWeek: weekly.dayOfWeek };
        }

        case 'thisWeek':
            return { weekCode: weekOf(now, weekStartsOn), dayOfWeek: "0" };

        case 'someday':
            return { weekCode: null, dayOfWeek: null };
    }
}

/**
 * Where a task goes to make room in a column that is over its limit.
 *
 * One step further out, never further in, so resolving one column cannot be what fills the one
 * beside it forever:
 *
 * - a **weekday** hands its task to the undated "this week" bucket, which is what the day columns
 *   drain into — the task keeps its week, it just stops claiming a day;
 * - **this week** hands it to Some day, which is the next thing out;
 * - **Some day** is already as far out as a task goes, so the only direction left is in — it is
 *   *promoted* into this week, which is what makes a shortlist a shortlist rather than a pile.
 *
 * Promoting out of Some day can put "this week" over its own limit in turn. That is allowed: the
 * next prompt arrives on the next capture, and refusing the move would leave someone stuck
 * between two full columns with nothing to do about it.
 */
export function relieveTarget(task: Task, weekCode: string): TaskLocation {
    if (task.taskType === 'someday') {
        return { weekCode, dayOfWeek: '0' };
    }

    const weekly = task as WeeklyTask;

    return `${weekly.dayOfWeek}` === '0'
        ? { weekCode: null, dayOfWeek: null }
        : { weekCode: weekly.weekCode, dayOfWeek: '0' };
}

/**
 * Which moves are worth offering for this task.
 *
 * A move that would leave the task exactly where it is gets left out rather than shown and
 * ignored: a menu whose entries sometimes do nothing is a menu people stop trusting.
 */
export function availableMoves(
    task: Task,
    now: Dayjs,
    weekStartsOn: Weekday = DEFAULT_WEEK_STARTS_ON,
): TaskMove[] {
    const weekly = task instanceof WeeklyTask ? task : null;
    const moves: TaskMove[] = [];

    moves.push(isOnDate(task, now, weekStartsOn) ? 'tomorrow' : 'today');
    moves.push('nextMonday');

    // Someday has no week to advance from.
    if (weekly) {
        moves.push('nextWeekSameDay');
    }

    if (!(weekly && isUndated(weekly) && weekly.weekCode === weekOf(now, weekStartsOn))) {
        moves.push('thisWeek');
    }

    if (weekly) {
        moves.push('someday');
    }

    return moves;
}
