/**
 * The bearer token the board writes with, and how it gets a new one.
 *
 * Board tokens live twelve hours and are written into the page when it renders. That is right
 * for a page you open, use and close; it is wrong for this one, which lives in a tab nobody
 * closes. On the morning of the second day every write gets a 401.
 *
 * The queue already handles that 401 correctly — it stops rather than dropping the writes, and
 * does not count a failed attempt, so nothing ages into a dead letter. But it stops *for ever*,
 * because nothing was ever going to hand it a new token. A fortnight of work sits behind an
 * expired credential while the board reports that all is well. That is the bug this closes.
 *
 * One token for every adapter, and one refresh in flight at a time: a board coming back online
 * flushes a queue, and without the shared promise each queued write would mint its own token and
 * they would prune each other out of existence.
 *
 * @see PROGRESS.md R28(b)
 */

let token: string | undefined;
let refreshUrl: string | undefined;
let inFlight: Promise<string | undefined> | null = null;

export function configureBoardToken(initial: string | undefined, url: string | undefined): void {
    token = initial;
    refreshUrl = url;
}

export function boardToken(): string | undefined {
    return token;
}

/**
 * Ask for a new token, once.
 *
 * Returns undefined when there is nowhere to ask (a demo or test board) or when the ask failed —
 * most importantly when the *session* has expired too, which is the honest end of the line: that
 * user does have to sign in again, and pretending otherwise would be a retry loop.
 */
export function refreshBoardToken(): Promise<string | undefined> {
    if (!refreshUrl) {
        return Promise.resolve(undefined);
    }

    // Everyone waiting joins the request already going out.
    inFlight ??= requestToken().finally(() => {
        inFlight = null;
    });

    return inFlight;
}

async function requestToken(): Promise<string | undefined> {
    try {
        const response = await fetch(refreshUrl as string, {
            method: 'POST',
            // The session cookie is the whole point — this is the one credential that has not
            // expired, and the board is served from the same origin.
            credentials: 'same-origin',
            headers: {
                Accept: 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                ...csrfHeader(),
            },
        });

        if (!response.ok) {
            return undefined;
        }

        const body = await response.json() as { data?: { token?: string } };
        token = body.data?.token;

        return token;
    } catch {
        // Offline, or the endpoint is unreachable. Not a reason to give up on the queue — the
        // caller leaves the entry in place and the next attempt tries again.
        return undefined;
    }
}

/**
 * What proves this POST came from the board's own page.
 *
 * The token route sits on the session, so Laravel checks CSRF on it — and without one it answers
 * 419, the refresh fails, and the board is back to the second-morning bug with a working-looking
 * fix in front of it. The test suite could never show this: Laravel skips the check under PHPUnit.
 *
 * The `XSRF-TOKEN` cookie first, because Laravel re-sets it on every response and it therefore
 * survives the session rotating its token; the page's meta tag is the fallback. An iPhone that
 * resumes the installed app days later is running the page from days ago, and its meta tag with it.
 */
function csrfHeader(): Record<string, string> {
    const cookie = document.cookie
        .split('; ')
        .find((part) => part.startsWith('XSRF-TOKEN='));

    if (cookie) {
        return { 'X-XSRF-TOKEN': decodeURIComponent(cookie.slice('XSRF-TOKEN='.length)) };
    }

    const meta = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content;

    return meta ? { 'X-CSRF-TOKEN': meta } : {};
}

/** Test seam. */
export function resetBoardToken(): void {
    token = undefined;
    refreshUrl = undefined;
    inFlight = null;
}
