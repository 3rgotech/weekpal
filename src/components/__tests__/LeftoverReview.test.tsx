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


const PAST_WEEK = "2026w30";

const data = {
    leftovers: [] as WeeklyTask[],
    leftoversLoaded: true,
    refreshLeftovers: jest.fn(async () => [] as WeeklyTask[]),
    categories: [] as unknown[],
    completeTask: jest.fn((_task: WeeklyTask) => undefined),
    deleteTask: jest.fn((_task: WeeklyTask) => undefined),
    rescueTask: jest.fn(async (_task: WeeklyTask, _destination: string) => undefined),
    // Typed, or `mock.calls` is an empty tuple and every assertion about what was moved reads as
    // a type error rather than as a check.
    relocateTask: jest.fn(async (_task: WeeklyTask, _target: { weekCode: string | null; dayOfWeek: string | null }) => undefined),
    restoreLeftover: jest.fn((_task: WeeklyTask) => undefined),
    // The real provider always supplies these. Mocked so the review is exercised against the
    // shape it actually receives: the line above the list, and the week it would sum up.
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

const teaser = { reviewClosed: jest.fn((_week: string) => undefined) };

jest.mock("../../contexts/proTeaser", () => ({
    useProTeaser: () => teaser,
}));

jest.mock("../../contexts/CalendarContext", () => ({
    useCalendar: () => fakeCalendar(getDayJs()(), DEFAULT_SETTINGS),
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

/**
 * The list lives in `DataContext` now, so it is supplied there — and the actions drop from it the
 * way the provider does, which is what makes a resolved row disappear.
 */
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

    return rendered;
};

beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    data.leftoversLoaded = true;
    data.lastWeekSummary = null;
});

describe("the weekly review of what was left behind", () => {
    it("shows itself when tasks were left behind", async () => {
        setup([leftover("a", "2")]);

        expect(await screen.findByText("Task a")).toBeInTheDocument();
    });

    it("stays shut when nothing was left behind", async () => {
        setup([]);

        // No modal at all rather than an empty one: a review that greets you with nothing to do is
        // what teaches people to dismiss it unread.
        await waitFor(() => expect(screen.queryByText("leftovers.title")).not.toBeInTheDocument());
    });

    it("waits for the first look before deciding anything", async () => {
        data.leftoversLoaded = false;
        setup([]);

        await waitFor(() => expect(screen.queryByText("leftovers.title")).not.toBeInTheDocument());
    });

    it("does not ask twice in the same week", async () => {
        setup([leftover("a", "2")]);
        await screen.findByText("Task a");

        // Closing it is what marks the week reviewed — the component writes the marker itself, so
        // the format stays in one place rather than being restated here.
        fireEvent.click(screen.getByText("leftovers.later"));
        await waitFor(() => expect(screen.queryByText("Task a")).not.toBeInTheDocument());

        // A second mount, as a page reload would be: the week has been reviewed, so it stays shut
        // even though the task is still outstanding.
        setup([leftover("a", "2")]);

        await waitFor(() => expect(screen.queryByText("Task a")).not.toBeInTheDocument());
    });

    it("reports the closed review so the one Pro teaser can follow it, never inside it", async () => {
        teaser.reviewClosed.mockClear();
        setup([leftover("a", "2")]);
        await screen.findByText("Task a");

        // Nothing while the review is open: the teaser may not live in this room.
        expect(teaser.reviewClosed).not.toHaveBeenCalled();

        fireEvent.click(screen.getByText("leftovers.later"));

        await waitFor(() => expect(teaser.reviewClosed).toHaveBeenCalledTimes(1));
        expect(teaser.reviewClosed.mock.calls[0][0]).toMatch(/^\d{4}w\d{2}$/);
    });

    it("ticks a task off without leaving the review", async () => {
        const task = leftover("a", "2");
        setup([task]);
        await screen.findByText("Task a");

        // A named button now, not an icon: *(rt §7)* the review was backwards on both axes, and
        // the most common actions were the ones behind a tooltip.
        fireEvent.click(screen.getByText("leftovers.complete"));

        expect(data.completeTask).toHaveBeenCalledWith(task);
        await waitFor(() => expect(screen.queryByText("Task a")).not.toBeInTheDocument());
    });

    it("drops a task that no longer matters", async () => {
        const task = leftover("a", "2");
        setup([task]);
        await screen.findByText("Task a");

        fireEvent.click(screen.getByLabelText("leftovers.delete"));

        await waitFor(() => expect(data.deleteTask).toHaveBeenCalledWith(task));
    });

    it("puts a task back on a day in one tap", async () => {
        // *(rt §7)* The whole point of the rework: the most common action was two taps and a
        // read behind a dropdown, and the destructive one was a single click in the open.
        const task = leftover("a", "2");
        setup([task]);
        await screen.findByText("Task a");

        // Tuesday's pill, by its accessible name rather than its letter — the letters are a
        // locale's abbreviations and several of them collide.
        const tuesday = screen.getAllByRole("button")
            .find((button) => /tuesday/i.test(button.getAttribute("aria-label") ?? ""));

        fireEvent.click(tuesday!);

        await waitFor(() => expect(data.relocateTask).toHaveBeenCalled());
        expect(data.relocateTask.mock.calls[0]?.[1]?.dayOfWeek).toBe("2");
    });

    it("pre-lights the day the task came from", async () => {
        // The most-used action is one tap on the glowing thing, and the pre-lit pill shows its
        // date while the others are letters.
        setup([leftover("a", "2")]);
        await screen.findByText("Task a");

        const lit = screen.getAllByRole("button")
            .filter((button) => button.className.includes("bg-sky-500"));

        expect(lit).toHaveLength(1);
        expect(lit[0].getAttribute("aria-label")).toMatch(/tuesday/i);
    });

    it("offers the week without a day", async () => {
        // "Any" is a real answer rather than an evasion: it is where a task goes when you know it
        // matters and not when.
        const task = leftover("a", "2");
        setup([task]);
        await screen.findByText("Task a");

        fireEvent.click(screen.getByText("leftovers.any"));

        await waitFor(() => expect(data.rescueTask).toHaveBeenCalledWith(task, "thisWeek"));
    });

    it("offers Some day only once a task has earned it", async () => {
        // *(rt §6)* Offering "give up on this" on every row would make giving up the suggestion
        // rather than the escape.
        setup([leftover("a", "2")]);
        await screen.findByText("Task a");

        expect(screen.queryByText("leftovers.some_day")).not.toBeInTheDocument();
    });

    it("offers Some day on a task that has been carried five times", async () => {
        const carried = leftover("a", "2");
        (carried as any).deferralCount = 6;
        setup([carried]);
        await screen.findByText("Task a");

        fireEvent.click(screen.getByText("leftovers.some_day"));

        await waitFor(() => expect(data.rescueTask).toHaveBeenCalledWith(carried, "someday"));
    });

    it("offers a deleted task back", async () => {
        // Delete is the one action here that cannot be reasoned about afterwards — every other
        // one leaves the task somewhere you can find it.
        const task = leftover("a", "2");
        setup([task]);
        await screen.findByText("Task a");

        fireEvent.click(screen.getByLabelText("leftovers.delete"));

        await waitFor(() => expect(data.deleteTask).toHaveBeenCalledWith(task));
        fireEvent.click(await screen.findByText("leftovers.undo_delete"));

        // Through the provider rather than a bare upsert: the row has to come back into the
        // review too, or the undo looks like it half happened.
        expect(data.restoreLeftover).toHaveBeenCalledWith(task);
    });

    it("asks how last week went when it opens", async () => {
        setup([leftover("a", "2")]);
        await screen.findByText("Task a");

        // On open, not on load: the line is only ever read here.
        expect(data.refreshLastWeekSummary).toHaveBeenCalled();
    });

    it("sums last week up in one line", async () => {
        // *(rt §7)* "Last week: 14 done, 5 moved." — one line above the inbox, not a panel.
        data.lastWeekSummary = { week: "2026w36", done: 14, moved: 5, left: 2 };
        setup([leftover("a", "2")]);
        await screen.findByText("Task a");

        expect(screen.getByText("leftovers.last_week")).toBeInTheDocument();
        // The third number waits behind a tap: it is the list underneath, as a count.
        expect(screen.queryByText("leftovers.last_week_left")).not.toBeInTheDocument();

        fireEvent.click(screen.getByText("leftovers.last_week"));

        expect(screen.getByText("leftovers.last_week_left")).toBeInTheDocument();
    });

    it("says nothing about a week the board was not used in", async () => {
        // "0 done, 0 moved" is not a summary, it is a reproach.
        data.lastWeekSummary = { week: "2026w36", done: 0, moved: 0, left: 0 };
        setup([leftover("a", "2")]);
        await screen.findByText("Task a");

        expect(screen.queryByText("leftovers.last_week")).not.toBeInTheDocument();
    });
});
