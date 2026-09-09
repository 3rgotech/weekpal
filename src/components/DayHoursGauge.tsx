import React from "react";
import clsx from "clsx";
import { useTranslation } from "react-i18next";
import { DayHours } from "../utils/hours";
import { formatEstimate } from "../utils/estimate";

interface DayHoursGaugeProps {
    hours: DayHours | null;
}

/**
 * Declared work against the hours no meeting has already taken.
 *
 * *(rt §5)* The finding this exists for: **six tasks on a day with four hours of meetings is
 * catastrophic; six on an empty day is a Tuesday.** A count cannot tell those apart, so a
 * count-based warning fires identically for both and teaches people to ignore it.
 *
 * Reuses the amber/red capacity language rather than introducing a third vocabulary — a board
 * should not have two different ways of saying "this is too much". And it is still soft:
 * nothing is refused, nothing is moved.
 *
 * Renders nothing at all when the day cannot honestly be measured, which is most days for most
 * people — no working-day length set, or nothing estimated.
 */
const DayHoursGauge: React.FC<DayHoursGaugeProps> = ({ hours }) => {
    const { t } = useTranslation();

    if (hours === null) {
        return null;
    }

    const planned = formatEstimate(hours.planned);
    const available = formatEstimate(hours.available);

    return (
        <span
            className={clsx(
                "shrink-0 text-xs tabular-nums",
                hours.level === "ok" && "text-slate-500 dark:text-slate-400",
                hours.level === "at" && "text-amber-600 dark:text-amber-400 font-medium",
                hours.level === "over" && "text-red-600 dark:text-red-400 font-semibold",
            )}
            title={hours.booked > 0
                ? t("estimate.booked", { booked: formatEstimate(hours.booked) })
                : undefined}
        >
            {/* "of ~4h free" rather than "of ~8h": the number that matters is what is left after
                the calendar, not what the day nominally holds. */}
            {planned} / {available === null ? t("estimate.no_time") : t("estimate.free", { time: available })}
        </span>
    );
};

export default DayHoursGauge;
