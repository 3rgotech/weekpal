import { newId } from './id';

/**
 * A stable name for this browser, minted once and kept.
 *
 * Two things need it. Conflict recovery: without a device on the changelog row, the history can
 * record that a value lost but never who it lost to, so "your laptop overwrote this" is a
 * sentence the data cannot produce. And tie-breaking: when two writes carry the exact same
 * timestamp, the resolver picks the lower device id — arbitrary, but it must be *consistent*, or
 * two devices resolving the same pair offline reach different answers and overwrite each other
 * for ever.
 *
 * `localStorage`, not a cookie or IndexedDB: it survives a reload and a restart, it is cheap to
 * read synchronously on the write path, and losing it costs nothing. A cleared store means a new
 * device id, which reads as "a new browser" — which, as far as any of this is concerned, it is.
 */
const STORAGE_KEY = 'weekpal-device-id';

let cached: string | null = null;

export function deviceId(): string {
    if (cached !== null) {
        return cached;
    }

    try {
        const stored = localStorage.getItem(STORAGE_KEY);

        if (stored) {
            cached = stored;

            return cached;
        }
    } catch {
        // Private mode, or a browser set to block site data. An ephemeral id is still better
        // than none — it is stable for this session, which covers the tie-break, and the
        // changelog records something rather than null.
    }

    cached = newId();

    try {
        localStorage.setItem(STORAGE_KEY, cached);
    } catch {
        // As above. Nothing here is worth failing a write over.
    }

    return cached;
}

/** Test seam. */
export function resetDeviceId(): void {
    cached = null;
}
