import { RefObject, useEffect, useState } from "react";

/**
 * How tall a column's *contents* are, as opposed to its container.
 *
 * The day strike runs from the top of the header to the bottom of the last card, and stops
 * there: a stroke continuing through the empty space below reads *cancelled* rather than
 * *finished*. The column itself is `flex-1`, so its own height is the full grid row whatever it
 * contains — which is precisely the wrong number.
 *
 * A `ResizeObserver` on the host and a read of the last child, rather than a layout effect on
 * every render: the height changes when a card is added, when a title wraps to a second line, or
 * when the window is resized, and none of those are renders of this component.
 */
export function useContentHeight(
    host: RefObject<HTMLElement | null>,
    list: RefObject<HTMLElement | null>,
    enabled: boolean,
): number {
    const [height, setHeight] = useState(0);

    useEffect(() => {
        if (!enabled) {
            setHeight(0);

            return;
        }

        const hostElement = host.current;
        const listElement = list.current;

        if (!hostElement || !listElement) {
            return;
        }

        const measure = () => {
            const last = listElement.lastElementChild as HTMLElement | null;

            if (!last) {
                setHeight(0);

                return;
            }

            // Relative to the host, so the number is where to stop drawing rather than where the
            // card happens to sit on the page.
            const bottom = last.getBoundingClientRect().bottom
                - hostElement.getBoundingClientRect().top;

            setHeight(Math.max(0, Math.round(bottom)));
        };

        measure();

        if (typeof ResizeObserver === "undefined") {
            // jsdom, and some older browsers. The strike simply does not draw rather than
            // drawing at the wrong length.
            return;
        }

        const observer = new ResizeObserver(measure);
        observer.observe(hostElement);
        observer.observe(listElement);

        return () => observer.disconnect();
    }, [host, list, enabled]);

    return height;
}
