import React from "react";
import { useTranslation } from "react-i18next";
import Task from "../data/task";
import { formatTotal, totalEstimate } from "../utils/estimate";

interface DayEstimateProps {
    tasks: Task[];
}

/**
 * What a day is carrying, said honestly.
 *
 * *(rt §5)* `~6h+ planned · 3 unestimated`. Three rules, all of them about not overstating:
 *
 * - **The `+` is doing real work.** A day with four estimated tasks and three unestimated ones
 *   does not take six hours, it takes *at least* six. Dropping the plus turns a floor into a
 *   claim, and the claim is the thing people would then plan against.
 * - **Nothing at all when nothing is estimated.** A header reading `0h planned · 6 unestimated`
 *   is a reproach for not having filled something in, and the whole design refuses to nag about
 *   estimates — they are optional, permanently.
 * - **The unestimated count is stated, never flagged.** No warning colour, no icon. It is
 *   context for reading the number beside it, not a task list of its own.
 *
 * @see PROGRESS.md R16
 */
const DayEstimate: React.FC<DayEstimateProps> = ({ tasks }) => {
    const { t } = useTranslation();

    const total = totalEstimate(tasks);
    const label = formatTotal(total);

    if (label === null) {
        return null;
    }

    return (
        <span className="shrink-0 text-xs tabular-nums text-slate-500 dark:text-slate-400">
            {label} {t("estimate.planned")}
            {total.partial && (
                <> · {t("estimate.unestimated", { count: total.unestimated })}</>
            )}
        </span>
    );
};

export default DayEstimate;
