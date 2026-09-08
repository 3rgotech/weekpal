/**
 * Notice that the server has moved on from the bundle this page is running.
 *
 * A tab open for a month is running month-old JavaScript. Usually harmless; not harmless when a
 * deploy in between changed what a request or a response looks like — the old code then writes
 * in a dialect the API has stopped speaking, and the errors it gets back are validation failures
 * on data that was never wrong.
 *
 * The service worker already watches for redeployments, but only when it manages to fetch a new
 * worker: offline, blocked by policy, or simply not yet, and the tab carries on regardless. This
 * is the cheaper second answer, and it rides on requests the board is making anyway — the server
 * states its build on every API response, and a mismatch is noticed on the next write attempt
 * rather than an hour later.
 *
 * Announced once. A stale tab makes many requests and every one of them mismatches; telling the
 * user forty times is telling them nothing.
 *
 * @see PROGRESS.md R28(c)
 */

const HEADER = 'X-WeekPal-Build';

/** What this page loaded with. `undefined` on a demo or dev board, which disables the fence. */
let loadedBuild: string | undefined;
let announced = false;
const listeners = new Set<() => void>();

export function configureBuildFence(build: string | undefined): void {
    loadedBuild = build;
    announced = false;
}

/**
 * Compare a response's build against this page's.
 *
 * Takes the whole response rather than the header value so the caller cannot forget which header
 * to read, and so a response without one is silently fine — the middleware may not be deployed
 * yet, and a fence that fired on its own absence would be worse than no fence.
 */
export function checkBuildFence(response: { headers: { get(name: string): string | null } }): void {
    if (!loadedBuild || announced) {
        return;
    }

    const served = response.headers.get(HEADER);

    // `unknown` is what a server with no built bundle answers — a developer running the SPA off
    // the Vite dev server. Comparing against it would nag on every request.
    if (!served || served === 'unknown' || served === loadedBuild) {
        return;
    }

    announced = true;
    listeners.forEach((listener) => listener());
}

export function subscribeToBuildMismatch(listener: () => void): () => void {
    listeners.add(listener);

    return () => {
        listeners.delete(listener);
    };
}

/** Test seam. */
export function resetBuildFence(): void {
    loadedBuild = undefined;
    announced = false;
    listeners.clear();
}
