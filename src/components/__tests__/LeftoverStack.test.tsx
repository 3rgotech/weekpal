import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React, { useState } from "react";
import LeftoverReview from "../LeftoverReview";
import { WeeklyTask } from "../../data/task";
import { WeekSummary } from "../../types";
import { DEFAULT_SETTINGS } from "../../utils/settings";
import { getDayJs } from "../../utils/dayjs";
import { fakeCalendar } from "../../test-support/calendar";

jest.mock("react-i18next", () => ({
    useTranslation: () => ({ t: (key: string) => key }),
}));

// A phone. Which body the review renders is the same question as which board mounted, and it is
// answered by the same hook — so this file is the review as the phone sees it.
jest.mock("../../utils/layout", () => ({
    useVerticalLayout: () => true,
}));

const PAST_WEEK = "2026w30";
const now = getDayJs()();
const thisWeek = now.format("GGGG[w]WW");

const data = {
    leftovers: [] as WeeklyTask[],
    leftoversLoaded: true,
    refreshLeftovers: jest.fn(async () => [] as WeeklyTask[]),
    categories: [] as unknown[],
    completeTask: jest.fn((_task: WeeklyTask) => undefined),
    deleteTask: jest.fn((_task: WeeklyTask) => undefined),
    rescueTask: jest.fn(async (_task: WeeklyTask, _destination: string) => undefined),
    relocateTask: jest.fn(async (_task: WeeklyTask, _target: { weekCode: string | null; dayOfWeek: string | null }) => undefined),
    restoreLeftover: jest.fn((_task: WeeklyTask) => undefined),
    lastWeekSummary: null as WeekSummary | null,
    refreshLastWeekSummary: jest.fn(async () => null as WeekSummary | null),
    allTasks: [] as unknown[],
};

jest.mock("../../contexts/DataContext", () => ({
    useData: () => data,
}));

jest.mock("../../contexts/SettingsContext", () => ({
    useSettings: () => ({ settings: DEFAULT_SETTINGS }),
}));

jest.mock("../../contexts/CalendarContext", () => ({
    useCalendar: () => fakeCalendar(now, DEFAULT_SETTINGS),
}));

const leftover = (id: string, dayOfWeek: string, extra: Record<string, unknown> = {}) => new WeeklyTask({
    id,
    title: `Task ${id}`,
    weekCode: PAST_WEEK,
    dayOfWeek,
    order: 0,
    ...extra,
});

const Harness: React.FC = () => {
    const [open, setOpen] = useState(false);

    return <LeftoverReview isOpen={open} onOpenChange={setOpen} />;
};

const setup = (tasks: WeeklyTask[]) => {
    data.leftovers = tasks;

    const rendered = render(<Harness />);

    const drop = (task: WeeklyTask) => {
        data.leftovers = data.leftovers.filter((held) => held.id !== task.id);
        rendered.rerender(<Harness />);
    };

    data.completeTask.mockImplementation(drop as any);
    data.deleteTask.mockImplementation(drop as any);
    data.rescueTask.mockImplementation((async (task: any) => drop(task)) as any);
    data.relocateTask.mockImplementation((async (task: any) => drop(task)) as any);

    return rendered;
};

/** A sideways swipe on the card, as a touch screen would report it. */
const swipe = (element: Element, dx: number) => {
    fireEvent.touchStart(element, { touches: [{ clientX: 200, clientY: 300 }] });
    fireEvent.touchEnd(element, { changedTouches: [{ clientX: 200 + dx, clientY: 305 }] });
};

beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    data.leftoversLoaded = true;
    data.lastWeekSummary = null;
    data.allTasks = [];
});

