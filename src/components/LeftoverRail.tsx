import React from "react";
import clsx from "clsx";
import { useTranslation } from "react-i18next";
import { WeeklyTask } from "../data/task";
import { DayOfWeek } from "../types";
import { useCalendar } from "../contexts/CalendarContext";
import { useSettings } from "../contexts/SettingsContext";
import { weekCodeToDate } from "../utils/dayjs";
import { Weekday, boardDayOrder, dateOfWeekDay } from "../utils/week";

interface LeftoverRailProps {
    task: WeeklyTask;
    busy: boolean;
    onMoveToDay: (day: DayOfWeek) => void;
    onMoveToWeek: () => void;
    /**
     * `row` sits under a list row and fits beside its neighbours; `bar` is pinned to the bottom of
     * a phone and gets the whole width, so its pills are the size of the board's own `DayNav`.
     */
    variant?: "row" | "bar";
}

/**
 * The incoming week as a row of targets.
 *
 * *(rt §7)* Three of the review's five actions were the same verb at different precision — put it
 * on the same day, put it somewhere this week, put it on a day of my choosing — and they collapse
 * onto one rail. The task's **original weekday is pre-lit**, showing its date while the others are
 * letters, so the most-used action is one tap on the thing that is already glowing. **`Any`** at
 * the end is "this week, no day yet": reading order puts the precise targets first and the
 * fallback last.
 *
 * The days are **this week's**, whichever week the board happens to be showing. The rail moves
 * a task into the present, and the pre-lit pill has to name the date it will land on — not the
 * date of the same weekday in whatever week the user was browsing when the review opened.
 */
const LeftoverRail: React.FC<LeftoverRailProps> = ({
    task, busy, onMoveToDay, onMoveToWeek, variant = "row",
}) => {
    const { t } = useTranslation();
    const { layout, thisWeek } = useCalendar();
    const { settings } = useSettings();

    // The same days the board draws, in the same order. A day the user has hidden is not a place
    // they can put anything, so offering it here would be offering a column they cannot see.
    const days = boardDayOrder(layout).filter((day) => day !== "0" && day !== "someday");

    const original = `${task.dayOfWeek}` as DayOfWeek;
    const monday = weekCodeToDate(thisWeek);

    const dateOf = (day: DayOfWeek) => dateOfWeekDay(monday, parseInt(day, 10) as Weekday, settings.weekStartsOn);

    const bar = variant === "bar";

    return (
        <div
            className={clsx(
                "flex items-center",
                bar ? "gap-1 w-full" : "gap-1 flex-wrap",
            )}
            data-testid="leftover-rail"
        >
            {days.map((day) => {
                const isOriginal = day === original;
                const date = dateOf(day);

                return (
                    <button
                        key={day}
                        type="button"
                        disabled={busy}
                        onClick={() => onMoveToDay(day)}
                        // The pill shows a letter; the pre-lit one shows its date, because "the
                        // same day next week" is a date rather than a weekday as far as anybody
                        // deciding is concerned.
                        aria-label={date.format("dddd D MMMM")}
                        className={clsx(
                            "rounded-md tabular-nums",
                            "focus-visible:outline-2 focus-visible:outline-sky-500 disabled:opacity-50",
                            bar ? "flex-1 min-w-0 py-2.5 text-sm rounded-full" : "min-w-7 px-1.5 py-1 text-xs",
                            isOriginal
                                ? "bg-sky-500 text-white font-semibold"
                                : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-sky-900",
                        )}
                    >
                        {isOriginal ? date.format("D") : date.format("dd").charAt(0)}
                    </button>
                );
            })}

            <button
                type="button"
                disabled={busy}
                onClick={onMoveToWeek}
                className={clsx(
                    "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-sky-900",
                    "focus-visible:outline-2 focus-visible:outline-sky-500 disabled:opacity-50",
                    bar ? "flex-1 min-w-0 py-2.5 text-sm rounded-full" : "px-2 py-1 rounded-md text-xs",
                )}
            >
                {t("leftovers.any")}
            </button>
        </div>
    );
};

export default LeftoverRail;
