import { afterEach, describe, expect, it, jest } from "@jest/globals";
import {
    broadcastToTabs,
    isLeaderTab,
    startTabLeadership,
    stopTabLeadership,
    subscribeToLeadership,
    subscribeToTabMessages,
} from "../tabLeader";

/**
 * Which tab may talk to the server.
 *
 * The failure this prevents is invisible in a single-tab test run and obvious on a real desk:
 * three copies of the board, three sync loops, one shared queue. So the assertions here are
 * mostly about the *other* tab — the one that must stay quiet.
 */

type LockCallback = () => Promise<void>;

interface FakeLockManager {
    request: (name: string, options: unknown, callback: LockCallback) => Promise<void>;
}

const originalLocks = (navigator as unknown as { locks?: unknown }).locks;
const originalChannel = (globalThis as unknown as { BroadcastChannel?: unknown }).BroadcastChannel;

function installLocks(manager: FakeLockManager | undefined): void {
    Object.defineProperty(navigator, "locks", {
        value: manager,
        configurable: true,
        writable: true,
    });
}

/** Grants the lock immediately, as an uncontended browser does. */
const grantingLocks = (): FakeLockManager => ({
    request: (_name, _options, callback) => callback(),
});

/** Accepts the request and never calls back — a second tab, waiting behind the first. */
const withholdingLocks = (): FakeLockManager => ({
    request: () => new Promise<void>(() => undefined),
});

afterEach(() => {
    stopTabLeadership();
    installLocks(originalLocks as FakeLockManager | undefined);
    Object.defineProperty(globalThis, "BroadcastChannel", {
        value: originalChannel,
        configurable: true,
        writable: true,
    });
    jest.restoreAllMocks();
});

describe("leadership", () => {
    it("leads when the lock is granted", async () => {
        installLocks(grantingLocks());

        startTabLeadership();
        await Promise.resolve();

        expect(isLeaderTab()).toBe(true);
    });

    it("does not lead while another tab holds the lock", async () => {
        installLocks(withholdingLocks());

        startTabLeadership();
        await Promise.resolve();

        expect(isLeaderTab()).toBe(false);
    });

    it("leads when the browser has no Web Locks at all", async () => {
        // Old Safari. The fallback has to be "sync anyway": duplicated effort is survivable, a
        // board that silently never reaches the server is not.
        installLocks(undefined);
        jest.spyOn(console, "info").mockImplementation(() => undefined);

        startTabLeadership();
        await Promise.resolve();

        expect(isLeaderTab()).toBe(true);
    });

    it("leads when the lock request is refused", async () => {
        installLocks({ request: () => Promise.reject(new Error("nope")) });

        startTabLeadership();
        await Promise.resolve();
        await Promise.resolve();

        expect(isLeaderTab()).toBe(true);
    });

    it("starts only once, however many times it is called", async () => {
        const request = jest.fn(((_n: string, _o: unknown, callback: LockCallback) =>
            callback()) as FakeLockManager["request"]);
        installLocks({ request });

        startTabLeadership();
        startTabLeadership();
        startTabLeadership();
        await Promise.resolve();

        // `DataProvider` rebuilds its stores whenever the adapters change; a second claim per
        // rebuild would mean a second channel and a second set of listeners.
        expect(request).toHaveBeenCalledTimes(1);
    });

    it("tells a subscriber the current answer before anything changes", async () => {
        installLocks(withholdingLocks());
        startTabLeadership();
        await Promise.resolve();

        const seen: boolean[] = [];
        subscribeToLeadership((leader) => seen.push(leader));

        expect(seen).toEqual([false]);
    });

    it("announces the promotion when the lock finally arrives", async () => {
        let grant: LockCallback | null = null;
        installLocks({
            request: (_name, _options, callback) => {
                grant = callback;

                return new Promise<void>(() => undefined);
            },
        });

        startTabLeadership();
        await Promise.resolve();

        const seen: boolean[] = [];
        subscribeToLeadership((leader) => seen.push(leader));

        void grant!();
        await Promise.resolve();

        // The tab in front closed. This one is now the only one that may send.
        expect(seen).toEqual([false, true]);
    });
});

describe("talking to the other tabs", () => {
    it("posts a message on the channel", async () => {
        const postMessage = jest.fn();
        class FakeChannel {
            onmessage: unknown = null;

            postMessage = postMessage;

            close = jest.fn();
        }
        Object.defineProperty(globalThis, "BroadcastChannel", {
            value: FakeChannel,
            configurable: true,
            writable: true,
        });
        installLocks(grantingLocks());

        startTabLeadership();
        await Promise.resolve();
        broadcastToTabs({ kind: "flush" });

        expect(postMessage).toHaveBeenCalledWith({ kind: "flush" });
    });

    it("hands an incoming message to its subscribers", async () => {
        let deliver: ((event: { data: unknown }) => void) | null = null;
        class FakeChannel {
            set onmessage(handler: (event: { data: unknown }) => void) {
                deliver = handler;
            }

            postMessage = jest.fn();

            close = jest.fn();
        }
        Object.defineProperty(globalThis, "BroadcastChannel", {
            value: FakeChannel,
            configurable: true,
            writable: true,
        });
        installLocks(grantingLocks());

        startTabLeadership();
        await Promise.resolve();

        const received: unknown[] = [];
        subscribeToTabMessages((message) => received.push(message));
        deliver!({ data: { kind: "changed" } });

        expect(received).toEqual([{ kind: "changed" }]);
    });

    it("survives a browser with no BroadcastChannel", async () => {
        Object.defineProperty(globalThis, "BroadcastChannel", {
            value: undefined,
            configurable: true,
            writable: true,
        });
        installLocks(grantingLocks());

        startTabLeadership();
        await Promise.resolve();

        // A follower cannot nudge the leader, so its write waits for the leader's own next
        // trigger. Slower, never lost — and never a thrown error either.
        expect(() => broadcastToTabs({ kind: "flush" })).not.toThrow();
    });
});
