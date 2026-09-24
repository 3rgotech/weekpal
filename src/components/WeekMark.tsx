import React from "react";
import clsx from "clsx";
import { useJustFinished } from "../utils/useJustFinished";

interface WeekMarkProps {
    /** Whether the whole week is finished right now — see `isWeekDone`. */
    done: boolean;
    /**
     * `rule` for a board whose days sit in one row: a hairline across the top that joins the
     * day strokes into one bracket. `frame` for a board that stacks days (3 + 2×2 and the like),
     * where a horizontal gesture has nothing to span, so the frame is drawn instead.
     */
    shape: "rule" | "frame";
}

/**
 * The full-week mark (R9).
 *
 * *(rt §3)* Separate from the day strike and rarer — at most 52 firings a year. The same grammar
 * as the day strike: one pen stroke, monochrome because colour belongs to categories, drawn once
 * when the week is finished during this session and simply present afterwards, never redrawn on
 * reload. Decorative to assistive technology, which has already been told each task is done.
 */
const WeekMark: React.FC<WeekMarkProps> = ({ done, shape }) => {
    const justFinished = useJustFinished(done);

    if (!done) {
        return null;
    }

    const stroke = clsx(
        "week-mark__stroke stroke-slate-900 dark:stroke-white",
        justFinished ? "week-mark__stroke--drawing" : "week-mark__stroke--drawn",
    );

    if (shape === "rule") {
        return (
            <svg
                className="week-mark week-mark--rule absolute left-0 -top-1.5 xl:-top-2.5 w-full h-0.5 overflow-visible pointer-events-none"
                aria-hidden="true"
                data-week-mark="rule"
            >
                <line x1="0" y1="1" x2="100%" y2="1" pathLength={1} strokeWidth={2} strokeLinecap="round" className={stroke} />
            </svg>
        );
    }

    return (
        <svg
            className="week-mark week-mark--frame absolute -inset-1 xl:-inset-2 w-[calc(100%+0.5rem)] h-[calc(100%+0.5rem)] xl:w-[calc(100%+1rem)] xl:h-[calc(100%+1rem)] overflow-visible pointer-events-none"
            aria-hidden="true"
            data-week-mark="frame"
        >
            <rect x="0" y="0" width="100%" height="100%" rx="10" fill="none" pathLength={1} strokeWidth={2} className={stroke} />
        </svg>
    );
};

export default WeekMark;
