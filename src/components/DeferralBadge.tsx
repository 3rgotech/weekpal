import React from "react";
import clsx from "clsx";
import { Tooltip } from "@heroui/react";
import { CalendarClock } from "lucide-react";
import { useTranslation } from "react-i18next";
import Task from "../data/task";
import { deferralLabel, deferralTier, hasEscapeHatch } from "../utils/deferral";
import { TOOLTIP_CLASSES } from "../utils/color";

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
    // A fact about the card, never a verb aimed at the reader: "postponed 4 times", not "you
    // postponed this 4 times". The board has no business making an accusation.
    const description = t("deferral.moved", { count: task.deferralCount });
    const escapable = hasEscapeHatch(task.deferralCount) && onOpenEscape !== undefined;

    const className = clsx(
        "inline-flex shrink-0 items-center gap-1 rounded-full text-[11px] font-semibold leading-none tabular-nums select-none",
        // Identical box in every tier, so nothing shifts as a task escalates. The icon is what
        // says what the number counts; a bare figure read as anything from a priority to a score.
        "px-1.5 py-1",
        tier === "muted" && "text-wp-muted",
        tier === "pill" && "bg-wp-track text-wp-fg-secondary",
        tier === "heavy" && "bg-wp-fg text-wp-bg",
    );

    const content = (
        <>
            <CalendarClock size={11} aria-hidden="true" />
            {label}
        </>
    );

    const badge = escapable ? (
        <button
            type="button"
            className={clsx(className, "cursor-pointer hover:opacity-80 focus-visible:outline-2 focus-visible:outline-wp-accent")}
            aria-label={`${description}. ${t("deferral.escape_hint")}`}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
                // The card is a drag handle and opens the editor on click; neither should happen
                // when the target was the badge.
                event.stopPropagation();
                onOpenEscape(task);
            }}
        >
            {content}
        </button>
    ) : (
        <span className={className} aria-label={description}>{content}</span>
    );

    return (
        <Tooltip delay={300} closeDelay={0}>
            <Tooltip.Trigger className="inline-flex shrink-0 rounded-full">{badge}</Tooltip.Trigger>
            <Tooltip.Content placement="top" showArrow className={TOOLTIP_CLASSES}>
                {escapable ? `${description} · ${t("deferral.escape_hint")}` : description}
                <Tooltip.Arrow />
            </Tooltip.Content>
        </Tooltip>
    );
};

export default DeferralBadge;
