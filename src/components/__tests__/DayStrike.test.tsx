import { describe, expect, it } from "@jest/globals";
import { render } from "@testing-library/react";
import React from "react";
import DayStrike from "../DayStrike";

/**
 * One stroke, corner to corner of a finished day's contents.
 *
 * The two properties worth pinning are the ones that were argued: the endpoints are anchored
 * rather than the angle, and the stroke is drawn once and then is simply ink.
 */
const line = (container: HTMLElement) => container.querySelector("line");

describe("the diagonal", () => {
    it("draws nothing for a day that is not finished", () => {
        const { container } = render(<DayStrike done={false} height={200} />);

        expect(container.firstElementChild).toBeNull();
    });

    it("draws nothing when there is no content to strike", () => {
        // A stroke through empty space reads *cancelled*, not *finished*.
        const { container } = render(<DayStrike done height={0} />);

        expect(container.firstElementChild).toBeNull();
    });

    it("anchors its endpoints rather than its angle", () => {
        // So it stays a strike in a squat two-by-two tile as readily as in a tall column, where
        // a fixed angle would leave it pointing at nothing.
        const { container } = render(<DayStrike done height={180} />);

        expect(line(container)?.getAttribute("x1")).toBe("0");
        expect(line(container)?.getAttribute("y1")).toBe("0");
        expect(line(container)?.getAttribute("x2")).toBe("100%");
        expect(line(container)?.getAttribute("y2")).toBe("100%");
    });

    it("stops at the bottom of the last card", () => {
        const { container } = render(<DayStrike done height={137} />);

        expect(container.querySelector("svg")?.getAttribute("height")).toBe("137");
    });

    it("is already drawn when the day was finished before this page loaded", () => {
        // It is ink. A mark that redrew itself on every reload would be a celebration of having
        // opened a browser tab.
        const { container } = render(<DayStrike done height={180} />);

        expect(line(container)?.getAttribute("class")).toContain("day-strike__line--drawn");
        expect(line(container)?.getAttribute("class")).not.toContain("--drawing");
    });

    it("draws when the day becomes finished while you are watching", () => {
        const { container, rerender } = render(<DayStrike done={false} height={180} />);

        rerender(<DayStrike done height={180} />);

        expect(line(container)?.getAttribute("class")).toContain("day-strike__line--drawing");
    });

    it("is monochrome", () => {
        // Colour belongs to categories — the only system on the board doing semantic work.
        const { container } = render(<DayStrike done height={180} />);

        expect(line(container)?.getAttribute("class")).not.toMatch(/red|green|sky-5|amber|rose/);
    });

    it("is decorative, since every card underneath already says it is done", () => {
        const { container } = render(<DayStrike done height={180} />);

        expect(container.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
    });

    it("cannot swallow a click meant for the day", () => {
        const { container } = render(<DayStrike done height={180} />);

        expect(container.querySelector("svg")?.getAttribute("class")).toContain("pointer-events-none");
    });
});
