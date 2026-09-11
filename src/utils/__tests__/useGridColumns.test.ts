import { describe, expect, it } from "@jest/globals";
import { countTracks } from "../useGridColumns";

/**
 * How many cards the grid is putting side by side, read off the grid itself.
 *
 * Getting this wrong is silent: an over-count windows the list into rows that are never full and
 * leaves gaps down the right-hand side, an under-count hides cards off the end of every row, and
 * either way the board looks broken without anything having thrown.
 */
describe("counting the tracks a grid declares", () => {
    it("counts the resolved widths a laid-out grid reports", () => {
        // What `getComputedStyle` normally gives: used values, one per track.
        expect(countTracks("340px 340px 340px")).toBe(3);
        expect(countTracks("512px 512px")).toBe(2);
        expect(countTracks("1024px")).toBe(1);
    });

    it("reads the count out of an unresolved repeat()", () => {
        // An element that is not laid out reports the specified value instead, and that is what
        // Tailwind's `grid-cols-3` specifies. Splitting on spaces would see four tokens.
        expect(countTracks("repeat(3, minmax(0, 1fr))")).toBe(3);
        expect(countTracks("repeat(2, minmax(0, 1fr))")).toBe(2);
        expect(countTracks("repeat(1, minmax(0, 1fr))")).toBe(1);
    });

    it("does not let brackets inside a track split it in two", () => {
        expect(countTracks("minmax(0, 1fr) minmax(0, 1fr)")).toBe(2);
        expect(countTracks("[full-start] 1fr [content] 2fr [full-end]")).toBe(2);
    });

    it("reads an element that is not a grid as a single file", () => {
        // Every day column, and the phone. `none` is what a non-grid reports.
        expect(countTracks("none")).toBe(1);
        expect(countTracks("")).toBe(1);
        expect(countTracks("   ")).toBe(1);
    });

    it("falls back to one rather than to nothing", () => {
        // jsdom resolves no styles at all, and a detached element reports whatever it likes. One
        // column is always a correct layout; zero is a division by zero and an infinite row count.
        expect(countTracks(null)).toBe(1);
        expect(countTracks(undefined)).toBe(1);
        expect(countTracks("repeat(0, 1fr)")).toBe(1);
    });
});
