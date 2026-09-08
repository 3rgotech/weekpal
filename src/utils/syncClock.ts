/**
 * What time this client claims it is, in a way the server can compare.
 *
 * Per-field last-write-wins is only as good as the timestamps it compares, and those come from
 * browsers — machines whose clocks are wrong in both directions, sometimes by years, and which
 * cannot be asked to be right. Three rules keep that from poisoning the resolver:
 *
 * 1. **Track the offset.** Every response carries `meta.server_time`; the difference is kept and
 *    added to the local clock. A machine ten minutes slow stops losing every conflict it enters
 *    against a machine that is correct.
 * 2. **Never go backwards.** The stamp is `max(local + offset, last issued + 1µs)`. Without it, a
 *    clock correction mid-session — an NTP sync, a timezone change, waking from sleep — makes the
 *    next write *older* than the one before it, and the client starts losing to itself.
 * 3. **Never go backwards past the server, either.** A stamp is also floored at the last
 *    `server_time` seen, so a client whose clock is badly behind cannot mint a timestamp that
 *    loses to a write it has already been told about.
 *
 * This is a hybrid logical clock with the interesting parts removed: monotonic, and close enough
 * to real time that a human reading the changelog is not confused.
 *
 * @see PROGRESS.md R26
 */

/** Milliseconds to add to the local clock to approximate the server's. */
let offsetMs = 0;

/** The last stamp handed out, so the next one is always strictly after it. */
let lastIssued = 0;

/** A counter of microseconds appended within one millisecond, so ties cannot happen locally. */
let withinMs = 0;

/** Told by every response. */
export function recordServerTime(serverTime: string | undefined | null): void {
    if (!serverTime) {
        return;
    }

    const server = Date.parse(serverTime);

    if (Number.isNaN(server)) {
        return;
    }

    offsetMs = server - Date.now();

    // Also a floor: a write minted after this must not lose to something the server has already
    // told us about.
    if (server > lastIssued) {
        lastIssued = server;
        withinMs = 0;
    }
}

/**
 * Stamp a gesture, right now.
 *
 * Called at the moment the user acts — never at flush. Stamping at flush would date every write
 * in an offline queue to the moment the network came back, which is the same instant for all of
 * them and is nobody's idea of when they happened. A fortnight of decisions would arrive
 * claiming to be simultaneous, and the resolver would have nothing to order them by.
 */
export function stampNow(): string {
    const candidate = Date.now() + offsetMs;

    if (candidate > lastIssued) {
        lastIssued = candidate;
        withinMs = 0;
    } else {
        // Same millisecond, or the clock moved back. Step forward inside the millisecond rather
        // than reusing a stamp.
        withinMs++;
    }

    return toIsoMicroseconds(lastIssued, withinMs);
}

/** The offset, for the status indicator and for tests. */
export function clockOffsetMs(): number {
    return offsetMs;
}

/**
 * ISO-8601 with a microsecond field, which is the precision the server compares at.
 *
 * JavaScript has milliseconds and no more, so the sub-millisecond digits carry the within-
 * millisecond counter instead. That is not a claim about real time — it is a tie-break the
 * server can read with the same parser as everything else.
 */
function toIsoMicroseconds(ms: number, extra: number): string {
    const base = new Date(ms).toISOString();
    const micros = String(Math.min(extra, 999)).padStart(3, '0');

    // "2026-09-08T10:00:00.123Z" -> "2026-09-08T10:00:00.123456Z"
    return base.replace(/\.(\d{3})Z$/, `.$1${micros}Z`);
}

/** Test seam. */
export function resetSyncClock(): void {
    offsetMs = 0;
    lastIssued = 0;
    withinMs = 0;
}
