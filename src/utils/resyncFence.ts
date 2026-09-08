import { WeekpalDB } from '../store/db';

/**
 * Starting again, when the local copy has drifted too far to reconcile.
 *
 * A board that has been offline longer than the server's history window holds a picture the
 * server can no longer reconcile against: rows may have been purged, weeks it still shows are no
 * longer readable, and its idea of what exists is a superset of what the server will answer
 * with. Merging that is not a conflict to resolve — it is two different databases.
 *
 * So the server answers `409 resync_required` and the client throws its cached rows away.
 *
 * **The outbox is never touched.** Everything else here can be fetched again; the queue cannot.
 * Those are writes the user made that have not reached anyone, and clearing them to tidy up the
 * local state would be destroying the only copy of work in the name of consistency. They flush
 * after the refetch, against the server's own rows, where each one is resolved on its merits.
 *
 * @see PROGRESS.md R28(d), R31
 */

const LAST_SYNC_KEY = 'weekpal-last-sync';

/** Sent with every write so the server can judge how far behind this device is. */
export function lastSyncedAt(): string | undefined {
    try {
        return localStorage.getItem(LAST_SYNC_KEY) ?? undefined;
    } catch {
        // Blocked storage. Sending nothing means the fence does not apply, which is the right
        // default: a device that cannot remember when it synced is not evidence that it is stale.
        return undefined;
    }
}

export function markSynced(at: Date = new Date()): void {
    try {
        localStorage.setItem(LAST_SYNC_KEY, at.toISOString());
    } catch {
        // As above.
    }
}

/**
 * Throw away everything that came from the server, and nothing that has not reached it.
 *
 * Tables, not `db.delete()`: deleting the database would take `pendingChanges` with it, and
 * would also race every open connection — including the one the caller is holding.
 */
export async function resyncFromServer(db: WeekpalDB): Promise<void> {
    const cached = [db.weeklyTasks, db.somedayTasks, db.categories, db.events, db.taskNotes, db.projects];

    await db.transaction('rw', cached, async () => {
        await Promise.all(cached.map((table) => table.clear()));
    });

    // The next read must go to the server rather than answering from a table that is now empty
    // and looks merely quiet.
    for (const table of ['tasks', 'categories', 'projects']) {
        try {
            localStorage.removeItem(`${table}-last-sync`);
        } catch {
            // Blocked storage. The tables are empty either way, so the next read has nothing
            // local to be satisfied by.
        }
    }

    markSynced();
}

/** Does this failure mean "start again"? */
export function isResyncRequired(body: unknown): boolean {
    return typeof body === 'object'
        && body !== null
        && (body as { reason?: unknown }).reason === 'resync_required';
}
