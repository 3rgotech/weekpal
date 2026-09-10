import { deviceId } from "./deviceId";
import { clockOffsetMs } from "./syncClock";
import { getSyncHealth } from "./syncStatus";
import { lastSyncedAt } from "./resyncFence";
import { isReachable } from "./connectivity";
import { isLeaderTab } from "./tabLeader";
import { loadedBuild } from "./buildFence";

/**
 * What the board knows about itself, for a bug report.
 *
 * **This is the reason the feedback widget is worth more than a screenshot.** The worst failure
 * an offline-first planner can have is silent data loss, and no picture shows it — but "3 pending
 * writes, 1 dead letter, last synced four days ago, build a3f9" says it in one line. Every value
 * here already existed for the sync work; none of it costs a byte to collect.
 *
 * Everything is stringified and every read is guarded. A diagnostics collector that threw would
 * take the bug report down with it, which would lose the one account of what went wrong — and it
 * would do so precisely when the board is in the broken state worth reporting.
 *
 * Deliberately **not** included: task titles, category names, anything the user wrote. A report
 * is not a backup, and somebody sending "this is broken" has not agreed to send their week.
 */
export interface Diagnostics {
    [key: string]: string;
}

export async function collectDiagnostics(
    pending: () => Promise<number>,
    deadLetters: () => Promise<unknown[]>,
): Promise<Diagnostics> {
    const out: Diagnostics = {};

    const record = (key: string, read: () => unknown) => {
        try {
            const value = read();

            if (value !== undefined && value !== null && value !== "") {
                out[key] = String(value);
            }
        } catch {
            // A signal that cannot be read is simply absent. Reporting "unavailable" for a
            // dozen keys would bury the ones that answered.
        }
    };

    record("device", () => deviceId());
    record("build", () => loadedBuild());
    record("last_synced", () => lastSyncedAt());
    record("sync_health", () => getSyncHealth());
    record("reachable", () => isReachable());
    record("leader_tab", () => isLeaderTab());
    record("clock_offset_ms", () => clockOffsetMs());
    record("viewport", () => `${window.innerWidth}×${window.innerHeight}`);
    record("timezone", () => Intl.DateTimeFormat().resolvedOptions().timeZone);
    record("language", () => navigator.language);

    // The two that matter most, and the only ones that need awaiting: a queue that is not
    // draining is the shape of every silent-data-loss report.
    try {
        out.pending_writes = String(await pending());
    } catch {
        // Dexie unavailable, which is itself worth knowing — but not worth failing over.
    }

    try {
        out.dead_letters = String((await deadLetters()).length);
    } catch {
        // As above.
    }

    return out;
}
