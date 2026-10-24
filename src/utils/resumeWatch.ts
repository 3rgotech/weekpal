/**
 * Notice that the board has come back into view, or has simply been on screen for a while.
 *
 * Reading the week happens when something re-renders the board — a week change, a filter — and
 * an installed app on a phone does neither. iOS does not reload a home-screen app when it is
 * reopened; it resumes the page it froze, hours or days later, and that page goes on showing
 * the week as it was when it was frozen. Tasks added on the laptop since never appeared, and
 * leaving the app open did not help, because nothing on an untouched board ever asks again.
 *
 * Two triggers, for the same reason as {@see dayWatch}:
 *
 * - **Returning**: `visibilitychange` to visible after being hidden for a while, and `pageshow`
 *   from the back-forward cache. A glance away and back is not worth a request.
 * - **Staying**: an interval while visible, for the board that is never hidden.
 */

/** Away for less than this and the board is not re-read on return. */
const AWAY_MS = 30_000;

/** How often a board left on screen re-reads itself. */
const EVERY_MS = 5 * 60_000;

export function watchForReturn(onReturn: () => void): () => void {
    let hiddenAt: number | null = document.visibilityState === 'hidden' ? Date.now() : null;

    const onVisibilityChange = () => {
        if (document.visibilityState === 'hidden') {
            hiddenAt = Date.now();

            return;
        }

        const away = hiddenAt === null ? 0 : Date.now() - hiddenAt;
        hiddenAt = null;

        if (away >= AWAY_MS) {
            onReturn();
        }
    };

    const onPageShow = (event: PageTransitionEvent) => {
        if (event.persisted) {
            onReturn();
        }
    };

    const timer = window.setInterval(() => {
        if (document.visibilityState === 'visible') {
            onReturn();
        }
    }, EVERY_MS);

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pageshow', onPageShow);

    return () => {
        document.removeEventListener('visibilitychange', onVisibilityChange);
        window.removeEventListener('pageshow', onPageShow);
        window.clearInterval(timer);
    };
}
