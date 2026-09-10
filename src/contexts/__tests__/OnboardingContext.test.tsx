import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { act, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { OnboardingProvider, useOnboarding } from "../OnboardingContext";
import { TOUR_VERSION } from "../../utils/tour";

jest.mock("react-i18next", () => ({
    useTranslation: () => ({ t: (key: string) => key }),
}));

const updateSettings = jest.fn<(patch: Record<string, unknown>) => void>();

let settings = { onboardingVersion: 0 };
let settingsLoaded = true;
let settingsPersisted = true;
let vertical = false;

jest.mock("../SettingsContext", () => ({
    useSettings: () => ({ settings, updateSettings, settingsLoaded, settingsPersisted }),
}));

jest.mock("../../utils/layout", () => ({ useVerticalLayout: () => vertical }));

/*
 * `whenReady` polls the DOM for up to ten seconds, which is right in a browser and useless in a
 * test. Only that one function is replaced — the step lists and `presentSteps` stay real, so what
 * the tour is handed is still the thing the board would hand it.
 */
let boardDraws = true;

jest.mock("../../utils/tour", () => ({
    ...(jest.requireActual("../../utils/tour") as object),
    whenReady: () => Promise.resolve(boardDraws),
}));

/*
 * driver.js, standing in for itself.
 *
 * What is under test is when the tour is offered, which steps it is handed, and what closing it
 * records — none of which needs a real spotlight. The library's own positioning is exercised in
 * the browser suite.
 */
const drive = jest.fn();
const destroy = jest.fn();
let lastConfig: any = null;

jest.mock("driver.js", () => ({
    driver: (config: any) => {
        lastConfig = config;

        return { drive, destroy, isActive: () => true };
    },
}));

/** The board's own markup, as far as the tour is concerned. */
const drawBoard = () => {
    document.body.innerHTML = ["week", "days", "buckets", "leftovers", "settings", "day", "menu"]
        .map((name) => `<div data-tour="${name}"></div>`)
        .join("");
};

const Probe: React.FC = () => {
    const { blocking, startTour } = useOnboarding();

    return (
        <button type="button" onClick={startTour}>
            {blocking ? "blocking" : "clear"}
        </button>
    );
};

const mount = () => render(
    <OnboardingProvider>
        <Probe />
    </OnboardingProvider>,
);

/** The user ending the tour — Done, the close button, Escape, or a click on the overlay. */
const close = async () => {
    await act(async () => {
        lastConfig.onDestroyStarted(undefined, {}, {});
    });
};

beforeEach(() => {
    settings = { onboardingVersion: 0 };
    settingsLoaded = true;
    settingsPersisted = true;
    vertical = false;
    lastConfig = null;
    boardDraws = true;
    updateSettings.mockClear();
    drive.mockClear();
    destroy.mockClear();
    drawBoard();
});

describe("who gets it", () => {
    it("runs for an account that has finished no tour", async () => {
        mount();

        await waitFor(() => expect(drive).toHaveBeenCalled());
    });

    it("leaves an account that has already finished this one alone", async () => {
        settings = { onboardingVersion: TOUR_VERSION };

        mount();

        await waitFor(() => expect(screen.getByText("clear")).toBeTruthy());
        expect(drive).not.toHaveBeenCalled();
    });

    it("leaves a demo visitor alone", async () => {
        // No account to remember it against, and `DemoModal` is already in front of them.
        settingsPersisted = false;

        mount();

        await waitFor(() => expect(screen.getByText("clear")).toBeTruthy());
        expect(drive).not.toHaveBeenCalled();
    });

    it("runs again for somebody who only ever saw an older tour", async () => {
        // The whole reason this is a number rather than a flag.
        settings = { onboardingVersion: TOUR_VERSION - 1 };

        mount();

        await waitFor(() => expect(drive).toHaveBeenCalled());
    });

    it("waits for the account's settings rather than the browser's", async () => {
        /*
         * The board renders from localStorage immediately, so a fresh browser on an established
         * account reads `onboardingVersion: 0` for as long as the request is in flight. Firing on
         * that shows the tour to somebody who finished it months ago.
         */
        settingsLoaded = false;

        mount();

        // It holds the floor while it decides, rather than deciding and then finding the
        // review already open.
        expect(screen.getByText("blocking")).toBeTruthy();
        expect(drive).not.toHaveBeenCalled();
    });
});

describe("which tour", () => {
    it("gives the wide board its five steps", async () => {
        mount();

        await waitFor(() => expect(drive).toHaveBeenCalled());
        expect(lastConfig.steps.map((s: any) => s.element)).toEqual([
            '[data-tour="week"]',
            '[data-tour="days"]',
            '[data-tour="buckets"]',
            '[data-tour="leftovers"]',
            '[data-tour="settings"]',
        ]);
    });

    it("gives the phone its own", async () => {
        vertical = true;

        mount();

        await waitFor(() => expect(drive).toHaveBeenCalled());
        expect(lastConfig.steps.map((s: any) => s.element)).toEqual([
            '[data-tour="day"]',
            '[data-tour="days"]',
            '[data-tour="menu"]',
        ]);
    });

    it("skips a step whose control this account does not have", async () => {
        // The review button is conditional. A spotlight on nothing is worse than a missing step.
        document.querySelector('[data-tour="leftovers"]')!.remove();

        mount();

        await waitFor(() => expect(drive).toHaveBeenCalled());
        expect(lastConfig.steps.map((s: any) => s.element)).not.toContain('[data-tour="leftovers"]');
    });

    it("does not run at all against a board that drew none of it", async () => {
        document.body.innerHTML = "";

        mount();

        await waitFor(() => expect(screen.getByText("clear")).toBeTruthy());
        expect(drive).not.toHaveBeenCalled();
    });

    it("gives up, without recording anything, on a board that never draws", async () => {
        // Ten seconds of an empty board is a bigger problem than onboarding. Nothing is written,
        // so the next load offers the tour again rather than counting this as having seen it.
        boardDraws = false;

        mount();

        await waitFor(() => expect(screen.getByText("clear")).toBeTruthy());
        expect(drive).not.toHaveBeenCalled();
        expect(updateSettings).not.toHaveBeenCalled();
    });
});

describe("finishing it", () => {
    it("records the version so it is not offered again", async () => {
        mount();
        await waitFor(() => expect(drive).toHaveBeenCalled());

        await close();

        expect(updateSettings).toHaveBeenCalledWith({ onboardingVersion: TOUR_VERSION });
    });

    it("records it when the tour was skipped, not only when it was completed", async () => {
        // Somebody who closed it has decided. A tour that comes back tomorrow because it was not
        // completed is one people learn to dismiss on sight.
        mount();
        await waitFor(() => expect(drive).toHaveBeenCalled());

        await close();

        expect(updateSettings).toHaveBeenCalledTimes(1);
    });

    it("releases the board once it is over", async () => {
        mount();
        await waitFor(() => expect(screen.getByText("blocking")).toBeTruthy());

        await close();

        expect(screen.getByText("clear")).toBeTruthy();
    });
});

describe("a tablet turned over mid-tour", () => {
    it("ends the tour without recording it", async () => {
        // The board genuinely remounts, so every element the tour points at goes away. Next load
        // offers it again, against whichever layout the device is in by then.
        const view = mount();
        await waitFor(() => expect(drive).toHaveBeenCalled());

        vertical = true;
        await act(async () => {
            view.rerender(<OnboardingProvider><Probe /></OnboardingProvider>);
        });

        // Torn down through `destroy()`, which is the path that deliberately does not run
        // `onDestroyStarted` — so nothing is recorded and the next load offers it again.
        expect(destroy).toHaveBeenCalled();
        expect(updateSettings).not.toHaveBeenCalled();
    });
});

describe("holding the floor", () => {
    it("blocks from the moment it decides, not from the moment it appears", async () => {
        /*
         * The review and the release notes both let themselves in on load. If this only claimed
         * the floor once the popover was up, it would be racing a local IndexedDB read with a
         * network response — and losing.
         */
        boardDraws = false;

        mount();

        expect(screen.getByText("blocking")).toBeTruthy();

        // Let the give-up path settle rather than leaving a state update outside `act`.
        await waitFor(() => expect(screen.getByText("clear")).toBeTruthy());
    });

    it("does not block an account that was never going to see it", async () => {
        settings = { onboardingVersion: TOUR_VERSION };

        mount();

        await waitFor(() => expect(screen.getByText("clear")).toBeTruthy());
    });
});

describe("asking for it again", () => {
    it("replays for somebody who has already finished it", async () => {
        settings = { onboardingVersion: TOUR_VERSION };

        mount();
        await waitFor(() => expect(screen.getByText("clear")).toBeTruthy());

        await act(async () => {
            screen.getByText("clear").click();
        });

        await waitFor(() => expect(drive).toHaveBeenCalled());
    });
});
