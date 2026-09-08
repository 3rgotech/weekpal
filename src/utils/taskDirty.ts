import Task, { WeeklyTask } from '../data/task';
import { stampNow } from './syncClock';

/**
 * Which fields a write actually claims to change.
 *
 * The server takes the whole task representation but treats only these as *claims* — everything
 * else is the client reporting what it last saw, which is not an argument about what should be
 * true now. That distinction is the entire defence against a tab that has been asleep since
 * Tuesday flushing its stale snapshot over Thursday's work.
 *
 * **Derived, not declared.** The alternative was for each caller to name the fields it touched,
 * and every one of the two dozen call sites would have been one forgotten field away from
 * silently reintroducing the bug — with no test that could see it, because a missing claim looks
 * exactly like a field nobody changed. Diffing against what is already in the local database
 * cannot be forgotten.
 *
 * The names are *logical* fields, matching the server's map. `position` is one field covering
 * week, day and order together, because moving a card is one gesture: resolved separately, two
 * devices moving the same task can each win a different column and leave it somewhere neither
 * user chose.
 *
 * @see PROGRESS.md R25
 */
export type DirtyMap = Record<string, string>;

const weekOf = (task: Task): string | null => (task instanceof WeeklyTask ? task.weekCode : null);
const dayOf = (task: Task): string | null =>
    task instanceof WeeklyTask && task.dayOfWeek !== undefined && task.dayOfWeek !== null
        ? `${task.dayOfWeek}`
        : null;

/**
 * Every field, claimed now.
 *
 * For a task the local database has never seen. There is nothing to diff against and nothing on
 * the server to lose to, so the whole representation is a claim.
 */
export function claimEverything(): DirtyMap {
    const at = stampNow();

    return {
        title: at,
        description: at,
        category_id: at,
        project_id: at,
        estimated_minutes: at,
        completed_at: at,
        subtasks: at,
        position: at,
    };
}

/** Just the position, claimed now — what a drag produces for every row it touches. */
export function claimPosition(): DirtyMap {
    return { position: stampNow() };
}

/**
 * What changed between the stored task and the one being written.
 *
 * Returns an empty map when nothing did, and the caller then queues a write that asserts
 * nothing — which is correct and cheap: the payload still reaches the server and heals anything
 * that had drifted, without claiming to be news.
 */
export function dirtyBetween(previous: Task | undefined, next: Task): DirtyMap {
    if (!previous) {
        return claimEverything();
    }

    const at = stampNow();
    const dirty: DirtyMap = {};

    if (previous.title !== next.title) {
        dirty.title = at;
    }

    if ((previous.description ?? null) !== (next.description ?? null)) {
        dirty.description = at;
    }

    if ((previous.categoryId ?? null) !== (next.categoryId ?? null)) {
        dirty.category_id = at;
    }

    if ((previous.projectId ?? null) !== (next.projectId ?? null)) {
        dirty.project_id = at;
    }

    if (timeOf(previous.completedAt) !== timeOf(next.completedAt)) {
        dirty.completed_at = at;
    }

    // Compared as a whole, and sent as a whole. A JSON array cannot be merged field-wise without
    // inventing an identity for each element, so the honest unit is the array — which at least
    // makes a loss visible in the changelog rather than silently half-applied.
    if (JSON.stringify(previous.subtasks ?? []) !== JSON.stringify(next.subtasks ?? [])) {
        dirty.subtasks = at;
    }

    if (
        weekOf(previous) !== weekOf(next)
        || dayOf(previous) !== dayOf(next)
        || (previous.order ?? 0) !== (next.order ?? 0)
    ) {
        dirty.position = at;
    }

    return dirty;
}

/**
 * Merge two claim maps, keeping the later stamp for any field in both.
 *
 * Used when a second write to the same task is queued before the first has been sent. "The
 * newer entry wins" would be wrong — it would throw away claims on fields the newer gesture did
 * not touch, which is exactly the data loss the map exists to prevent.
 */
export function mergeDirty(existing: DirtyMap | undefined, incoming: DirtyMap): DirtyMap {
    const merged: DirtyMap = { ...(existing ?? {}) };

    for (const [field, at] of Object.entries(incoming)) {
        if (!merged[field] || at > merged[field]) {
            merged[field] = at;
        }
    }

    return merged;
}

/** `completedAt` is a dayjs instance, whose `valueOf` is the epoch milliseconds. */
function timeOf(value: { valueOf(): number } | null | undefined): number | null {
    return value ? value.valueOf() : null;
}
