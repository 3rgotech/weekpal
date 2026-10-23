import { Dayjs } from "dayjs";
import { getDayJs, weekCodeToDate } from "./dayjs";

/**
 * The week on screen, in the address bar: `#2026w43`.
 *
 * A hash rather than a path, because the board is one page served by Laravel at `/app` and a
 * hash never reaches the server — no route to add, nothing for the service worker's offline copy
 * to miss. Each week the user moves to becomes a history entry, so the browser's back button
 * walks back through the weeks they looked at, and a link to a week opens that week.
 */
export function weekFromHash(hash: string): string | null {
    const match = /^#(\d{4})w(\d{2})$/.exec(hash);

    if (!match) {
        return null;
    }

    const code = `${match[1]}w${match[2]}`;

    // Round-tripped, so a week that does not exist (2026w53, w00) is refused rather than quietly
    // turned into the first week of the next year.
    return weekCodeToDate(code).format("GGGG[w]WW") === code ? code : null;
}

/**
 * A date inside the week a code names, to put the calendar on.
 *
 * Today when the code is this week, so the board lands on today rather than on that week's
 * Monday; otherwise the ISO Monday, which every displayed week contains whatever day it starts on.
 */
export function dateOfWeekCode(code: string, thisWeek: string): Dayjs {
    return code === thisWeek ? getDayJs()() : weekCodeToDate(code);
}
