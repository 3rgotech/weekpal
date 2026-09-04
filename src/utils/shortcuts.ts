import Task, { WeeklyTask } from "../data/task";
import { DayOfWeek, TaskLocation } from "../types";

/**
 * The board in its default reading order: the seven days, then the undated bucket, then Some day.
 *
 * The order a Monday-to-Sunday board with nothing hidden lays out in. Both functions below take
 * the live order as an argument instead — {@link boardDayOrder} builds it from the settings — so
 * that `j`, `k` and `d` walk the week the user is actually looking at. This is the fallback for
 * callers that have no board to ask, and the shape the order is expected to have.
 */
export const BOARD_ORDER: DayOfWeek[] = ["1", "2", "3", "4", "5", "6", "7", "0", "someday"];

/** Every task the board is showing, in the order it shows them. */
export function boardOrder(tasks: Task[], order: DayOfWeek[] = BOARD_ORDER): Task[] {
    return order.flatMap((day) => tasks
        .filter((task) => `${task.dayOfWeek}` === day)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
}

/**
 * The task `j` or `k` moves to.
 *
 * With nothing selected, either key starts at the near end — pressing `j` on a fresh board picks
 * the first task rather than doing nothing. At either end the selection stays put: wrapping
 * around from Sunday to Monday reads as a jump to somewhere else entirely.
 */
export function nextTask(ordered: Task[], currentId: string | null, direction: 1 | -1): Task | null {
    if (ordered.length === 0) {
        return null;
    }

    const current = ordered.findIndex((task) => task.id === currentId);

    if (current === -1) {
        return direction === 1 ? ordered[0] : ordered[ordered.length - 1];
    }

    const next = current + direction;

    return next >= 0 && next < ordered.length ? ordered[next] : ordered[current];
}

/**
 * Where `d` sends a task: one step further along the board.
 *
 * The *next column on screen*, not the next weekday — a Friday task on a board that hides the
 * weekend defers past it, and under a Sunday start a Sunday task defers to Monday rather than
 * falling off the end of the week. The last day has nowhere further to go inside the week, and
 * the undated "this week" bucket is already dayless, so both fall to Some day — the honest answer
 * to "not now" at the end of a week, and one that keeps the task in view rather than pushing it
 * into a week nobody is looking at. A task already in Some day has nowhere further to go.
 */
export function deferTarget(task: Task, order: DayOfWeek[] = BOARD_ORDER): TaskLocation | null {
    if (task.taskType === "someday") {
        return null;
    }

    const weekly = task as WeeklyTask;
    const day = `${weekly.dayOfWeek}` as DayOfWeek;
    const days: DayOfWeek[] = order.filter((bucket) => bucket !== "0" && bucket !== "someday");
    const next = days[days.indexOf(day) + 1];

    if (days.includes(day) && next !== undefined) {
        return { weekCode: weekly.weekCode, dayOfWeek: next };
    }

    return { weekCode: null, dayOfWeek: null };
}

/**
 * Whether a keystroke belongs to whatever is being typed in.
 *
 * Without this, naming a task "dinner" would tick it off, defer it and open a new task on the
 * way through. Checked on the event target rather than on `document.activeElement` so it is
 * right for shadow roots and for a key that arrives mid-blur.
 */
export function isTypingTarget(target: EventTarget | null): boolean {
    const element = target as HTMLElement | null;

    if (!element || typeof element.tagName !== "string") {
        return false;
    }

    if (element.isContentEditable) {
        return true;
    }

    return ["INPUT", "TEXTAREA", "SELECT"].includes(element.tagName);
}

/**
 * How this machine spells the print shortcut.
 *
 * Printing is the browser's own binding, not one of ours — but it is the shortcut people most
 * often want on a week they are about to pin up, so the sheet names it rather than pretending it
 * does not exist. Which modifier that is depends on the platform, so it is read rather than
 * guessed.
 */
export function printShortcutLabel(): string {
    const platform = typeof navigator === "undefined"
        ? ""
        : `${(navigator as { userAgentData?: { platform?: string } }).userAgentData?.platform ?? ""} ${navigator.userAgent}`;

    return /mac|iphone|ipad|ipod/i.test(platform) ? "⌘P" : "Ctrl+P";
}

/** What the help sheet lists, in the order it lists them. */
export const SHORTCUTS: Array<{ keys: string[]; description: string }> = [
    { keys: ["j"], description: "shortcuts.next" },
    { keys: ["k"], description: "shortcuts.previous" },
    { keys: ["space"], description: "shortcuts.complete" },
    { keys: ["d"], description: "shortcuts.defer" },
    { keys: ["n"], description: "shortcuts.new" },
    { keys: ["c"], description: "shortcuts.category" },
    { keys: ["v"], description: "shortcuts.completed_tasks" },
    { keys: ["i"], description: "shortcuts.inbox" },
    { keys: ["p"], description: "shortcuts.projects" },
    { keys: ["←", "→"], description: "shortcuts.week" },
    { keys: ["t"], description: "shortcuts.today" },
    { keys: [printShortcutLabel()], description: "shortcuts.print" },
    { keys: ["?"], description: "shortcuts.help" },
    { keys: ["esc"], description: "shortcuts.escape" },
];
