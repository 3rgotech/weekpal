import React from "react";
import clsx from "clsx";
import { CapacityLevel } from "../utils/capacity";

interface DayShareBarProps {
    /** This day's load against the heaviest day on screen, 0 to 1, or null when there is nothing to compare. */
    share: number | null;
    /** The day's own capacity verdict, so the rail speaks the board's existing language. */
    level: CapacityLevel;
}

/**
 * A hairline under the day's name, as long as the day is heavy.
 *
 * *(rt §10)* **Relative, not a quota.** The capacity count already answers "is this day too
 * full"; this answers the other question — *which day is the problem* — and a day can be well
 * inside its limit while being twice its neighbour.
 *
 * Three rules, all of them things it must not do:
 *
 * - **Nothing is painted behind text.** This is the rejected denser-column-fill idea's
 *   replacement: a wash behind a day's tasks is a readability tax paid for eight hours to deliver
 *   a signal wanted for one second. A rail in the header costs nothing to read past.
 * - **No text.** The number is already on the header twice over — the count, and the hours. A
 *   third rendering of the same fact is clutter.
 * - **No new colour.** Amber and red are the capacity language already; neutral otherwise. On a
 *   board spending sixteen hues on categories, a new one would compete with the only thing
 *   colour means here.
 *
 * Nothing at all when there is no comparison to draw — an empty week draws no rails rather than
 * a row of empty ones.
 */
const DayShareBar: React.FC<DayShareBarProps> = ({ share, level }) => {
    if (share === null || share <= 0) {
        return null;
    }

    return (
        <div
            // Decorative: the count beside it and the hours gauge both say this in words, and a
            // screen reader reading a third version of the same fact is being talked over.
            aria-hidden="true"
            className="h-1 w-full rounded-sm bg-wp-track overflow-hidden"
        >
            <div
                className={clsx(
                    "h-full rounded-sm",
                    level === "ok" && "bg-wp-muted",
                    level === "at" && "bg-wp-warn",
                    level === "over" && "bg-wp-danger",
                )}
                // A width, not a scale transform: the rail is one element wide and there is
                // nothing to composite it against.
                style={{ width: `${Math.min(100, Math.round(share * 100))}%` }}
            />
        </div>
    );
};

export default DayShareBar;
