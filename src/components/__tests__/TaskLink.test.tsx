import { afterEach, beforeEach, describe, expect, it } from "@jest/globals";
import { act, render } from "@testing-library/react";
import React from "react";
import TaskLink from "../TaskLink";
import { WeeklyTask } from "../../data/task";

const task = new WeeklyTask({ id: "01930000-0000-7000-8000-000000000001", title: "Call the bank", weekCode: "2026w43", dayOfWeek: "3" });

const data = { tasks: [] as WeeklyTask[], findTask: (id: string) => data.tasks.find((t) => t.id === id) ?? null };
const open = jest.fn();
const goToToday = jest.fn();

jest.mock("../../contexts/DataContext", () => ({ useData: () => data }));
jest.mock("../../contexts/CalendarContext", () => ({ useCalendar: () => ({ goToToday }) }));
jest.mock("../../contexts/TaskModalContext", () => ({ useTaskModal: () => ({ open }) }));

/** A stand-in for the page's service worker container, which jsdom does not have. */
const worker = new EventTarget();

beforeEach(() => {
    jest.clearAllMocks();
    data.tasks = [];
    Object.defineProperty(navigator, "serviceWorker", { value: worker, configurable: true });
});

afterEach(() => {
    window.history.replaceState(null, "", "/app");
});

describe("a link to a task", () => {
    it("opens the task named in the address once its week has loaded, and leaves the address", () => {
        window.history.replaceState(null, "", `/app?task=${task.id}&view=week`);

        const { rerender } = render(<TaskLink />);
        expect(open).not.toHaveBeenCalled();
        expect(window.location.search).toBe("?view=week");

        data.tasks = [task];
        rerender(<TaskLink />);

        expect(open).toHaveBeenCalledWith(task);
    });

    it("opens it on a board already open, when the service worker says so", () => {
        data.tasks = [task];
        render(<TaskLink />);

        act(() => {
            worker.dispatchEvent(new MessageEvent("message", { data: { type: "weekpal:open", url: `https://weekpal.test/app?task=${task.id}` } }));
        });

        expect(goToToday).toHaveBeenCalled();
        expect(open).toHaveBeenCalledWith(task);
    });

    it("does nothing on a board opened without one", () => {
        data.tasks = [task];
        render(<TaskLink />);

        expect(open).not.toHaveBeenCalled();
    });
});
