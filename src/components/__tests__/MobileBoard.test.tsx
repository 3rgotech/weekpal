import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import MobileBoard from "../MobileBoard";
import { SomedayTask, WeeklyTask } from "../../data/task";
import { DEFAULT_SETTINGS } from "../../utils/settings";
import { getDayJs } from "../../utils/dayjs";
import { fakeCalendar } from "../../test-support/calendar";

jest.mock("react-i18next", () => ({
    useTranslation: () => ({ t: (key: string) => key }),
}));


const now = getDayJs()();
const thisWeek = now.format("GGGG[w]WW");
const today = `${now.isoWeekday()}`;
const notToday = `${(now.isoWeekday() % 7) + 1}`;

const data = {
    tasks: [] as unknown[],
    events: [] as unknown[],
    categories: [] as unknown[],
    leftovers: [] as unknown[],
    addTask: jest.fn(),
    completeTask: jest.fn(),
    uncompleteTask: jest.fn(),
    relocateTask: jest.fn(async () => undefined),
    duplicateTask: jest.fn(async () => undefined),
    deleteTask: jest.fn(),
};

const modal = { open: jest.fn(), openNewTask: jest.fn() };

jest.mock("../../contexts/DataContext", () => ({ useData: () => data }));
jest.mock("../../contexts/TaskModalContext", () => ({ useTaskModal: () => modal }));
const settings = { ...DEFAULT_SETTINGS };

jest.mock("../../contexts/SettingsContext", () => ({
    useSettings: () => ({ settings, updateSettings: jest.fn() }),
}));
jest.mock("../../contexts/CalendarContext", () => ({
    useCalendar: () => fakeCalendar(now, settings),
}));

const weekly = (title: string, dayOfWeek: string) => new WeeklyTask({ title, weekCode: thisWeek, dayOfWeek });

beforeEach(() => {
    jest.clearAllMocks();
    Object.assign(settings, DEFAULT_SETTINGS);
    data.tasks = [];
});

describe("the board on a phone", () => {
    it("opens on today, not on Monday", () => {
        data.tasks = [weekly("Today's task", today), weekly("Another day's task", notToday)];

        render(<MobileBoard />);

        expect(screen.getByText("Today's task")).toBeInTheDocument();
        expect(screen.queryByText("Another day's task")).not.toBeInTheDocument();
    });

    it("shows one bucket at a time, and switches on a pill", () => {
        data.tasks = [weekly("Today's task", today), new SomedayTask({ title: "Flip mattress" })];

        render(<MobileBoard />);
        expect(screen.queryByText("Flip mattress")).not.toBeInTheDocument();

        fireEvent.click(screen.getByText("main.some_day_short"));

        expect(screen.getByText("Flip mattress")).toBeInTheDocument();
        expect(screen.queryByText("Today's task")).not.toBeInTheDocument();
    });

    it("gives every task its three controls, with no hover to find them", () => {
        data.tasks = [weekly("Today's task", today)];

        render(<MobileBoard />);

        // The wide board hides the tick until the pointer is over the row; there is no pointer
        // here, so all three have to be on screen from the start.
        expect(screen.getByLabelText("actions.complete_task")).toBeVisible();
        expect(screen.getByLabelText("actions.edit_task")).toBeVisible();
        // By role: the menu it opens carries the same accessible name, which is correct for a
        // screen reader and ambiguous for a plain label lookup.
        expect(screen.getByRole("button", { name: "task.menu.open" })).toBeVisible();
    });

    it("opens the task modal from the edit control", () => {
        const task = weekly("Today's task", today);
        data.tasks = [task];

        render(<MobileBoard />);
        fireEvent.click(screen.getByLabelText("actions.edit_task"));

        expect(modal.open).toHaveBeenCalledWith(task);
    });

    it("gives a pill to every bucket the board draws, in the user's week order", () => {
        settings.weekStartsOn = 7;

        render(<MobileBoard />);

        const pills = screen.getAllByRole("button")
            .filter((button) => button.className.includes("flex-1 min-w-0"))
            .map((button) => button.textContent);

        // Sunday leads, the rest of the week follows, then the two undated buckets.
        expect(pills.slice(-2)).toEqual(["main.this_week_short", "main.some_day_short"]);
        expect(pills[0]).toBe(now.startOf("isoWeek").add(6, "day").format("dd"));
        expect(pills[1]).toBe(now.startOf("isoWeek").format("dd"));
    });

    it("drops the pills for days that are hidden", () => {
        settings.showNonWorkingDays = false;

        render(<MobileBoard />);

        const saturday = now.startOf("isoWeek").add(5, "day").format("dd");

        expect(screen.queryByText(saturday)).not.toBeInTheDocument();
        expect(screen.getByText(now.startOf("isoWeek").format("dd"))).toBeInTheDocument();
    });

    it("does not open on a day it is not drawing", () => {
        // A weekend day hidden while today falls on it would otherwise open the board on a
        // column with no way back to it.
        settings.workingDays = [now.isoWeekday() === 1 ? 2 : 1];
        settings.showNonWorkingDays = false;
        data.tasks = [weekly("Today's task", today)];

        render(<MobileBoard />);

        expect(screen.queryByText("Today's task")).not.toBeInTheDocument();
        expect(screen.getByText("main.this_week")).toBeInTheDocument();
    });

    it("moves a task through the menu, since there is nothing to drag", () => {
        const task = weekly("Today's task", today);
        data.tasks = [task];

        render(<MobileBoard />);
        fireEvent.click(screen.getByText("task.menu.some_day"));

        expect(data.relocateTask).toHaveBeenCalledWith(task, { weekCode: null, dayOfWeek: null });
    });
});
