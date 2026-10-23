import { beforeEach, describe, expect, it } from "@jest/globals";
import { act, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { CalendarProvider, useCalendar } from "../CalendarContext";
import { DEFAULT_SETTINGS } from "../../utils/settings";
import { getDayJs } from "../../utils/dayjs";

const settings = { ...DEFAULT_SETTINGS };

jest.mock("../SettingsContext", () => ({
    useSettings: () => ({ settings, updateSettings: jest.fn() }),
}));

const Week: React.FC = () => {
    const { currentWeek, goToNextWeek, goToToday } = useCalendar();

    return (
        <>
            <span data-testid="week">{currentWeek}</span>
            <button onClick={goToNextWeek}>next</button>
            <button onClick={goToToday}>today</button>
        </>
    );
};

const thisWeek = getDayJs()().format("GGGG[w]WW");
const nextWeek = getDayJs()().add(1, "week").format("GGGG[w]WW");

/** What Back does in a browser: move the address, then tell the page. */
const back = () => act(() => {
    window.history.back();
});

beforeEach(() => {
    window.history.replaceState(null, "", "/app");
});

describe("the week in the address bar", () => {
    it("names the week on screen without adding a history entry for it", () => {
        const before = window.history.length;

        render(<CalendarProvider><Week /></CalendarProvider>);

        expect(window.location.hash).toBe(`#${thisWeek}`);
        expect(window.history.length).toBe(before);
    });

    it("adds an entry per week moved to, which Back walks through", async () => {
        render(<CalendarProvider><Week /></CalendarProvider>);

        fireEvent.click(screen.getByText("next"));
        expect(window.location.hash).toBe(`#${nextWeek}`);

        back();
        // jsdom delivers popstate asynchronously, as a browser does.
        await screen.findByText(thisWeek);
        expect(screen.getByTestId("week").textContent).toBe(thisWeek);
    });

    it("opens the week a link names", () => {
        window.history.replaceState(null, "", "/app#2026w05");

        render(<CalendarProvider><Week /></CalendarProvider>);

        expect(screen.getByTestId("week").textContent).toBe("2026w05");
    });

    it("follows an address edited by hand", () => {
        render(<CalendarProvider><Week /></CalendarProvider>);

        act(() => {
            window.history.replaceState(null, "", "/app#2026w05");
            window.dispatchEvent(new HashChangeEvent("hashchange"));
        });

        expect(screen.getByTestId("week").textContent).toBe("2026w05");
    });
});
