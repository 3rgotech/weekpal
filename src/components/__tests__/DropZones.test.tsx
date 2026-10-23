import { describe, expect, it } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import React from "react";
import { DndContext } from "@dnd-kit/core";
import DropZones from "../DropZones";
import { SomedayTask, WeeklyTask } from "../../data/task";
import { DEFAULT_SETTINGS } from "../../utils/settings";
import { getDayJs } from "../../utils/dayjs";
import { fakeCalendar } from "../../test-support/calendar";

jest.mock("react-i18next", () => ({
    useTranslation: () => ({ t: (key: string) => key }),
}));

const now = getDayJs()();
const settings = { ...DEFAULT_SETTINGS };

jest.mock("../../contexts/SettingsContext", () => ({
    useSettings: () => ({ settings, updateSettings: jest.fn() }),
}));
jest.mock("../../contexts/CalendarContext", () => ({
    useCalendar: () => fakeCalendar(now, settings),
}));

const inBoard = (node: React.ReactNode) => render(<DndContext>{node}</DndContext>);

describe("the drop zones", () => {
    it("are not there while nothing is being dragged", () => {
        inBoard(<DropZones task={null} />);

        expect(screen.queryByText("task.menu.delete")).not.toBeInTheDocument();
    });

    it("offer next Monday, the same day next week and delete for a task on a day", () => {
        inBoard(<DropZones task={new WeeklyTask({ title: "Ring the plumber", weekCode: now.format("GGGG[w]WW"), dayOfWeek: "3" })} />);

        expect(screen.getByText("task.menu.next_monday")).toBeInTheDocument();
        expect(screen.getByText("task.menu.next_week")).toBeInTheDocument();
        expect(screen.getByText("task.menu.delete")).toBeInTheDocument();
        // Each move says where it lands, as the menu does.
        expect(screen.getByText(now.add(1, "week").startOf("isoWeek").format("D MMM"))).toBeInTheDocument();
    });

    it("offer one zone, not two, when next Monday is the same day next week", () => {
        inBoard(<DropZones task={new WeeklyTask({ title: "Ring the plumber", weekCode: now.format("GGGG[w]WW"), dayOfWeek: "1" })} />);

        expect(screen.getByText("task.menu.next_monday")).toBeInTheDocument();
        expect(screen.queryByText("task.menu.next_week")).not.toBeInTheDocument();
    });

    it("leave out the same day next week for a task with no week to advance", () => {
        inBoard(<DropZones task={new SomedayTask({ title: "Flip mattress" })} />);

        expect(screen.getByText("task.menu.next_monday")).toBeInTheDocument();
        expect(screen.queryByText("task.menu.next_week")).not.toBeInTheDocument();
        expect(screen.getByText("task.menu.delete")).toBeInTheDocument();
    });
});
