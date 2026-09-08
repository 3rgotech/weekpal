/**
 * Which tab is allowed to talk to the server.
 *
 * The board is furniture: it lives in a permanently-open tab, and a permanently-open tab becomes
 * three of them. Every one of those runs its own `SyncService` over the same IndexedDB database,
 * so the first "two devices in conflict" this product ever sees is one laptop arguing with
 * itself — two tabs draining the same queue, racing on the same rows, and each writing back a
 * server response the other has already superseded.
 *
 * A Web Lock settles it for about ten lines. One tab holds `weekpal-sync` for as long as it is
 * open; that tab is the only one that flushes. The others keep working exactly as before —
 * writes go to Dexie, which is shared — and tell the leader there is something to send.
 *
 * This removes most real-world conflict volume *before a packet leaves the machine*, which is
 * the cheapest place to remove it. Everything downstream (the per-field resolver, the mutation
 * dedupe) still has to be right, but it stops being right about a problem we manufactured.
 *
 * @see PROGRESS.md R24
 */

const LOCK_NAME = 'weekpal-sync';
const CHANNEL_NAME = 'weekpal-tabs';

/**
 * What one tab says to the others.
 *
 * `flush`: a follower has queued a write and wants the leader to send it now, rather than at
 * whatever the leader's next trigger would have been.
 *
 * `changed`: the leader has pulled or written back, so the shared database no longer matches
 * what a follower is showing. Followers re-read Dexie; nothing is sent with the message, because
 * the database *is* the message and shipping a copy of a row invites the two to disagree.
 */
export type TabMessage =
    | { kind: 'flush' }
    | { kind: 'changed' };

type LeadershipListener = (isLeader: boolean) => void;
type MessageListener = (message: TabMessage) => void;

/**
 * Optimistic, and deliberately so.
 *
 * A browser with no `navigator.locks` — or one that never grants it — must not end up with a
 * board that never syncs. Starting as the leader means the worst case is exactly today's
 * behaviour (every tab flushes), never a silent stall.
 */
let leader = true;
let started = false;
let releaseLock: (() => void) | null = null;
let channel: BroadcastChannel | null = null;

const leadershipListeners = new Set<LeadershipListener>();
const messageListeners = new Set<MessageListener>();

export function isLeaderTab(): boolean {
    return leader;
}

/**
 * Claim the lock, and open the channel.
 *
 * Called once from `App`. Safe to call again — a second call is ignored rather than opening a
 * second channel, because `DataProvider` rebuilding its stores must not cost another listener.
 */
export function startTabLeadership(): void {
    if (started) {
        return;
    }

    started = true;

    openChannel();

    const locks = navigator.locks;

    if (!locks) {
        // No Web Locks. Stay leader, behave as the board always has, and say so once — this is
        // the branch old Safari takes, and a silent fallback is one nobody ever notices is on.
        console.info('[weekpal] navigator.locks is unavailable; this tab will sync on its own.');

        return;
    }

    // Not the leader until the lock is actually granted. Assuming otherwise would let a second
    // tab flush for however long the request takes to be answered, which is the exact window
    // this exists to close.
    setLeader(false);

    void locks
        .request(LOCK_NAME, { mode: 'exclusive' }, () => {
            setLeader(true);

            // Held, never resolved: the callback's promise is the lock's lifetime, so this tab
            // keeps it until the page goes away or `stopTabLeadership` releases it. The next
            // tab in line is granted it automatically at that moment — there is no election to
            // run and no heartbeat to miss.
            return new Promise<void>((resolve) => {
                releaseLock = resolve;
            });
        })
        .catch(() => {
            // The request was aborted, or the API refused it. Falling back to leading is the
            // safe direction: duplicated effort, never a queue nobody drains.
            setLeader(true);
        });
}

/** Tell the other tabs something. A no-op where `BroadcastChannel` is missing. */
export function broadcastToTabs(message: TabMessage): void {
    channel?.postMessage(message);
}

export function subscribeToLeadership(listener: LeadershipListener): () => void {
    listener(leader);
    leadershipListeners.add(listener);

    return () => {
        leadershipListeners.delete(listener);
    };
}

export function subscribeToTabMessages(listener: MessageListener): () => void {
    messageListeners.add(listener);

    return () => {
        messageListeners.delete(listener);
    };
}

/** Give up the lock so another tab can take it. Test seam, and the unload path. */
export function stopTabLeadership(): void {
    releaseLock?.();
    releaseLock = null;

    channel?.close();
    channel = null;

    started = false;
    leader = true;
    leadershipListeners.clear();
    messageListeners.clear();
}

function openChannel(): void {
    if (typeof BroadcastChannel === 'undefined') {
        // Followers cannot nudge the leader, so a queued write waits for the leader's own next
        // trigger instead of going immediately. Slower, never lost.
        return;
    }

    channel = new BroadcastChannel(CHANNEL_NAME);
    channel.onmessage = (event: MessageEvent<TabMessage>) => {
        messageListeners.forEach((listener) => listener(event.data));
    };
}

function setLeader(next: boolean): void {
    if (next === leader) {
        return;
    }

    leader = next;
    leadershipListeners.forEach((listener) => listener(next));
}
