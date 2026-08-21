/**
 * @jest-environment jsdom
 */
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import {
    configureConnectivity,
    isReachable,
    probe,
    probeIfStale,
    resetConnectivity,
    subscribeToConnectivity,
} from "../connectivity";

/**
 * Connectivity is two questions, and neither answers alone.
 *
 * `navigator.onLine` knows only about the local link — it says "online" behind a captive portal
 * and while the API is restarting. `/status` knows whether the API answers but costs a request.
 * So: the machine's answer first as a free negative, then the API's.
 */
/**
 * jsdom ships no `Response`, so constructing one throws and every mocked call would take
 * `probe`'s catch path — which quietly turns the "unreachable" tests into tests of the wrong
 * thing. `probe` reads `.ok` and nothing else, so a plain object is both sufficient and honest.
 */
const respondsWith = (ok: boolean) => jest.fn(async () => ({ ok }) as Response);

const setBrowserOnline = (online: boolean) => {
    Object.defineProperty(window.navigator, 'onLine', { value: online, configurable: true });
};

beforeEach(() => {
    resetConnectivity();
    setBrowserOnline(true);
    configureConnectivity({ baseApiUrl: 'https://api.test/api/v1', dataSource: 'api' });
});

describe("probe", () => {
    it("asks the status endpoint and reports reachable on a 200", async () => {
        const fetchMock = respondsWith(true);
        (globalThis as any).fetch = fetchMock;

        expect(await probe()).toBe(true);
        expect(isReachable()).toBe(true);

        const [url, init] = fetchMock.mock.calls[0] as [string, any];
        expect(url).toBe('https://api.test/api/v1/status');
        // Unauthenticated on purpose: an expired token must not read as being offline.
        expect(init.headers.Authorization).toBeUndefined();
    });

    it("reports unreachable when the API answers with an error", async () => {
        (globalThis as any).fetch = respondsWith(false);

        expect(await probe()).toBe(false);
        expect(isReachable()).toBe(false);
    });

    it("reports unreachable when the request never completes", async () => {
        // A captive portal that swallows the request, or DNS failing.
        (globalThis as any).fetch = jest.fn(async () => { throw new TypeError('Failed to fetch'); });

        expect(await probe()).toBe(false);
        expect(isReachable()).toBe(false);
    });

    it("does not send a request when the machine says it is offline", async () => {
        const fetchMock = respondsWith(true);
        (globalThis as any).fetch = fetchMock;
        setBrowserOnline(false);

        expect(await probe()).toBe(false);
        // The free negative: no point waiting for a timeout to tell us what we know.
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it("stays offline while the machine is offline, whatever the API last said", async () => {
        (globalThis as any).fetch = respondsWith(true);
        await probe();
        expect(isReachable()).toBe(true);

        setBrowserOnline(false);

        // No new probe — the cached API answer is still "yes", but the machine overrides it.
        expect(isReachable()).toBe(false);
    });

    it("treats a demo or test board as reachable without calling anything", async () => {
        // There is no API behind those, so probing would mark a local-only session offline.
        const fetchMock = jest.fn();
        (globalThis as any).fetch = fetchMock;
        configureConnectivity({ baseApiUrl: 'https://api.test/api/v1', dataSource: 'demo' });

        expect(await probe()).toBe(true);
        expect(fetchMock).not.toHaveBeenCalled();
    });
});

describe("probeIfStale", () => {
    it("reuses a fresh answer instead of asking again", async () => {
        const fetchMock = respondsWith(true);
        (globalThis as any).fetch = fetchMock;

        await probe();
        await probeIfStale();
        await probeIfStale();

        // A burst of writes must not become a burst of probes.
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });
});

describe("subscribers", () => {
    it("is told when reachability changes, and not when it does not", async () => {
        const seen: boolean[] = [];
        subscribeToConnectivity((reachable) => seen.push(reachable));

        (globalThis as any).fetch = respondsWith(false);
        await probe();
        await probe();

        // The initial value, then one change — not one per probe.
        expect(seen).toEqual([true, false]);
    });
});
