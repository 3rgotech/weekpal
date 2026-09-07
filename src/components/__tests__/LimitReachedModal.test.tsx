import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import LimitReachedModal from "../LimitReachedModal";
import { SomedayTask, WeeklyTask } from "../../data/task";
import { DEFAULT_SETTINGS } from "../../utils/settings";
import Category from "../../data/category";

jest.mock("react-i18next", () => ({
    useTranslation: () => ({ t: (key: string) => key }),
}));

const data = {
    allTasks: [] as unknown[],
    overLimitColumn: null as string | null,
    clearOverLimit: jest.fn(),
    relocateTask: jest.fn(async (_task: unknown, _to: unknown) => undefined),
    deleteTask: jest.fn((_task: unknown) => undefined),
    categories: [] as Category[],
};

const settings = { ...DEFAULT_SETTINGS };

jest.mock("../../contexts/DataContext", () => ({ useData: () => data }));
jest.mock("../../contexts/SettingsContext", () => ({ useSettings: () => ({ settings }) }));
jest.mock("../../contexts/CalendarContext", () => ({
    useCalendar: () => ({ currentWeek: "2026w35" }),
}));

const weekly = (title: string, dayOfWeek: string) =>
    new WeeklyTask({ id: title, title, weekCode: "2026w35", dayOfWeek });

beforeEach(() => {
    jest.clearAllMocks();
    Object.assign(settings, DEFAULT_SETTINGS);
    data.allTasks = [];
    data.overLimitColumn = null;
    data.categories = [];
});

describe("what a hard limit does when a column goes over", () => {
    it("stays shut while nothing is over", () => {
        render(<LimitReachedModal />);

        expect(screen.queryByText("limits.full")).toBeNull();
    });

    it("lists what is in the column that went over", () => {
        data.allTasks = [weekly("Email the builder", "3"), weekly("Book the van", "3")];
        data.overLimitColumn = "3";
        settings.dayCapacity = 1;

        render(<LimitReachedModal />);

        expect(screen.getByText("limits.full")).toBeTruthy();
        expect(screen.getByText("Email the builder")).toBeTruthy();
        expect(screen.getByText("Book the van")).toBeTruthy();
    });

    it("leaves completed tasks and project backlogs out of the choice", () => {
        data.allTasks = [
            weekly("Still to do", "3"),
            new WeeklyTask({ id: "done", title: "Done", weekCode: "2026w35", dayOfWeek: "3", completedAt: "2026-08-26T09:00:00Z" }),
            new SomedayTask({ id: "backlog", title: "Backlog", projectId: "01930000-0000-7000-8000-000000000001" }),
        ];
        data.overLimitColumn = "3";
        settings.dayCapacity = 1;

        render(<LimitReachedModal />);

        expect(screen.getByText("Still to do")).toBeTruthy();
        expect(screen.queryByText("Done")).toBeNull();
        expect(screen.queryByText("Backlog")).toBeNull();
    });

    it("makes room by moving a day's task out to the week, not out of it", () => {
        data.allTasks = [weekly("Email the builder", "3")];
        data.overLimitColumn = "3";
        settings.dayCapacity = 1;

        render(<LimitReachedModal />);
        fireEvent.click(screen.getByText("limits.to_this_week"));

        return waitFor(() => {
            expect(data.relocateTask).toHaveBeenCalledWith(
                expect.anything(),
                { weekCode: "2026w35", dayOfWeek: "0" },
            );
            expect(data.clearOverLimit).toHaveBeenCalled();
        });
    });

    it("promotes out of Some day, since nothing is further out", () => {
        data.allTasks = [new SomedayTask({ id: "cello", title: "Learn the cello" })];
        data.overLimitColumn = "someday";
        settings.somedayLimit = 1;

        render(<LimitReachedModal />);
        fireEvent.click(screen.getByText("limits.promote"));

        return waitFor(() => expect(data.relocateTask).toHaveBeenCalledWith(
            expect.anything(),
            { weekCode: "2026w35", dayOfWeek: "0" },
        ));
    });

    it("lets something go instead", () => {
        data.allTasks = [weekly("Email the builder", "3")];
        data.overLimitColumn = "3";
        settings.dayCapacity = 1;

        render(<LimitReachedModal />);
        fireEvent.click(screen.getByText("limits.delete"));

        return waitFor(() => {
            expect(data.deleteTask).toHaveBeenCalled();
            expect(data.clearOverLimit).toHaveBeenCalled();
        });
    });

    it("offers no way to dismiss it but the dialog's own", () => {
        // Insistent, not inescapable: Escape and the backdrop still work, so it is not a keyboard
        // trap — but there is no button that means "leave it over".
        data.allTasks = [weekly("Email the builder", "3")];
        data.overLimitColumn = "3";
        settings.dayCapacity = 1;

        render(<LimitReachedModal />);

        expect(screen.queryByText("actions.cancel")).toBeNull();
        expect(screen.queryByText("leftovers.not_now")).toBeNull();
    });
});
