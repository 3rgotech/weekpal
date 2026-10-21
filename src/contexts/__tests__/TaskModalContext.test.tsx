import { beforeEach, describe, expect, it } from "@jest/globals";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { TaskModalProvider, useTaskModal } from "../TaskModalContext";
import Task, { WeeklyTask } from "../../data/task";

jest.mock("react-i18next", () => ({
    useTranslation: () => ({ t: (key: string) => key }),
}));

const addTask = jest.fn();
const updateTask = jest.fn();

jest.mock("../DataContext", () => ({
    useData: () => ({ addTask, updateTask, categories: [], projects: [] }),
}));

jest.mock("../../utils/layout", () => ({ useVerticalLayout: () => false }));

// Stand-ins for the parts of the editor that are tested on their own.
jest.mock("../../components/TaskActivity", () => ({ __esModule: true, default: () => null }));
jest.mock("../../components/SubtaskEditor", () => ({ __esModule: true, default: () => null }));
jest.mock("../../components/EstimatePicker", () => ({ __esModule: true, default: () => null }));
jest.mock("../../components/DescriptionEditor", () => ({
    __esModule: true,
    default: ({ value, onChange }: { value: string; onChange: (next: string) => void }) => (
        <textarea aria-label="description" value={value} onChange={(event) => onChange(event.target.value)} />
    ),
}));

/*
 * The ⋮ menu, reduced to one action: move the task to Friday, the way `relocateTask` would, with
 * the menu's own order of calls around it.
 */
jest.mock("../../components/TaskMenu", () => ({
    __esModule: true,
    default: ({ task, onBeforeAction, onAction }: { task: Task; onBeforeAction?: () => void; onAction?: () => void }) => (
        <button
            type="button"
            onClick={() => {
                onBeforeAction?.();
                (task as WeeklyTask).dayOfWeek = "5";
                onAction?.();
            }}
        >
            move to friday
        </button>
    ),
}));

const task = () => new WeeklyTask({
    id: "01930000-0000-7000-8000-000000000001",
    title: "Write the report",
    description: "",
    weekCode: "2026w43",
    dayOfWeek: "3",
    order: 0,
    subtasks: [],
});

const Opener: React.FC<{ subject: Task }> = ({ subject }) => {
    const { open, openNewTask } = useTaskModal();

    return (
        <>
            <button type="button" onClick={() => open(subject)}>edit</button>
            <button type="button" onClick={() => openNewTask("2026w43", "3")}>new</button>
        </>
    );
};

const renderEditor = (subject: Task) => render(
    <TaskModalProvider>
        <Opener subject={subject} />
    </TaskModalProvider>,
);

/** The title: the editor's one text input, the other fields being stood in for above. */
const titleField = () => document.querySelector("input") as HTMLInputElement;

beforeEach(() => {
    jest.clearAllMocks();
});

describe("editing an existing task", () => {
    it("saves a change on its own after a pause in typing", async () => {
        const subject = task();
        renderEditor(subject);
        fireEvent.click(screen.getByText("edit"));

        fireEvent.change(titleField(), { target: { value: "Write the final report" } });
        expect(updateTask).not.toHaveBeenCalled();

        await waitFor(() => expect(updateTask).toHaveBeenCalledTimes(1), { timeout: 2000 });
        expect(subject.title).toBe("Write the final report");
    });

    it("offers no Save button, only Close and a word that changes are kept", () => {
        renderEditor(task());
        fireEvent.click(screen.getByText("edit"));

        expect(screen.queryByText("actions.save")).toBeNull();
        expect(screen.getByText("task.autosaved")).toBeTruthy();
    });

    it("saves what was just typed when it is closed straight away", () => {
        const subject = task();
        renderEditor(subject);
        fireEvent.click(screen.getByText("edit"));

        fireEvent.change(screen.getByLabelText("description"), { target: { value: "Due Friday" } });
        fireEvent.click(screen.getByText("actions.close"));

        expect(updateTask).toHaveBeenCalledTimes(1);
        expect(subject.description).toBe("Due Friday");
    });

    it("writes nothing when nothing changed", () => {
        renderEditor(task());
        fireEvent.click(screen.getByText("edit"));
        fireEvent.click(screen.getByText("actions.close"));

        expect(updateTask).not.toHaveBeenCalled();
    });

    it("never saves an emptied title", () => {
        const subject = task();
        renderEditor(subject);
        fireEvent.click(screen.getByText("edit"));

        fireEvent.change(titleField(), { target: { value: "  " } });
        fireEvent.click(screen.getByText("actions.close"));

        expect(updateTask).not.toHaveBeenCalled();
        expect(subject.title).toBe("Write the report");
    });

    it("saves the edits before a menu action, and does not undo the action on the way out", () => {
        const subject = task();
        renderEditor(subject);
        fireEvent.click(screen.getByText("edit"));

        fireEvent.change(titleField(), { target: { value: "Renamed" } });
        act(() => {
            fireEvent.click(screen.getByText("move to friday"));
        });

        // Once, before the move: a whole-form save after it would put the task back on Wednesday.
        expect(updateTask).toHaveBeenCalledTimes(1);
        expect(subject.title).toBe("Renamed");
        expect(subject.dayOfWeek).toBe("5");
    });
});

describe("creating a task", () => {
    it("waits for Save rather than saving as it is typed", async () => {
        renderEditor(task());
        fireEvent.click(screen.getByText("new"));

        fireEvent.change(titleField(), { target: { value: "Call the bank" } });
        await new Promise((resolve) => setTimeout(resolve, 900));

        expect(addTask).not.toHaveBeenCalled();
        expect(updateTask).not.toHaveBeenCalled();

        fireEvent.click(screen.getByText("actions.save"));
        expect(addTask).toHaveBeenCalledTimes(1);
    });

    it("leaves nothing behind when it is cancelled", () => {
        renderEditor(task());
        fireEvent.click(screen.getByText("new"));

        fireEvent.change(titleField(), { target: { value: "Call the bank" } });
        fireEvent.click(screen.getByText("actions.cancel"));

        expect(addTask).not.toHaveBeenCalled();
        expect(updateTask).not.toHaveBeenCalled();
    });
});
