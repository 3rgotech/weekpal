import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import TaskContent from "../TaskContent";
import Category from "../../data/category";
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
