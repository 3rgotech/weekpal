import { describe, expect, it } from "@jest/globals";
import { leftoverBadge } from "../settings";

/**
 * The badge is the only sign the board gives that the review still holds something, once it has
 * been dismissed for the week. What it must never do is grow wide enough to swallow the icon.
 */
describe("leftoverBadge", () => {
    it("says nothing when nothing is waiting", () => {
        expect(leftoverBadge(0)).toBeNull();
        // Not reachable through a length, but a badge is not the place to render "-1".
        expect(leftoverBadge(-1)).toBeNull();
    });

    it("counts up to nine exactly", () => {
        expect(leftoverBadge(1)).toBe("1");
        expect(leftoverBadge(9)).toBe("9");
    });

    it("caps beyond nine, where the exact figure would not fit anyway", () => {
        expect(leftoverBadge(10)).toBe("9+");
        expect(leftoverBadge(147)).toBe("9+");
    });
});
