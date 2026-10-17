import { beforeEach, describe, expect, it, jest } from "@jest/globals";

/**
 * Error reports, when the host application collects them.
 *
 * Nothing may be reported for a demo visitor or a self-hoster, every report must go through the
 * host's tunnel and survive being offline, and none may carry more about the person than an id.
 */
const init = jest.fn();
const setUser = jest.fn();

jest.mock("@sentry/react", () => ({
    init: (options: unknown) => init(options),
    setUser: (user: unknown) => setUser(user),
    makeBrowserOfflineTransport: (inner: unknown) => ({ offline: inner }),
    makeFetchTransport: "fetch",
    breadcrumbsIntegration: (options: unknown) => ({ name: "Breadcrumbs", options }),
}));

type Options = {
    dsn: string;
    tunnel: string;
    sendDefaultPii: boolean;
    transport: unknown;
    initialScope: { tags: Record<string, string>; user?: { id: string } };
    integrations: (defaults: { name: string }[]) => { name: string; options?: unknown }[];
    beforeSend: (event: { tags?: Record<string, string> }) => Promise<{ tags: Record<string, string> }>;
};

const load = async () => {
    jest.resetModules();
    return import("../monitoring");
};

beforeEach(() => {
    init.mockClear();
    setUser.mockClear();
    delete window.SENTRY_DSN;
    delete window.SENTRY_TUNNEL;
    delete window.SENTRY_USER_ID;
});

describe("starting", () => {
    it("reports nothing when the page names no DSN", async () => {
        const { startMonitoring, setMonitoringUser } = await load();

        startMonitoring();
        setMonitoringUser(4);

        expect(init).not.toHaveBeenCalled();
        expect(setUser).not.toHaveBeenCalled();
    });

    it("sends through the tunnel, keeps reports offline, and names the account by id only", async () => {
        window.SENTRY_DSN = "https://key@weekpal.test/2";
        window.SENTRY_TUNNEL = "https://weekpal.test/monitoring";
        window.SENTRY_USER_ID = 42;
        const { startMonitoring } = await load();

        startMonitoring();
        startMonitoring();

        expect(init).toHaveBeenCalledTimes(1);
        const options = init.mock.calls[0][0] as Options;
        expect(options.tunnel).toBe("https://weekpal.test/monitoring");
        expect(options.transport).toEqual({ offline: "fetch" });
        expect(options.sendDefaultPii).toBe(false);
        expect(options.initialScope.tags).toEqual({ runtime: "board" });
        expect(options.initialScope.user).toEqual({ id: "42" });
    });

    it("leaves console output out, since it can hold what the user wrote", async () => {
        window.SENTRY_DSN = "https://key@weekpal.test/2";
        const { startMonitoring } = await load();

        startMonitoring();

        const integrations = (init.mock.calls[0][0] as Options).integrations([{ name: "Breadcrumbs" }, { name: "Dedupe" }]);
        expect(integrations).toEqual([{ name: "Dedupe" }, { name: "Breadcrumbs", options: { console: false } }]);
    });
});

describe("what a report carries", () => {
    it("tags it with the board's sync state, the outbox included", async () => {
        window.SENTRY_DSN = "https://key@weekpal.test/2";
        const { startMonitoring, setOutboxReader } = await load();
        setOutboxReader(async () => ({ pending: 3, deadLetters: 1 }));

        startMonitoring();
        const event = await (init.mock.calls[0][0] as Options).beforeSend({ tags: { runtime: "board" } });

        expect(event.tags).toMatchObject({ runtime: "board", online: String(navigator.onLine), outbox: "3", dead_letters: "1" });
    });

    it("still sends the report when the outbox cannot be read", async () => {
        window.SENTRY_DSN = "https://key@weekpal.test/2";
        const { startMonitoring, setOutboxReader } = await load();
        setOutboxReader(async () => { throw new Error("IndexedDB is gone"); });

        startMonitoring();
        const event = await (init.mock.calls[0][0] as Options).beforeSend({});

        expect(event.tags).toHaveProperty("online");
        expect(event.tags).not.toHaveProperty("outbox");
    });

    it("learns the account after an offline start", async () => {
        window.SENTRY_DSN = "https://key@weekpal.test/2";
        const { startMonitoring, setMonitoringUser } = await load();

        startMonitoring();
        setMonitoringUser(7);

        expect(setUser).toHaveBeenCalledWith({ id: "7" });
    });
});
