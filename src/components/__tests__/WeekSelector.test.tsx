import { beforeEach, describe, expect, it } from "@jest/globals";
import { act, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import WeekSelector from "../WeekSelector";

jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

let finish: () => void = () => undefined;
const data = {
    reloadBoard: jest.fn(() => new Promise<void>((resolve) => { finish = resolve; })),
};

jest.mock("../../contexts/DataContext", () => ({ useData: () => data }));
jest.mock("../../contexts/CalendarContext", () => ({
    useCalendar: () => ({ currentDate: new Date("2026-10-17"), goToPreviousWeek: jest.fn(), goToNextWeek: jest.fn(), goToToday: jest.fn() }),
}));
jest.mock("../../contexts/SettingsContext", () => ({
    useSettings: () => ({ settings: { language: "en", weekHeaderFormat: "[[WEEK]] W - MMMM YYYY" } }),
}));

beforeEach(() => {
    jest.clearAllMocks();
});

describe("the week refresh button", () => {
    it("reads the week again, once, however often it is pressed while it runs", async () => {
        render(<WeekSelector />);
        const button = screen.getByRole("button", { name: "actions.refresh_week" });

        fireEvent.click(button);
        fireEvent.click(button);

        expect(data.reloadBoard).toHaveBeenCalledTimes(1);
        expect(button.getAttribute("aria-busy")).toBe("true");

        await act(async () => finish());

        expect(button.getAttribute("aria-busy")).toBe("false");
        fireEvent.click(button);
        expect(data.reloadBoard).toHaveBeenCalledTimes(2);
    });
});
