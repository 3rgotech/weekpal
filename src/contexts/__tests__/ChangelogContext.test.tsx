import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { act, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { ChangelogProvider, useChangelog } from "../ChangelogContext";
import { ChangelogEntry } from "../../types";

const adapter = {
    list: jest.fn<() => Promise<ChangelogEntry[]>>(),
    markRead: jest.fn<() => Promise<void>>(),
};

let provided: { changelogAdapter: typeof adapter | null; leftoversLoaded: boolean } = {
    changelogAdapter: adapter,
    leftoversLoaded: true,
};

/** The leftover review's open state, which the release notes give way to. */
let leftoversOpen = false;

jest.mock("../DataContext", () => ({ useData: () => provided }));
jest.mock("../ShortcutsContext", () => ({ useShortcuts: () => ({ leftoversOpen }) }));

/** The first-run tour, which the release notes also give way to. Off unless a test says so. */
let onboarding = false;

jest.mock("../OnboardingContext", () => ({
    useOnboarding: () => ({ blocking: onboarding, startTour: () => { } }),
}));

/*
 * The dialog stands in for itself: what is under test here is when the provider decides to open
 * it and what it does on the way out, not how a release note is laid out.
 */
let lastProps: Record<string, unknown> = {};

jest.mock("../../components/ChangelogModal", () => ({
    __esModule: true,
    default: (props: Record<string, unknown>) => {
        lastProps = props;

        return props.isOpen ? <div data-testid="dialog">{String(props.view)}</div> : null;
    },
}));

const entry = (over: Partial<ChangelogEntry> = {}): ChangelogEntry => ({
    id: 1,
    version: "1.1.0",
    title: "Estimates",
    description: "Say how long a task will take.",
    body: "<p>Details</p>",
    publishedAt: "2026-02-01T09:00:00+00:00",
    seen: false,
    ...over,
});

const Opener: React.FC = () => {
    const { available, openChangelog } = useChangelog();

    return (
        <button type="button" onClick={openChangelog}>
            {available ? "available" : "absent"}
        </button>
    );
};

const mount = () => render(
    <ChangelogProvider>
        <Opener />
    </ChangelogProvider>,
);

beforeEach(() => {
    provided = { changelogAdapter: adapter, leftoversLoaded: true };
    leftoversOpen = false;
    onboarding = false;
    lastProps = {};
    adapter.list.mockReset();
    adapter.markRead.mockReset();
    adapter.list.mockResolvedValue([]);
    adapter.markRead.mockResolvedValue(undefined);
});

describe("coming back to the board", () => {
    it("shows what shipped while the user was away", async () => {
        adapter.list.mockResolvedValue([entry({ seen: false })]);

        mount();

        await waitFor(() => expect(screen.getByTestId("dialog").textContent).toBe("new"));
    });

    it("stays out of the way when everything has already been seen", async () => {
        adapter.list.mockResolvedValue([entry({ seen: true })]);

        mount();

        await waitFor(() => expect(adapter.list).toHaveBeenCalled());
        expect(screen.queryByTestId("dialog")).toBeNull();
    });

    it("stays out of the way when there are no release notes at all", async () => {
        adapter.list.mockResolvedValue([]);

        mount();

        await waitFor(() => expect(adapter.list).toHaveBeenCalled());
        expect(screen.queryByTestId("dialog")).toBeNull();
    });

    it("says nothing when the board has no backend to ask", async () => {
        // A demo or local-only board. No adapter, no request, and no changelog link in Settings.
        provided = { changelogAdapter: null, leftoversLoaded: true };

        mount();

        expect(screen.getByText("absent")).toBeTruthy();
        expect(adapter.list).not.toHaveBeenCalled();
    });

    it("keeps quiet when the notes cannot be fetched", async () => {
        // Offline, or a backend with the changelog feature switched off. Nothing the user could
        // act on, so nothing worth interrupting them for.
        adapter.list.mockRejectedValue(new Error("offline"));

        mount();

        await waitFor(() => expect(lastProps.failed).toBe(true));
        expect(screen.queryByTestId("dialog")).toBeNull();
    });
});

describe("giving way to the leftover review", () => {
    it("holds the notes back while the review is up", async () => {
        // Two stacked dialogs on the first Monday after a deploy is not a greeting.
        leftoversOpen = true;
        adapter.list.mockResolvedValue([entry({ seen: false })]);

        mount();

        await waitFor(() => expect(adapter.list).toHaveBeenCalled());
        expect(screen.queryByTestId("dialog")).toBeNull();
    });

    it("waits until the review has decided whether it wants the load", async () => {
        // `leftoversLoaded` false means the list has not landed yet, so the review has not yet
        // had the chance to let itself in. Announcing now would be winning a race rather than
        // taking a turn.
        provided = { changelogAdapter: adapter, leftoversLoaded: false };
        adapter.list.mockResolvedValue([entry({ seen: false })]);

        mount();

        await waitFor(() => expect(adapter.list).toHaveBeenCalled());
        expect(screen.queryByTestId("dialog")).toBeNull();
    });

    it("takes its turn once the review is closed", async () => {
        leftoversOpen = true;
        adapter.list.mockResolvedValue([entry({ seen: false })]);

        const view = mount();
        await waitFor(() => expect(adapter.list).toHaveBeenCalled());

        leftoversOpen = false;
        view.rerender(
            <ChangelogProvider>
                <Opener />
            </ChangelogProvider>,
        );

        await waitFor(() => expect(screen.getByTestId("dialog").textContent).toBe("new"));
    });
});

describe("giving way to the first-run tour", () => {
    it("holds the notes back while the tour has the floor", async () => {
        // Somebody being shown the board for the first time has no absence to be caught up on.
        onboarding = true;
        adapter.list.mockResolvedValue([entry({ seen: false })]);

        mount();

        await waitFor(() => expect(adapter.list).toHaveBeenCalled());
        expect(screen.queryByTestId("dialog")).toBeNull();
    });
});

describe("closing it", () => {
    it("records every published entry as seen, not only the ones on screen", async () => {
        adapter.list.mockResolvedValue([entry({ id: 2, seen: false }), entry({ id: 1, seen: true })]);

        mount();
        await waitFor(() => expect(screen.getByTestId("dialog")).toBeTruthy());

        await act(async () => {
            (lastProps.onClose as () => void)();
        });

        expect(adapter.markRead).toHaveBeenCalledTimes(1);
        expect(screen.queryByTestId("dialog")).toBeNull();
    });

    it("does not show the same entries again in the same session", async () => {
        adapter.list.mockResolvedValue([entry({ seen: false })]);

        mount();
        await waitFor(() => expect(screen.getByTestId("dialog")).toBeTruthy());

        await act(async () => {
            (lastProps.onClose as () => void)();
        });

        expect((lastProps.entries as ChangelogEntry[]).every((one) => one.seen)).toBe(true);
    });

    it("asks for nothing when there was nothing unseen to acknowledge", async () => {
        // Opening the history deliberately, having already read everything in it.
        adapter.list.mockResolvedValue([entry({ seen: true })]);

        mount();
        await waitFor(() => expect(adapter.list).toHaveBeenCalled());

        await act(async () => {
            (lastProps.onClose as () => void)();
        });

        expect(adapter.markRead).not.toHaveBeenCalled();
    });

    it("closes even when the acknowledgement fails", async () => {
        // The worst case is the same dialog on the next load, which is the right failure.
        adapter.list.mockResolvedValue([entry({ seen: false })]);
        adapter.markRead.mockRejectedValue(new Error("offline"));

        mount();
        await waitFor(() => expect(screen.getByTestId("dialog")).toBeTruthy());

        await act(async () => {
            (lastProps.onClose as () => void)();
        });

        expect(screen.queryByTestId("dialog")).toBeNull();
    });
});

describe("asking for it by name", () => {
    it("opens the full history", async () => {
        adapter.list.mockResolvedValue([entry({ seen: true })]);

        mount();
        await waitFor(() => expect(adapter.list).toHaveBeenCalled());

        act(() => {
            screen.getByText("available").click();
        });

        expect(screen.getByTestId("dialog").textContent).toBe("all");
    });

    it("is available whenever the board has a backend, online or not", async () => {
        adapter.list.mockRejectedValue(new Error("offline"));

        mount();

        await waitFor(() => expect(lastProps.failed).toBe(true));
        expect(screen.getByText("available")).toBeTruthy();
    });
});
