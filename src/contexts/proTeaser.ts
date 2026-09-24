import { createContext, useContext } from "react";

/**
 * The one Pro teaser (roundtable §2, R4).
 *
 * WeekPal shows no upgrade prompts; this is the single sanctioned exception. It is never shown
 * inside the Leftover Review — that is the one room where someone may be bad at their week
 * without being sold anything — only on the board, after the review closes. Whether it shows at
 * all is the server's call, because its rules span devices and weeks: spared on the first two
 * reviews, at most every four weeks, silent while the pattern is unchanged, and gone for good
 * once dismissed or twice ignored. This context only carries the answer to the bar.
 */
export interface ProTeaserValue {
    /** The pattern on screen, or null when there is nothing to show. */
    signature: string | null;
    /** Where the teaser's door opens: the Pro page, at the Avoidance Report. */
    href: string | null;
    reviewClosed: (week: string) => void;
    follow: () => void;
    dismiss: () => void;
}

const noop: ProTeaserValue = {
    signature: null,
    href: null,
    reviewClosed: () => {},
    follow: () => {},
    dismiss: () => {},
};

export const ProTeaserContext = createContext<ProTeaserValue>(noop);

/** Outside the provider — the demo, a test — every call is a no-op and nothing shows. */
export const useProTeaser = (): ProTeaserValue => useContext(ProTeaserContext);
