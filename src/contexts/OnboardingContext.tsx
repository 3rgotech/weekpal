import React, { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from "react";
import { driver, type Driver } from "driver.js";
import { useTranslation } from "react-i18next";
import { useSettings } from "./SettingsContext";
import { useVerticalLayout } from "../utils/layout";
import { TOUR_VERSION, presentSteps, tourFor, whenReady } from "../utils/tour";

/** Idle before it has decided; waiting for the board to draw; running; or over for this session. */
type TourState = "idle" | "waiting" | "running" | "done";

interface OnboardingContextProps {
    /**
     * The tour has the floor.
     *
     * True until it is over, *including while it is still deciding*. The leftover review opens off
     * a local IndexedDB read and this decides off a network response, so anything short of
     * claiming the floor up front is a race the tour loses on a slow connection — and loses into
     * the worst outcome, a spotlight pointing at a board covered by a dialog.
     *
     * It cannot hang: `settingsLoaded` is set when the request settles either way, and
     * immediately when there is no server to ask.
     */
    blocking: boolean;
    /** Run it again from the beginning. What the Settings link calls. */
    startTour: () => void;
}

const OnboardingContext = createContext<OnboardingContextProps | undefined>(undefined);

/**
 * The first-run tour.
 *
 * Two tours, one script: `tourFor` returns the wide board's five steps or the phone's three, and
 * which one runs is decided by the same `useVerticalLayout` that decides which board mounted. A
 * single tour would be pointing at elements half the users do not have.
 *
 * *(rt §8)* Worth being clear about what this is not. **#3 — persona-driven onboarding — stays
 * cut.** No questions, no configuration, nothing to answer: a config surface is a bill paid
 * before any value has arrived. This points at a board that is already on screen and then gets
 * out of the way.
 *
 * It needs an account. A demo visitor gets `DemoModal` explaining what they are looking at, and
 * nothing here should be the second dialog in front of somebody who has not decided whether they
 * want the product yet.
 *
 * Three things it has to get right, and each is a bug that only shows up on somebody's first day:
 *
 * - **It waits for the account's real settings**, not the browser's. The board renders from
 *   localStorage immediately, so a fresh browser on an established account starts with
 *   `onboardingVersion: 0` for as long as the request is in flight. Firing on that would show
 *   the tour to somebody who finished it months ago, on the one device where they cannot dismiss
 *   it permanently by dismissing it.
 * - **It waits for the board to be drawn.** The steps are selectors, and the splash screen is
 *   still up when the settings land.
 * - **It goes first.** The leftover review and the release notes both let themselves in on load,
 *   and a spotlight pointing at a board covered by two dialogs is worse than no spotlight.
 *
 * Skipping counts as finishing. Somebody who closed it has decided, and a tour that returns
 * tomorrow because it was not completed is a tour people learn to fear rather than read.
 */
const OnboardingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { t } = useTranslation();
    const { settings, updateSettings, settingsLoaded, settingsPersisted } = useSettings();
    const vertical = useVerticalLayout();

    const [state, setState] = useState<TourState>("idle");
    const instance = useRef<Driver | null>(null);

    /*
     * Whether to offer it at all.
     *
     * Only out of `idle`, and only once the account's own settings have arrived. `>=` rather than
     * `!==`: a client that has somehow stored a version ahead of the one it ships should be left
     * alone rather than shown a tour it has already outgrown.
     */
    useEffect(() => {
        if (state !== "idle" || !settingsLoaded) {
            return;
        }

        // No account, no tour. The demo board opens with a dialog explaining what it is, and a
        // second one teaching somebody to plan their week would be two impositions before they
        // have decided whether they want the product at all.
        if (!settingsPersisted || settings.onboardingVersion >= TOUR_VERSION) {
            setState("done");

            return;
        }

        setState("waiting");
    }, [state, settingsLoaded, settingsPersisted, settings.onboardingVersion]);

    /**
     * End the tour.
     *
     * `record` is the whole question: did the *user* end it, or did we? Finishing and skipping are
     * both decisions and both get written; a rotation or an unmount is neither, and writing on
     * those would quietly consume somebody's one chance to see this.
     *
     * `destroy()` is driver's `h(false)` — it tears down without re-entering `onDestroyStarted`,
     * so calling it from inside that hook cannot loop.
     */
    const stop = useCallback((record: boolean) => {
        const tour = instance.current;
        instance.current = null;

        tour?.destroy();
        setState("done");

        if (record) {
            updateSettings({ onboardingVersion: TOUR_VERSION });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const launch = useCallback(() => {
        // Only the steps whose target is on the page. The review button, the feedback button and
        // the share button are each conditional, and a spotlight on nothing is worse than a
        // missing step.
        const steps = presentSteps(tourFor(vertical));

        if (steps.length === 0) {
            setState("done");

            return;
        }

        const tour = driver({
            showProgress: steps.length > 1,
            progressText: t("tour.progress"),
            nextBtnText: t("tour.next"),
            prevBtnText: t("tour.back"),
            doneBtnText: t("tour.done"),
            // The spotlit control stays inert for the length of the tour. Letting somebody drag a
            // task out of the column being described mid-sentence leaves the popover pointing at
            // a rectangle that no longer holds what it is talking about.
            disableActiveInteraction: true,
            popoverClass: "weekpal-tour",
            steps: steps.map((step) => ({
                element: step.target,
                popover: {
                    title: t(`tour.${step.key}.title`),
                    description: t(`tour.${step.key}.body`),
                    side: step.side,
                    align: step.align,
                },
            })),
            /*
             * `onDestroyStarted`, not `onDestroyed`.
             *
             * Two reasons, and the second is why this is written down. It fires on every way a
             * *person* can end the tour — Done, the close button, Escape, a click on the overlay —
             * while our own `destroy()` deliberately skips it, so "the user decided" and "we tore
             * it down" are told apart by which path ran rather than by a flag one of them has to
             * remember to set.
             *
             * And `onDestroyed` could not do the job: driver 1.8 only calls it when its internal
             * `__activeElement` and `__activeStep` are both still populated, which they are not
             * once a step's transition has settled. Closing a tour that had been sitting open
             * never reached it — the tour vanished and the account recorded nothing, so it came
             * back on the next load. Caught by the browser test below.
             */
            onDestroyStarted: () => stop(true),
        });

        instance.current = tour;
        setState("running");
        tour.drive();
    }, [vertical, t, stop]);

    /*
     * Wait for the board, then go.
     *
     * A timeout ends the wait rather than the tour: nothing is recorded, so the next load offers
     * it again. Ten seconds of a board that never drew its own columns is a board with a bigger
     * problem than onboarding, and a spotlight would be the wrong thing to add to it.
     */
    useEffect(() => {
        if (state !== "waiting") {
            return;
        }

        let cancelled = false;

        void whenReady(tourFor(vertical)).then((ready) => {
            if (cancelled) {
                return;
            }

            if (!ready) {
                setState("done");

                return;
            }

            launch();
        });

        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state, vertical]);

    /*
     * A tablet turned mid-tour.
     *
     * The board genuinely remounts — `MobileBoard` and `MainContent` are different trees — so
     * every element the tour is pointing at goes away. The tour ends without being recorded, and
     * the next load offers it again against whichever layout the device is in by then. Restarting
     * it in place would mean a tour that relaunches every time somebody turns their tablet over.
     */
    const previousLayout = useRef(vertical);

    useEffect(() => {
        if (previousLayout.current === vertical) {
            return;
        }

        previousLayout.current = vertical;

        if (instance.current) {
            stop(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [vertical]);

    // Leaving the page mid-tour is not finishing it either. Torn down directly rather than
    // through `stop`, which would set state on a provider that is going away.
    useEffect(() => () => {
        instance.current?.destroy();
        instance.current = null;
    }, []);

    const startTour = useCallback(() => {
        instance.current?.destroy();
        instance.current = null;

        // Straight to `waiting`, bypassing the version check: this is somebody asking for it by
        // name, and they have plainly already seen it.
        setState("waiting");
    }, []);

    return (
        <OnboardingContext.Provider
            value={{ blocking: state !== "done", startTour }}
        >
            {children}
        </OnboardingContext.Provider>
    );
};

/**
 * Optional, like `useShortcuts` and `useChangelog`: the print sheet and most component tests
 * render outside the provider, and nothing there should throw for want of a tour.
 */
const useOnboarding = (): OnboardingContextProps => useContext(OnboardingContext) ?? {
    blocking: false,
    startTour: () => { },
};

export { OnboardingContext, OnboardingProvider, useOnboarding };
