import { RefObject, useCallback, useEffect, useState } from "react";

/**
 * How many rows are below the fold of a scrolling column.
 *
 * *(rt §4)* **How much total and how much unseen are two different signals.** The capacity count
 * answers the first; a column that scrolls silently answers neither, and a full Tuesday looks
 * exactly like a Tuesday with three tasks on it once the fourth is out of sight.
 *
 * **No hard cap** — paper's eight-line limit is a physical accident, not information. The answer
 * to a long column is to say how long it is, never to refuse the ninth task.
 *
 * Measured from the DOM rather than computed from the task list, deliberately: what is hidden
 * depends on how tall the rows turned out and where the user has scrolled to, neither of which
 * the data knows. A title that wraps to three lines pushes a row out of sight that a count of
 * tasks would swear was visible.
 */
export function useHiddenBelow(
    list: RefObject<HTMLElement | null>,
    /** Re-measures when this changes — the row count, so adding a task is noticed. */
    revision: unknown,
): number {
    const [hidden, setHidden] = useState(0);

    const measure = useCallback(() => {
        const element = list.current;

        if (!element) {
            return;
        }

        // Not scrolling at all is the common case and costs one comparison.
        if (element.scrollHeight <= element.clientHeight + 1) {
            setHidden(0);

            return;
        }

        const fold = element.scrollTop + element.clientHeight;
        let below = 0;

        for (const child of Array.from(element.children)) {
            const row = child as HTMLElement;

            // Only real rows. The quick-add field at the end of every column is furniture, and
            // counting it would make an empty column claim one hidden task.
            if (!row.dataset.flipKey) {
                continue;
            }

            /*
             * Below the fold, not merely clipped by it.
             *
             * A row half in view has been seen — the user knows it is there, which is the entire
             * question being asked. Counting it would make "1 more" appear on a column whose last
             * row is one pixel short of complete.
             */
            if (row.offsetTop >= fold - 4) {
                below++;
            }
        }

        setHidden(below);
    }, [list]);

    useEffect(() => {
        const element = list.current;

        if (!element) {
            return;
        }

        measure();

        element.addEventListener("scroll", measure, { passive: true });

        if (typeof ResizeObserver === "undefined") {
            // jsdom, and older browsers. The count simply stays at whatever the first measure
            // found rather than being wrong as the column resizes.
            return () => element.removeEventListener("scroll", measure);
        }

        // The column resizes when the window does and when a title wraps; the list resizes when
        // a row is added. Both change what is below the fold without any scrolling happening.
        const observer = new ResizeObserver(measure);
        observer.observe(element);

        return () => {
            element.removeEventListener("scroll", measure);
            observer.disconnect();
        };
    }, [list, measure, revision]);

    return hidden;
}
