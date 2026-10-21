import React from "react";
import clsx from "clsx";
import { useTranslation } from "react-i18next";
import { DayProgress } from "../utils/dayProgress";

interface DayProgressBarProps {
    /** The day's tasks and how many are done, or null when there is nothing to show. */
    progress: DayProgress | null;
    /** Today's column speaks in the accent colour, like the rest of its header. */
    isToday?: boolean;
    className?: string;
}

/*
 * Past this many slots a segment is too narrow to read as one, and the row becomes a single bar.
 * The same threshold as the capacity slots, so the two read alike.
 */
const MAX_SEGMENTS = 12;

/**
 * How far through its tasks the day is: one slot per task, filled once it is done.
 *
 * Shown under a day's name when the day has no limit — with one, the capacity slots take the
 * place. Drawn like them, slots and a count, so a header carries one kind of bar whichever it is.
 * Never amber or red: being part way through a day is not a warning.
 */
const DayProgressBar: React.FC<DayProgressBarProps> = ({ progress, isToday = false, className }) => {
    const { t } = useTranslation();

    if (progress === null) {
        return null;
    }

    const { done, total } = progress;
    const ink = isToday ? "bg-wp-accent" : "bg-wp-muted";
    const description = t("capacity.progress", { done, total });

    return (
        <div
            className={clsx("flex items-center gap-2 pr-1.5", className)}
            role="img"
            aria-label={description}
            title={description}
        >
            {total <= MAX_SEGMENTS ? (
                <div className="flex flex-1 gap-[3px]">
                    {Array.from({ length: total }, (_, index) => (
                        <span
                            key={index}
                            className={clsx("h-1 flex-1 rounded-sm", index < done ? ink : "bg-wp-track")}
                        />
                    ))}
                </div>
            ) : (
                <div className="h-1 flex-1 rounded-sm bg-wp-track overflow-hidden">
                    <div
                        className={clsx("h-full rounded-sm", ink)}
                        style={{ width: `${Math.round((done / total) * 100)}%` }}
                    />
                </div>
            )}
            <span className={clsx("text-[11px] font-semibold tabular-nums", isToday ? "text-wp-accent" : "text-wp-muted")}>
                {done}/{total}
            </span>
        </div>
    );
};

export default DayProgressBar;
