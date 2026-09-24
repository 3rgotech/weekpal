import { describe, expect, it } from "@jest/globals";
import { render } from "@testing-library/react";
import React from "react";
import WeekMark from "../WeekMark";

const stroke = (container: HTMLElement) => container.querySelector(".week-mark__stroke");

describe("WeekMark", () => {
    it("draws nothing for a week that is not finished", () => {
        const { container } = render(<WeekMark done={false} shape="rule" />);

        expect(container.querySelector("svg")).toBeNull();
    });

    it("is already ink when the week was finished before the board loaded", () => {
        const { container } = render(<WeekMark done shape="rule" />);

        expect(stroke(container)?.getAttribute("class")).toContain("week-mark__stroke--drawn");
    });

    it("draws itself when the week is finished while watching", () => {
        const { container, rerender } = render(<WeekMark done={false} shape="rule" />);
        rerender(<WeekMark done shape="rule" />);

        expect(stroke(container)?.getAttribute("class")).toContain("week-mark__stroke--drawing");
    });

    it("is a rule across a one-row board and a frame round a stacked one", () => {
        expect(render(<WeekMark done shape="rule" />).container.querySelector("[data-week-mark='rule'] line")).not.toBeNull();
        expect(render(<WeekMark done shape="frame" />).container.querySelector("[data-week-mark='frame'] rect")).not.toBeNull();
    });
});
