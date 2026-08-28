import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import React from "react";
import PrintSheet from "../PrintSheet";
import { SomedayTask, WeeklyTask } from "../../data/task";
import { DEFAULT_SETTINGS } from "../../utils/settings";
import { getDayJs } from "../../utils/dayjs";

jest.mock("react-i18next", () => ({
    useTranslation: () => ({ t: (key: string) => key }),
}));

const now = getDayJs()();
const thisWeek = now.format("GGGG[w]WW");
const monday = now.startOf("isoWeek");

const settings = { ...DEFAULT_SETTINGS };
const data = { tasks: [] as unknown[], events: [] as unknown[], categories: [] as unknown[] };

jest.mock("../../contexts/DataContext", () => ({ useData: () => data }));
jest.mock("../../contexts/SettingsContext", () => ({ useSettings: () => ({ settings }) }));
jest.mock("../../contexts/CalendarContext", () => ({
    useCalendar: () => ({ currentDate: now, currentWeek: thisWeek, firstDayOfWeek: monday }),
}));

const weekly = (title: string, dayOfWeek: string, extra: Record<string, unknown> = {}) =>
    new WeeklyTask({ title, weekCode: thisWeek, dayOfWeek, ...extra });

beforeEach(() => {
    settings.showCompletedTasks = true;
    data.tasks = [];
    data.events = [];
    data.categories = [];
});

describe("the printable week", () => {
    it("carries every day, plus this week and some day", () => {
        data.tasks = [
            weekly("Monday task", "1"),
            weekly("Sunday task", "7"),
            weekly("Undated task", "0"),
            new SomedayTask({ title: "Someday task" }),
        ];

        render(<PrintSheet />);

        expect(screen.getByText("Monday task")).toBeInTheDocument();
        expect(screen.getByText("Sunday task")).toBeInTheDocument();
        expect(screen.getByText("Undated task")).toBeInTheDocument();
        expect(screen.getByText("Someday task")).toBeInTheDocument();
        expect(screen.getByText("main.this_week")).toBeInTheDocument();
        expect(screen.getByText("main.some_day")).toBeInTheDocument();
    });

    it("leaves project backlogs off the sheet", () => {
        data.tasks = [
            new SomedayTask({ title: "Someday task" }),
            new SomedayTask({ title: "Backlog task", projectId: "01930000-0000-7000-8000-000000000001" }),
        ];

        render(<PrintSheet />);

        expect(screen.getByText("Someday task")).toBeInTheDocument();
        expect(screen.queryByText("Backlog task")).not.toBeInTheDocument();
    });

    it("prints completed tasks struck through, and drops them when the board does", () => {
        data.tasks = [weekly("Done task", "1", { completedAt: now.toISOString() })];

        const { rerender } = render(<PrintSheet />);
        expect(screen.getByText("Done task").className).toContain("line-through");

        settings.showCompletedTasks = false;
        rerender(<PrintSheet />);
        expect(screen.queryByText("Done task")).not.toBeInTheDocument();
    });

    it("marks today with weight, since colour does not survive a black-and-white print", () => {
        render(<PrintSheet />);

        const today = screen.getByText(now.format("D MMM")).closest("header");
        const other = screen.getByText(monday.add(now.isoWeekday() % 7, "day").format("D MMM")).closest("header");

        expect(today?.className).toContain("border-b-2");
        expect(other?.className).not.toContain("border-b-2");
    });

    it("uses no dark-mode variant anywhere — the sheet is ink on paper", () => {
        const { container } = render(<PrintSheet />);

        expect(container.innerHTML).not.toContain("dark:");
    });
});
