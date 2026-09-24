import React from "react";
import { useTranslation } from "react-i18next";
import { DayOfWeek } from "../types";
import { useData } from "../contexts/DataContext";

interface PastDayRecoveryProps {
    dayOfWeek: DayOfWeek;
    count: number;
}

/**
 * "2 unfinished", where a past day's header sits, tappable to pull them into today.
 *
 * *(rt §10)* The *what did I forget* half of the two-second glance, and **the only asymmetric
 * mark in the week**. Every other column is drawn the same whatever its date, because the week
 * is meant to be read as one shape rather than as a countdown — but work left on Tuesday when it
 * is Thursday is not neutral information, and without a mark it looks exactly like a day that
 * went perfectly.
 *
 * A soft amber pill in the redesign, beside the day's name: work left behind is worth noticing,
 * and it is still not an error — no red, and nothing louder than the "Today" pill it mirrors.
 *
 * A button rather than a label because the recovery *is* the feature. Naming a problem the user
 * then has to solve by dragging four cards would be worse than saying nothing.
 */
const PastDayRecovery: React.FC<PastDayRecoveryProps> = ({ dayOfWeek, count }) => {
    const { t } = useTranslation();
    const { recoverDay } = useData();

    if (count <= 0) {
        return null;
    }

    return (
        <button
            type="button"
            onClick={() => { void recoverDay(dayOfWeek); }}
            title={t("recovery.pull_hint")}
            className="
                shrink-0 px-2 py-0.5 rounded-full text-[11px] font-bold leading-4 cursor-pointer
                bg-wp-warn-soft text-wp-warn hover:brightness-95 dark:hover:brightness-125
                focus-visible:outline-2 focus-visible:outline-wp-accent
            "
        >
            {t("recovery.unfinished", { count })}
        </button>
    );
};

export default PastDayRecovery;
