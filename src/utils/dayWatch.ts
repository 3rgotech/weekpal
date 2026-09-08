/**
 * Notice that the day has changed while the tab sat there.
 *
 * The board is furniture: it lives in a permanently-open tab, so at rest is 99% of its life. A
 * React tree only recomputes when something re-renders it, and nothing does at 3am — so a tab
 * opened on Thursday still believes it is Thursday on Sunday. Everything downstream inherits
 * that: "today" is highlighted on the wrong column, the past-day marks are wrong, and *last
 * week's board is being shown as this week's*, which is the version of this bug that loses work.
 *
 * Two triggers, because neither is sufficient alone:
 *
 * - **`visibilitychange`**, for the laptop that was shut and reopened. Timers do not fire
 *   reliably while a tab is hidden or a machine is asleep, so coming back to the tab is often
 *   the first moment anything can run at all.
 * - **An interval**, for the tab that was never hidden — a second monitor, left visible across
 *   midnight, where `visibilitychange` never fires.
 *
 * A minute is frequent enough that nobody sees a stale day, and cheap enough to be invisible:
 * it compares two strings.
 *
 * This is also the Leftover Review's re-entry trigger. The review needed a front door that was
 * not an exit ritual — ceremonies churn the moment you miss three days — and "the day changed
 * while you were away" is a fact about the calendar rather than a demand on the user.
 *
 * @see PROGRESS.md R28(a)
 */

type DayChangeListener = (today: string) => void;

/** How often to check when the tab is visible and nothing else has woken us. */
const TICK_MS = 60_000;

let currentDay = today();
let timer: ReturnType<typeof setInterval> | null = null;
let listening = false;
const listeners = new Set<DayChangeListener>();

/** The local calendar day, as a plain sortable string. Not a week code — locale settings decide that. */
function today(): string {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    return `${now.getFullYear()}-${month}-${day}`;
}

export function currentDayKey(): string {
    return currentDay;
}

export function startDayWatch(): void {
    if (listening) {
        return;
    }

    listening = true;
    currentDay = today();

    document.addEventListener('visibilitychange', onVisibilityChange);
    timer = setInterval(check, TICK_MS);
}

export function stopDayWatch(): void {
    document.removeEventListener('visibilitychange', onVisibilityChange);

    if (timer !== null) {
        clearInterval(timer);
        timer = null;
    }

    listening = false;
    listeners.clear();
    currentDay = today();
}

export function subscribeToDayChange(listener: DayChangeListener): () => void {
    listeners.add(listener);

    return () => {
        listeners.delete(listener);
    };
}

/** Exposed so a test — or a manual "refresh" — can force the comparison without waiting a minute. */
export function check(): void {
    const now = today();

    if (now === currentDay) {
        return;
    }

    currentDay = now;
    listeners.forEach((listener) => listener(now));
}

function onVisibilityChange(): void {
    if (document.visibilityState === 'visible') {
        check();
    }
}
