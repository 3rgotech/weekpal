import Task from "../data/task";
import { DayOfWeek } from "../types";

/**
 * When a day counts as finished.
 *
 * *(rt §3)* The diagonal is the rarest mark on the board and the only celebratory one, so what
 * earns it matters more than how it is drawn.
 *
 * **Never on an empty day.** A day with nothing in it has not been finished, it has been
 * unused — and striking it would turn the mark from an achievement into a description of
 * absence, which is the opposite of what it is for. It would also mean most people's Saturday
 * arrives pre-congratulated.
 *
 * A project's backlog does not count, for the same reason it never counts anywhere else: those
 * tasks were not promised this day.
 *
 * @see PROGRESS.md R8
 */
export function dayTasks(tasks: Task[], dayOfWeek: DayOfWeek): Task[] {
    return tasks.filter((task) => task.dayOfWeek === dayOfWeek && !task.belongsToProject);
}

export function isDayDone(tasks: Task[], dayOfWeek: DayOfWeek): boolean {
    const owned = dayTasks(tasks, dayOfWeek);

    return owned.length > 0 && owned.every((task) => task.completed);
}
