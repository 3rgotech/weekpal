import { describe, expect, it } from "@jest/globals";
import { render } from "@testing-library/react";
import React from "react";
import DayShareBar from "../DayShareBar";

/**
 * *(rt §10)* A hairline under the day's name, as long as the day is heavy.
 *
 * Most of what this component must get right is what it must *not* do — the rejected
 * denser-column-fill idea is one careless className away from being reinstated.
 */
/** The inner element — the ink. The outer one is the rail it runs in. */
const fill = (container: HTMLElement) =>
    container.firstElementChild?.firstElementChild as HTMLElement | null;

describe("the share bar", () => {
    it("draws nothing when there is nothing to compare", () => {
        // An empty week draws no rails rather than a row of empty ones.
        const { container } = render(<DayShareBar share={null} level="ok" />);

        expect(container.firstElementChild).toBeNull();
    });

    it("draws nothing for a day with no load", () => {
        const { container } = render(<DayShareBar share={0} level="ok" />);

        expect(container.firstElementChild).toBeNull();
    });

    it("fills the rail for the heaviest day", () => {
        const { container } = render(<DayShareBar share={1} level="ok" />);

        expect(fill(container)?.style.width).toBe("100%");
    });

    it("shows a lighter day as a gap", () => {
        const { container } = render(<DayShareBar share={0.25} level="ok" />);

        expect(fill(container)?.style.width).toBe("25%");
    });

    it("speaks the board's existing capacity language", () => {
        // Amber and red already mean "too much" here. A new hue would compete with the sixteen
        // that mean "category", which is the only thing colour is for on this board.
        const { container: at } = render(<DayShareBar share={1} level="at" />);
        const { container: over } = render(<DayShareBar share={1} level="over" />);

        expect(fill(at)?.className).toContain("amber");
        expect(fill(over)?.className).toContain("red");
    });

    it("stays neutral for a day inside its limit", () => {
        // Being the heaviest day is not the same as being too full — that is the whole point of
        // the bar being relative.
        const { container } = render(<DayShareBar share={1} level="ok" />);

        expect(fill(container)?.className).not.toMatch(/amber|red/);
    });

    it("carries no text", () => {
        // The count and the hours gauge both say this in words already; a third rendering of the
        // same fact is clutter.
        const { container } = render(<DayShareBar share={0.6} level="ok" />);

        expect(container.textContent).toBe("");
    });

    it("is decorative, since the header says it in words twice over", () => {
        const { container } = render(<DayShareBar share={0.6} level="ok" />);

        expect(container.firstElementChild?.getAttribute("aria-hidden")).toBe("true");
    });

    it("stays a hairline", () => {
        // The rejected idea was a wash behind the day's tasks: a readability tax paid for eight
        // hours to deliver a signal wanted for one second.
        const { container } = render(<DayShareBar share={0.6} level="ok" />);

        expect(container.firstElementChild?.className).toContain("h-[3px]");
    });

    it("cannot overflow its rail", () => {
        const { container } = render(<DayShareBar share={4} level="over" />);

        expect(fill(container)?.style.width).toBe("100%");
    });
});
