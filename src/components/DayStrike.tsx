import React from "react";
import { useJustFinished } from "../utils/useJustFinished";
import clsx from "clsx";

interface DayStrikeProps {
    /** Whether this day is finished right now. */
    done: boolean;
    /**
     * Where the ink stops.
     *
     * The bottom of the last card, not the bottom of the column — a stroke through the empty
     * space below reads *cancelled*, not *finished*.
     */
    height: number;
}

/**
 * One stroke, corner to corner of a finished day's contents.
 *
 * *(rt §3)* Romain's design, and the rarest mark on the board.
 *
 * **The endpoints are anchored, not the angle.** The line runs from the top-left of the content
 * box to the bottom-right of it, whatever shape that box happens to be — so it stays a strike in
 * a squat two-by-two tile as readily as in a tall column, where a fixed angle would leave it
 * pointing at nothing. SVG percentage coordinates do this for free.
 *
 * **Drawn once, then it is ink.** The animation runs on the transition from unfinished to
 * finished during this session; a reload finds the day already done and simply shows the end
 * state. A mark that redrew itself every time the page loaded would be a celebration of having
 * opened a browser tab.
 *
 * Monochrome, because colour belongs to categories.
 */
const DayStrike: React.FC<DayStrikeProps> = ({ done, height }) => {
    // Drawn only when this session watched the day become done; otherwise it is already ink.
    const justFinished = useJustFinished(done);

    if (!done || height <= 0) {
        return null;
    }

    return (
        // `z-10`: over the cards, not under them. The list below is positioned and comes later in
        // the column, so without it the stroke only showed in the gaps between cards.
        <svg
            className="day-strike absolute left-0 top-0 z-10 w-full pointer-events-none"
            height={height}
            // Decorative: the day's tasks are each already marked complete, so a screen reader
            // announcing this would be repeating what it has just read out card by card.
            aria-hidden="true"
        >
            <line
                x1="0"
                y1="0"
                x2="100%"
                y2="100%"
                // Normalises the line's length to 1 so the dash maths does not depend on the
                // column's pixel size — which is what lets the endpoints be anchored.
                pathLength={1}
                strokeWidth={2}
                strokeLinecap="round"
                className={clsx(
                    "day-strike__line stroke-wp-strike",
                    justFinished ? "day-strike__line--drawing" : "day-strike__line--drawn",
                )}
            />
        </svg>
    );
};

export default DayStrike;
