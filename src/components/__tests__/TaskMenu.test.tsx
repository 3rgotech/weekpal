import { describe, expect, it } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import React from "react";
import TaskMenu from "../TaskMenu";
import { WeeklyTask } from "../../data/task";
import { DEFAULT_SETTINGS } from "../../utils/settings";
import { getDayJs } from "../../utils/dayjs";
import { fakeCalendar } from "../../test-support/calendar";

jest.mock("react-i18next", () => ({
    useTranslation: () => ({ t: (key: string) => key }),
}));

const now = getDayJs()();
const settings = { ...DEFAULT_SETTINGS };
const data = { relocateTask: jest.fn(), duplicateTask: jest.fn(), deleteTask: jest.fn() };

jest.mock("../../contexts/DataContext", () => ({ useData: () => data }));
jest.mock("../../contexts/SettingsContext", () => ({
    useSettings: () => ({ settings, updateSettings: jest.fn() }),
}));
jest.mock("../../contexts/CalendarContext", () => ({
    useCalendar: () => fakeCalendar(now, settings),
}));

const task = new WeeklyTask({ title: "Ring the plumber", weekCode: now.format("GGGG[w]WW"), dayOfWeek: "3" });

describe("the task menu's trigger", () => {
    it("says Actions where it is labelled, as in the edit modal", () => {
        render(<TaskMenu task={task} labelled />);

        expect(screen.getByRole("button", { name: "task.menu.actions" })).toBeVisible();
    });

    it("is a bare ⋮ otherwise, named for screen readers", () => {
        render(<TaskMenu task={task} />);

        expect(screen.getByRole("button", { name: "task.menu.open" })).toBeVisible();
        expect(screen.queryByText("task.menu.actions")).not.toBeInTheDocument();
    });
});
