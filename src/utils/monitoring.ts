import * as Sentry from "@sentry/react";
import { deviceId } from "./deviceId";
import { getSyncHealth } from "./syncStatus";
import { lastSyncedAt } from "./resyncFence";
import { isReachable } from "./connectivity";
import { isLeaderTab } from "./tabLeader";
import { loadedBuild } from "./buildFence";

declare global {
    interface Window {
        /**
         * Where the board's errors are reported, when the host application collects them.
         *
         * Set by the Blade view that embeds the board. Its host is the host application's own:
         * every report goes through SENTRY_TUNNEL, which forwards it, so the browser never learns
         * where the error tracker lives. Absent in demo mode and for anyone running the board on
         * their own, and then nothing is reported anywhere.
         */
        SENTRY_DSN?: string;
        /** The host application's endpoint that forwards reports to the error tracker. */
        SENTRY_TUNNEL?: string;
        SENTRY_ENVIRONMENT?: string;
        /** The signed-in account, by id only: the page knows it before the API has answered. */
        SENTRY_USER_ID?: number;
    }
}

let started = false;

/** Reads the board's outbox; set by the store layer, which owns the database. */
let readOutbox: (() => Promise<{ pending: number; deadLetters: number }>) | null = null;

export function setOutboxReader(reader: () => Promise<{ pending: number; deadLetters: number }>): void {
    readOutbox = reader;
}

/**
 * Report uncaught errors to the host application's error tracker, if it has one.
 *
 * Offline-first, like the rest of the board: a report that cannot be sent waits in IndexedDB
 * (Sentry's own database, not the board's) and goes out when the board next opens or the network
 * returns. At most 30 wait, so a crash loop on a train cannot fill the device.
 *
 * Reports carry no personal data beyond the account id: no IP, no console output (which can hold
 * task content), nothing the user wrote. They do carry the sync state that diagnostics.ts collects
 * for bug reports, as tags, because "fails only offline" or "fails with a full outbox" is the
 * shape of the bugs this board is most likely to have.
 */
export function startMonitoring(): void {
    if (started || !window.SENTRY_DSN) {
        return;
    }

    started = true;

    Sentry.init({
        dsn: window.SENTRY_DSN,
        tunnel: window.SENTRY_TUNNEL,
        environment: window.SENTRY_ENVIRONMENT,
        release: window.BUILD_ID,
        transport: Sentry.makeBrowserOfflineTransport(Sentry.makeFetchTransport),
        sendDefaultPii: false,
        integrations: (defaults) => [
            ...defaults.filter((integration) => integration.name !== "Breadcrumbs"),
            Sentry.breadcrumbsIntegration({ console: false }),
        ],
        initialScope: {
            tags: { runtime: "board" },
            user: window.SENTRY_USER_ID ? { id: String(window.SENTRY_USER_ID) } : undefined,
        },
        beforeSend: async (event) => {
            event.tags = { ...event.tags, ...(await syncTags()) };

            return event;
        },
    });
}

/** The account changed under the board, or became known after an offline start. */
export function setMonitoringUser(id: number | null): void {
    if (started) {
        Sentry.setUser(id === null ? null : { id: String(id) });
    }
}

/**
 * What the board knew about its sync when it failed. Every read is guarded: a report must never
 * be lost because one of its tags could not be read.
 */
export async function syncTags(): Promise<Record<string, string>> {
    const tags: Record<string, string> = {};

    const record = (key: string, read: () => unknown) => {
        try {
            const value = read();

            if (value !== undefined && value !== null && value !== "") {
                tags[key] = String(value);
            }
        } catch {
            // Absent rather than "unavailable".
        }
    };

    record("online", () => navigator.onLine);
    record("reachable", () => isReachable());
    record("sync_health", () => getSyncHealth());
    record("last_synced", () => lastSyncedAt());
    record("leader_tab", () => isLeaderTab());
    record("build", () => loadedBuild());
    record("device", () => deviceId());

    try {
        const outbox = await readOutbox?.();

        if (outbox) {
            tags.outbox = String(outbox.pending);
            tags.dead_letters = String(outbox.deadLetters);
        }
    } catch {
        // The database may be what failed.
    }

    return tags;
}
