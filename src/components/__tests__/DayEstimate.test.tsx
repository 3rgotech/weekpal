import { describe, expect, it, jest } from "@jest/globals";
import { render } from "@testing-library/react";
import React from "react";
import DayEstimate from "../DayEstimate";
import { WeeklyTask } from "../../data/task";

jest.mock("react-i18next", () => ({
    useTranslation: () => ({
        t: (key: string, options?: any) => (options?.count !== undefined ? `${options.count} unestimated` : key),
    }),
}));

const task = (n: number, estimatedMinutes: number | null = null) => new WeeklyTask({
    id: `01930000-0000-7000-8000-00000000000${n}`,
    title: `Task ${n}`,
    weekCode: "2026w37",
    dayOfWeek: "2",
    order: n,
    subtasks: [],
    estimatedMinutes,
});

describe("what a day is carrying", () => {
    it("says nothing when nothing is estimated", () => {
        // A header reading "0h planned · 6 unestimated" is a reproach for not having filled
        // something in. Estimates are optional, permanently.
        const { container } = render(<DayEstimate tasks={[task(1), task(2)]} />);

        expect(container.textContent).toBe("");
    });

    it("says nothing about an empty day", () => {
        const { container } = render(<DayEstimate tasks={[]} />);

        expect(container.textContent).toBe("");
    });

    it("states a complete total plainly", () => {
        const { container } = render(<DayEstimate tasks={[task(1, 60), task(2, 60)]} />);

        expect(container.textContent).toContain("~2h");
        expect(container.textContent).not.toContain("+");
        expect(container.textContent).not.toContain("unestimated");
    });

    it("marks a partial total with a plus and says how many are missing", () => {
        // The `+` is the difference between a floor and a claim.
        const { container } = render(<DayEstimate tasks={[task(1, 60), task(2, 30), task(3)]} />);

        expect(container.textContent).toContain("~1.5h+");
        expect(container.textContent).toContain("1 unestimated");
    });

    it("does not flag the unestimated, only counts them", () => {
        // No warning colour, no icon: it is context for reading the number beside it, not a task
        // list of its own.
        const { container } = render(<DayEstimate tasks={[task(1, 60), task(2)]} />);

        expect(container.innerHTML).not.toMatch(/red|amber|rose|orange|warn/);
    });
});
