import React from "react";
import { Button } from "@heroui/react";
import { useTranslation } from "react-i18next";
import Task from "../data/task";
import { ESTIMATE_CHIPS, chipLabel } from "../utils/estimate";

interface BatchEstimateStackProps {
    tasks: Task[];
    index: number;
    onChoose: (task: Task, minutes: number) => void;
    onSkip: () => void;
    onLeave: () => void;
}

/**
 * Estimating a day on a phone: one card at a time.
 *
 * *(rt §5)* The mobile body of batch estimation. The column-mode the wide board uses does not
 * survive being made narrow — dimming and lighting cards needs the column visible around them,
 * and on a phone the column *is* the screen. So the same run becomes a stack: one card, large,
 * with the chips as targets under it.
 *
 * **"3 of 7" is not decoration.** The worst version of this flow is one with no visible end —
 * people abandon it halfway and then feel they have left something unfinished. A counter turns
 * an open-ended chore into a short, countable one.
 *
 * **Skip is free and leaves nothing behind.** A skipped task is still unestimated; the run is
 * not a forced march, and bailing out halfway keeps everything already entered.
 */
const BatchEstimateStack: React.FC<BatchEstimateStackProps> = ({
    tasks, index, onChoose, onSkip, onLeave,
}) => {
    const { t } = useTranslation();
    const task = tasks[index];

    if (!task) {
        return null;
    }

    return (
        <div className="flex-1 flex flex-col justify-center gap-6 px-4 py-6">
            <div className="flex items-baseline justify-between text-sm text-wp-muted">
                <span className="tabular-nums">
                    {t("estimate.position", { current: index + 1, total: tasks.length })}
                </span>
                <button type="button" onClick={onLeave} className="underline">
                    {t("actions.cancel")}
                </button>
            </div>

            {/* Large and central: the card is the question, and on a phone there is room for it
                to look like one. */}
            <p className="text-xl font-medium text-wp-fg break-words">
                {task.title}
            </p>

            <div className="grid grid-cols-3 gap-2">
                {ESTIMATE_CHIPS.map((minutes) => (
                    <Button
                        key={minutes}
                        variant="secondary"
                        // Full-width targets rather than the wide board's pills: this is a thumb,
                        // not a pointer.
                        onPress={() => onChoose(task, minutes)}
                    >
                        {chipLabel(minutes)}
                    </Button>
                ))}
            </div>

            <button
                type="button"
                onClick={onSkip}
                className="text-sm text-wp-muted underline"
            >
                {t("estimate.skip")}
            </button>
        </div>
    );
};

export default BatchEstimateStack;
