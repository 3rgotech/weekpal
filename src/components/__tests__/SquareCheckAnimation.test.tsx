import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { act, render } from "@testing-library/react";
import React from "react";
import SquareCheckAnimation from "../SquareCheckAnimation";

beforeEach(() => {
    jest.useFakeTimers();
});

afterEach(() => {
    jest.useRealTimers();
});

describe("the splash's three boxes", () => {
    it("says when the third is ticked, once, and quickly", () => {
        // The splash used to leave on a fixed timer that ran out after the first box.
        const onComplete = jest.fn();
        render(<SquareCheckAnimation start onComplete={onComplete} />);

        for (let step = 0; step < 40; step++) {
            act(() => { jest.advanceTimersByTime(25); });
        }

        expect(onComplete).toHaveBeenCalledTimes(1);

        // It loops while the board is still loading; that is not a second completion.
        for (let step = 0; step < 80; step++) {
            act(() => { jest.advanceTimersByTime(25); });
        }

        expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it("does nothing until it is told to start", () => {
        const onComplete = jest.fn();
        render(<SquareCheckAnimation start={false} onComplete={onComplete} />);

        act(() => { jest.advanceTimersByTime(5_000); });

        expect(onComplete).not.toHaveBeenCalled();
    });
});
