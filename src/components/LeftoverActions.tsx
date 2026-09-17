import React from "react";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { WeeklyTask } from "../data/task";
import { DayOfWeek } from "../types";
import { hasEscapeHatch } from "../utils/deferral";
import LeftoverRail from "./LeftoverRail";

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
 * This is the list's half of R21. The card's half — Done bottom-left in the thumb zone, Someday
 * bottom-right, the rail pinned under the card — is `LeftoverStack`, the phone's review. The rail
 * itself is shared (`LeftoverRail`), so the two never disagree about which days are on offer.
 */
const LeftoverActions: React.FC<LeftoverActionsProps> = ({
    task, busy, onMoveToDay, onMoveToWeek, onSomeday, onDone, onDelete,
}) => {
    const { t } = useTranslation();

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

            <LeftoverRail task={task} busy={busy} onMoveToDay={onMoveToDay} onMoveToWeek={onMoveToWeek} />

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
