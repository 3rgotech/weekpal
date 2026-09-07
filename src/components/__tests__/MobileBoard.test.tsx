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
    allTasks: [] as unknown[],
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

const weekly = (title: string, dayOfWeek: string, extra: Record<string, unknown> = {}) =>
    new WeeklyTask({ title, weekCode: thisWeek, dayOfWeek, ...extra });

beforeEach(() => {
    jest.clearAllMocks();
    Object.assign(settings, DEFAULT_SETTINGS);
    data.tasks = [];
    data.allTasks = [];
});

describe("the board on a phone", () => {
    it("opens on today, not on Monday", () => {
        data.tasks = [weekly("Today's task", today), weekly("Another day's task", notToday)];

        data.allTasks = data.allTasks.length ? data.allTasks : data.tasks;
        render(<MobileBoard />);

        expect(screen.getByText("Today's task")).toBeInTheDocument();
        expect(screen.queryByText("Another day's task")).not.toBeInTheDocument();
    });

    it("shows one bucket at a time, and switches on a pill", () => {
        data.tasks = [weekly("Today's task", today), new SomedayTask({ title: "Flip mattress" })];

        data.allTasks = data.allTasks.length ? data.allTasks : data.tasks;
        render(<MobileBoard />);
        expect(screen.queryByText("Flip mattress")).not.toBeInTheDocument();

        fireEvent.click(screen.getByText("main.some_day_short"));

        expect(screen.getByText("Flip mattress")).toBeInTheDocument();
        expect(screen.queryByText("Today's task")).not.toBeInTheDocument();
    });

    it("gives every task its three controls, with no hover to find them", () => {
        data.tasks = [weekly("Today's task", today)];

        data.allTasks = data.allTasks.length ? data.allTasks : data.tasks;
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

        data.allTasks = data.allTasks.length ? data.allTasks : data.tasks;
        render(<MobileBoard />);
        fireEvent.click(screen.getByLabelText("actions.edit_task"));

        expect(modal.open).toHaveBeenCalledWith(task);
    });

    it("gives a pill to every bucket the board draws, in the user's week order", () => {
        settings.weekStartsOn = 7;

        data.allTasks = data.allTasks.length ? data.allTasks : data.tasks;
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

        data.allTasks = data.allTasks.length ? data.allTasks : data.tasks;
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

        data.allTasks = data.allTasks.length ? data.allTasks : data.tasks;
        render(<MobileBoard />);

        expect(screen.queryByText("Today's task")).not.toBeInTheDocument();
        expect(screen.getByText("main.this_week")).toBeInTheDocument();
    });

    it("says how full a day is once a limit is set, and stays quiet until then", () => {
        data.tasks = [weekly("One", today), weekly("Two", today), weekly("Three", today)];

        data.allTasks = data.tasks;
        const { rerender } = render(<MobileBoard />);
        expect(screen.queryByText("3")).not.toBeInTheDocument();

        settings.dayCapacity = 3;
        rerender(<MobileBoard />);

        // At the limit: named in full for a screen reader, since a bare "3" says nothing.
        const count = screen.getByLabelText("capacity.planned");
        expect(count.textContent).toBe("3");
        expect(count.className).toContain("amber");
    });

    it("counts what is left to do, not what was planned", () => {
        // A day you have worked through should stop warning rather than stay red all evening.
        data.tasks = [
            weekly("Done", today, { completedAt: now.toISOString() }),
            weekly("Still to do", today),
        ];
        settings.dayCapacity = 2;

        data.allTasks = data.allTasks.length ? data.allTasks : data.tasks;
        render(<MobileBoard />);

        expect(screen.getByLabelText("capacity.planned").textContent).toBe("1");
    });

    it("counts Some day against its own limit, not the day one", () => {
        data.tasks = [
            new SomedayTask({ title: "Learn the cello" }),
            new SomedayTask({ title: "Fix the bike lamp" }),
        ];
        settings.dayCapacity = 10;
        settings.somedayLimit = 2;

        data.allTasks = data.allTasks.length ? data.allTasks : data.tasks;
        render(<MobileBoard />);
        fireEvent.click(screen.getByText("main.some_day_short"));

        const count = screen.getByLabelText("capacity.planned");
        expect(count.textContent).toBe("2");
        // Two of two is full, and would have been well under the day's ten.
        expect(count.className).toContain("amber");
    });

    it("leaves a project's backlog out of the Some day count", () => {
        // Backlog tasks live in the drawer and have somewhere to be — they are not the shortlist
        // the limit exists to keep short.
        data.tasks = [
            new SomedayTask({ title: "Learn the cello" }),
            new SomedayTask({ title: "Order the doors", projectId: "01930000-0000-7000-8000-000000000001" }),
        ];
        settings.somedayLimit = 5;

        data.allTasks = data.allTasks.length ? data.allTasks : data.tasks;
        render(<MobileBoard />);
        fireEvent.click(screen.getByText("main.some_day_short"));

        expect(screen.getByLabelText("capacity.planned").textContent).toBe("1");
    });

    it("counts the whole list, not the filtered view", () => {
        // Narrowing the board to one category must not make a day look emptier than it is: the
        // warning is about what you have planned, not about what you are looking at.
        const shown = weekly("Work task", today);
        data.tasks = [shown];
        data.allTasks = [shown, weekly("Hobby task", today), weekly("Another", today)];
        settings.dayCapacity = 3;

        render(<MobileBoard />);

        const count = screen.getByLabelText("capacity.planned");
        expect(count.textContent).toBe("3");
        expect(count.className).toContain("amber");
    });

    it("moves a task through the menu, since there is nothing to drag", () => {
        const task = weekly("Today's task", today);
        data.tasks = [task];

        data.allTasks = data.allTasks.length ? data.allTasks : data.tasks;
        render(<MobileBoard />);
        fireEvent.click(screen.getByText("task.menu.some_day"));

        expect(data.relocateTask).toHaveBeenCalledWith(task, { weekCode: null, dayOfWeek: null });
    });
});
