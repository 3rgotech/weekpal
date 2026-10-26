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
    /** The `bar` only: offered beside "no set day" when given, for a card that has earned it. */
    onSomeday?: () => void;
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
 * onto one rail. Each pill is a weekday over its date, and the task's **original weekday is
 * pre-lit**, so the most-used action is one tap on the thing that is already glowing. **`Any`** at
 * the end is "this week, no day yet": reading order puts the precise targets first and the
 * fallback last.
 *
 * The days are **this week's**, whichever week the board happens to be showing. The rail moves
 * a task into the present, and the pre-lit pill has to name the date it will land on — not the
 * date of the same weekday in whatever week the user was browsing when the review opened.
 */
const LeftoverRail: React.FC<LeftoverRailProps> = ({
    task, busy, onMoveToDay, onMoveToWeek, onSomeday, variant = "row",
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

    const pills = days.map((day) => {
        const isOriginal = day === original;
        const date = dateOf(day);

        return (
            <button
                key={day}
                type="button"
                disabled={busy}
                onClick={() => onMoveToDay(day)}
                // Every pill is a small calendar day — weekday over date — so the pre-lit
                // one reads as "this day" rather than as a stray number among letters.
                aria-label={date.format("dddd D MMMM")}
                className={clsx(
                    "flex flex-col items-center justify-center leading-tight tabular-nums cursor-pointer",
                    "focus-visible:outline-2 focus-visible:outline-wp-accent disabled:opacity-50",
                    bar ? "flex-1 min-w-0 py-2 rounded-xl" : "min-w-9 px-1.5 py-1 rounded-lg",
                    isOriginal
                        ? "bg-wp-accent text-wp-on-accent"
                        // On a phone every day sits on a tile: bare numbers along the
                        // bottom of the screen read as a footer, not as targets.
                        : bar ? "bg-wp-track text-wp-fg active:bg-wp-border-strong" : "text-wp-fg hover:bg-wp-track",
                )}
            >
                <span
                    className={clsx(
                        "text-[10px] font-semibold uppercase tracking-wide",
                        !isOriginal && "text-wp-muted",
                    )}
                    aria-hidden="true"
                >
                    {date.format("dd").charAt(0)}
                </span>
                <span className={clsx(bar ? "text-base" : "text-sm", "font-semibold")} aria-hidden="true">
                    {date.format("D")}
                </span>
            </button>
        );
    });

    const any = (
        <button
            type="button"
            disabled={busy}
            onClick={onMoveToWeek}
            className={clsx(
                "cursor-pointer",
                "focus-visible:outline-2 focus-visible:outline-wp-accent disabled:opacity-50",
                bar
                    ? "flex-1 min-w-0 py-2.5 text-sm rounded-xl border border-wp-border-strong text-wp-fg active:bg-wp-track"
                    : "self-stretch px-2.5 rounded-lg text-xs text-wp-fg-secondary hover:bg-wp-track",
            )}
        >
            {t("leftovers.any")}
        </button>
    );

    // On a phone the days get the whole width, and "no set day" a row of its own under them:
    // squeezed in as an eighth pill, it wrapped onto three lines.
    if (bar) {
        return (
            <div className="flex flex-col gap-2 w-full" data-testid="leftover-rail">
                <div className="flex items-stretch gap-1 w-full">{pills}</div>
                <div className="flex gap-2 w-full">
                    {any}
                    {onSomeday && (
                        <button
                            type="button"
                            disabled={busy}
                            onClick={onSomeday}
                            className="
                                flex-1 min-w-0 py-2.5 text-sm rounded-xl cursor-pointer
                                border border-wp-border-strong text-wp-fg-secondary active:bg-wp-track
                                focus-visible:outline-2 focus-visible:outline-wp-accent disabled:opacity-50
                            "
                        >
                            {t("leftovers.some_day")}
                        </button>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-1 flex-wrap" data-testid="leftover-rail">
            {pills}
            {any}
        </div>
    );
};

export default LeftoverRail;
