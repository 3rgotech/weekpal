import Task, { WeeklyTask } from "../data/task";

/**
 * The board's task list once some tasks have changed.
 *
 * The board holds the week on screen and Some day; a project's backlog lives in the drawer. A
 * changed task is kept, replaced or dropped by where it now belongs — so a task sent to next week
 * leaves this one as soon as it is sent, rather than staying on its old day until a reload shows
 * the board the truth. Tasks that did not change are left as they are.
 */
export function mergeTaskChanges(
    current: Task[],
    updated: Task[],
    week: string,
    isBacklogTask: (task: Task) => boolean,
): Task[] {
    const byId = new Map(updated.map((task) => [task.id, task]));
    const belongs = (task: Task) => (
        !isBacklogTask(task)
        && (task.taskType === "someday" || (task as WeeklyTask).weekCode === week)
    );

    const merged = current
        .map((task) => byId.get(task.id) ?? task)
        .filter((task) => !isBacklogTask(task))
        .filter((task) => !byId.has(task.id) || belongs(task));

    const added = updated.filter((task) => belongs(task) && !current.some((held) => held.id === task.id));

    return [...merged, ...added];
}
