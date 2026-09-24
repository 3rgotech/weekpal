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

/** As much of a dnd-kit rectangle as deciding a drop position needs. */
export interface DropRect {
    top: number;
    left: number;
    width: number;
    height: number;
}

/**
 * Which position a drop lands on, given where the dragged card is against the card under it.
 *
 * The rule is the target's **midpoint**: past halfway and the task goes after it, short of that
 * and it goes before. The board used to compare against the target's *bottom* edge, which meant
 * a whole row's worth of travel counted as "still above" — so a task dropped between the second
 * and third landed between the first and second, every time, and the further you aimed the more
 * wrong it looked.
 *
 * **Which midpoint depends on whether the two cards share a row.** A day column is a single file
 * and the answer is always vertical, but the undated buckets lay their cards out in a grid on a
 * wide screen, and there two cards side by side have the same top edge — so a vertical test reads
 * every drop onto a right-hand neighbour as "still above it" and inserts before, whichever way
 * the card was actually dragged. Same row, and the reading order runs left to right, so the
 * horizontal midpoint is the one that means anything.
 *
 * "Same row" is judged against half the target's own height rather than a fixed tolerance: cards
 * are as tall as their titles make them, and a constant would be wrong for both a one-line task
 * and a three-line one.
 *
 * Used when a card crosses into another list, which is where there is no sortable preview to
 * follow. A reorder inside one list follows the preview instead — see `reorderedIndex`.
 */
export function dropOrder(active: DropRect, over: DropRect, overOrder: number): number {
    const activeMiddleY = active.top + active.height / 2;
    const overMiddleY = over.top + over.height / 2;

    // Clearly above or below: a different row, and the vertical axis decides — which is every
    // drop in a single-file day column.
    if (Math.abs(activeMiddleY - overMiddleY) > over.height / 2) {
        return activeMiddleY > overMiddleY ? overOrder + 1 : overOrder;
    }

    // Alongside it. In a single file both middles sit on the same vertical line, so this reads as
    // "not past it" and the drop goes before — which is the answer the vertical rule gave too.
    return active.left + active.width / 2 > over.left + over.width / 2 ? overOrder + 1 : overOrder;
}

/**
 * Where a reorder inside one list lands, as the index `moveTask` expects.
 *
 * **The preview is the answer.** While a card is dragged within its own list, dnd-kit's sortable
 * preview draws the list with the card moved into the slot of the card under the pointer — an
 * `arrayMove` from its index to that one — in a grid and a single file alike. The drop used to be
 * worked out again from the midpoint rule, which is a different question: in a bucket's grid the
 * two answers routinely disagreed, and the card settled somewhere other than where it had been
 * shown to go. Taking the preview's own order makes the drop land exactly where the card was
 * shown.
 *
 * `items` is the list as the sortable context holds it, completed tasks included; `moveTask`
 * orders only the tasks still to do, so the result counts the unfinished ones ahead of the card.
 */
export function reorderedIndex(
    items: string[],
    activeIndex: number,
    overIndex: number,
    isCompleted: (id: string) => boolean,
): number {
    const moved = [...items];
    const [active] = moved.splice(activeIndex, 1);
    moved.splice(overIndex, 0, active);

    return moved.slice(0, overIndex).filter((id) => !isCompleted(id)).length;
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
