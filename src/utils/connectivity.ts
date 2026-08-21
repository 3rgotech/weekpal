/**
 * Whether the backend is actually reachable, as opposed to whether the machine has a network.
 *
 * `navigator.onLine` only knows about the local link. It reports true behind a captive portal,
 * on a wifi network with no route out, and while the API itself is down or restarting — so the
 * board used to believe it was syncing when nothing was arriving. It is still worth consulting,
 * because a `false` is trustworthy and costs nothing: no request is sent when the machine knows
 * it is offline.
 *
 * So both, in that order: `navigator.onLine` first as a free negative, then `GET /status` — an
 * unauthenticated endpoint that exists for exactly this — to confirm the API answers.
 *
 * The result is cached and read synchronously. The alternative, awaiting a probe wherever
 * connectivity is consulted, would put a network round trip in front of every local write.
 */

type Listener = (reachable: boolean) => void;

interface ConnectivityConfig {
    baseApiUrl?: string;
    dataSource?: string;
}

/**
 * Told, not fetched.
 *
 * Reading `getEnvConfig()` from here would drag `env.ts` — and its `import.meta.env` — into
 * every module that touches the sync path, which jest cannot parse. `App` configures this once
 * at startup instead, which also makes the tests say plainly what environment they assume.
 */
let config: ConnectivityConfig = {};

export function configureConnectivity(next: ConnectivityConfig): void {
    config = next;
}

/** How long a probe's answer is trusted before the next sync re-checks. */
const FRESH_FOR_MS = 30_000;

/** Short: this is a liveness check, and a slow answer is a bad one. */
const TIMEOUT_MS = 3_000;

/**
 * Optimistic until proven otherwise, which keeps a first write from being held back by a probe
 * that has not run yet. A failed probe corrects it, and the queue makes a wrong guess cheap:
 * the write is stored locally either way.
 */
let apiReachable = true;
let lastProbedAt = 0;
const listeners = new Set<Listener>();

/** The cached answer: what the machine says, and what the API last said. */
export function isReachable(): boolean {
    return navigator.onLine && apiReachable;
}

export function isProbeStale(): boolean {
    return Date.now() - lastProbedAt > FRESH_FOR_MS;
}

/**
 * Ask the API whether it is there.
 *
 * Returns the cached answer without a request when the machine reports itself offline — there is
 * nothing to ask and no point waiting for a timeout to tell us so.
 */
export async function probe(): Promise<boolean> {
    if (!navigator.onLine) {
        update(false);

        return false;
    }

    const { baseApiUrl, dataSource } = config;

    // Demo and test boards have no API behind them. Probing would fail and mark a local-only
    // session offline, which is both wrong and visible.
    if (dataSource !== 'api' || !baseApiUrl) {
        update(true);

        return true;
    }

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

        // No credentials: `/status` is deliberately unauthenticated, so an expired token cannot
        // masquerade as being offline.
        const response = await fetch(`${baseApiUrl.replace(/\/$/, '')}/status`, {
            method: 'GET',
            signal: controller.signal,
            headers: { Accept: 'application/json' },
        });

        clearTimeout(timeout);
        update(response.ok);

        return response.ok;
    } catch {
        // A network error, a DNS failure, a captive portal's redirect, or our own timeout.
        update(false);

        return false;
    }
}

/** Probe only when the last answer has gone stale. */
export async function probeIfStale(): Promise<boolean> {
    if (!isProbeStale()) {
        return isReachable();
    }

    return probe();
}

function update(reachable: boolean): void {
    lastProbedAt = Date.now();

    if (reachable === apiReachable) {
        return;
    }

    apiReachable = reachable;
    listeners.forEach((listener) => listener(isReachable()));
}

export function subscribeToConnectivity(listener: Listener): () => void {
    listener(isReachable());
    listeners.add(listener);

    return () => {
        listeners.delete(listener);
    };
}

/** Test seam. */
export function resetConnectivity(): void {
    apiReachable = true;
    lastProbedAt = 0;
    listeners.clear();
    config = {};
}
