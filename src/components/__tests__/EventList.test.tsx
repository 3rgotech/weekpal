import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import React from "react";
import EventList from "../EventList";
import Event from "../../data/event";
import { DEFAULT_SETTINGS } from "../../utils/settings";

jest.mock("react-i18next", () => ({
    useTranslation: () => ({ t: (key: string) => key }),
}));

const settings = { ...DEFAULT_SETTINGS };

jest.mock("../../contexts/SettingsContext", () => ({ useSettings: () => ({ settings }) }));
jest.mock("../../contexts/DataContext", () => ({ useData: () => ({ categories: [] }) }));

const event = (over: Record<string, unknown> = {}) => new Event({
    id: "evt-1",
    title: "Sprint review",
    weekCode: "2026w37",
    dayOfWeek: "2",
    startHour: "14:00",
    endHour: "15:00",
    ...over,
});

const detailed = () => event({
    organiser: "Priya Raman",
    location: "Room 4",
    description: "Bring the numbers for the quarter",
});

beforeEach(() => {
    settings.expandEvents = false;
});

describe("collapsed", () => {
    it("shows the hours and the title, and nothing else", () => {
        // The default, and the board's behaviour before any of this existed: a day column is
        // narrow, and an event is a fixed point to plan around rather than the thing being
        // planned.
        render(<EventList events={[detailed()]} />);

        expect(screen.queryByText("Sprint review")).toBeTruthy();
        expect(screen.queryByText("14:00 - 15:00")).toBeTruthy();
        expect(screen.queryByText("Priya Raman")).toBeNull();
        expect(screen.queryByText("Room 4")).toBeNull();
    });

    it("renders an all-day event without a time range", () => {
        render(<EventList events={[event({ startHour: null, endHour: null })]} />);

        expect(screen.queryByText("Sprint review")).toBeTruthy();
        expect(screen.queryByText(/-/)).toBeNull();
    });
});

describe("expanded", () => {
    beforeEach(() => {
        settings.expandEvents = true;
    });

    it("says who called it, where it is, and what it is about", () => {
        render(<EventList events={[detailed()]} />);

        expect(screen.queryByText("Priya Raman")).toBeTruthy();
        expect(screen.queryByText("Room 4")).toBeTruthy();
        expect(screen.queryByText("Bring the numbers for the quarter")).toBeTruthy();
    });

    it("leaves out the lines the provider had nothing for", () => {
        // Absent, not blank. Three empty rows under a title is worse than a collapsed event.
        const { container } = render(<EventList events={[event({ location: "Room 4" })]} />);

        expect(screen.queryByText("Room 4")).toBeTruthy();
        expect(container.querySelectorAll("p").length).toBe(1);
    });

    it("looks exactly like a collapsed event when there is nothing to open out", () => {
        // An event that expands into what it already was reads as the switch having failed.
        const { container } = render(<EventList events={[event()]} />);

        expect(container.querySelectorAll("p").length).toBe(0);
        expect(screen.queryByText("Sprint review")).toBeTruthy();
    });

    it("keeps the description to two lines rather than to the whole column", () => {
        // The server already cut this to 400 characters; the clamp is what stops the 400 it did
        // send from pushing a Tuesday's tasks off the bottom.
        const { container } = render(<EventList events={[detailed()]} />);

        const description = [...container.querySelectorAll("p")]
            .find((node) => node.textContent?.startsWith("Bring the numbers"));

        expect(description?.className).toContain("line-clamp-2");
        // The full text stays reachable without expanding the row any further.
        expect(description?.getAttribute("title")).toBe("Bring the numbers for the quarter");
    });
});

describe("what an event knows about itself", () => {
    it("reads the three fields off an API row", () => {
        const parsed = Event.createFromApiData({
            id: "evt-9",
            title: "Review",
            week_number: "2026w37",
            day_of_week: 2,
            description: "Bring numbers",
            location: "Room 4",
            organiser: "Priya Raman",
        });

        expect(parsed?.description).toBe("Bring numbers");
        expect(parsed?.location).toBe("Room 4");
        expect(parsed?.organiser).toBe("Priya Raman");
        expect(parsed?.hasDetail).toBe(true);
    });

    it("reads a row with none of them as having no detail", () => {
        const parsed = Event.createFromApiData({
            id: "evt-9",
            title: "Focus block",
            week_number: "2026w37",
            day_of_week: 2,
        });

        expect(parsed?.hasDetail).toBe(false);
        expect(parsed?.location).toBeNull();
    });
});
