import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { check, startDayWatch, stopDayWatch, subscribeToDayChange } from "../dayWatch";

/**
 * Noticing that the day changed while the tab sat there.
 *
 * The board lives in a tab nobody closes, and nothing re-renders a React tree at 3am. Without
 * this, a board opened on Thursday is still presenting last week as this week on Sunday.
 */
/**
 * Local time, not UTC.
 *
 * The watcher compares *calendar days as the user sees them*, so a test that sets the clock in
 * UTC is testing a different midnight from the one the code looks at — and passes or fails
 * depending on the machine's timezone.
 */
const at = (year: number, month: number, day: number, hour: number, minute: number, second = 0) =>
    new Date(year, month - 1, day, hour, minute, second);

afterEach(() => {
    stopDayWatch();
    jest.useRealTimers();
});

describe("the tick", () => {
    it("says nothing while the day is the same", () => {
        jest.useFakeTimers().setSystemTime(at(2026, 9, 8, 12, 0));
        startDayWatch();

        const seen: string[] = [];
        subscribeToDayChange((day) => seen.push(day));

        jest.setSystemTime(at(2026, 9, 8, 23, 59));
        check();

        expect(seen).toEqual([]);
    });

    it("announces the new day once it has arrived", () => {
        jest.useFakeTimers().setSystemTime(at(2026, 9, 8, 23, 59));
        startDayWatch();

        const seen: string[] = [];
        subscribeToDayChange((day) => seen.push(day));

        jest.setSystemTime(at(2026, 9, 9, 0, 1));
        check();

        expect(seen).toHaveLength(1);
    });

    it("announces it only once, however often it is asked", () => {
        jest.useFakeTimers().setSystemTime(at(2026, 9, 8, 23, 59));
        startDayWatch();

        const seen: string[] = [];
        subscribeToDayChange((day) => seen.push(day));

        jest.setSystemTime(at(2026, 9, 9, 0, 1));
        check();
        check();
        check();

        expect(seen).toHaveLength(1);
    });

    it("catches up across a weekend the machine spent asleep", () => {
        // Timers do not fire reliably in a hidden tab or on a sleeping machine, so the first
        // moment anything can run is often the user coming back to it.
        jest.useFakeTimers().setSystemTime(at(2026, 9, 4, 18, 0));
        startDayWatch();

        const seen: string[] = [];
        subscribeToDayChange((day) => seen.push(day));

        jest.setSystemTime(at(2026, 9, 7, 9, 0));
        check();

        expect(seen).toEqual(["2026-09-07"]);
    });

    it("checks on its own once a minute", () => {
        jest.useFakeTimers().setSystemTime(at(2026, 9, 8, 23, 59, 30));
        startDayWatch();

        const seen: string[] = [];
        subscribeToDayChange((day) => seen.push(day));

        // The tab that was never hidden — a second monitor, left visible across midnight, where
        // `visibilitychange` never fires at all.
        jest.setSystemTime(at(2026, 9, 9, 0, 0, 30));
        jest.advanceTimersByTime(60_000);

        expect(seen).toHaveLength(1);
    });

    it("starts only once, however many times it is called", () => {
        jest.useFakeTimers().setSystemTime(at(2026, 9, 8, 23, 59, 30));
        startDayWatch();
        startDayWatch();
        startDayWatch();

        const seen: string[] = [];
        subscribeToDayChange((day) => seen.push(day));

        jest.setSystemTime(at(2026, 9, 9, 0, 0, 30));
        jest.advanceTimersByTime(60_000);

        // Three intervals would announce the rollover three times over.
        expect(seen).toHaveLength(1);
    });

    it("stops listening once unsubscribed", () => {
        jest.useFakeTimers().setSystemTime(at(2026, 9, 8, 23, 59));
        startDayWatch();

        const seen: string[] = [];
        const unsubscribe = subscribeToDayChange((day) => seen.push(day));
        unsubscribe();

        jest.setSystemTime(at(2026, 9, 9, 0, 1));
        check();

        expect(seen).toEqual([]);
    });
});
