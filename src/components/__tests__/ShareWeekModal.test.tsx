import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import ShareWeekModal from "../ShareWeekModal";
import Category from "../../data/category";
import { WeekShare } from "../../types";

jest.mock("react-i18next", () => ({
    useTranslation: () => ({ t: (key: string, options?: any) => (options?.count !== undefined ? `${key}:${options.count}` : key) }),
}));

const share = (overrides: Partial<WeekShare> = {}): WeekShare => ({
    id: "share-1",
    week_number: "2026w37",
    url: "https://weekpal.test/w/abcdef",
    has_password: false,
    expires_at: null,
    max_views: null,
    view_count: 0,
    last_viewed_at: null,
    revoked_at: null,
    is_viewable: true,
    unavailable_reason: null,
    created_at: null,
    ...overrides,
});

const adapter = {
    list: jest.fn(async (): Promise<WeekShare[]> => []),
    share: jest.fn(async (_week: string, _options: any): Promise<WeekShare> => share()),
    revoke: jest.fn(async (_week: string): Promise<void> => undefined),
};

const data = { shareAdapter: adapter as any, categories: [] as Category[] };

jest.mock("../../contexts/DataContext", () => ({ useData: () => data }));
jest.mock("../../contexts/CalendarContext", () => ({ useCalendar: () => ({ currentWeek: "2026w37" }) }));

const open = () => render(<ShareWeekModal isOpen onOpenChange={() => { }} />);

beforeEach(() => {
    adapter.list.mockClear();
    adapter.share.mockClear();
    adapter.revoke.mockClear();
    adapter.list.mockImplementation(async () => []);
    data.shareAdapter = adapter as any;
    data.categories = [];
});

describe("sharing a week", () => {
    it("offers to create a link when the week is not shared", async () => {
        open();

        await waitFor(() => expect(adapter.list).toHaveBeenCalled());
        expect(screen.getByText("share.create")).toBeTruthy();
    });

    it("creates a link with no password, expiry or cap by default", async () => {
        // The common case is "here is my week" sent to one person. A dialog that demanded three
        // decisions before producing a link is a dialog people close.
        open();
        await waitFor(() => expect(adapter.list).toHaveBeenCalled());

        fireEvent.click(screen.getByText("share.create"));

        await waitFor(() => expect(adapter.share).toHaveBeenCalledTimes(1));
        expect(adapter.share.mock.calls[0][1]).toEqual({
            password: undefined,
            expiresAt: undefined,
            maxViews: undefined,
        });
    });

    it("shows the link once it exists, in a field that can be selected", async () => {
        // Not a copy button alone: clipboard access can be refused, and a link nobody can select
        // is a link nobody can send.
        adapter.list.mockImplementation(async () => [share()]);
        open();

        await waitFor(() => expect(screen.getByDisplayValue("https://weekpal.test/w/abcdef")).toBeTruthy());
    });

    it("only shows a link for the week being looked at", async () => {
        adapter.list.mockImplementation(async () => [share({ week_number: "2026w40" })]);
        open();

        await waitFor(() => expect(adapter.list).toHaveBeenCalled());
        expect(screen.queryByDisplayValue("https://weekpal.test/w/abcdef")).toBeNull();
    });

    it("ignores a link that has stopped working", async () => {
        // A revoked or expired link is not something to offer for copying.
        adapter.list.mockImplementation(async () => [
            share({ is_viewable: false, unavailable_reason: "expired" }),
        ]);
        open();

        await waitFor(() => expect(adapter.list).toHaveBeenCalled());
        expect(screen.queryByDisplayValue("https://weekpal.test/w/abcdef")).toBeNull();
    });

    it("warns that a new link turns off the old one", async () => {
        // The URL is the credential, so changing the terms cannot mean editing something other
        // people are already holding.
        adapter.list.mockImplementation(async () => [share()]);
        open();

        await waitFor(() => expect(screen.getByText("share.replace_warning")).toBeTruthy());
    });

    it("revokes the link", async () => {
        adapter.list.mockImplementation(async () => [share()]);
        open();

        await waitFor(() => expect(screen.getByText("share.revoke")).toBeTruthy());
        fireEvent.click(screen.getByText("share.revoke"));

        await waitFor(() => expect(adapter.revoke).toHaveBeenCalledWith("2026w37"));
    });

    it("passes a typed password through", async () => {
        open();
        await waitFor(() => expect(adapter.list).toHaveBeenCalled());

        fireEvent.change(screen.getByLabelText("share.password_label", { selector: "input" }), {
            target: { value: "hunter2" },
        });
        fireEvent.click(screen.getByText("share.create"));

        await waitFor(() => expect(adapter.share).toHaveBeenCalled());
        expect(adapter.share.mock.calls[0][1].password).toBe("hunter2");
    });

    it("says how many categories are never shared", async () => {
        // So the sender knows the omission is deliberate rather than a bug, without the dialog
        // listing what is being kept back.
        data.categories = [
            new Category({ id: "a", name: "Work", color: "sky", isPrivate: false }),
            new Category({ id: "b", name: "Therapy", color: "rose", isPrivate: true }),
            new Category({ id: "c", name: "Money", color: "red", isPrivate: true }),
        ];
        open();

        await waitFor(() => expect(screen.getByText("share.private_note:2")).toBeTruthy());
    });

    it("renders nothing without a backend to mint a link", async () => {
        // A demo board cannot produce a URL anyone could open, so it gets no dialog rather than
        // one that hands out a broken link.
        data.shareAdapter = null;

        const { container } = open();

        expect(container.textContent).toBe("");
        expect(adapter.list).not.toHaveBeenCalled();
    });

    it("says so when the server refuses", async () => {
        adapter.share.mockImplementation(async () => { throw new Error("nope"); });
        open();
        await waitFor(() => expect(adapter.list).toHaveBeenCalled());

        fireEvent.click(screen.getByText("share.create"));

        await waitFor(() => expect(screen.getByText("share.error")).toBeTruthy());
    });
});
