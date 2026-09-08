import { SyncFailureKind } from "../types";

export type SyncHealth = 'ok' | 'unauthorized' | 'forbidden';

type Listener = (health: SyncHealth) => void;

let current: SyncHealth = 'ok';
const listeners = new Set<Listener>();

/**
 * Whether the backend is currently refusing us, and why.
 *
 * Without this the app has no way to say so. Every failure path — the write queue and both pull
 * paths — swallowed its error into `console.error`, so a board that had stopped syncing looked
 * exactly like one that was up to date. That became reachable in normal use once the API token
 * gained an expiry: twelve hours in, every request 401s and the user is still typing into a
 * board that is quietly saving nothing.
 *
 * Queued writes are never discarded on either status. A 401 is fixed by getting a new token and
 * a 403 by changing plan; neither means the work was invalid.
 */
export function getSyncHealth(): SyncHealth {
    return current;
}

export function reportSyncHealth(health: SyncHealth): void {
    if (health === current) {
        return;
    }

    current = health;
    listeners.forEach((listener) => listener(current));
}

/**
 * Report a failure, ignoring the kinds that say nothing about our standing with the backend.
 *
 * A transient failure is the network, and a permanent one is a bad payload — neither should
 * raise an alarm about the session.
 */
export function reportSyncFailure(kind: SyncFailureKind): void {
    if (kind === 'unauthorized' || kind === 'forbidden') {
        reportSyncHealth(kind);
    }
}

export function subscribeToSyncHealth(listener: Listener): () => void {
    listeners.add(listener);
    listener(current);

    return () => {
        listeners.delete(listener);
    };
}

/** Test seam. */
export function resetSyncHealth(): void {
    current = 'ok';
    listeners.clear();
    supersededCount = 0;
    supersededListeners.clear();
}

/*
|------------------------------------------------------------------------------
| Superseded writes
|------------------------------------------------------------------------------
|
| A change the user made that another device had already overruled.
|
| Not a failure — the sync worked exactly as designed — but it is the one outcome the user has
| a right to be told about, because their screen is about to show something they did not type.
| Silently repainting is what makes an offline app feel haunted.
|
| Counted rather than described here; naming the fields is a UI decision and belongs with
| whatever eventually surfaces it. See PROGRESS.md R27.
*/

type SupersededListener = (count: number) => void;

let supersededCount = 0;
const supersededListeners = new Set<SupersededListener>();

export function reportSuperseded(count: number): void {
    if (count <= 0) {
        return;
    }

    supersededCount += count;
    supersededListeners.forEach((listener) => listener(supersededCount));
}

export function getSupersededCount(): number {
    return supersededCount;
}

/** Called once the user has been shown the tally. */
export function clearSuperseded(): void {
    supersededCount = 0;
    supersededListeners.forEach((listener) => listener(0));
}

export function subscribeToSuperseded(listener: SupersededListener): () => void {
    listener(supersededCount);
    supersededListeners.add(listener);

    return () => {
        supersededListeners.delete(listener);
    };
}
