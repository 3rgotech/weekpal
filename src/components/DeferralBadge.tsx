import React from "react";
import clsx from "clsx";
import { useTranslation } from "react-i18next";
import Task from "../data/task";
import { deferralLabel, deferralTier, hasEscapeHatch } from "../utils/deferral";

interface DeferralBadgeProps {
    task: Task;
    /** Opens R20's three doors. Absent where there is nowhere to put them, such as the print sheet. */
    onOpenEscape?: (task: Task) => void;
}

/**
 * How many times this task has been carried.
 *
 * *(rt §6)* Achromatic and capped. **Colour belongs to categories** — the sixteen hues are the
 * only system on this board doing semantic work, and a new one here would compete with the thing
 * colour already means. Red especially: red means error, and a task deferred five times is not
 * an error, it is a signal about fit.
 *
 * Escalation is in **fill**, never in size. A badge that grew would change the card's metrics,
 * and a column of cards whose heights disagree reads as damage rather than as emphasis.
 *
 * At the top tier the badge becomes a button, because escalation without an exit is nagging with
 * better typography.
 */
const DeferralBadge: React.FC<DeferralBadgeProps> = ({ task, onOpenEscape }) => {
    const { t } = useTranslation();
    const tier = deferralTier(task.deferralCount);

    if (tier === "none") {
        return null;
    }

    const label = deferralLabel(task.deferralCount);
    // A fact about the card, never a verb aimed at the reader: "moved 4 times", not "you
    // postponed this 4 times". The board has no business making an accusation.
    const description = t("deferral.moved", { count: task.deferralCount });

    const className = clsx(
        "shrink-0 rounded-full text-[0.65rem] leading-none tabular-nums select-none",
        // Identical box in every tier, so nothing shifts as a task escalates.
        "px-1.5 py-1 min-w-[1.4rem] text-center",
        tier === "muted" && "text-slate-500 dark:text-slate-400",
        tier === "pill" && "bg-slate-200 text-slate-700 dark:bg-sky-900 dark:text-slate-200",
        tier === "heavy" && "bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-medium",
    );

    if (!hasEscapeHatch(task.deferralCount) || !onOpenEscape) {
        return <span className={className} title={description} aria-label={description}>{label}</span>;
    }

    return (
        <button
            type="button"
            className={clsx(className, "hover:opacity-80 focus-visible:outline-2 focus-visible:outline-sky-500")}
            title={t("deferral.escape_hint")}
            aria-label={`${description}. ${t("deferral.escape_hint")}`}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
                // The card is a drag handle and opens the editor on click; neither should happen
                // when the target was the badge.
                event.stopPropagation();
                onOpenEscape(task);
            }}
        >
            {label}
        </button>
    );
};

export default DeferralBadge;
