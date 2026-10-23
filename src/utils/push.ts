import { IPushAdapter } from "../types";

/**
 * Whether this browser can receive the morning briefing, and if not, why.
 *
 * - `ready`: it can; asking will show the browser's permission prompt.
 * - `install`: an iPhone or iPad in a browser tab. iOS only delivers web push to a web app added
 *   to the Home Screen, so the answer there is "install it", not "unsupported".
 * - `denied`: the user said no to this site's notifications. Only the browser's own site settings
 *   can undo that; asking again from the page does nothing at all.
 * - `unsupported`: no push in this browser, or no service worker on this page (the dev server,
 *   a private window in some browsers).
 */
export type PushSupport = "ready" | "install" | "denied" | "unsupported";

const isIos = (): boolean => (
    /iPad|iPhone|iPod/.test(navigator.userAgent)
    // iPadOS asks for the desktop site, and says so by claiming to be a Mac with a touch screen.
    || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
);

const isStandalone = (): boolean => (
    window.matchMedia?.("(display-mode: standalone)").matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true
);

export function pushSupport(): PushSupport {
    const capable = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

    if (!capable) {
        return isIos() && !isStandalone() ? "install" : "unsupported";
    }

    return Notification.permission === "denied" ? "denied" : "ready";
}

/**
 * The page's service worker registration, or null when there is none.
 *
 * `navigator.serviceWorker.ready` would be the usual way in, but it never settles on a page with
 * no worker, and a settings switch that hangs forever is worse than one that says it cannot.
 */
async function registration(): Promise<ServiceWorkerRegistration | null> {
    return (await navigator.serviceWorker.getRegistration()) ?? null;
}

/** Whether this browser already holds a push subscription. */
export async function isSubscribed(): Promise<boolean> {
    if (pushSupport() !== "ready" || Notification.permission !== "granted") {
        return false;
    }

    const worker = await registration();

    return (await worker?.pushManager.getSubscription()) != null;
}

/** The VAPID key as the browser wants it: bytes, from the URL-safe base64 the server publishes. */
export function keyBytes(key: string): Uint8Array<ArrayBuffer> {
    const padded = `${key}${"=".repeat((4 - (key.length % 4)) % 4)}`.replace(/-/g, "+").replace(/_/g, "/");
    const raw = atob(padded);
    const bytes = new Uint8Array(new ArrayBuffer(raw.length));

    for (let index = 0; index < raw.length; index++) {
        bytes[index] = raw.charCodeAt(index);
    }

    return bytes;
}

/**
 * Ask for permission, subscribe this browser, and hand the subscription to the server.
 *
 * Must be called from a click: browsers refuse a permission prompt nobody asked for. Resolves to
 * what happened rather than throwing, because each outcome is something the settings say back.
 */
export async function subscribeThisDevice(
    key: string,
    adapter: IPushAdapter,
): Promise<"subscribed" | "denied" | "unsupported"> {
    if (pushSupport() !== "ready") {
        return pushSupport() === "denied" ? "denied" : "unsupported";
    }

    const permission = await Notification.requestPermission();

    if (permission !== "granted") {
        return "denied";
    }

    const worker = await registration();

    if (!worker) {
        return "unsupported";
    }

    const subscription = await worker.pushManager.getSubscription()
        ?? await worker.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(key) });

    await adapter.subscribe(subscription.toJSON());

    return "subscribed";
}

/** Where this browser thinks it is, as an IANA name — what the server needs to read "8:00". */
export function browserTimezone(): string | null {
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone ?? null;
    } catch {
        return null;
    }
}
