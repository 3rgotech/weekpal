/**
 * The first-run tour: which version it is, what it points at, and when the board is ready for it.
 *
 * The steps themselves are data rather than JSX because there are two sets of them — the wide
 * board and the phone are different enough that a tour written for one is a tour pointing at
 * elements the other does not have. Same concepts, in the same order; different targets, and
 * different words where the interaction genuinely differs.
 */

/**
 * Bumped when the tour changes enough that somebody who saw the old one should see the new one.
 *
 * Stored per account as `settings.onboardingVersion`. Anyone whose stored number is lower is
 * offered the tour; finishing *or skipping* it writes this value.
 */
export const TOUR_VERSION = 1;

export interface TourStep {
    /** Names the translation keys: `tour.<key>.title` and `tour.<key>.body`. */
    key: string;
    /** A CSS selector for the element to highlight. */
    target: string;
    side?: "top" | "bottom" | "left" | "right";
    align?: "start" | "center" | "end";
}

/**
 * The wide board: seven columns and a toolbar.
 *
 * Five steps. The order is the order somebody meets the product in — the week they are looking
 * at, the days inside it, the two places a task goes when it has no day, and then the two
 * controls that are not discoverable by looking (the review, and where the settings live).
 */
export const HORIZONTAL_TOUR: readonly TourStep[] = [
    { key: "week", target: '[data-tour="week"]', side: "bottom", align: "start" },
    { key: "columns", target: '[data-tour="days"]', side: "bottom", align: "center" },
    { key: "buckets", target: '[data-tour="buckets"]', side: "top", align: "center" },
    { key: "leftovers", target: '[data-tour="leftovers"]', side: "bottom", align: "end" },
    { key: "settings", target: '[data-tour="settings"]', side: "bottom", align: "end" },
];

/**
 * The phone: one day at a time.
 *
 * Three steps, not five. There is less to explain — a single column needs no introduction — and
 * a tour is a worse imposition on a phone, where each step covers most of the screen.
 *
 * The two the wide board spends steps on collapse: "this week" and "some day" are tabs on the
 * same rail as the weekdays here, so the rail explains all nine at once; and everything the
 * toolbar holds is behind one menu button.
 */
export const VERTICAL_TOUR: readonly TourStep[] = [
    { key: "day", target: '[data-tour="day"]', side: "bottom", align: "center" },
    { key: "tabs", target: '[data-tour="days"]', side: "top", align: "center" },
    { key: "menu", target: '[data-tour="menu"]', side: "bottom", align: "end" },
];

export const tourFor = (vertical: boolean): readonly TourStep[] =>
    vertical ? VERTICAL_TOUR : HORIZONTAL_TOUR;

/**
 * The steps whose target is actually on the page.
 *
 * Controls come and go with the account: the review button, the feedback button and the share
 * button are each conditional, and a demo board has fewer of them still. Highlighting an element
 * that is not there is either an error or — worse — an empty spotlight in the corner of the
 * screen with a paragraph attached to it.
 */
export const presentSteps = (steps: readonly TourStep[]): TourStep[] =>
    steps.filter((step) => document.querySelector(step.target) !== null);

/**
 * Resolves once the board has drawn the things the tour talks about.
 *
 * The tour is decided from settings, which arrive over the network, and drawn against the DOM,
 * which arrives when the splash lifts. Neither reliably comes second. Rather than guess at a
 * delay, this waits for the elements themselves and gives up after `timeout` — at which point
 * the board is either broken or showing something the tour was not written for, and in both
 * cases running it anyway would be worse than not.
 */
export const whenReady = (
    steps: readonly TourStep[],
    timeout = 10_000,
    now: () => number = () => Date.now(),
): Promise<boolean> => new Promise((resolve) => {
    const deadline = now() + timeout;

    const look = () => {
        if (presentSteps(steps).length > 0) {
            resolve(true);

            return;
        }

        if (now() >= deadline) {
            resolve(false);

            return;
        }

        window.requestAnimationFrame(look);
    };

    look();
});
