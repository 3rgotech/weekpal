import React, { useEffect, useRef } from "react";
import clsx from "clsx";
import { useTranslation } from "react-i18next";
import Task from "../data/task";
import { ESTIMATE_CHIPS, chipLabel } from "../utils/estimate";

interface BatchEstimateRowProps {
    task: Task;
    remaining: number;
    onChoose: (minutes: number) => void;
    onSkip: () => void;
    onLeave: () => void;
}

/**
 * The chip row that appears beneath the card being sized.
 *
 * *(rt §5)* Beneath the card, not over it: the task stays readable while you answer about it, and
 * the column keeps its shape. A popover would cover the two cards either side, which are the
 * context for judging whether this one is really two hours.
 *
 * Numbered 1–6 because the keys do the same thing — the number on the chip is not decoration,
 * it is the documentation for the temporary verb set. Clicking works identically for anyone who
 * never touches the keyboard.
 *
 * Says how many are left, because a run with no visible end is one people abandon halfway and
 * feel bad about. Bailing out is free: whatever was entered is already saved.
 */
const BatchEstimateRow: React.FC<BatchEstimateRowProps> = ({
    task, remaining, onChoose, onSkip, onLeave,
}) => {
    const { t } = useTranslation();
    const rowRef = useRef<HTMLDivElement>(null);

    /*
     * Focus lands here when the row appears.
     *
     * Two reasons, and the second is the important one: a screen reader should announce what has
     * just opened, and Escape needs somewhere reliable to be caught. The board's global handler
     * ignores keys while focus is in a typing target, and this row contains a number input.
     */
    useEffect(() => {
        rowRef.current?.focus();
    }, [task.id]);

    return (
        <div
            ref={rowRef}
            tabIndex={-1}
            role="group"
            aria-label={t("estimate.batch_for", { title: task.title })}
            onKeyDown={(event) => {
                if (event.key === "Escape") {
                    event.stopPropagation();
                    onLeave();
                }
            }}
            className="
                flex flex-wrap items-center gap-1.5 px-2.5 py-2 -mt-1 rounded-lg
                bg-wp-accent-soft border border-wp-border
                focus:outline-none
            "
        >
            {ESTIMATE_CHIPS.map((minutes, index) => (
                <button
                    key={minutes}
                    type="button"
                    aria-label={chipLabel(minutes)}
                    onClick={() => onChoose(minutes)}
                    className="
                        px-2 py-1 rounded-full text-xs font-medium tabular-nums
                        bg-wp-card text-wp-fg border border-wp-border-strong
                        hover:bg-wp-card-hover cursor-pointer
                        focus-visible:outline-2 focus-visible:outline-wp-accent
                    "
                >
                    <span aria-hidden="true" className="opacity-50 mr-1.5">{index + 1}</span>
                    <span aria-hidden="true">{chipLabel(minutes)}</span>
                </button>
            ))}

            {/* Skipping is a first-class answer, not a failure to answer: a task nobody wants to
                size should cost one key and leave no mark. */}
            <button
                type="button"
                onClick={onSkip}
                className="px-2 py-1 rounded-full text-xs font-medium text-wp-fg-secondary cursor-pointer hover:underline"
            >
                {t("estimate.skip")}
            </button>

            <span className={clsx("ml-auto text-xs tabular-nums text-wp-muted")}>
                {t("estimate.remaining", { count: remaining })}
            </span>
        </div>
    );
};

export default BatchEstimateRow;
