import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import VisibilityFilter from "../VisibilityFilter";
import { DEFAULT_SETTINGS } from "../../utils/settings";

jest.mock("react-i18next", () => ({
    useTranslation: () => ({ t: (key: string) => key }),
}));

const settings = { ...DEFAULT_SETTINGS };
const updateSettings = jest.fn();

jest.mock("../../contexts/SettingsContext", () => ({
    useSettings: () => ({ settings, updateSettings }),
}));

beforeEach(() => {
    jest.clearAllMocks();
    settings.showCompletedTasks = true;
    settings.showEvents = true;
    settings.expandEvents = false;
});

describe("the visibility menu on the wide board", () => {
    it("hides completed tasks when they are showing", () => {
        // The item carried no action at all: it drew a checkmark and left the setting alone,
        // so the wide board's only completed-tasks toggle did nothing.
        render(<VisibilityFilter />);
        fireEvent.click(screen.getByText("visibility.hide_completed_tasks"));

        expect(updateSettings).toHaveBeenCalledWith({ showCompletedTasks: false });
    });

    it("shows them again when they are hidden", () => {
        settings.showCompletedTasks = false;

        render(<VisibilityFilter />);
        fireEvent.click(screen.getByText("visibility.show_completed_tasks"));

        expect(updateSettings).toHaveBeenCalledWith({ showCompletedTasks: true });
    });

    it("names the action rather than the state", () => {
        // "Hide completed tasks" is a button. "Completed tasks: shown" is a status line
        // pretending to be one, and you cannot tell what pressing it will do.
        render(<VisibilityFilter />);

        expect(screen.queryByText("visibility.hide_completed_tasks")).toBeTruthy();
        expect(screen.queryByText("visibility.show_completed_tasks")).toBeNull();
    });
});

describe("the calendar", () => {
    it("hides the events when they are showing", () => {
        // `showEvents` had been declared in the settings type and read by nothing since the board
        // was written: the setting existed, and switching it did nothing at all.
        render(<VisibilityFilter />);
        fireEvent.click(screen.getByText("visibility.hide_events"));

        expect(updateSettings).toHaveBeenCalledWith({ showEvents: false });
    });

    it("shows them again when they are hidden", () => {
        settings.showEvents = false;

        render(<VisibilityFilter />);
        fireEvent.click(screen.getByText("visibility.show_events"));

        expect(updateSettings).toHaveBeenCalledWith({ showEvents: true });
    });
});

describe("expanding the events", () => {
    it("opens them out", () => {
        render(<VisibilityFilter />);
        fireEvent.click(screen.getByText("visibility.expand_events"));

        expect(updateSettings).toHaveBeenCalledWith({ expandEvents: true });
    });

    it("closes them again", () => {
        settings.expandEvents = true;

        render(<VisibilityFilter />);
        fireEvent.click(screen.getByText("visibility.collapse_events"));

        expect(updateSettings).toHaveBeenCalledWith({ expandEvents: false });
    });

    it("is not offered while the calendar is switched off", () => {
        // Offering to open out a calendar that is hidden is offering to do nothing, and the user
        // cannot tell which of the two switches failed.
        settings.showEvents = false;

        render(<VisibilityFilter />);

        expect(screen.queryByText("visibility.expand_events")).toBeNull();
        expect(screen.queryByText("visibility.collapse_events")).toBeNull();
    });
});
