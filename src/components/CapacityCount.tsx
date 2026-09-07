import React from "react";
import clsx from "clsx";
import { useTranslation } from "react-i18next";
import { capacityLevel, showsCapacity } from "../utils/capacity";

interface CapacityCountProps {
    /** Unfinished tasks in the column. Undefined for a bucket that is not counted. */
    planned?: number;
    /** The number this column is counted against, or 0 for no limit. */
    limit: number;
}

const LEVEL_CLASS = {
    ok: "text-slate-400 dark:text-slate-500",
    at: "text-amber-600 dark:text-amber-400 font-semibold",
    over: "text-red-600 dark:text-red-400 font-semibold",
};

/**
 * How much is in a column, against how much its owner said fits.
 *
 * Shared by the day columns and by Some day, which are counted against different numbers — so
 * the limit arrives as a prop rather than being read here, and one component cannot quietly
 * measure a list against the wrong setting.
 *
 * Colour and weight only — no badge, no border, no icon. The board already spends its colour on
 * categories and on marking today, and a day that is merely full does not deserve to outrank
 * either. It reads as a number until it is worth reading as a warning.
 *
 * Renders nothing at all when no limit is set, which is the default: a count on every column all
 * week is clutter for someone who never asked to be counted. The width it occupies is reserved
 * either way, so turning the setting on does not shunt every heading sideways.
 */
const CapacityCount: React.FC<CapacityCountProps> = ({ planned, limit }) => {
    const { t } = useTranslation();

    if (planned === undefined || !showsCapacity(limit)) {
        // The menu button on the other side is 40px wide; this keeps the heading between them
        // centred rather than nudged left by its absence.
        return <span className="w-10 shrink-0" aria-hidden="true" />;
    }

    const level = capacityLevel(planned, limit);

    return (
        <span
            className={clsx("w-10 shrink-0 text-center text-xs tabular-nums", LEVEL_CLASS[level])}
            // The bare number is ambiguous out of context — a screen reader gets the whole thing.
            aria-label={t("capacity.planned", { planned, limit })}
            title={t("capacity.planned", { planned, limit })}
        >
            {planned}
        </span>
    );
};

export default CapacityCount;
