import { describe, expect, it } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import TaskActivity from "../TaskActivity";
import Category from "../../data/category";
import HistoryEntry from "../../data/history";
import Project from "../../data/project";
import { WeeklyTask } from "../../data/task";

jest.mock("react-i18next", () => ({
    useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock("../../utils/dayjs", () => ({
    ...jest.requireActual<object>("../../utils/dayjs"),
    __esModule: true,
    default: () => () => ({ fromNow: () => "now" }),
}));

const data = {
    noteStore: { list: () => Promise.resolve([]) },
    historyAdapter: {
        list: () => Promise.resolve([
            new HistoryEntry({
                id: "h1",
                event: "updated",
                changes: {
                    category_id: { from: "work", to: "gone" },
                    project_id: { from: null, to: "weekpal" },
                },
            }),
        ]),
    },
    categories: [new Category({ id: "work", name: "Work", color: "blue" })],
    projects: [new Project({ id: "weekpal", name: "Weekpal", categoryId: null })],
};

jest.mock("../../contexts/DataContext", () => ({ useData: () => data }));

describe("a task's history", () => {
    it("names categories and projects rather than printing their ids", async () => {
        render(<TaskActivity task={new WeeklyTask({ title: "Fix it", weekCode: "2026w01", dayOfWeek: "1" })} />);

        fireEvent.click(screen.getByRole("tab", { name: /task.history/ }));

        expect(await screen.findByText(/Work/)).toBeTruthy();
        expect(screen.getByText(/task.history.removed/)).toBeTruthy();
        expect(screen.getByText(/Weekpal/)).toBeTruthy();
        expect(screen.queryByText(/weekpal|gone/)).toBeNull();
    });
});
