import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import BatchEstimateRow from "../BatchEstimateRow";
import { WeeklyTask } from "../../data/task";

jest.mock("react-i18next", () => ({
    useTranslation: () => ({
        t: (key: string, options?: any) => (options?.count !== undefined ? `${options.count} left` : key),
    }),
}));

const task = new WeeklyTask({
    id: "01930000-0000-7000-8000-000000000001",
    title: "Draft the release notes",
    weekCode: "2026w37",
    dayOfWeek: "2",
    order: 1,
    subtasks: [],
});

const onChoose = jest.fn((_minutes: number) => undefined);
const onSkip = jest.fn();
const onLeave = jest.fn();

const open = (remaining = 3) => render(
    <BatchEstimateRow
        task={task}
        remaining={remaining}
        onChoose={onChoose}
        onSkip={onSkip}
        onLeave={onLeave}
    />,
);

beforeEach(() => {
    onChoose.mockClear();
    onSkip.mockClear();
    onLeave.mockClear();
});

describe("the chip row", () => {
    it("offers the six chips, numbered like the keys", () => {
        // The number is not decoration — it is the documentation for the temporary verb set.
        const { container } = open();

        expect(screen.getByRole("button", { name: "30m" })).toBeTruthy();
        expect(container.querySelectorAll('[aria-hidden="true"].opacity-50')).toHaveLength(6);
    });

    it("reports the chosen chip", () => {
        open();

        fireEvent.click(screen.getByRole("button", { name: "2h" }));

        expect(onChoose).toHaveBeenCalledWith(120);
    });

    it("offers skipping as a first-class answer", () => {
        // A task nobody wants to size should cost one press and leave no mark.
        open();

        fireEvent.click(screen.getByText("estimate.skip"));

        expect(onSkip).toHaveBeenCalled();
        expect(onChoose).not.toHaveBeenCalled();
    });

    it("says how many are left", () => {
        // A run with no visible end is one people abandon halfway and feel bad about.
        open(4);

        expect(screen.getByText("4 left")).toBeTruthy();
    });

    it("leaves on Escape", () => {
        const { container } = open();

        fireEvent.keyDown(container.firstElementChild!, { key: "Escape" });

        expect(onLeave).toHaveBeenCalled();
    });

    it("keeps Escape from reaching the board underneath", () => {
        // The row catches it because the board's own handler ignores keys while focus is in a
        // typing target, and this row contains a number input.
        const onBoardEscape = jest.fn();
        const { container } = render(
            <div onKeyDown={onBoardEscape}>
                <BatchEstimateRow
                    task={task} remaining={2}
                    onChoose={onChoose} onSkip={onSkip} onLeave={onLeave}
                />
            </div>,
        );

        fireEvent.keyDown(container.querySelector('[role="group"]')!, { key: "Escape" });

        expect(onLeave).toHaveBeenCalled();
        expect(onBoardEscape).not.toHaveBeenCalled();
    });

    it("names the task it is asking about", () => {
        open();

        expect(screen.getByRole("group").getAttribute("aria-label")).toBe("estimate.batch_for");
    });
});
