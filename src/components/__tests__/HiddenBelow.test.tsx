import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import HiddenBelow from "../HiddenBelow";

jest.mock("react-i18next", () => ({
    useTranslation: () => ({
        t: (key: string, options?: any) => (options?.count !== undefined ? `${options.count} more` : key),
    }),
}));

const onReveal = jest.fn();

beforeEach(() => { onReveal.mockClear(); });

/**
 * *(rt §4)* How much total and how much unseen are two different signals, and a column that
 * scrolls silently gives neither.
 */
describe("the clipped edge", () => {
    it("says nothing when nothing is hidden", () => {
        const { container } = render(<HiddenBelow count={0} onReveal={onReveal} />);

        expect(container.firstElementChild).toBeNull();
    });

    it("says how many are below the fold", () => {
        render(<HiddenBelow count={3} onReveal={onReveal} />);

        expect(screen.getByText("3 more")).toBeTruthy();
    });

    it("scrolls to them when pressed", () => {
        // Naming a problem the user then has to solve by hunting for the scrollbar is worse than
        // saying nothing.
        render(<HiddenBelow count={2} onReveal={onReveal} />);

        fireEvent.click(screen.getByRole("button"));

        expect(onReveal).toHaveBeenCalled();
    });

    it("sits on the edge rather than in the flow", () => {
        // The fold is the thing being described, so the marker belongs on it — and it must not
        // take a row's worth of height away from the list it is describing.
        render(<HiddenBelow count={2} onReveal={onReveal} />);

        expect(screen.getByRole("button").className).toContain("absolute");
    });

    it("never caps the column, only describes it", () => {
        // Paper's eight-line limit is a physical accident, not information.
        render(<HiddenBelow count={40} onReveal={onReveal} />);

        expect(screen.getByText("40 more")).toBeTruthy();
    });
});
