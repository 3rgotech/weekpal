import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import PastDayRecovery from "../PastDayRecovery";

jest.mock("react-i18next", () => ({
    useTranslation: () => ({
        t: (key: string, options?: any) => (options?.count !== undefined ? `${key}:${options.count}` : key),
    }),
}));

const data = { recoverDay: jest.fn(async (_day: string) => undefined) };

jest.mock("../../contexts/DataContext", () => ({ useData: () => data }));

beforeEach(() => { data.recoverDay.mockClear(); });

describe("the past-day mark", () => {
    it("says how many are unfinished", () => {
        render(<PastDayRecovery dayOfWeek="2" count={3} />);

        expect(screen.getByText("recovery.unfinished:3")).toBeTruthy();
    });

    it("draws nothing for a day that finished everything", () => {
        // The mark is the only asymmetry in the week. A day that went well must look like every
        // other day, or the asymmetry stops meaning anything.
        const { container } = render(<PastDayRecovery dayOfWeek="2" count={0} />);

        expect(container.textContent).toBe("");
    });

    it("pulls the day into today when pressed", () => {
        // The recovery *is* the feature. Naming a problem the user then has to solve by dragging
        // four cards would be worse than saying nothing.
        render(<PastDayRecovery dayOfWeek="2" count={2} />);

        fireEvent.click(screen.getByText("recovery.unfinished:2"));

        expect(data.recoverDay).toHaveBeenCalledWith("2");
    });

    it("is a button, so the keyboard reaches it", () => {
        render(<PastDayRecovery dayOfWeek="2" count={1} />);

        expect(screen.getByRole("button")).toBeTruthy();
    });
});
