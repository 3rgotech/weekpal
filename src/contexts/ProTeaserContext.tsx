import React, { useCallback, useMemo, useState } from "react";
import { useAccount } from "./AccountContext";
import { useData } from "./DataContext";
import { ProTeaserContext, ProTeaserValue } from "./proTeaser";

/**
 * Supplies the one Pro teaser — see `proTeaser.ts` for the rules it follows.
 *
 * The hook and the context live in that file, which imports nothing: the Leftover Review uses
 * the hook, and this provider's imports (the account, the data) would otherwise pull the adapter
 * factory and `import.meta` into every test that renders the review.
 */
/** `proUrl` comes from `App`, which already reads the environment; this file stays free of it. */
export const ProTeaserProvider: React.FC<{ proUrl?: string | null; children: React.ReactNode }> = ({ proUrl: given, children }) => {
    const { insightsAdapter } = useData();
    const { subscribed } = useAccount();
    const [signature, setSignature] = useState<string | null>(null);
    const proUrl = given ?? null;

    const reviewClosed = useCallback((week: string) => {
        // Pro already has the report; a demo or standalone board has nowhere to send anyone.
        if (!insightsAdapter || subscribed || !proUrl) {
            return;
        }

        insightsAdapter.reviewed(week)
            .then((decision) => setSignature(decision.show ? decision.signature : null))
            // A teaser is the last thing worth an error message.
            .catch(() => {});
    }, [insightsAdapter, subscribed, proUrl]);

    const answer = useCallback((outcome: "clicked" | "dismissed") => {
        if (signature && insightsAdapter) {
            insightsAdapter.respond(signature, outcome).catch(() => {});
        }

        setSignature(null);
    }, [signature, insightsAdapter]);

    const value = useMemo<ProTeaserValue>(() => ({
        signature,
        href: proUrl ? `${proUrl}#avoidance` : null,
        reviewClosed,
        follow: () => answer("clicked"),
        dismiss: () => answer("dismissed"),
    }), [signature, proUrl, reviewClosed, answer]);

    return <ProTeaserContext.Provider value={value}>{children}</ProTeaserContext.Provider>;
};

