import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import FeedbackModal from "../FeedbackModal";

jest.mock("react-i18next", () => ({
    useTranslation: () => ({
        t: (key: string, options?: any) => (options?.count !== undefined ? `${key}:${options.count}` : key),
    }),
}));

const taskStore = {
    getPendingChangesCount: jest.fn(async () => 3),
    getDeadLetters: jest.fn(async () => [{ id: "x" }]),
};

jest.mock("../../contexts/DataContext", () => ({ useData: () => ({ taskStore }) }));
jest.mock("../../contexts/CalendarContext", () => ({ useCalendar: () => ({ currentWeek: "2026w37" }) }));

const adapter = {
    send: jest.fn(async (_k: string, _m: string, _d: Record<string, string>, _w: string | null) => undefined),
};

const open = () => render(
    <FeedbackModal adapter={adapter as any} isOpen onOpenChange={() => { }} />,
);

beforeEach(() => {
    adapter.send.mockClear();
    adapter.send.mockImplementation(async () => undefined);
    taskStore.getPendingChangesCount.mockClear();
});

describe("reporting something", () => {
    it("offers two kinds, not five", async () => {
        // A taxonomy is a decision asked of somebody who came here to say one thing.
        open();

        expect(screen.getByText("feedback.kind_bug")).toBeTruthy();
        expect(screen.getByText("feedback.kind_idea")).toBeTruthy();
    });

    it("will not send an empty report", async () => {
        // A report with no words is one nobody can act on. Asserted on the behaviour rather than
        // on the button's disabled attribute: the HeroUI stub does not map `isDisabled` to the
        // DOM, and the guarantee that matters is that nothing leaves.
        open();

        fireEvent.click(screen.getByText("feedback.send"));

        await waitFor(() => expect(taskStore.getPendingChangesCount).toHaveBeenCalled());
        expect(adapter.send).not.toHaveBeenCalled();
    });

    it("will not send whitespace either", async () => {
        open();

        fireEvent.change(screen.getByLabelText("feedback.title"), { target: { value: "   " } });
        fireEvent.click(screen.getByText("feedback.send"));

        await waitFor(() => expect(taskStore.getPendingChangesCount).toHaveBeenCalled());
        expect(adapter.send).not.toHaveBeenCalled();
    });

    it("sends what was written, with the week it happened in", async () => {
        open();

        fireEvent.change(screen.getByLabelText("feedback.title"), {
            target: { value: "Ticking a task moved the wrong card." },
        });
        fireEvent.click(screen.getByText("feedback.send"));

        await waitFor(() => expect(adapter.send).toHaveBeenCalled());
        expect(adapter.send.mock.calls[0][0]).toBe("bug");
        expect(adapter.send.mock.calls[0][1]).toBe("Ticking a task moved the wrong card.");
        expect(adapter.send.mock.calls[0][3]).toBe("2026w37");
    });

    it("attaches what the board knew about itself", async () => {
        // The reason this is worth more than a screenshot: the worst failure here is silent data
        // loss, and no picture shows it.
        open();
        await waitFor(() => expect(taskStore.getPendingChangesCount).toHaveBeenCalled());

        fireEvent.change(screen.getByLabelText("feedback.title"), { target: { value: "Tasks vanished." } });
        fireEvent.click(screen.getByText("feedback.send"));

        await waitFor(() => expect(adapter.send).toHaveBeenCalled());
        const diagnostics = adapter.send.mock.calls[0][2];

        expect(diagnostics.pending_writes).toBe("3");
        expect(diagnostics.dead_letters).toBe("1");
    });

    it("says what is attached before it is sent", async () => {
        // Attaching the board's state without saying so would be collecting device information
        // from somebody who came here to be helpful.
        open();

        await waitFor(() => expect(screen.getByText(/^feedback\.attached:/)).toBeTruthy());
    });

    it("promises the tasks themselves are never included", async () => {
        // A report is not a backup. Somebody sending "this is broken" has not agreed to send
        // their week.
        open();

        expect(screen.getByText("feedback.no_tasks")).toBeTruthy();
    });

    it("switches to a suggestion", async () => {
        open();

        fireEvent.click(screen.getByText("feedback.kind_idea"));
        fireEvent.change(screen.getByLabelText("feedback.title"), { target: { value: "Sort Some day by age." } });
        fireEvent.click(screen.getByText("feedback.send"));

        await waitFor(() => expect(adapter.send.mock.calls[0][0]).toBe("idea"));
    });

    it("thanks the sender rather than leaving them guessing", async () => {
        open();

        fireEvent.change(screen.getByLabelText("feedback.title"), { target: { value: "Something broke." } });
        fireEvent.click(screen.getByText("feedback.send"));

        expect(await screen.findByText("feedback.thanks")).toBeTruthy();
    });

    it("says so plainly when it could not send", async () => {
        // A report silently lost is worse than one that failed loudly: the user would believe
        // they had told somebody.
        adapter.send.mockImplementation(async () => { throw new Error("offline"); });
        open();

        fireEvent.change(screen.getByLabelText("feedback.title"), { target: { value: "Something broke." } });
        fireEvent.click(screen.getByText("feedback.send"));

        expect(await screen.findByText("feedback.error")).toBeTruthy();
        expect(screen.queryByText("feedback.thanks")).toBeNull();
    });

    it("renders nothing on a board with nowhere to send", async () => {
        const { container } = render(
            <FeedbackModal adapter={null} isOpen onOpenChange={() => { }} />,
        );

        expect(container.textContent).toBe("");
    });
});
