import { useEffect, useRef, useState } from "react";

/**
 * Whether this component watched something *become* finished.
 *
 * Starts false and only turns true when `done` goes false → true while mounted — the one case
 * that deserves the mark being drawn. Mounting with `done` already true (a reload, a week
 * navigated back to) leaves it false, so the mark is simply there: it is ink, not a replay.
 * Going back to not-done resets it, so finishing again later genuinely draws again — a second
 * achievement, not a repeat of the first.
 *
 * Shared by the day strike (R8) and the week mark (R9), which follow the same rule.
 */
export function useJustFinished(done: boolean): boolean {
    const [justFinished, setJustFinished] = useState(false);
    const wasDone = useRef(done);

    useEffect(() => {
        if (done && !wasDone.current) {
            setJustFinished(true);
        }

        if (!done) {
            setJustFinished(false);
        }

        wasDone.current = done;
    }, [done]);

    return justFinished;
}
