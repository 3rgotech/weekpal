import { useCallback, useEffect, useState } from "react";

/** How often a board nobody has closed goes looking for a new version. */
const CHECK_EVERY = 60 * 60 * 1000;

interface AppUpdate {
    /** A newer version has taken over the page's worker; the code on screen is the old one. */
    updateReady: boolean;
    refresh: () => void;
    dismiss: () => void;
}

/**
 * Noticing that the app has been redeployed underneath someone.
 *
 * The service worker activates a new version as soon as it finds one, but a page already open
 * goes on running the code it loaded — so the board can be a week behind the server and give no
 * sign of it. This is the sign.
 *
 * `controllerchange` is the signal, guarded by whether there was a controller to begin with:
 * the very first install claims the page too, and announcing an update to someone who has just
 * arrived would be announcing nothing.
 *
 * The check is also driven from here rather than left to the browser. A browser looks for a new
 * worker when the page navigates, and a board that is left open never navigates — the whole case
 * this exists for.
 */
export function useAppUpdate(): AppUpdate {
    const [updateReady, setUpdateReady] = useState(false);

    useEffect(() => {
        const worker = typeof navigator === 'undefined' ? undefined : navigator.serviceWorker;

        if (!worker) {
            return;
        }

        /*
         * Whether this page has ever been under a worker — kept live, not snapshotted at mount.
         *
         * On a first visit the page is not controlled yet: the worker installs, claims it, and
         * `controllerchange` fires for that. Reading the flag once at mount left it false for the
         * life of the page, so every *real* update afterwards was swallowed as though it were
         * that first claim. This is the difference between arriving and being replaced.
         */
        let controlled = Boolean(worker.controller);

        const announce = () => {
            if (controlled) {
                setUpdateReady(true);

                return;
            }

            controlled = true;
        };

        const check = () => {
            worker.getRegistration()
                .then((registration) => registration?.update())
                .catch(() => {
                    // Offline, most likely. The next check is the retry.
                });
        };

        const onVisible = () => {
            if (document.visibilityState === 'visible') {
                check();
            }
        };

        worker.addEventListener('controllerchange', announce);
        document.addEventListener('visibilitychange', onVisible);

        check();

        const timer = window.setInterval(check, CHECK_EVERY);

        return () => {
            worker.removeEventListener('controllerchange', announce);
            document.removeEventListener('visibilitychange', onVisible);
            window.clearInterval(timer);
        };
    }, []);

    const refresh = useCallback(() => {
        window.location.reload();
    }, []);

    /**
     * Deliberately not remembered anywhere.
     *
     * Someone dismissing this is saying "not now" — a bad connection, a task half typed — not
     * "never". Reopening the app loads the new version anyway, so there is nothing left to ask;
     * and if another release lands while they stay open, the offer comes back.
     */
    const dismiss = useCallback(() => {
        setUpdateReady(false);
    }, []);

    return { updateReady, refresh, dismiss };
}
