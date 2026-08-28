import { useEffect, useState } from "react";

/**
 * When the board switches to the one-day-at-a-time layout.
 *
 * Two rules, because neither alone covers the devices: **portrait** catches a tablet held
 * upright, which is wide enough to pass any width test but far too narrow for seven columns;
 * **under 1024px** catches a phone in landscape and a half-width desktop window, which are wide
 * in the wrong proportion — 7 columns in 390px of height is not a board, it is a list of headers.
 *
 * 1024px is Tailwind's `lg`, so the CSS side of the same split can be written as `lg:` without a
 * second number to keep in step.
 */
export const VERTICAL_LAYOUT_QUERY = "(orientation: portrait), (max-width: 1023px)";

/**
 * Whether the vertical layout is in force.
 *
 * A media query rather than a width state: this drives *which components render*, not just how
 * they look — the horizontal board mounts a drag-and-drop context the vertical one has no use
 * for — and that cannot be expressed in CSS.
 */
export function useVerticalLayout(): boolean {
    const [vertical, setVertical] = useState(() => matches());

    useEffect(() => {
        if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
            return;
        }

        const query = window.matchMedia(VERTICAL_LAYOUT_QUERY);
        const update = () => setVertical(query.matches);

        update();
        query.addEventListener("change", update);

        return () => query.removeEventListener("change", update);
    }, []);

    return vertical;
}

/**
 * jsdom ships no `matchMedia`, and neither does a server render. Both are horizontal by default:
 * the layout that has always existed is the safer thing to guess wrong.
 */
function matches(): boolean {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
        return false;
    }

    return window.matchMedia(VERTICAL_LAYOUT_QUERY).matches;
}
