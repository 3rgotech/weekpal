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

const data = { categories: [] as Category[], reloadBoard: jest.fn(async () => undefined) };

jest.mock("../../contexts/DataContext", () => ({ useData: () => data }));

// The import panel reaches for an adapter, and the factory reads `import.meta.env`, which jest
// cannot transform. Nulled here: the panel then renders its "needs an account" line.
jest.mock("../../adapter", () => ({
    __esModule: true,
    default: { createAdapters: () => ({ importAdapter: null }) },
}));

// Same reason: `env.ts` reads `import.meta`. The Pro page address is the one value used here.
let proUrl: string | undefined = "https://weekpal.test/pro";
jest.mock("../../utils/env", () => ({ getEnvConfig: () => ({ proUrl }) }));

beforeEach(() => {
    jest.clearAllMocks();
    proUrl = "https://weekpal.test/pro";
    Object.assign(settings, DEFAULT_SETTINGS);
    settings.dayCapacityCategories = [];
    data.categories = [new Category({ id: "work", name: "Work", color: "sky" })];
});

describe("the settings dialog", () => {
    it("splits its controls across tabs", () => {
        render(<SettingsModal />);

        expect(screen.getByText("settings.tab_appearance")).toBeTruthy();
        expect(screen.getByText("settings.tab_week")).toBeTruthy();
        expect(screen.getByText("settings.tab_limits")).toBeTruthy();
        expect(screen.getByText("settings.tab_import")).toBeTruthy();
    });

    it("carries one line pointing at the Pro page, and no more", () => {
        render(<SettingsModal />);

        const links = screen.getAllByRole("link", { name: "settings.pro_line" });
        expect(links).toHaveLength(1);
        expect(links[0]).toHaveAttribute("href", "https://weekpal.test/pro");
    });

    it("drops the Pro line when there is no Pro page to point at", () => {
        proUrl = undefined;
        render(<SettingsModal />);

        expect(screen.queryByRole("link", { name: "settings.pro_line" })).toBeNull();
    });

    it("offers the named layouts, and says they are Pro to an account without it", () => {
        render(<SettingsModal />);
        fireEvent.click(screen.getByText("settings.tab_week"));

        expect(screen.getAllByText("settings.layout").length).toBeGreaterThan(0);
        expect(screen.getByText("settings.layoutPro")).toBeTruthy();
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
