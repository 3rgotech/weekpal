/**
 * Notice that the account's calendars changed somewhere else, usually on the host's Settings page.
 *
 * The board keeps the events of every week it has opened and re-reads a week at most every five
 * minutes, so a calendar removed on Settings went on showing its events: for up to five minutes
 * on the current week, and on every other week until that week was next pulled.
 *
 * The host stamps a version of the account's calendars on the board's page and on every API
 * response. When it differs from the last one this browser saw, every cached event is marked
 * stale: the next pull throws them all away before writing the week it fetched, and the throttle
 * is lifted so that pull happens now. Tasks are untouched; only what came from a calendar goes.
 */

const HEADER = 'X-WeekPal-Calendars';
const VERSION_KEY = 'weekpal-calendars-version';
const STALE_KEY = 'weekpal-events-stale';

const listeners = new Set<() => void>();

function read(key: string): string | null {
    try {
        return localStorage.getItem(key);
    } catch {
        return null;
    }
}

function write(key: string, value: string | null): void {
    try {
        if (value === null) {
            localStorage.removeItem(key);
        } else {
            localStorage.setItem(key, value);
        }
    } catch {
        // Blocked storage: the five-minute throttle is all there is, as before.
    }
}

/**
 * Record a version the host reported. Returns whether it was news.
 *
 * Absent is never news: a demo board, the offline shell and a server without the header all say
 * nothing, and saying nothing must not wipe a working cache.
 */
export function noteCalendarsVersion(version: string | null | undefined): boolean {
    if (!version || read(VERSION_KEY) === version) {
        return false;
    }

    write(VERSION_KEY, version);
    write(STALE_KEY, '1');
    // The task pull is what writes events, and it is the throttled one.
    write('tasks-last-sync', null);

    for (const listener of listeners) {
        listener();
    }

    return true;
}

/** Compare a response's calendars version against the last one seen. */
export function checkCalendarFence(response: { headers: { get(name: string): string | null } }): void {
    noteCalendarsVersion(response.headers.get(HEADER));
}

/** Whether the cached events predate a calendar change, so the next pull should drop them all. */
export function cachedEventsAreStale(): boolean {
    return read(STALE_KEY) === '1';
}

export function markEventsFresh(): void {
    write(STALE_KEY, null);
}

/** Called when a change is noticed, so what is on screen can be read again. */
export function subscribeToCalendarChanges(listener: () => void): () => void {
    listeners.add(listener);

    return () => {
        listeners.delete(listener);
    };
}
