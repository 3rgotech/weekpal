import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import SubtaskEditor from "../SubtaskEditor";
import { Subtask } from "../../types";

// The component renders its own labels through i18next, which is initialised app-wide; keys are
// enough here and keep the assertions independent of the copy.
jest.mock("react-i18next", () => ({
    useTranslation: () => ({ t: (key: string) => key }),
}));

/**
 * HeroUI's components pull in framer-motion through a dynamic import, which jest's VM cannot
 * resolve. They stand in as the plain elements they wrap, so what these tests cover is this
 * component's own wiring — which item a change applies to, and what it hands back — rather than
 * HeroUI, which is not our code. The real components are exercised in the browser test.
 */
jest.mock("@heroui/react", () => ({
    Checkbox: ({ isSelected, onValueChange, ...props }: any) => (
        <input
            type="checkbox"
            checked={isSelected}
            onChange={(event) => onValueChange(event.target.checked)}
            {...props}
        />
    ),
    Input: ({ value, onValueChange, classNames, ...props }: any) => (
        <input
            value={value}
            onChange={(event) => onValueChange(event.target.value)}
            {...props}
        />
    ),
    Tooltip: ({ children }: any) => children,
}));

const setup = (subtasks: Subtask[] = []) => {
    const onChange = jest.fn();
    render(<SubtaskEditor subtasks={subtasks} onChange={onChange as any} />);

    return onChange;
};

describe("SubtaskEditor", () => {
    it("adds a subtask, unticked", () => {
        const onChange = setup();

        fireEvent.change(screen.getByLabelText("task.subtasks.add"), {
            target: { value: "Buy cement" },
        });
        fireEvent.click(screen.getByRole("button"));

        expect(onChange).toHaveBeenCalledWith([{ title: "Buy cement", completed: false }]);
    });

    it("adds on Enter, so a checklist can be typed straight through", () => {
        const onChange = setup();
        const input = screen.getByLabelText("task.subtasks.add");

        fireEvent.change(input, { target: { value: "Mix it" } });
        fireEvent.keyDown(input, { key: "Enter" });

        expect(onChange).toHaveBeenCalledWith([{ title: "Mix it", completed: false }]);
    });

    it("refuses an empty or blank title", () => {
        const onChange = setup();
        const input = screen.getByLabelText("task.subtasks.add");

        fireEvent.keyDown(input, { key: "Enter" });
        fireEvent.change(input, { target: { value: "   " } });
        fireEvent.keyDown(input, { key: "Enter" });

        expect(onChange).not.toHaveBeenCalled();
    });

    it("ticks one subtask without disturbing the others", () => {
        const onChange = setup([
            { title: "First", completed: false },
            { title: "Second", completed: false },
        ]);

        fireEvent.click(screen.getByLabelText("Second"));

        expect(onChange).toHaveBeenCalledWith([
            { title: "First", completed: false },
            { title: "Second", completed: true },
        ]);
    });

    it("removes by position, keeping duplicates apart", () => {
        // Two identical titles: removing by value rather than position would take both.
        const onChange = setup([
            { title: "Same", completed: false },
            { title: "Same", completed: true },
        ]);

        fireEvent.click(screen.getAllByRole("button")[0]);

        expect(onChange).toHaveBeenCalledWith([{ title: "Same", completed: true }]);
    });
});
