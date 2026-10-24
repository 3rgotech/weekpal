import { beforeEach, describe, expect, it } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import NewTask from "../NewTask";

jest.mock("react-i18next", () => ({
    useTranslation: () => ({ t: (key: string) => key }),
}));

const data = { addTask: jest.fn(), projects: [] as unknown[] };

jest.mock("../../contexts/DataContext", () => ({ useData: () => data }));
jest.mock("../../contexts/CalendarContext", () => ({
    useCalendar: () => ({ currentWeek: "2026w43" }),
}));

beforeEach(() => {
    jest.clearAllMocks();
});

const open = () => {
    fireEvent.click(screen.getByText("main.add_new_task"));

    return screen.getByPlaceholderText("main.add_new_task");
};

describe("adding a task", () => {
    it("keeps the title when tapping + blurs the input without focusing anything, as iOS does", () => {
        render(<NewTask dayOfWeek="1" />);

        const input = open();
        fireEvent.change(input, { target: { value: "Call the bank" } });
        fireEvent.blur(input, { relatedTarget: null });
        fireEvent.click(screen.getByRole("button", { name: "actions.add_task" }));

        expect(data.addTask).toHaveBeenCalledTimes(1);
        expect((data.addTask.mock.calls[0][0] as { title: string }).title).toBe("Call the bank");
    });

    it("still cancels when focus moves to something outside it", () => {
        render(<><NewTask dayOfWeek="1" /><button>elsewhere</button></>);

        const input = open();
        fireEvent.change(input, { target: { value: "Call the bank" } });
        fireEvent.blur(input, { relatedTarget: screen.getByText("elsewhere") });

        expect(screen.queryByPlaceholderText("main.add_new_task")).not.toBeInTheDocument();
        expect(data.addTask).not.toHaveBeenCalled();
    });
});
