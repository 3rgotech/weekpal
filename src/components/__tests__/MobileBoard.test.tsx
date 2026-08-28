import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import MobileBoard from "../MobileBoard";
import { SomedayTask, WeeklyTask } from "../../data/task";
import { DEFAULT_SETTINGS } from "../../utils/settings";
import { getDayJs } from "../../utils/dayjs";

jest.mock("react-i18next", () => ({
    useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock("@heroui/react", () => ({
    Chip: ({ children }: any) => <span>{children}</span>,
    Dropdown: ({ children }: any) => <div>{children}</div>,
    DropdownTrigger: ({ children }: any) => <div>{children}</div>,
    DropdownMenu: ({ children }: any) => <div>{children}</div>,
    DropdownSection: ({ children }: any) => <div>{children}</div>,
    DropdownItem: ({ children, onPress }: any) => <button onClick={onPress}>{children}</button>,
    Tooltip: ({ children }: any) => children,
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
jest.mock("../../contexts/SettingsContext", () => ({
    useSettings: () => ({ settings: DEFAULT_SETTINGS, updateSettings: jest.fn() }),
}));
jest.mock("../../contexts/CalendarContext", () => ({
    useCalendar: () => ({
        currentDate: now,
        currentWeek: thisWeek,
        firstDayOfWeek: now.startOf("isoWeek"),
        goToPreviousWeek: jest.fn(),
        goToNextWeek: jest.fn(),
        goToToday: jest.fn(),
    }),
}));

const weekly = (title: string, dayOfWeek: string) => new WeeklyTask({ title, weekCode: thisWeek, dayOfWeek });

beforeEach(() => {
    jest.clearAllMocks();
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
        expect(screen.getByLabelText("task.menu.open")).toBeVisible();
    });

    it("opens the task modal from the edit control", () => {
        const task = weekly("Today's task", today);
        data.tasks = [task];

        render(<MobileBoard />);
        fireEvent.click(screen.getByLabelText("actions.edit_task"));

        expect(modal.open).toHaveBeenCalledWith(task);
    });

    it("moves a task through the menu, since there is nothing to drag", () => {
        const task = weekly("Today's task", today);
        data.tasks = [task];

        render(<MobileBoard />);
        fireEvent.click(screen.getByText("task.menu.some_day"));

        expect(data.relocateTask).toHaveBeenCalledWith(task, { weekCode: null, dayOfWeek: null });
    });
});
