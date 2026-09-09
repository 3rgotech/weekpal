import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import EscapeHatchModal from "../EscapeHatchModal";
import { WeeklyTask } from "../../data/task";

jest.mock("react-i18next", () => ({
    useTranslation: () => ({
        t: (key: string, options?: any) => (options?.count !== undefined ? `${key}:${options.count}` : key),
    }),
}));

const data = { deleteTask: jest.fn((_task: any, _reason?: string) => undefined) };
const modal = { open: jest.fn((_task: any) => undefined) };

jest.mock("../../contexts/DataContext", () => ({ useData: () => data }));
jest.mock("../../contexts/TaskModalContext", () => ({ useTaskModal: () => modal }));

const task = new WeeklyTask({
    id: "01930000-0000-7000-8000-000000000001",
    title: "Reconcile last month's receipts",
    weekCode: "2026w37",
    dayOfWeek: "2",
    order: 1,
    subtasks: [],
    deferralCount: 6,
});

const onClose = jest.fn();

beforeEach(() => {
    data.deleteTask.mockClear();
    modal.open.mockClear();
    onClose.mockClear();
});

describe("the three doors", () => {
    it("renders nothing when no task is chosen", () => {
        const { container } = render(<EscapeHatchModal task={null} onClose={onClose} />);

        expect(container.textContent).toBe("");
    });

    it("offers exactly three", () => {
        // No fourth door for "keep it": closing the dialog is that, and offering it as a button
        // would make deferring again feel like the sanctioned answer.
        render(<EscapeHatchModal task={task} onClose={onClose} />);

        expect(screen.getByText("deferral.break_down")).toBeTruthy();
        expect(screen.getByText("deferral.not_mine")).toBeTruthy();
        expect(screen.getByText("deferral.let_go")).toBeTruthy();
    });

    it("opens the editor to break a task down", () => {
        render(<EscapeHatchModal task={task} onClose={onClose} />);

        fireEvent.click(screen.getByText("deferral.break_down"));

        expect(modal.open).toHaveBeenCalledWith(task);
        expect(data.deleteTask).not.toHaveBeenCalled();
        expect(onClose).toHaveBeenCalled();
    });

    it("records which door was taken", () => {
        // The difference between the two is the finding: "I let go of nine things this month" is
        // worth reading, where nine anonymous deletions is housekeeping.
        render(<EscapeHatchModal task={task} onClose={onClose} />);

        fireEvent.click(screen.getByText("deferral.not_mine"));

        expect(data.deleteTask).toHaveBeenCalledWith(task, "not_mine");
    });

    it("distinguishes letting go from disowning", () => {
        render(<EscapeHatchModal task={task} onClose={onClose} />);

        fireEvent.click(screen.getByText("deferral.let_go"));

        expect(data.deleteTask).toHaveBeenCalledWith(task, "let_go");
    });

    it("names the task and states the count as a fact about it", () => {
        render(<EscapeHatchModal task={task} onClose={onClose} />);

        // The mock renders the count into the key, which is enough to prove it is passed through.
        expect(screen.getByText("deferral.escape_intro:6")).toBeTruthy();
    });
});
