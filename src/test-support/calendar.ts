import { Dayjs } from "dayjs";
import { DayOfWeek, Settings } from "../types";
import { getDayJs } from "../utils/dayjs";
import { DEFAULT_SETTINGS } from "../utils/settings";
import { Weekday, dateOfDay, weekAnchor, weekCodeOf, weekLayout, weekStart } from "../utils/week";

/**
 * A stand-in for `CalendarContext`, derived from the settings the test is running with.
 *
 * Components mock the calendar rather than mounting its provider, and a hand-written literal
 * drifts from the real thing the moment a field is added — which is what happened to every one of
 * these when the week gained a configurable start day. Built from the same helpers the provider
 * uses, so a mocked board and a real one disagree only about the clock.
 */
export function fakeCalendar(
    now: Dayjs,
    settings: Settings = DEFAULT_SETTINGS,
    overrides: Record<string, unknown> = {},
) {
    const weekStartsOn = settings.weekStartsOn;
    const firstDayOfWeek = weekStart(now, weekStartsOn);

    return {
        currentDate: now,
        currentWeek: weekCodeOf(now, weekStartsOn),
        thisWeek: weekCodeOf(getDayJs()(), weekStartsOn),
        currentWeekNumber: weekAnchor(now, weekStartsOn).isoWeek(),
        firstDayOfWeek,
        dateOf: (day: DayOfWeek): Dayjs | null => (
            day === "0" || day === "someday"
                ? null
                : dateOfDay(firstDayOfWeek, parseInt(day, 10) as Weekday, weekStartsOn)
        ),
        layout: weekLayout(settings.workingDays, settings.showNonWorkingDays, weekStartsOn),
        goToPreviousWeek: () => { },
        goToNextWeek: () => { },
        goToToday: () => { },
        ...overrides,
    };
}
