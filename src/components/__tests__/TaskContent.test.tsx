import { beforeEach, describe, expect, it } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import TaskContent from "../TaskContent";
import Category from "../../data/category";
import Project from "../../data/project";
import { WeeklyTask } from "../../data/task";
import { DEFAULT_SETTINGS } from "../../utils/settings";

jest.mock("react-i18next", () => ({
    useTranslation: () => ({
        t: (key: string, options?: Record<string, unknown>) =>
            (options?.name ? `${key}:${options.name}` : key),
    }),
}));

const data = {
    categories: [] as unknown[],
    projects: [] as unknown[],
    focusedCategory: null as string | null,
    toggleFocusCategory: jest.fn(),
};

jest.mock("../../contexts/DataContext", () => ({ useData: () => data }));
jest.mock("../../contexts/SettingsContext", () => ({
    useSettings: () => ({ settings: DEFAULT_SETTINGS, updateSettings: jest.fn() }),
}));

const work = new Category({ id: "work", name: "Work", color: "blue" });
const task = () => new WeeklyTask({ title: "Book the van", weekCode: "2026w01", dayOfWeek: "1", categoryId: "work" });

beforeEach(() => {
    jest.clearAllMocks();
    data.categories = [work];
    data.projects = [new Project({ id: "weekpal", name: "Weekpal", categoryId: "work" })];
    data.focusedCategory = null;
});

describe("the category chip on a task", () => {
    it("focuses its category in one tap", () => {
        render(<TaskContent task={task()} />);

        fireEvent.click(screen.getByRole("button", { name: "category.focus:Work" }));

        expect(data.toggleFocusCategory).toHaveBeenCalledWith("work");
    });

    it("offers the way out when its category is the focused one", () => {
        data.focusedCategory = "work";

        render(<TaskContent task={task()} />);

        const chip = screen.getByRole("button", { name: "category.focus_exit" });
        expect(chip).toHaveAttribute("aria-pressed", "true");

        fireEvent.click(chip);
        expect(data.toggleFocusCategory).toHaveBeenCalledWith("work");
    });

    it("keeps the press to itself, so the drag handle under it does not open the task", () => {
        // On the wide board the chip sits inside the drag handle, and dnd-kit both starts a drag
        // and — under its movement threshold — opens the task from `pointerdown`.
        const onPointerDown = jest.fn();
        const onClick = jest.fn();

        render(
            <div onPointerDown={onPointerDown} onClick={onClick}>
                <TaskContent task={task()} />
            </div>,
        );

        const chip = screen.getByRole("button", { name: "category.focus:Work" });
        fireEvent.pointerDown(chip);
        fireEvent.click(chip);

        expect(onPointerDown).not.toHaveBeenCalled();
        expect(onClick).not.toHaveBeenCalled();
        expect(data.toggleFocusCategory).toHaveBeenCalledWith("work");
    });

    it("has no chip to tap when the task has no category", () => {
        const uncategorised = new WeeklyTask({ title: "Sharpen the axe", weekCode: "2026w01", dayOfWeek: "1" });

        render(<TaskContent task={uncategorised} />);

        expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });
});


describe("the completion strike", () => {
    it("draws across the title rather than decorating it", () => {
        // A background gradient, not `text-decoration`: a decoration cannot be animated across
        // its own arrival, and on an inline element the gradient paints into every line box, so
        // a title wrapped to three lines is struck on all three at once.
        data.categories = [];
        const done = new WeeklyTask({
            title: "Book the van", weekCode: "2026w01", dayOfWeek: "1", completedAt: new Date().toISOString(),
        });
        const { container } = render(<TaskContent task={done} />);

        expect(container.querySelector(".task-strike--done")).not.toBeNull();
        expect(container.innerHTML).not.toContain("line-through");
    });

    it("leaves an unfinished title unstruck", () => {
        data.categories = [];
        const { container } = render(<TaskContent task={task()} />);

        expect(container.querySelector(".task-strike")).not.toBeNull();
        expect(container.querySelector(".task-strike--done")).toBeNull();
    });
});

describe("a task linked to a project", () => {
    const linked = () => new WeeklyTask({
        title: "Fix the badge", weekCode: "2026w01", dayOfWeek: "1", categoryId: "work", projectId: "weekpal",
    });

    it("names its project ahead of its title", () => {
        render(<TaskContent task={linked()} />);

        const heading = screen.getByRole("heading");
        expect(heading.textContent).toBe("WeekpalFix the badge");
    });

    it("leaves the name off where the list is already the project's", () => {
        render(<TaskContent task={linked()} showProject={false} />);

        expect(screen.getByRole("heading").textContent).toBe("Fix the badge");
    });
});

describe("signs that a task holds more than its card shows", () => {
    const withMore = (data: Record<string, unknown>) => new WeeklyTask({
        title: "Book the van", weekCode: "2026w01", dayOfWeek: "1", ...data,
    });

    it("marks a task with a description", () => {
        render(<TaskContent task={withMore({ description: "Ask about the roof rack" })} />);

        expect(screen.getByRole("img", { name: "task.has_description" })).toBeTruthy();
    });

    it("ignores a description that is only whitespace", () => {
        render(<TaskContent task={withMore({ description: "  \n " })} />);

        expect(screen.queryByRole("img", { name: "task.has_description" })).toBeNull();
    });

    it("counts a task's notes", () => {
        render(<TaskContent task={withMore({ notesCount: 2 })} />);

        expect(screen.getByRole("img", { name: "task.notes_count" }).textContent).toBe("2");
    });

    it("shows neither on a task with nothing inside", () => {
        render(<TaskContent task={withMore({})} />);

        expect(screen.queryByRole("img")).toBeNull();
    });
});

describe("the reminder on a task", () => {
    const reminded = (overrides: Record<string, unknown> = {}) =>
        new WeeklyTask({ title: "Call the bank", weekCode: "2026w43", dayOfWeek: "3", reminderTime: "14:30", ...overrides });

    it("shows its time where it will ring", () => {
        render(<TaskContent task={reminded()} />);

        expect(screen.getByTitle("task.reminder.at")).toHaveTextContent(/2:30|14:30/);
    });

    it("is not shown on a done task, or one with no day", () => {
        const { rerender } = render(<TaskContent task={reminded({ completedAt: "2026-10-21T10:00:00Z" })} />);
        expect(screen.queryByTitle("task.reminder.at")).not.toBeInTheDocument();

        rerender(<TaskContent task={reminded({ dayOfWeek: "0" })} />);
        expect(screen.queryByTitle("task.reminder.at")).not.toBeInTheDocument();
    });
});
