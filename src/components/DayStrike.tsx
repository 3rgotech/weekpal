import React, { useEffect, useRef, useState } from "react";
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
    /*
     * Whether this component watched the day *become* done.
     *
     * Starts false and only ever turns true when `done` goes false → true while mounted, which
     * is exactly the case that deserves the draw. Mounting with `done` already true — a reload,
     * a week navigated back to — leaves it false and the stroke is simply there.
     */
    const [justFinished, setJustFinished] = useState(false);
    const wasDone = useRef(done);

    useEffect(() => {
        if (done && !wasDone.current) {
            setJustFinished(true);
        }

        // Unticking a task, or adding one, clears the mark. If the day is finished again later
        // it has genuinely been finished again, and the stroke redraws — that is a second
        // achievement, not a replay of the first.
        if (!done) {
            setJustFinished(false);
        }

        wasDone.current = done;
    }, [done]);

    if (!done || height <= 0) {
        return null;
    }

    return (
        <svg
            className="day-strike absolute left-0 top-0 w-full pointer-events-none"
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
                    "day-strike__line stroke-slate-900 dark:stroke-white",
                    justFinished ? "day-strike__line--drawing" : "day-strike__line--drawn",
                )}
            />
        </svg>
    );
};

export default DayStrike;
