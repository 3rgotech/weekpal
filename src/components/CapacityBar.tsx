import React from "react";
import clsx from "clsx";
import { useTranslation } from "react-i18next";
import { Gauge, readGauges } from "../utils/capacity";

interface CapacityBarProps {
    /** What this column is measured against: the day, and any category in it with a limit. */
    gauges: Gauge[];
    /** Today's column speaks in the accent colour, like the rest of its header. */
    isToday?: boolean;
    className?: string;
}

/*
 * Past this many slots a segment is too narrow to read as one, and the row becomes a single bar.
 * The largest day capacity on offer is 12; the undated buckets' limits go well past it.
 */
const MAX_SEGMENTS = 12;

/**
 * How full a column is, against how much its owner said fits — one slot per task the limit allows.
 *
 * Replaces the bare count in the header's corner: a row of slots answers "how much room is left"
 * at a glance where a number had to be read. Quiet up to and at the limit — the muted ink, or the
 * accent on today — amber past it, and red at the capacity language's "over".
 *
 * Renders nothing when no limit is set, which is the default: a gauge on every column all week is
 * clutter for someone who never asked to be counted.
 */
const CapacityBar: React.FC<CapacityBarProps> = ({ gauges, isToday = false, className }) => {
    const { t } = useTranslation();

    const read = readGauges(gauges);
    const worst = read[0];

    if (worst === undefined) {
        return null;
    }

    // Every gauge, worst first — a day can be over on its own total and on two categories at
    // once, and the row has room for one. The rest are in the title.
    const description = read
        .map((gauge) => (gauge.label === null
            ? t("capacity.planned", { planned: gauge.planned, limit: gauge.limit })
            : t("capacity.category", { name: gauge.label, planned: gauge.planned, limit: gauge.limit })))
        .join(" · ");

    // Full is not a warning — the redesign draws a 3/3 day in its ordinary ink. Past the limit
    // is amber, and the capacity language's "over" (twice the limit) is red.
    const over = worst.level === "over";
    const past = worst.planned > worst.limit;
    const ink = over ? "bg-wp-danger" : past ? "bg-wp-warn" : isToday ? "bg-wp-accent" : "bg-wp-muted";
    const text = over ? "text-wp-danger" : past ? "text-wp-warn" : isToday ? "text-wp-accent" : "text-wp-muted";
    const segmented = worst.limit <= MAX_SEGMENTS;

    return (
        <div
            className={clsx("flex items-center gap-2 pr-1.5", className)}
            role="img"
            aria-label={description}
            title={description}
        >
            {segmented ? (
                <div className="flex flex-1 gap-[3px]">
                    {Array.from({ length: worst.limit }, (_, index) => (
                        <span
                            key={index}
                            className={clsx("h-1 flex-1 rounded-sm", index < worst.planned ? ink : "bg-wp-track")}
                        />
                    ))}
                </div>
            ) : (
                <div className="h-1 flex-1 rounded-sm bg-wp-track overflow-hidden">
                    <div
                        className={clsx("h-full rounded-sm", ink)}
                        style={{ width: `${Math.min(100, Math.round((worst.planned / worst.limit) * 100))}%` }}
                    />
                </div>
            )}
            <span
                className={clsx(
                    "text-[11px] font-semibold tabular-nums",
                    text,
                )}
            >
                {worst.planned}/{worst.limit}
            </span>
        </div>
    );
};

export default CapacityBar;
