/**
 * How loudly a card admits it has been carried.
 *
 * *(rt §6)* The count is observed behaviour, not a self-report — which is the whole reason the
 * urgency field was cut. A priority someone set on a Monday when they felt organised disagrees
 * with reality by Thursday; how many times they actually moved the thing does not.
 *
 * Four rules, and each one is a decision that was argued:
 *
 * - **One deferral gets nothing.** Moving a task once is Tuesday. A badge on it would mean the
 *   badge appears on almost every card, and a mark that is everywhere is a mark that is nowhere.
 * - **Escalate in fill, never in size.** A badge that grew would change the card's metrics, and
 *   a row of cards whose heights disagree reads as damage rather than as emphasis.
 * - **Never red.** Red means error, and a repeatedly-deferred task is not an error — it is a
 *   signal about fit. On a board already spending sixteen hues on categories, near-black is
 *   louder than red anyway, and colour here would compete with the one system colour means.
 * - **Cap at three steps.** `7+` stays `7+`. Without a cap a heavy deferrer's whole board is at
 *   maximum, which is a board where nothing stands out — the mark would be measuring the person
 *   rather than telling them anything.
 *
 * @see PROGRESS.md R19
 */

export type DeferralTier = "none" | "muted" | "pill" | "heavy";

/** Where the escape hatch appears, and stays. */
export const ESCAPE_HATCH_AT = 5;

/** Beyond this the label stops counting and says `7+`. */
const CAP = 7;

export function deferralTier(count: number | null | undefined): DeferralTier {
    const moves = count ?? 0;

    if (moves <= 1) {
        return "none";
    }

    if (moves === 2) {
        return "muted";
    }

    if (moves <= 4) {
        return "pill";
    }

    return "heavy";
}

/**
 * What the badge says.
 *
 * A bare number, because the mark describes the **task** and never the person — "moved 4 times"
 * is a fact about a card, where "you postponed this 4 times" is an accusation, and the board has
 * no business making one.
 */
export function deferralLabel(count: number | null | undefined): string {
    const moves = count ?? 0;

    return moves >= CAP ? `${CAP}+` : `${moves}`;
}

/**
 * Whether this card carries the way out.
 *
 * *(rt §6)* Escalation without an exit is nagging with better typography. Reaching the top tier
 * **permanently** surfaces it — not on hover, not behind a menu — because the whole point is
 * that the offer arrives when the task has earned it rather than when the user goes looking.
 */
export function hasEscapeHatch(count: number | null | undefined): boolean {
    return (count ?? 0) >= ESCAPE_HATCH_AT;
}
