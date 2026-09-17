import React, { useState } from "react";
import clsx from "clsx";
import { useTranslation } from "react-i18next";
import { WeekSummary } from "../types";

interface LeftoverSummaryProps {
    summary: WeekSummary | null;
    className?: string;
}

/**
 * How last week went, in one line.
 *
 * *(rt §7)* "Last week: 14 done, 5 moved." Above the inbox, not a panel — nobody has ever changed
 * behaviour because of a donut. Tapping it opens the third number, the one the line leaves out
 * because it is the list underneath: how many are still sitting there.
 *
 * Nothing when there is nothing to say. A week with no tasks in it is not "0 done, 0 moved", it is
 * a week the board was not used, and a line announcing zeros would read as a reproach.
 *
 * The grammar rule of the badge holds here: numbers about the week, never a verb aimed at the
 * reader.
 */
const LeftoverSummary: React.FC<LeftoverSummaryProps> = ({ summary, className }) => {
    const { t } = useTranslation();
    const [expanded, setExpanded] = useState(false);

    if (!summary || summary.done + summary.moved + summary.left === 0) {
        return null;
    }

    return (
        <div className={clsx("text-sm text-slate-500 dark:text-slate-400", className)}>
            <button
                type="button"
                onClick={() => setExpanded((open) => !open)}
                aria-expanded={expanded}
                className="text-left tabular-nums hover:text-slate-700 dark:hover:text-slate-200 focus-visible:outline-2 focus-visible:outline-sky-500 rounded"
            >
                {t("leftovers.last_week", { done: summary.done, moved: summary.moved })}
            </button>

            {expanded && (
                <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs tabular-nums">
                    <dt className="font-semibold text-slate-700 dark:text-slate-200">{summary.done}</dt>
                    <dd>{t("leftovers.last_week_done", { count: summary.done })}</dd>
                    <dt className="font-semibold text-slate-700 dark:text-slate-200">{summary.moved}</dt>
                    <dd>{t("leftovers.last_week_moved", { count: summary.moved })}</dd>
                    <dt className="font-semibold text-slate-700 dark:text-slate-200">{summary.left}</dt>
                    <dd>{t("leftovers.last_week_left", { count: summary.left })}</dd>
                </dl>
            )}
        </div>
    );
};

export default LeftoverSummary;
