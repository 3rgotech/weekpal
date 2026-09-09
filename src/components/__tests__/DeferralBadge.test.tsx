import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import DeferralBadge from "../DeferralBadge";
import { WeeklyTask } from "../../data/task";

jest.mock("react-i18next", () => ({
    useTranslation: () => ({
        t: (key: string, options?: any) => (options?.count !== undefined ? `${key}:${options.count}` : key),
    }),
}));

const task = (deferralCount: number, overrides: Record<string, any> = {}) => new WeeklyTask({
    id: "01930000-0000-7000-8000-000000000001",
    title: "Reconcile last month's receipts",
    weekCode: "2026w37",
    dayOfWeek: "2",
    order: 1,
    subtasks: [],
    deferralCount,
    ...overrides,
});

const onOpenEscape = jest.fn((_task: any) => undefined);

beforeEach(() => { onOpenEscape.mockClear(); });

describe("the badge", () => {
    it("draws nothing for a task moved once", () => {
        const { container } = render(<DeferralBadge task={task(1)} />);

        expect(container.textContent).toBe("");
    });

    it("shows the count once it means something", () => {
        render(<DeferralBadge task={task(3)} />);

        expect(screen.getByText("3")).toBeTruthy();
    });

    it("stops counting past the cap", () => {
        render(<DeferralBadge task={task(19)} onOpenEscape={onOpenEscape} />);

        expect(screen.getByText("7+")).toBeTruthy();
    });

    it("keeps the same box in every tier", () => {
        // Escalation is in fill, never in size: a badge that grew would change the card's
        // metrics, and a column whose card heights disagree reads as damage.
        const { container: muted } = render(<DeferralBadge task={task(2)} />);
        const { container: heavy } = render(<DeferralBadge task={task(9)} onOpenEscape={onOpenEscape} />);

        const box = (el: Element | null) => (el?.className ?? "").match(/px-\S+|py-\S+|min-w-\S+/g)?.sort().join(" ");

        expect(box(muted.firstElementChild)).toBe(box(heavy.firstElementChild));
    });

    it("never uses red", () => {
        // Red means error. A repeatedly-deferred task is a signal about fit, not a fault — and on
        // a board spending sixteen hues on categories, a new one would compete with the only
        // thing colour means here.
        const { container } = render(<DeferralBadge task={task(9)} onOpenEscape={onOpenEscape} />);

        expect(container.innerHTML).not.toMatch(/red|rose|orange|amber/);
    });

    it("is not a button below the top tier", () => {
        render(<DeferralBadge task={task(3)} onOpenEscape={onOpenEscape} />);

        expect(screen.queryByRole("button")).toBeNull();
    });

    it("opens the escape hatch at the top tier", () => {
        render(<DeferralBadge task={task(6)} onOpenEscape={onOpenEscape} />);

        fireEvent.click(screen.getByRole("button"));

        expect(onOpenEscape).toHaveBeenCalledTimes(1);
    });

    it("does not open the card underneath it", () => {
        // The badge sits inside the drag handle, which opens the editor on click.
        const onCardClick = jest.fn();
        render(
            <div onClick={onCardClick}>
                <DeferralBadge task={task(6)} onOpenEscape={onOpenEscape} />
            </div>,
        );

        fireEvent.click(screen.getByRole("button"));

        expect(onCardClick).not.toHaveBeenCalled();
    });

    it("describes the task rather than the reader", () => {
        render(<DeferralBadge task={task(4)} />);

        // "Moved 4 times", never "you postponed this".
        expect(screen.getByLabelText("deferral.moved:4")).toBeTruthy();
    });
});
