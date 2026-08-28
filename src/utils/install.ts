import { useCallback, useEffect, useState } from "react";

/**
 * The event Chrome fires when it decides a site is installable. It is not in the DOM typings
 * because it is not in any standard — Safari and Firefox never fire it.
 */
interface InstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * Whether the board is already running as an installed app.
 *
 * Two ways of asking, because the two platforms answer differently: `display-mode: standalone` is
 * the standard one, and iOS carries its own `navigator.standalone` from before the standard
 * existed. Either being true means there is nothing left to offer.
 */
export function isInstalled(): boolean {
    if (typeof window === 'undefined') {
        return false;
    }

    const asApp = typeof window.matchMedia === 'function'
        && window.matchMedia('(display-mode: standalone)').matches;

    return asApp || (window.navigator as { standalone?: boolean }).standalone === true;
}

/**
 * iOS Safari, which can add to a home screen but has no API for it.
 *
 * Chrome and Firefox on iOS are deliberately excluded: they render through the same engine but
 * cannot install anything, so telling their users how to would be telling them to do something
 * that does not work.
 */
export function isIosSafari(): boolean {
    if (typeof window === 'undefined') {
        return false;
    }

    const agent = window.navigator.userAgent;

    return /iphone|ipad|ipod/i.test(agent) && !/crios|fxios|edgios/i.test(agent);
}

interface InstallPrompt {
    /** Whether to offer installation at all. False once installed, and where it cannot be done. */
    canInstall: boolean;
    /** iOS has no prompt to fire, so the offer there is a set of directions. */
    needsManualSteps: boolean;
    install: () => Promise<void>;
}

/**
 * The offer to keep the board on a home screen.
 *
 * Chrome hands over a prompt to fire whenever it feels the site qualifies; iOS Safari hands over
 * nothing at all and expects the user to find its share sheet. This covers both, and goes quiet
 * the moment the app is installed — a menu entry offering to install what you are already running
 * is worse than no entry.
 */
export function useInstallPrompt(): InstallPrompt {
    const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
    const [installed, setInstalled] = useState<boolean>(() => isInstalled());

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        const capture = (event: Event) => {
            // Taking the event is what makes it ours to fire when the user asks, rather than
            // whenever the browser decides to show its own bar.
            event.preventDefault();
            setPrompt(event as InstallPromptEvent);
        };

        const done = () => {
            setInstalled(true);
            setPrompt(null);
        };

        window.addEventListener('beforeinstallprompt', capture);
        window.addEventListener('appinstalled', done);

        return () => {
            window.removeEventListener('beforeinstallprompt', capture);
            window.removeEventListener('appinstalled', done);
        };
    }, []);

    const install = useCallback(async () => {
        if (!prompt) {
            return;
        }

        prompt.prompt();
        await prompt.userChoice;

        // Spent either way: the event cannot be fired a second time.
        setPrompt(null);
    }, [prompt]);

    const manual = !installed && prompt === null && isIosSafari();

    return {
        canInstall: !installed && (prompt !== null || manual),
        needsManualSteps: manual,
        install,
    };
}
