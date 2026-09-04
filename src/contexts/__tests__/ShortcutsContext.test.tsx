import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { ShortcutsProvider, useShortcuts } from "../ShortcutsContext";
import { SomedayTask, WeeklyTask } from "../../data/task";
import { DEFAULT_SETTINGS } from "../../utils/settings";
import { getDayJs } from "../../utils/dayjs";
import { fakeCalendar } from "../../test-support/calendar";

jest.mock("react-i18next", () => ({
    useTranslation: () => ({ t: (key: string) => key }),
}));

// The provider also mounts the review, which reads its own slice of the same context.
const data = {
    tasks: [] as unknown[],
    categories: [] as unknown[],
    leftovers: [] as unknown[],
    leftoversLoaded: true,
    refreshLeftovers: jest.fn(async () => []),
    completeTask: jest.fn(),
    uncompleteTask: jest.fn(),
    deleteTask: jest.fn(),
    rescueTask: jest.fn(async () => undefined),
    relocateTask: jest.fn(async () => undefined),
    toggleFocusCategory: jest.fn(),
};

const modal = { openNewTask: jest.fn(), isOpen: false, open: jest.fn() };
const settings = { ...DEFAULT_SETTINGS };

jest.mock("../DataContext", () => ({ useData: () => data }));
const updateSettings = jest.fn();
jest.mock("../SettingsContext", () => ({ useSettings: () => ({ settings, updateSettings }) }));
const calendar = {
    ...fakeCalendar(getDayJs()(), DEFAULT_SETTINGS),
    currentWeek: "2026w10",
    goToPreviousWeek: jest.fn(),
    goToNextWeek: jest.fn(),
    goToToday: jest.fn(),
};

jest.mock("../CalendarContext", () => ({ useCalendar: () => calendar }));
jest.mock("../TaskModalContext", () => ({ useTaskModal: () => modal }));

const Probe = () => {
    const { activeTaskId } = useShortcuts();

    return <span data-testid="active">{activeTaskId ?? "none"}</span>;
};

const weekly = (id: string, dayOfWeek: string, order: number, fields: Record<string, unknown> = {}) =>
    new WeeklyTask({ id, title: id, weekCode: "2026w10", dayOfWeek, order, ...fields });

const press = (key: string, target: Element | Window = window) => fireEvent.keyDown(target, { key });

const active = () => screen.getByTestId("active").textContent;

const board = (tasks: unknown[]) => {
    data.tasks = tasks;
    render(<ShortcutsProvider><Probe /></ShortcutsProvider>);
};

beforeEach(() => {
    jest.clearAllMocks();
    settings.showCompletedTasks = true;
    modal.isOpen = false;
});

