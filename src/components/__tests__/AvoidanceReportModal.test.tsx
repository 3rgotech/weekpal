import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { render, screen, waitFor } from "@testing-library/react";
import React from "react";
import AvoidanceReportModal from "../AvoidanceReportModal";
import { AvoidanceReport } from "../../types";

jest.mock("react-i18next", () => ({
    useTranslation: () => ({
        t: (key: string, options?: any) =>
            (options?.count !== undefined ? `${key}:${options.count}` : key),
    }),
}));

const report = (overrides: Partial<AvoidanceReport> = {}): AvoidanceReport => ({
    has_enough_data: true,
    moves: 273,
    open: 42,
    chronic: 20,
    since: "2026-06-01T00:00:00+00:00",
    most_deferred: [
        { id: "a", title: "Reconcile last month's receipts", moves: 14, week: "2026w37", category: "Admin", color: "orange" },
    ],
    by_category: [
        { category: "Learning", color: "violet", total: 24, done: 8, deferrals: 107, completion: 33 },
        { category: "Work", color: "blue", total: 47, done: 44, deferrals: 11, completion: 94 },
    ],
    longest_chains: [
        { id: "b", title: "Book the dentist", moves: 14, first_seen: "2026-06-01T00:00:00+00:00" },
    ],
    ...overrides,
});

const adapter = { avoidance: jest.fn(async (): Promise<AvoidanceReport | null> => report()) };

const open = () => render(
    <AvoidanceReportModal adapter={adapter as any} isOpen onOpenChange={() => { }} />,
);

beforeEach(() => {
    adapter.avoidance.mockClear();
    adapter.avoidance.mockImplementation(async () => report());
});

describe("the report", () => {
    it("names what has been moved most", async () => {
        open();

        expect(await screen.findByText("Reconcile last month's receipts")).toBeTruthy();
    });

    it("describes the task rather than the reader", async () => {
        // *(rt §6)* "Moved 14 times", never "you postponed this 14 times". A report that reads as
        // an accusation gets closed and not reopened.
        open();

        expect(await screen.findByText("avoidance.moved:14")).toBeTruthy();
    });

    it("shows which categories get done and which are carried", async () => {
        // The finding nobody knows about themselves: a board shows what is there, not what
        // became of it.
        open();

        await waitFor(() => expect(screen.getByText("Learning")).toBeTruthy());
        expect(screen.getByText("Work")).toBeTruthy();
    });

    it("says there is not enough history rather than inventing a pattern", async () => {
        // A pattern invented from a fortnight would spend the tier's credibility on the first
        // screen anybody sees.
        adapter.avoidance.mockImplementation(async () => report({ has_enough_data: false }));
        open();

        expect(await screen.findByText("avoidance.too_early")).toBeTruthy();
        expect(screen.queryByText("Reconcile last month's receipts")).toBeNull();
    });

    it("says the report is part of Pro rather than reporting an error", async () => {
        // A lapsed subscription is exactly the case where the board might still offer it, and an
        // error dialog would be the wrong answer.
        adapter.avoidance.mockImplementation(async () => null);
        open();

        expect(await screen.findByText("avoidance.pro_only")).toBeTruthy();
    });

    it("says so when it cannot load", async () => {
        adapter.avoidance.mockImplementation(async () => { throw new Error("nope"); });
        open();

        expect(await screen.findByText("avoidance.error")).toBeTruthy();
    });

    it("offers no advice", async () => {
        // It says what happened; it does not suggest what to do about it. The user knows their
        // own life, and counsel from a task manager is impertinent.
        const { container } = open();
        await screen.findByText("Reconcile last month's receipts");

        expect(container.textContent).not.toMatch(/should|try to|consider|why not/i);
    });

    it("asks for nothing until it is opened", () => {
        render(<AvoidanceReportModal adapter={adapter as any} isOpen={false} onOpenChange={() => { }} />);

        expect(adapter.avoidance).not.toHaveBeenCalled();
    });
});
