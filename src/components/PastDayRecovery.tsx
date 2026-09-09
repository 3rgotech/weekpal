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
 * Monochrome, like every status mark added since the roundtable: **colour belongs to
 * categories**, which are the only system on the board doing semantic work. Amber and red are
 * already spoken for by capacity, and this is not a capacity problem — it is a fact about the
 * past, and it is not an error.
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
                shrink-0 px-1.5 py-0.5 rounded text-xs font-medium
                text-slate-600 dark:text-slate-300
                hover:bg-slate-200 dark:hover:bg-sky-900
                focus-visible:outline-2 focus-visible:outline-sky-500
            "
        >
            {t("recovery.unfinished", { count })}
        </button>
    );
};

export default PastDayRecovery;
