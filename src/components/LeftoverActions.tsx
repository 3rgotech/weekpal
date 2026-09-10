import React from "react";
import clsx from "clsx";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { WeeklyTask } from "../data/task";
import { DayOfWeek } from "../types";
import { useCalendar } from "../contexts/CalendarContext";
import { useSettings } from "../contexts/SettingsContext";
import useDayJs from "../utils/dayjs";
import { boardDayOrder } from "../utils/week";
import { hasEscapeHatch } from "../utils/deferral";

interface LeftoverActionsProps {
    task: WeeklyTask;
    busy: boolean;
    onMoveToDay: (day: DayOfWeek) => void;
    onMoveToWeek: () => void;
    onSomeday: () => void;
    onDone: () => void;
    onDelete: () => void;
}

/**
 * What you can do with a task that never got done.
 *
 * *(rt §7)* The review was **backwards on both axes**: three of its five actions were the same
 * verb at different precision, hidden together behind one dropdown, while the destructive one sat
 * in the open. So the most common thing anybody wants to do — put it back on a day — took two
 * taps and a read, and the thing nobody wants to do by accident took one.
 *
 * Turned around:
 *
 * - **The days are a rail, not a menu.** Three moves collapse into one row of targets, and the
 *   task's original weekday is **pre-lit** showing its date while the others are letters — so the
 *   most-used action is one tap on the glowing thing.
 * - **`Any`** at the rail's end is "this week, no day yet", which is a real answer rather than an
 *   evasion — it is where a task goes when you know it matters and not when.
 * - **Some day** appears only once a task has earned it *(rt §6)*: on the top deferral tier. The
 *   offer to give up arrives when the evidence does, not on every row.
 * - **Delete is a low-contrast `×` at the far end**, deliberately away from everything else, and
 *   always undoable.
 *
 * Not the full R21: that design puts these on a *card* — Done bottom-left in the thumb zone,
 * Someday bottom-right — which is the mobile card stack (R22) and does not exist yet. What is
 * here is the part that is true of a list: the rail, the pre-lit day, and the demoted delete.
 */
const LeftoverActions: React.FC<LeftoverActionsProps> = ({
    task, busy, onMoveToDay, onMoveToWeek, onSomeday, onDone, onDelete,
}) => {
    const { t } = useTranslation();
    const { layout, dateOf } = useCalendar();
    const { settings } = useSettings();
    const dayjs = useDayJs(settings.language);

    // The same days the board draws, in the same order. A day the user has hidden is not a place
    // they can put anything, so offering it here would be offering a column they cannot see.
    const days = boardDayOrder(layout).filter((day) => day !== "0" && day !== "someday");

    const original = `${task.dayOfWeek}` as DayOfWeek;

    return (
        <div className="flex items-center gap-1 flex-wrap">
            <button
                type="button"
                disabled={busy}
                onClick={onDone}
                className="
                    px-2 py-1 rounded-md text-xs font-medium
                    text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30
                    focus-visible:outline-2 focus-visible:outline-sky-500 disabled:opacity-50
                "
            >
                {t("leftovers.complete")}
            </button>

            <span className="w-px h-4 bg-slate-200 dark:bg-sky-900 mx-0.5" aria-hidden="true" />

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
                        aria-label={date ? date.format("dddd D MMMM") : day}
                        className={clsx(
                            "min-w-7 px-1.5 py-1 rounded-md text-xs tabular-nums",
                            "focus-visible:outline-2 focus-visible:outline-sky-500 disabled:opacity-50",
                            isOriginal
                                ? "bg-sky-500 text-white font-semibold"
                                : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-sky-900",
                        )}
                    >
                        {isOriginal && date ? date.format("D") : (date?.format("dd").charAt(0) ?? day)}
                    </button>
                );
            })}

            <button
                type="button"
                disabled={busy}
                onClick={onMoveToWeek}
                className="
                    px-2 py-1 rounded-md text-xs
                    text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-sky-900
                    focus-visible:outline-2 focus-visible:outline-sky-500 disabled:opacity-50
                "
            >
                {t("leftovers.any")}
            </button>

            {/* *(rt §6)* Only once the task has earned it. Offering "give up on this" on every row
                would make giving up the suggestion rather than the escape. */}
            {hasEscapeHatch(task.deferralCount) && (
                <button
                    type="button"
                    disabled={busy}
                    onClick={onSomeday}
                    className="
                        px-2 py-1 rounded-md text-xs
                        text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-sky-900
                        focus-visible:outline-2 focus-visible:outline-sky-500 disabled:opacity-50
                    "
                >
                    {t("leftovers.some_day")}
                </button>
            )}

            {/* Last, low-contrast, and set apart: the one action nobody should reach by accident. */}
            <button
                type="button"
                disabled={busy}
                onClick={onDelete}
                aria-label={t("leftovers.delete")}
                title={t("leftovers.delete")}
                className="
                    ml-auto p-1 rounded text-slate-300 dark:text-slate-600
                    hover:text-red-600 dark:hover:text-red-400
                    focus-visible:outline-2 focus-visible:outline-sky-500 disabled:opacity-50
                "
            >
                <X size={14} />
            </button>
        </div>
    );
};

export default LeftoverActions;
