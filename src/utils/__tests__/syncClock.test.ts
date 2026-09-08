import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { clockOffsetMs, recordServerTime, resetSyncClock, stampNow } from "../syncClock";

/**
 * The timestamps the whole conflict resolver rests on.
 *
 * They come from browsers, whose clocks are wrong in both directions and cannot be asked to be
 * right. Everything here is about making a wrong clock survivable rather than pretending it is
 * correct.
 */
afterEach(() => {
    resetSyncClock();
    jest.useRealTimers();
});

describe("the offset", () => {
    it("learns how far this machine is from the server", () => {
        jest.useFakeTimers().setSystemTime(new Date("2026-09-08T12:00:00.000Z"));

        recordServerTime("2026-09-08T12:10:00.000Z");

        // Ten minutes slow. Without correcting for it, this client loses every conflict it
        // enters against one whose clock is right.
        expect(clockOffsetMs()).toBe(600_000);
    });

    it("applies the offset to its own stamps", () => {
        jest.useFakeTimers().setSystemTime(new Date("2026-09-08T12:00:00.000Z"));
        recordServerTime("2026-09-08T12:10:00.000Z");

        expect(stampNow().startsWith("2026-09-08T12:10:00")).toBe(true);
    });

    it("ignores a response that carries no server time", () => {
        recordServerTime(undefined);
        recordServerTime(null);
        recordServerTime("not a date");

        expect(clockOffsetMs()).toBe(0);
    });
});

describe("monotonicity", () => {
    it("never issues the same stamp twice", () => {
        jest.useFakeTimers().setSystemTime(new Date("2026-09-08T12:00:00.000Z"));

        const stamps = [stampNow(), stampNow(), stampNow()];

        expect(new Set(stamps).size).toBe(3);
    });

    it("keeps going forward when the clock jumps backwards", () => {
        // An NTP correction, a timezone change, a laptop waking up. Without this the next write
        // is *older* than the one before it and the client starts losing to itself.
        jest.useFakeTimers().setSystemTime(new Date("2026-09-08T12:00:00.000Z"));
        const before = stampNow();

        jest.setSystemTime(new Date("2026-09-08T11:00:00.000Z"));
        const after = stampNow();

        expect(after > before).toBe(true);
    });

    it("never mints a stamp older than a server time it has seen", () => {
        // A client badly behind must not be able to lose to a write it has already been told
        // about — it would keep re-sending changes that can never win.
        jest.useFakeTimers().setSystemTime(new Date("2020-01-01T00:00:00.000Z"));
        recordServerTime("2026-09-08T12:00:00.000Z");

        expect(stampNow() > "2026-09-08T12:00:00.000000Z").toBe(true);
    });

    it("stamps at microsecond precision, which is what the server compares at", () => {
        expect(stampNow()).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/);
    });
});
