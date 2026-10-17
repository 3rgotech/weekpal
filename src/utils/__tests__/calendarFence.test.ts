import { beforeEach, describe, expect, it } from "@jest/globals";
import { cachedEventsAreStale, checkCalendarFence, markEventsFresh, noteCalendarsVersion, subscribeToCalendarChanges } from "../calendarFence";

const response = (version: string | null) => ({ headers: { get: (name: string) => (name === "X-WeekPal-Calendars" ? version : null) } });

beforeEach(() => {
    localStorage.clear();
});

describe("the calendar fence", () => {
    it("marks cached events stale and lifts the pull throttle when the version changes", () => {
        localStorage.setItem("tasks-last-sync", Date.now().toString());
        const heard = jest.fn();
        const unsubscribe = subscribeToCalendarChanges(heard);

        checkCalendarFence(response("01KVERSIONA"));

        expect(cachedEventsAreStale()).toBe(true);
        expect(localStorage.getItem("tasks-last-sync")).toBeNull();
        expect(heard).toHaveBeenCalledTimes(1);

        unsubscribe();
    });

    it("says nothing about a version it has already seen", () => {
        noteCalendarsVersion("01KVERSIONA");
        markEventsFresh();
        const heard = jest.fn();
        const unsubscribe = subscribeToCalendarChanges(heard);

        checkCalendarFence(response("01KVERSIONA"));

        expect(cachedEventsAreStale()).toBe(false);
        expect(heard).not.toHaveBeenCalled();

        unsubscribe();
    });

    it("treats a missing version as no news, not as a change", () => {
        noteCalendarsVersion("01KVERSIONA");
        markEventsFresh();

        checkCalendarFence(response(null));
        expect(noteCalendarsVersion(undefined)).toBe(false);
        expect(noteCalendarsVersion(null)).toBe(false);
        expect(cachedEventsAreStale()).toBe(false);
    });
});
