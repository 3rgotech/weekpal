import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import ChangelogModal from "../ChangelogModal";
import { ChangelogEntry } from "../../types";

jest.mock("react-i18next", () => ({
    useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock("../../contexts/SettingsContext", () => ({
    useSettings: () => ({ settings: { language: "en" } }),
}));

jest.mock("../../utils/dayjs", () => ({
    __esModule: true,
    default: () => () => ({ format: () => "1 February 2026" }),
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

const show = (props: Partial<React.ComponentProps<typeof ChangelogModal>> = {}) => render(
    <ChangelogModal
        isOpen
        view="new"
        entries={[entry()]}
        failed={false}
        onClose={() => { }}
        onShowEverything={() => { }}
        {...props}
    />,
);

describe("what's new", () => {
    it("shows only the entries the user has not seen", () => {
        // The whole point of the dialog: what shipped while they were away, and nothing else.
        show({
            entries: [
                entry({ id: 2, title: "New thing", seen: false }),
                entry({ id: 1, title: "Old thing", seen: true }),
            ],
        });

        expect(screen.queryByText("New thing")).toBeTruthy();
        expect(screen.queryByText("Old thing")).toBeNull();
    });

    it("shows everything in the full history, seen or not", () => {
        show({
            view: "all",
            entries: [
                entry({ id: 2, title: "New thing", seen: false }),
                entry({ id: 1, title: "Old thing", seen: true }),
            ],
        });

        expect(screen.queryByText("New thing")).toBeTruthy();
        expect(screen.queryByText("Old thing")).toBeTruthy();
    });

    it("offers the full history when there is more behind the new entries", () => {
        show({
            entries: [entry({ id: 2, seen: false }), entry({ id: 1, seen: true })],
        });

        expect(screen.queryByText("changelog.see_all")).toBeTruthy();
    });

    it("does not offer it when the new entries are the whole history", () => {
        // After a first release the two lists are the same three lines, and a button that opens
        // what is already on screen is a button that teaches people not to press buttons.
        show({ entries: [entry({ seen: false })] });

        expect(screen.queryByText("changelog.see_all")).toBeNull();
    });

    it("closes through the caller, which is what records the entries as seen", () => {
        const onClose = jest.fn();
        show({ onClose });

        fireEvent.click(screen.getByText("actions.close"));

        expect(onClose).toHaveBeenCalled();
    });
});

describe("one entry", () => {
    it("prints the version when there is one", () => {
        show({ entries: [entry({ version: "1.2.0" })] });

        expect(screen.queryByText("v1.2.0")).toBeTruthy();
    });

    it("says nothing where the version would be on an entry that predates 1.0.0", () => {
        // A version badge with nothing in it reads as a missing value rather than an old entry.
        const { container } = show({ entries: [entry({ version: null })] });

        expect(container.textContent).not.toContain("v");
        expect(screen.queryByText("1 February 2026")).toBeTruthy();
    });

    it("renders the body as the markup it was written as", () => {
        // Sanitised server-side by SafeHtml; a release note without a list is a worse note.
        const { container } = show({
            entries: [entry({ body: "<ul><li>Per task</li></ul>" })],
        });

        expect(container.querySelector(".changelog-body li")?.textContent).toBe("Per task");
    });

    it("survives an entry with no publication date", () => {
        const { container } = show({ entries: [entry({ publishedAt: null })] });

        expect(container.querySelector("time")).toBeNull();
    });
});

describe("nothing to show", () => {
    it("says the notes could not be loaded when the fetch failed", () => {
        show({ entries: [], failed: true });

        expect(screen.queryByText("changelog.unavailable")).toBeTruthy();
    });

    it("says there is nothing yet when the fetch simply came back empty", () => {
        show({ entries: [], failed: false });

        expect(screen.queryByText("changelog.empty")).toBeTruthy();
    });
});
