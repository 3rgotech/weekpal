import { RefObject, useEffect, useState } from "react";

/**
 * How many tracks a `grid-template-columns` value declares.
 *
 * Exported for its own tests, because getting it wrong is silent: an over-count windows the list
 * into rows that are never full and leaves gaps down the right-hand side, and an under-count
 * hides cards off the end of every row.
 *
 * Computed style normally resolves the tracks to used pixel widths — `"340px 340px 340px"` — so
 * counting whitespace-separated tokens is usually enough. It is not always: an element that is
 * not laid out (display:none, or a detached tree) can report the specified value instead, and
 * Tailwind's `grid-cols-3` specifies `repeat(3, minmax(0, 1fr))`, where naive splitting sees four
 * tokens rather than three. So parentheses are counted, `repeat()` is read for its own count, and
 * anything unrecognised falls back to one column — a single file is always a correct layout, and
 * a wrong number of columns is not.
 */
export function countTracks(value: string | null | undefined): number {
    if (!value) {
        return 1;
    }

    const trimmed = value.trim();

    if (trimmed === "" || trimmed === "none") {
        return 1;
    }

    // The unresolved form. `repeat(3, minmax(0, 1fr))` is three tracks however many spaces it
    // contains, and the count is right there in it.
    const repeat = /^repeat\(\s*(\d+)\s*,/.exec(trimmed);

    if (repeat) {
        return Math.max(1, parseInt(repeat[1], 10));
    }

    /*
     * The resolved form: top-level tokens, one per track.
     *
     * Line names go first — `[full-start] 1fr [content] 2fr` is two tracks with three names
     * between them, and a name is not a track. Nothing here emits them today; stripping them
     * costs one expression and stops the count being right only for the CSS we happen to write.
     */
    const sizes = trimmed.replace(/\[[^\]]*\]/g, " ");

    let depth = 0;
    let inToken = false;
    let tracks = 0;

    for (const character of sizes) {
        if (character === "(") {
            depth++;
        } else if (character === ")") {
            depth--;
        }

        const isSpace = depth === 0 && /\s/.test(character);

        if (isSpace) {
            inToken = false;

            continue;
        }

        if (!inToken) {
            inToken = true;
            tracks++;
        }
    }

    return Math.max(1, tracks);
}

/**
 * How many cards the grid is currently putting side by side.
 *
 * Read off the element rather than declared in TypeScript, and that is the whole point: the
 * column count lives in Tailwind's `md:` and `xl:` classes, and a `matchMedia` copy of those
 * breakpoints in here would be a second source of truth that drifts the first time somebody
 * changes one of them. The same argument `useHiddenBelow` makes about measuring rather than
 * counting applies here — the CSS is the answer, so ask the CSS.
 *
 * A `ResizeObserver`, because the number changes when the window is resized and that is not a
 * render of the component that needs to know.
 *
 * Returns 1 when disabled, when there is no element yet, and in jsdom — where computed style
 * resolves nothing. A single file is always a correct layout.
 */
export function useGridColumns(
    element: RefObject<HTMLElement | null>,
    enabled: boolean,
): number {
    const [columns, setColumns] = useState(1);

    useEffect(() => {
        if (!enabled) {
            setColumns(1);

            return;
        }

        const node = element.current;

        if (!node) {
            return;
        }

        const measure = () => {
            const tracks = countTracks(getComputedStyle(node).gridTemplateColumns);

            // Guarded rather than set unconditionally: this runs on every resize frame, and a
            // state write per frame would re-window the whole list while somebody drags a window
            // edge.
            setColumns((current) => (current === tracks ? current : tracks));
        };

        measure();

        if (typeof ResizeObserver === "undefined") {
            return;
        }

        const observer = new ResizeObserver(measure);
        observer.observe(node);

        return () => observer.disconnect();
    }, [element, enabled]);

    return columns;
}
