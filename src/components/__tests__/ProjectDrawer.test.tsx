import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import ProjectDrawer from "../ProjectDrawer";
import Project from "../../data/project";
import { SomedayTask } from "../../data/task";

jest.mock("react-i18next", () => ({
    useTranslation: () => ({ t: (key: string) => key }),
}));

// The board's drag context is not what this file is about, and `useSortable` needs one.
jest.mock("../DraggableTask", () => ({
    __esModule: true,
    default: ({ task }: { task: { title: string } }) => <li>{task.title}</li>,
}));

// A droppable outside a `DndContext` has nothing to register with.
jest.mock("@dnd-kit/core", () => ({
    useDroppable: () => ({ setNodeRef: () => { }, isOver: false }),
}));
jest.mock("@dnd-kit/sortable", () => ({
    SortableContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const work = new Project({ id: "p1", name: "Kitchen", categoryId: null });

const data = {
    projects: [work],
    backlogs: {} as Record<string, unknown[]>,
    loadBacklog: jest.fn(async () => undefined),
    categories: [] as unknown[],
    focusedCategory: null as string | null,
    addTask: jest.fn(),
    saveProject: jest.fn(async () => undefined),
    deleteProject: jest.fn(async () => undefined),
};

jest.mock("../../contexts/DataContext", () => ({ useData: () => data }));

// The drawer's open state lives in the shortcuts context, whose module graph reaches the API
// adapters — which jsdom cannot load. The state itself is what matters here.
let projectsOpen = false;
jest.mock("../../contexts/ShortcutsContext", () => ({
    useShortcuts: () => ({
        projectsOpen,
        setProjectsOpen: (open: boolean) => { projectsOpen = open; },
    }),
}));
jest.mock("../../contexts/CalendarContext", () => ({ useCalendar: () => ({ currentWeek: "2026w10" }) }));

const openDrawer = () => {
    const view = render(<ProjectDrawer />);
    fireEvent.click(screen.getByLabelText("projects.show"));
    view.rerender(<ProjectDrawer />);
};

beforeEach(() => {
    jest.clearAllMocks();
    projectsOpen = false;
    data.projects = [work];
    data.backlogs = {};
    data.focusedCategory = null;
});

describe("the projects drawer", () => {
    it("loads a backlog when its project is opened", () => {
        openDrawer();
        fireEvent.click(screen.getByText("Kitchen"));

        expect(data.loadBacklog).toHaveBeenCalledWith("p1");
    });

    it("lists the tasks waiting in a project", () => {
        data.backlogs = { p1: [new SomedayTask({ id: "t1", title: "Regrout the tiles", projectId: "p1" })] };

        openDrawer();
        fireEvent.click(screen.getByText("Kitchen"));

        expect(screen.getByText("Regrout the tiles")).toBeInTheDocument();
    });

    it("creates a task straight into the backlog", () => {
        // The drawer had no way to add a task at all: a project could only be filled by
        // dragging one out of the week.
        openDrawer();
        fireEvent.click(screen.getByText("Kitchen"));
        fireEvent.click(screen.getByText("main.add_new_task"));

        const input = screen.getByRole("textbox");
        fireEvent.change(input, { target: { value: "Order the worktop" } });
        fireEvent.keyDown(input, { key: "Enter" });

        expect(data.addTask).toHaveBeenCalledWith(expect.objectContaining({
            title: "Order the worktop",
            projectId: "p1",
        }));
    });

    it("edits a project in a dialog rather than under its task list", () => {
        openDrawer();
        fireEvent.click(screen.getByLabelText("projects.edit"));

        expect(screen.getByText("projects.name")).toBeInTheDocument();
        expect(screen.getByText("projects.category")).toBeInTheDocument();
    });

    it("keeps a project out of the drawer while another category has focus", () => {
        data.projects = [new Project({ id: "p2", name: "Garden", categoryId: "home" })];
        data.focusedCategory = "work";

        openDrawer();

        expect(screen.queryByText("Garden")).not.toBeInTheDocument();
    });
});

describe("the drawer when it is shut", () => {
    it("says what it is, rather than being an unlabelled chevron", () => {
        render(<ProjectDrawer />);

        expect(screen.getByText("projects.title")).toBeInTheDocument();
    });
});
