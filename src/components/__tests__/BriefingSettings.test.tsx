import { beforeEach, describe, expect, it } from "@jest/globals";
import { act, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import BriefingSettings from "../BriefingSettings";
import { DEFAULT_SETTINGS } from "../../utils/settings";
import { getDayJs } from "../../utils/dayjs";
import type { PushSupport } from "../../utils/push";

jest.mock("react-i18next", () => ({
    useTranslation: () => ({ t: (key: string) => key }),
}));

const settings = { ...DEFAULT_SETTINGS };
const updateSettings = jest.fn();
const account = { subscribed: true };
const data = { pushAdapter: { subscribe: jest.fn(), unsubscribe: jest.fn() } as unknown };
const push = {
    support: "ready" as PushSupport,
    subscribed: false,
    outcome: "subscribed" as "subscribed" | "denied" | "unsupported" | "throws",
    brave: false,
};

jest.mock("../../contexts/SettingsContext", () => ({
    useSettings: () => ({ settings, updateSettings }),
}));
jest.mock("../../contexts/AccountContext", () => ({ useAccount: () => account }));
jest.mock("../../contexts/DataContext", () => ({ useData: () => data }));
jest.mock("../../utils/env", () => ({ getEnvConfig: () => ({ webPushKey: "BKey" }) }));
jest.mock("../../utils/push", () => ({
    pushSupport: () => push.support,
    isSubscribed: async () => push.subscribed,
    subscribeThisDevice: jest.fn(async () => {
        if (push.outcome === "throws") {
            throw new DOMException("Registration failed - push service error", "AbortError");
        }

        return push.outcome;
    }),
    isBrave: () => push.brave,
    browserTimezone: () => "Europe/Paris",
}));

const nameOf = (day: number, format: string) =>
    getDayJs()().startOf("isoWeek").add(day - 1, "day").format(format);

const renderPanel = async () => {
    render(<BriefingSettings nameOf={nameOf} />);
    // Let the "is this device subscribed?" check settle.
    await act(async () => undefined);
};

beforeEach(() => {
    jest.clearAllMocks();
    Object.assign(settings, DEFAULT_SETTINGS);
    account.subscribed = true;
    data.pushAdapter = { subscribe: jest.fn(), unsubscribe: jest.fn() };
    push.support = "ready";
    push.subscribed = false;
    push.outcome = "subscribed";
    push.brave = false;
});

describe("the morning briefing settings", () => {
    it("are Pro: shown, but not switchable without it", async () => {
        account.subscribed = false;
        await renderPanel();

        expect(screen.getByText("settings.briefing.pro")).toBeTruthy();
        expect((screen.getByText("settings.briefing.on") as HTMLButtonElement).disabled).toBe(true);
    });

    it("subscribe this device and send where the user is when switched on", async () => {
        await renderPanel();

        await act(async () => {
            fireEvent.click(screen.getByText("settings.briefing.on"));
        });

        expect(updateSettings).toHaveBeenCalledWith({ briefingEnabled: true, timezone: "Europe/Paris" });
    });

    it("stay off, and say why, when the browser refuses", async () => {
        push.outcome = "denied";
        await renderPanel();

        await act(async () => {
            fireEvent.click(screen.getByText("settings.briefing.on"));
        });

        expect(updateSettings).not.toHaveBeenCalled();
        expect(screen.getByText("settings.briefing.denied")).toBeTruthy();
    });

    it("tell an iPhone in a browser tab to install the app first", async () => {
        push.support = "install";
        await renderPanel();

        expect(screen.getByText("settings.briefing.install")).toBeTruthy();
    });

    it("offer to receive it here when it was switched on elsewhere", async () => {
        settings.briefingEnabled = true;
        await renderPanel();

        expect(screen.getByText("settings.briefing.receive_here")).toBeTruthy();
    });

    it("show the days, the time and empty days only once on, and change the days", async () => {
        await renderPanel();
        expect(screen.queryByText("settings.briefing.days")).toBeNull();

        settings.briefingEnabled = true;
        push.subscribed = true;
        await renderPanel();

        expect(screen.getByText("settings.briefing.here")).toBeTruthy();
        expect(screen.getByText("settings.briefing.empty")).toBeTruthy();

        fireEvent.click(screen.getByLabelText(nameOf(6, "dddd")));
        expect(updateSettings).toHaveBeenCalledWith({ briefingDays: [1, 2, 3, 4, 5, 6] });
    });

    it("write the time the way the board's language does", async () => {
        settings.briefingEnabled = true;
        settings.language = "fr";
        await renderPanel();

        expect(screen.getAllByText("8:00").length).toBeGreaterThan(0);
        expect(screen.queryByText("LT")).toBeNull();
    });

    it("name Brave's own switch when Brave refuses the subscription", async () => {
        jest.spyOn(console, "error").mockImplementation(() => undefined);
        push.outcome = "throws";
        push.brave = true;
        await renderPanel();

        await act(async () => {
            fireEvent.click(screen.getByText("settings.briefing.on"));
        });

        expect(screen.getByText("settings.briefing.brave")).toBeTruthy();
        expect(updateSettings).not.toHaveBeenCalled();
    });
});
