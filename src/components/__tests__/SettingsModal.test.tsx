import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import SettingsModal from "../SettingsModal";
import { DEFAULT_SETTINGS } from "../../utils/settings";
import Category from "../../data/category";

jest.mock("react-i18next", () => ({
    useTranslation: () => ({ t: (key: string) => key }),
}));

const updateSettings = jest.fn();
const settings = { ...DEFAULT_SETTINGS };
const overlay = { isOpen: true, open: () => { }, close: () => { } };

jest.mock("../../contexts/SettingsContext", () => ({
    useSettings: () => ({ settings, updateSettings, settingsOverlay: overlay }),
}));

const data = { categories: [] as Category[] };

jest.mock("../../contexts/DataContext", () => ({ useData: () => data }));

beforeEach(() => {
    jest.clearAllMocks();
    Object.assign(settings, DEFAULT_SETTINGS);
    settings.dayCapacityCategories = [];
    data.categories = [new Category({ id: "work", name: "Work", color: "sky" })];
});

describe("the settings dialog", () => {
    it("splits its controls across three tabs", () => {
        render(<SettingsModal />);

        expect(screen.getByText("settings.tab_appearance")).toBeTruthy();
        expect(screen.getByText("settings.tab_week")).toBeTruthy();
        expect(screen.getByText("settings.tab_limits")).toBeTruthy();
    });

    it("has no save button — every change is written as it is made", () => {
        // The dialog can be closed, or a tab left, at any moment without losing anything. A save
        // button would imply the opposite, and there is nothing for it to do.
        render(<SettingsModal />);

        expect(screen.queryByText("actions.save")).toBeNull();
    });

    it("applies a change immediately", () => {
        render(<SettingsModal />);

        fireEvent.click(screen.getByText("theme.dark"));

        expect(updateSettings).toHaveBeenCalledWith({ theme: "dark" });
    });

    it("writes a working-day change the moment it is toggled", () => {
        render(<SettingsModal />);

        // The day buttons are labelled by the locale, not by a translation key — Monday is
        // worked by default, so this turns it off.
        fireEvent.click(screen.getByLabelText("Monday"));

        expect(updateSettings).toHaveBeenCalledWith({ workingDays: [2, 3, 4, 5] });
    });

    it("offers the counted categories only once there is a limit to count towards", () => {
        render(<SettingsModal />);
        expect(screen.queryByText("settings.countedCategories")).toBeNull();

        settings.dayCapacity = 6;
        render(<SettingsModal />);

        expect(screen.getAllByText("settings.countedCategories").length).toBeGreaterThan(0);
    });
});
