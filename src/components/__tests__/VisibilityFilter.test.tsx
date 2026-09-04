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
});
