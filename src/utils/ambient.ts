/**
 * The whole ambient notification channel: a tab title and a dot on the favicon.
 *
 * *(rt §9)* **The axis was wrong.** The old plan sorted notifications by importance and asked the
 * user to opt in; the answer is that the tab is already open, so notify *inside* it. **Push is
 * reserved for a time and a consequence** — an event in ten minutes, something gone if you do not
 * act. Everything else is silent and in-tab, because noise is a relevance problem rather than a
 * volume one.
 *
 * That makes this the cheapest feature in the plan and one of the more useful: it is the only way
 * the board can say anything at all to somebody who is looking at a different tab, and it is also
 * where the day-complete ceremony lands for that person.
 *
 * @see PROGRESS.md R13, #6
 */

/** What the board currently has to say. Nothing is the common case and must stay silent. */
export interface AmbientState {
    /** Unfinished work from weeks that have ended. */
    leftovers: number;
    /** Today's name, when today is finished — `WeekPal — Tuesday done`. */
    dayDone: string | null;
}

const BASE_TITLE = "WeekPal";

/** The raster icon rather than the SVG: it is guaranteed to draw onto a canvas. */
const ICON_SOURCE = "/weekpal/favicon-96x96.png";

/**
 * The title, given what there is to say.
 *
 * A finished day beats a leftover count. Both are true at once often enough to need a rule, and
 * the count will still be there tomorrow — the day is finished only today, and a board that
 * greeted the end of a good day with a nag would be teaching the wrong lesson.
 */
export function ambientTitle(state: AmbientState): string {
    if (state.dayDone) {
        return `${BASE_TITLE} — ${state.dayDone}`;
    }

    if (state.leftovers > 0) {
        // Capped like the top bar's own badge: past nine the exact number stops being a fact
        // anybody acts on differently.
        return `(${state.leftovers > 9 ? "9+" : state.leftovers}) ${BASE_TITLE}`;
    }

    return BASE_TITLE;
}

type Badge = "none" | "dot" | "solid";

export function ambientBadge(state: AmbientState): Badge {
    if (state.dayDone) {
        return "solid";
    }

    return state.leftovers > 0 ? "dot" : "none";
}

let icon: HTMLImageElement | null = null;
let iconFailed = false;
let painted: Badge | null = null;

/**
 * Draw the badge onto the favicon.
 *
 * Composited at runtime rather than shipped as three icon files: the badge is a state of the one
 * icon, and three files would be three things to keep in step with a logo that will change.
 *
 * Fails silently in every direction — a blocked canvas, a missing icon, a browser that ignores a
 * changed `href`. The title carries the same information, so losing the dot costs a nicety
 * rather than the message.
 */
export function paintFavicon(badge: Badge): void {
    if (typeof document === "undefined" || iconFailed || painted === badge) {
        return;
    }

    const link = document.querySelector<HTMLLinkElement>('link[rel="icon"][type="image/png"]');

    if (!link) {
        iconFailed = true;

        return;
    }

    if (icon === null) {
        icon = new Image();
        icon.src = ICON_SOURCE;
        icon.onerror = () => { iconFailed = true; };
        icon.onload = () => {
            // The first paint may have been asked for before the icon arrived; ask again now
            // that it has.
            painted = null;
            paintFavicon(badge);
        };
    }

    if (!icon.complete || icon.naturalWidth === 0) {
        return;
    }

    try {
        const size = 96;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;

        const context = canvas.getContext("2d");

        if (!context) {
            iconFailed = true;

            return;
        }

        context.drawImage(icon, 0, 0, size, size);

        if (badge !== "none") {
            const radius = size * 0.24;
            const centre = size - radius - 3;

            // A ring of the page's own background first, so the badge reads as a badge rather
            // than as part of the logo whatever the logo happens to be behind it.
            context.beginPath();
            context.arc(centre, centre, radius + 3, 0, Math.PI * 2);
            context.fillStyle = "#ffffff";
            context.fill();

            context.beginPath();
            context.arc(centre, centre, radius, 0, Math.PI * 2);

            if (badge === "solid") {
                // A finished day. Solid, and the one place green is right — it is the only
                // unambiguously good state the board has.
                context.fillStyle = "#22c55e";
                context.fill();
            } else {
                // Something waiting. Hollow, because it is a fact rather than an achievement.
                context.strokeStyle = "#0ea5e9";
                context.lineWidth = size * 0.09;
                context.stroke();
            }
        }

        link.href = canvas.toDataURL("image/png");
        painted = badge;
    } catch {
        // A tainted canvas, or a browser refusing `toDataURL`. The title still speaks.
        iconFailed = true;
    }
}

/** Test seam. */
export function resetAmbient(): void {
    icon = null;
    iconFailed = false;
    painted = null;
}
