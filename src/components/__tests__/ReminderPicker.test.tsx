import { beforeEach, describe, expect, it } from "@jest/globals";
import { act, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import ReminderPicker from "../ReminderPicker";
import { DEFAULT_SETTINGS } from "../../utils/settings";
import type { PushSupport } from "../../utils/push";

jest.mock("react-i18next", () => ({
    useTranslation: () => ({ t: (key: string) => key }),
}));

const settings = { ...DEFAULT_SETTINGS };
const updateSettings = jest.fn();
const account = { subscribed: true };
const data = { pushAdapter: { subscribe: jest.fn(), unsubscribe: jest.fn() } as unknown };
const push = { support: "ready" as PushSupport, subscribed: true };

jest.mock("../../contexts/SettingsContext", () => ({
    useSettings: () => ({ settings, updateSettings }),
}));
jest.mock("../../contexts/AccountContext", () => ({ useAccount: () => account }));
jest.mock("../../contexts/DataContext", () => ({ useData: () => data }));
jest.mock("../../utils/env", () => ({ getEnvConfig: () => ({ webPushKey: "BKey" }) }));
jest.mock("../../utils/push", () => ({
    pushSupport: () => push.support,
    isSubscribed: async () => push.subscribed,
    subscribeThisDevice: jest.fn(async () => "subscribed"),
    isBrave: () => false,
    browserTimezone: () => "Europe/Paris",
}));

const onChange = jest.fn();

const renderPicker = async (value: string | null, hasDay = true) => {
    render(<ReminderPicker value={value} onChange={onChange} hasDay={hasDay} />);
    // Let the "is this device subscribed?" check settle.
    await act(async () => undefined);
};

beforeEach(() => {
    jest.clearAllMocks();
    Object.assign(settings, DEFAULT_SETTINGS);
    account.subscribed = true;
    push.support = "ready";
    push.subscribed = true;
});

describe("the reminder picker", () => {
    it("is Pro: shown, but disabled without it", async () => {
        account.subscribed = false;
        await renderPicker("14:30");

        expect(screen.getByText("task.reminder.pro")).toBeTruthy();
        expect(screen.queryByLabelText("task.reminder.clear")).toBeNull();
    });

    it("needs the task to be on a day", async () => {
        await renderPicker(null, false);

        expect(screen.getByText("task.reminder.needs_day")).toBeTruthy();
    });

    it("takes the reminder off", async () => {
        await renderPicker("14:30");

        fireEvent.click(screen.getByLabelText("task.reminder.clear"));

        expect(onChange).toHaveBeenCalledWith(null);
    });

    it("offers to receive it on a device that does not yet", async () => {
        push.subscribed = false;
        await renderPicker("14:30");

        expect(screen.getByText("task.reminder.not_here")).toBeTruthy();
        expect(screen.getByText("settings.briefing.receive_here")).toBeTruthy();
    });

    it("says nothing about this device until a reminder is set", async () => {
        push.subscribed = false;
        await renderPicker(null);

        expect(screen.queryByText("task.reminder.not_here")).toBeNull();
    });

    it("says why a browser that cannot receive it will not ring", async () => {
        push.support = "denied";
        await renderPicker("14:30");

        expect(screen.getByText("settings.briefing.denied")).toBeTruthy();
    });

    it("shows the time the way the board's language writes it", async () => {
        settings.language = "en";
        await renderPicker("14:30");

        expect(screen.getAllByText("2:30 PM").length).toBeGreaterThan(0);
    });
});
