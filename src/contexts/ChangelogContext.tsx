import React, { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from "react";
import { ChangelogEntry } from "../types";
import { useData } from "./DataContext";
import { useShortcuts } from "./ShortcutsContext";
import { useOnboarding } from "./OnboardingContext";
import ChangelogModal from "../components/ChangelogModal";

/** Closed, showing what shipped while the user was away, or showing the whole history. */
type ChangelogView = "new" | "all" | null;

interface ChangelogContextProps {
    /** Whether this board has release notes at all. False on a demo or local-only board. */
    available: boolean;
    /** Open the full history. What the Settings link calls. */
    openChangelog: () => void;
}

const ChangelogContext = createContext<ChangelogContextProps | undefined>(undefined);

/**
 * Release notes, for somebody coming back.
 *
 * The board is a single page nobody navigates away from, so the marketing site's changelog page
 * is somewhere a user of the app never goes. This brings the same entries in, and shows them at
 * the one moment they are worth reading: **the first load after something shipped.**
 *
 * Two rules decide what "in their absence" means, and both live on the server, in
 * `Api\V1\ChangelogController`:
 *
 * - an entry the user has already been shown is seen;
 * - an entry published before the account existed is seen *by definition* — nothing was released
 *   in the absence of somebody who had not arrived yet. That is what keeps a new user's first
 *   visit quiet without a baseline row having to be written at signup.
 *
 * So this asks the server what is new and believes the answer, rather than keeping a
 * last-seen-version in localStorage — which would announce the same release again on every device
 * and forget it entirely when somebody clears their site data.
 *
 * Opened once per session at most. A refetch that happened to arrive while the user was mid-task
 * would otherwise interrupt them with a dialog they had already closed.
 *
 * And it gives way to the first-run tour and then to the leftover review, both of which let
 * themselves in on the same load. Three things arriving at once on the first Monday after a
 * deploy is not a greeting; the notes go last, which is also the honest order — somebody being
 * shown the board for the first time has no absence to be caught up on.
 */
const ChangelogProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { changelogAdapter, leftoversLoaded } = useData();
    const { leftoversOpen } = useShortcuts();
    // Third in the queue, and last for a reason: somebody being shown the board for the first
    // time has no absence to be caught up on.
    const { blocking: onboarding } = useOnboarding();

    const [entries, setEntries] = useState<ChangelogEntry[]>([]);
    const [view, setView] = useState<ChangelogView>(null);
    const [failed, setFailed] = useState(false);
    /** There is something to announce, and the board is not yet a good moment to announce it. */
    const [waiting, setWaiting] = useState(false);
    const announced = useRef(false);

    useEffect(() => {
        if (!changelogAdapter) {
            return;
        }

        let live = true;

        void changelogAdapter
            .list()
            .then((loaded) => {
                if (!live) {
                    return;
                }

                setEntries(loaded);

                // Offered, not forced: an empty result and a first-time account both land here
                // and both should leave the board alone.
                if (!announced.current && loaded.some((entry) => !entry.seen)) {
                    setWaiting(true);
                }
            })
            .catch(() => {
                /*
                 * Silent. Being offline, or being on a build whose backend has the changelog
                 * feature switched off, is not something to interrupt somebody about — there is
                 * nothing they could do with the information. The Settings link stays, and says
                 * so for itself if they go looking.
                 */
                if (live) {
                    setFailed(true);
                }
            });

        return () => {
            live = false;
        };
    }, [changelogAdapter]);

    /*
     * When to actually show it.
     *
     * `leftoversLoaded` rather than a timer: the review decides whether to let itself in during
     * the same tick its list lands, so waiting for that removes the race entirely — a network
     * response cannot arrive before a local read and then be overtaken by it.
     */
    useEffect(() => {
        if (!waiting || announced.current || !leftoversLoaded || leftoversOpen || onboarding) {
            return;
        }

        announced.current = true;
        setWaiting(false);
        setView("new");
    }, [waiting, leftoversLoaded, leftoversOpen, onboarding]);

    /*
     * Closing is the acknowledgement.
     *
     * Every published entry is marked, not the ones scrolled past: an entry somebody did not read
     * is one they chose not to read, and showing it again tomorrow would turn the dialog into
     * something to dismiss rather than something to read.
     *
     * The local copy is updated without waiting for the request. If it fails the worst case is
     * the same dialog on the next load, which is the failure this should have.
     */
    const close = useCallback(() => {
        setView(null);

        if (!changelogAdapter || entries.every((entry) => entry.seen)) {
            return;
        }

        setEntries((current) => current.map((entry) => ({ ...entry, seen: true })));
        void changelogAdapter.markRead().catch(() => undefined);
    }, [changelogAdapter, entries]);

    const openChangelog = useCallback(() => {
        // Once it has been asked for by name, it stays asked for: a user who opens the history
        // deliberately should not be shown the "what's new" version of it a moment later.
        announced.current = true;
        setWaiting(false);
        setView("all");
    }, []);

    return (
        <ChangelogContext.Provider value={{ available: changelogAdapter !== null, openChangelog }}>
            {children}
            <ChangelogModal
                isOpen={view !== null}
                view={view}
                entries={entries}
                failed={failed}
                onClose={close}
                onShowEverything={() => setView("all")}
            />
        </ChangelogContext.Provider>
    );
};

/**
 * Optional, like `useShortcuts`: the print sheet and most component tests render outside the
 * provider, and a Settings dialog that threw because nothing was listening for a changelog would
 * take the whole board with it.
 */
const useChangelog = (): ChangelogContextProps => useContext(ChangelogContext) ?? {
    available: false,
    openChangelog: () => { },
};

export { ChangelogContext, ChangelogProvider, useChangelog };
