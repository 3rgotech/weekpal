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

/** Test seam. */
export function resetBoardToken(): void {
    token = undefined;
    refreshUrl = undefined;
    inFlight = null;
}
