import React from "react";
import { Check, Trash2 } from "lucide-react";
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
 * - **Delete is a labelled button at the far end**, muted and deliberately away from everything
 *   else, and always undoable. A bare `×` read as "dismiss", not as "delete this task".
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
        <div className="flex items-center gap-x-2 gap-y-2 flex-wrap">
            {/* A button that looks like one, with a check: as a bare accent word it read as a
                label for the rail beside it. */}
            <button
                type="button"
                disabled={busy}
                onClick={onDone}
                className="
                    inline-flex items-center gap-1.5 self-stretch px-2.5 rounded-lg text-xs font-semibold cursor-pointer
                    border border-wp-border-strong text-wp-fg hover:border-wp-accent hover:text-wp-accent
                    focus-visible:outline-2 focus-visible:outline-wp-accent disabled:opacity-50
                "
            >
                <Check size={14} aria-hidden="true" />
                {t("leftovers.complete")}
            </button>

            <span className="w-px self-stretch my-1 bg-wp-border-strong" aria-hidden="true" />

            {/* The rail is the same verb seven times, so it is named once. */}
            <span className="text-xs text-wp-muted" aria-hidden="true">{t("leftovers.move_to")}</span>

            <LeftoverRail task={task} busy={busy} onMoveToDay={onMoveToDay} onMoveToWeek={onMoveToWeek} />

            {/* *(rt §6)* Only once the task has earned it. Offering "give up on this" on every row
                would make giving up the suggestion rather than the escape. */}
            {hasEscapeHatch(task.deferralCount) && (
                <button
                    type="button"
                    disabled={busy}
                    onClick={onSomeday}
                    className="
                        px-2 py-1 rounded-md text-xs cursor-pointer
                        text-wp-fg-secondary hover:bg-wp-track
                        focus-visible:outline-2 focus-visible:outline-wp-accent disabled:opacity-50
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
                className="
                    ml-auto inline-flex items-center gap-1.5 self-stretch px-2.5 rounded-lg text-xs cursor-pointer
                    text-wp-muted hover:text-wp-danger hover:bg-wp-danger-soft
                    focus-visible:outline-2 focus-visible:outline-wp-accent disabled:opacity-50
                "
            >
                <Trash2 size={14} aria-hidden="true" />
                {t("leftovers.delete")}
            </button>
        </div>
    );
};

export default LeftoverActions;