describe("the review on a phone", () => {
    it("is a stack of cards rather than a list", async () => {
        setup([leftover("a", "2"), leftover("b", "3")]);

        expect(await screen.findByTestId("leftover-stack")).toBeInTheDocument();
        // One card at a time: the second task is in the count, not on the screen.
        expect(screen.getByText("Task a")).toBeInTheDocument();
        expect(screen.queryByText("Task b")).not.toBeInTheDocument();
    });

    it("counts its way to a visible end", async () => {
        // *(rt §7)* The worst mobile review flow is one with no visible end.
        setup([leftover("a", "2"), leftover("b", "3"), leftover("c", "4")]);
        await screen.findByText("Task a");

        expect(screen.getByText("leftovers.position")).toBeInTheDocument();
    });

    it("browses on a swipe without deciding anything", async () => {
        setup([leftover("a", "2"), leftover("b", "3")]);
        const card = (await screen.findByText("Task a")).closest("article")!;

        swipe(card.parentElement!, -120);

        expect(await screen.findByText("Task b")).toBeInTheDocument();
        expect(screen.queryByText("Task a")).not.toBeInTheDocument();
        // Swipe browses, tap commits: nothing was written.
        expect(data.relocateTask).not.toHaveBeenCalled();
        expect(data.rescueTask).not.toHaveBeenCalled();
        expect(data.completeTask).not.toHaveBeenCalled();
        expect(data.deleteTask).not.toHaveBeenCalled();
    });

    it("ignores a swipe that is really a scroll", async () => {
        setup([leftover("a", "2"), leftover("b", "3")]);
        const card = (await screen.findByText("Task a")).closest("article")!;

        fireEvent.touchStart(card.parentElement!, { touches: [{ clientX: 200, clientY: 300 }] });
        fireEvent.touchEnd(card.parentElement!, { changedTouches: [{ clientX: 150, clientY: 500 }] });

        expect(screen.getByText("Task a")).toBeInTheDocument();
    });

    it("comes back round to the first card", async () => {
        // Not a forced march: the stack is the same list read from a different place, and a
        // skipped task is still a leftover.
        setup([leftover("a", "2"), leftover("b", "3")]);
        await screen.findByText("Task a");

        fireEvent.click(screen.getByText("leftovers.skip"));
        await screen.findByText("Task b");
        fireEvent.click(screen.getByText("leftovers.skip"));

        expect(await screen.findByText("Task a")).toBeInTheDocument();
    });

    it("shows the next card once one is decided", async () => {
        const [a, b] = [leftover("a", "2"), leftover("b", "3")];
        setup([a, b]);
        await screen.findByText("Task a");

        fireEvent.click(screen.getByText("leftovers.complete"));

        expect(data.completeTask).toHaveBeenCalledWith(a);
        expect(await screen.findByText("Task b")).toBeInTheDocument();
    });

    it("puts a card back on its own day in one tap on the rail", async () => {
        const task = leftover("a", "2");
        setup([task]);
        await screen.findByText("Task a");

        const lit = screen.getAllByRole("button")
            .filter((button) => button.classList.contains("bg-wp-accent"));

        expect(lit).toHaveLength(1);
        expect(lit[0].getAttribute("aria-label")).toMatch(/tuesday/i);

        fireEvent.click(lit[0]);

        await waitFor(() => expect(data.relocateTask).toHaveBeenCalled());
        expect(data.relocateTask.mock.calls[0]?.[1]).toEqual({ weekCode: thisWeek, dayOfWeek: "2" });
    });

    it("keeps Some day for a card that has earned it", async () => {
        // *(rt §6)* Progressive disclosure wired to the badge.
        const carried = leftover("b", "3", { deferralCount: 6 });
        setup([leftover("a", "2"), carried]);
        await screen.findByText("Task a");

        expect(screen.queryByText("leftovers.some_day")).not.toBeInTheDocument();

        fireEvent.click(screen.getByText("leftovers.skip"));
        await screen.findByText("Task b");

        fireEvent.click(screen.getByText("leftovers.some_day"));

        await waitFor(() => expect(data.rescueTask).toHaveBeenCalledWith(carried, "someday"));
    });

    it("offers a deleted card back", async () => {
        const task = leftover("a", "2");
        setup([task, leftover("b", "3")]);
        await screen.findByText("Task a");

        fireEvent.click(screen.getByLabelText("leftovers.delete"));

        await waitFor(() => expect(data.deleteTask).toHaveBeenCalledWith(task));
        fireEvent.click(await screen.findByText("leftovers.undo_delete"));

        expect(data.restoreLeftover).toHaveBeenCalledWith(task);
    });

    it("draws the week it all landed in once the stack is empty", async () => {
        // The stats line expands into next week's shape when the last card leaves.
        data.allTasks = [
            new WeeklyTask({ id: "x", title: "X", weekCode: thisWeek, dayOfWeek: "1", order: 0 }),
            new WeeklyTask({ id: "y", title: "Y", weekCode: thisWeek, dayOfWeek: "1", order: 1 }),
            new WeeklyTask({ id: "z", title: "Z", weekCode: thisWeek, dayOfWeek: "3", order: 0 }),
        ];
        const task = leftover("a", "2");
        setup([task]);
        await screen.findByText("Task a");

        fireEvent.click(screen.getByText("leftovers.complete"));

        const shape = await screen.findByLabelText("leftovers.shape");
        const counts = Array.from(shape.querySelectorAll("li")).map((li) => li.textContent);

        // Monday holds two, Wednesday one, and every other bucket says so with a zero.
        expect(counts.some((text) => text?.endsWith("2"))).toBe(true);
        expect(counts.filter((text) => text?.endsWith("0")).length).toBeGreaterThan(0);
        expect(screen.getByText("leftovers.empty")).toBeInTheDocument();
    });

    it("carries last week's line at the top", async () => {
        data.lastWeekSummary = { week: "2026w36", done: 14, moved: 5, left: 1 };
        setup([leftover("a", "2")]);
        await screen.findByText("Task a");

        expect(screen.getByText("leftovers.last_week")).toBeInTheDocument();
    });
});
