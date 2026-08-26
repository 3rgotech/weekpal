import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React, { useState } from "react";
import LeftoverReview from "../LeftoverReview";
import { WeeklyTask } from "../../data/task";
import { DEFAULT_SETTINGS } from "../../utils/settings";

jest.mock("react-i18next", () => ({
    useTranslation: () => ({ t: (key: string) => key }),
}));

/**
 * HeroUI pulls framer-motion in through a dynamic import jest's VM cannot resolve, so its
 * components stand in as the plain elements they wrap. What is under test is this component's
 * own wiring — which task an action applies to, and when the review shows itself at all.
 */
jest.mock("@heroui/react", () => ({
    Button: ({ children, onPress }: any) => <button onClick={onPress}>{children}</button>,
    Chip: ({ children }: any) => <span>{children}</span>,
    Modal: ({ children, isOpen }: any) => (isOpen ? <div>{children}</div> : null),
    ModalBody: ({ children }: any) => <div>{children}</div>,
    ModalContent: ({ children }: any) => <div>{children}</div>,
    ModalFooter: ({ children }: any) => <div>{children}</div>,
    ModalHeader: ({ children }: any) => <div>{children}</div>,
    Spinner: () => <div>spinner</div>,
    Tooltip: ({ children }: any) => children,
}));

const PAST_WEEK = "2026w30";

const data = {
    taskStore: { leftovers: jest.fn(async () => [] as WeeklyTask[]) },
    categories: [] as unknown[],
    completeTask: jest.fn(),
    deleteTask: jest.fn(),
    rescueTask: jest.fn(async () => undefined),
};

jest.mock("../../contexts/DataContext", () => ({
    useData: () => data,
}));

jest.mock("../../contexts/SettingsContext", () => ({
    useSettings: () => ({ settings: DEFAULT_SETTINGS }),
}));

const leftover = (id: string, dayOfWeek: string) => new WeeklyTask({
    id,
    title: `Task ${id}`,
    weekCode: PAST_WEEK,
    dayOfWeek,
    order: 0,
});

/** The review is controlled by its parent, so the test supplies the state the app would hold. */
const Harness: React.FC = () => {
    const [open, setOpen] = useState(false);

    return <LeftoverReview isOpen={open} onOpenChange={setOpen} />;
};

const setup = (tasks: WeeklyTask[]) => {
    data.taskStore.leftovers.mockResolvedValue(tasks);

    return render(<Harness />);
};

beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
});

describe("the weekly review of what was left behind", () => {
    it("shows itself when tasks were left behind", async () => {
        setup([leftover("a", "2")]);

        expect(await screen.findByText("Task a")).toBeInTheDocument();
    });

    it("stays shut when nothing was left behind", async () => {
        setup([]);

        await waitFor(() => expect(data.taskStore.leftovers).toHaveBeenCalled());

        // No modal at all rather than an empty one: a review that greets you with nothing to do
        // is what teaches people to dismiss it unread.
        expect(screen.queryByText("leftovers.title")).not.toBeInTheDocument();
    });

    it("does not ask twice in the same week", async () => {
        setup([leftover("a", "2")]);
        await screen.findByText("Task a");

        // Closing it is what marks the week reviewed — the component writes the marker itself,
        // so the format stays in one place rather than being restated here.
        fireEvent.click(screen.getByText("leftovers.later"));
        await waitFor(() => expect(screen.queryByText("Task a")).not.toBeInTheDocument());

        // A second mount, as a page reload would be: the week has been reviewed, so it stays
        // shut, and does not even go looking.
        setup([leftover("a", "2")]);

        await waitFor(() => expect(data.taskStore.leftovers).toHaveBeenCalledTimes(1));
        expect(screen.queryByText("Task a")).not.toBeInTheDocument();
    });

    it("ticks a task off without leaving the review", async () => {
        const task = leftover("a", "2");
        setup([task]);
        await screen.findByText("Task a");

        fireEvent.click(screen.getByLabelText("leftovers.complete"));

        await waitFor(() => expect(screen.queryByText("Task a")).not.toBeInTheDocument());
        expect(data.completeTask).toHaveBeenCalledWith(task);
    });

    it("drops a task that no longer matters", async () => {
        const task = leftover("a", "2");
        setup([task]);
        await screen.findByText("Task a");

        fireEvent.click(screen.getByLabelText("leftovers.delete"));

        await waitFor(() => expect(data.deleteTask).toHaveBeenCalledWith(task));
    });

    it("offers the three ways back into the present", async () => {
        const task = leftover("a", "2");
        setup([task]);
        await screen.findByText("Task a");

        fireEvent.click(screen.getByText("leftovers.same_day"));
        await waitFor(() => expect(data.rescueTask).toHaveBeenCalledWith(task, "sameDay"));

        setup([leftover("b", "2")]);
        await screen.findByText("Task b");
        fireEvent.click(screen.getAllByText("leftovers.this_week")[0]);
        await waitFor(() => expect(data.rescueTask).toHaveBeenCalledWith(expect.anything(), "thisWeek"));

        setup([leftover("c", "2")]);
        await screen.findByText("Task c");
        fireEvent.click(screen.getAllByText("leftovers.some_day")[0]);
        await waitFor(() => expect(data.rescueTask).toHaveBeenCalledWith(expect.anything(), "someday"));
    });

    it("leaves out the same-day move for a task that never had a day", async () => {
        setup([leftover("a", "0")]);
        await screen.findByText("Task a");

        // Day 0 is the undated "this week" bucket, so keeping its weekday and moving it into this
        // week are the same move — offering both would be two buttons that do one thing.
        expect(screen.queryByText("leftovers.same_day")).not.toBeInTheDocument();
        expect(screen.getByText("leftovers.this_week")).toBeInTheDocument();
    });
});