describe("keyboard control of the board", () => {
    it("selects with j and k", () => {
        board([weekly("a", "1", 0), weekly("b", "2", 0)]);
        expect(active()).toBe("none");

        press("j");
        expect(active()).toBe("a");

        press("j");
        expect(active()).toBe("b");

        press("k");
        expect(active()).toBe("a");
    });

    it("ticks the selected task off with space", () => {
        board([weekly("a", "1", 0), weekly("b", "2", 0)]);
        press("j");
        press(" ");

        expect(data.completeTask).toHaveBeenCalledWith(expect.objectContaining({ id: "a" }));
    });

    it("puts a finished task back with the same key", () => {
        board([weekly("a", "1", 0, { completedAt: "2026-03-02T10:00:00Z" })]);
        press("j");
        press(" ");

        expect(data.uncompleteTask).toHaveBeenCalledWith(expect.objectContaining({ id: "a" }));
    });

    it("defers the selected task to the next day", () => {
        board([weekly("a", "1", 0)]);
        press("j");
        press("d");

        expect(data.relocateTask).toHaveBeenCalledWith(
            expect.objectContaining({ id: "a" }),
            { weekCode: "2026w10", dayOfWeek: "2" },
        );
    });

    it("has nowhere to defer a Some day task, and does nothing", () => {
        board([new SomedayTask({ id: "s", title: "s", order: 0 })]);
        press("j");
        press("d");

        expect(data.relocateTask).not.toHaveBeenCalled();
    });

    it("opens a new task in the selected task's day with n", () => {
        board([weekly("a", "1", 0), weekly("b", "2", 0)]);
        press("j");
        press("j");
        press("n");

        expect(modal.openNewTask).toHaveBeenCalledWith("2026w10", "2");
    });

    it("opens a new task in the undated bucket when nothing is selected", () => {
        board([weekly("a", "1", 0)]);
        press("n");

        expect(modal.openNewTask).toHaveBeenCalledWith("2026w10", "0");
    });

    it("focuses the selected task's category with c", () => {
        board([weekly("a", "1", 0, { categoryId: "work" })]);
        press("j");
        press("c");

        expect(data.toggleFocusCategory).toHaveBeenCalledWith("work");
    });

    it("says nothing about a task with no category", () => {
        board([weekly("a", "1", 0)]);
        press("j");
        press("c");

        expect(data.toggleFocusCategory).not.toHaveBeenCalled();
    });

    it("shows the help sheet on ? and closes it on Escape", () => {
        board([weekly("a", "1", 0)]);
        press("?");
        expect(screen.getByText("shortcuts.title")).toBeInTheDocument();

        press("Escape");
        expect(screen.queryByText("shortcuts.title")).not.toBeInTheDocument();
    });

    it("leaves the board alone while the help sheet is up", () => {
        board([weekly("a", "1", 0)]);
        press("?");
        press("j");

        expect(active()).toBe("none");
    });

    it("leaves the board alone while the task modal is open", () => {
        modal.isOpen = true;
        board([weekly("a", "1", 0)]);
        press("j");
        press(" ");

        expect(active()).toBe("none");
        expect(data.completeTask).not.toHaveBeenCalled();
    });

    it("keeps out of the way of anything being typed", () => {
        board([weekly("a", "1", 0)]);
        const input = document.createElement("input");
        document.body.appendChild(input);

        press("j", input);

        expect(active()).toBe("none");
    });

    it("leaves modifier combinations to the browser", () => {
        board([weekly("a", "1", 0)]);
        fireEvent.keyDown(window, { key: "j", metaKey: true });

        expect(active()).toBe("none");
    });

    it("skips completed tasks while they are hidden", () => {
        settings.showCompletedTasks = false;
        board([weekly("a", "1", 0, { completedAt: "2026-03-02T10:00:00Z" }), weekly("b", "2", 0)]);

        press("j");

        expect(active()).toBe("b");
    });
});

describe("the keys that act on the board rather than on a task", () => {
    it("shows and hides completed tasks with v", () => {
        board([weekly("a", "1", 0)]);
        press("v");

        expect(updateSettings).toHaveBeenCalledWith({ showCompletedTasks: false });
    });

    it("opens what was left behind with i", () => {
        board([weekly("a", "1", 0)]);
        press("i");

        expect(screen.getByText("leftovers.title")).toBeInTheDocument();
    });

    it("leaves the board's keys alone while the review is open", () => {
        board([weekly("a", "1", 0)]);
        press("i");
        press("j");

        expect(active()).toBe("none");
    });

    it("toggles the projects drawer with p", () => {
        const Panel = () => {
            const { projectsOpen } = useShortcuts();

            return <span data-testid="projects">{projectsOpen ? "open" : "shut"}</span>;
        };

        data.tasks = [weekly("a", "1", 0)];
        render(<ShortcutsProvider><Panel /></ShortcutsProvider>);

        expect(screen.getByTestId("projects").textContent).toBe("shut");

        press("p");
        expect(screen.getByTestId("projects").textContent).toBe("open");

        press("p");
        expect(screen.getByTestId("projects").textContent).toBe("shut");
    });

    it("walks the weeks with the arrow keys, and comes back with t", () => {
        board([weekly("a", "1", 0)]);

        press("ArrowLeft");
        expect(calendar.goToPreviousWeek).toHaveBeenCalled();

        press("ArrowRight");
        expect(calendar.goToNextWeek).toHaveBeenCalled();

        press("t");
        expect(calendar.goToToday).toHaveBeenCalled();
    });
});
