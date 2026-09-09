import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import BatchEstimateStack from "../BatchEstimateStack";
import { WeeklyTask } from "../../data/task";

jest.mock("react-i18next", () => ({
    useTranslation: () => ({
        t: (key: string, options?: any) =>
            (options?.current !== undefined ? `${options.current} of ${options.total}` : key),
    }),
}));

const task = (n: number) => new WeeklyTask({
    id: `01930000-0000-7000-8000-00000000000${n}`,
    title: `Task ${n}`,
    weekCode: "2026w37",
    dayOfWeek: "2",
    order: n,
    subtasks: [],
});

const onChoose = jest.fn((_task: any, _minutes: number) => undefined);
const onSkip = jest.fn();
const onLeave = jest.fn();

const open = (index = 0, tasks = [task(1), task(2), task(3)]) => render(
    <BatchEstimateStack
        tasks={tasks}
        index={index}
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

describe("the card stack", () => {
    it("shows one card at a time", () => {
        open();

        expect(screen.getByText("Task 1")).toBeTruthy();
        expect(screen.queryByText("Task 2")).toBeNull();
    });

    it("says where you are in the run", () => {
        // The worst version of this flow is one with no visible end: people abandon it halfway
        // and feel they have left something unfinished.
        open(1);

        expect(screen.getByText("2 of 3")).toBeTruthy();
    });

    it("reports the chip with the task it was chosen for", () => {
        open(2);

        fireEvent.click(screen.getByText("4h"));

        expect(onChoose.mock.calls[0][0].title).toBe("Task 3");
        expect(onChoose.mock.calls[0][1]).toBe(240);
    });

    it("offers all six as thumb-sized targets", () => {
        open();

        for (const label of ["5m", "15m", "30m", "1h", "2h", "4h"]) {
            expect(screen.getByText(label)).toBeTruthy();
        }
    });

    it("lets a card be skipped without recording anything", () => {
        open();

        fireEvent.click(screen.getByText("estimate.skip"));

        expect(onSkip).toHaveBeenCalled();
        expect(onChoose).not.toHaveBeenCalled();
    });

    it("can be left at any point", () => {
        // Bailing halfway keeps everything already entered — the run is not a forced march.
        open(1);

        fireEvent.click(screen.getByText("actions.cancel"));

        expect(onLeave).toHaveBeenCalled();
    });

    it("renders nothing once the run is past its end", () => {
        const { container } = open(5, [task(1)]);

        expect(container.textContent).toBe("");
    });

    it("renders nothing for an empty run", () => {
        const { container } = open(0, []);

        expect(container.textContent).toBe("");
    });
});
