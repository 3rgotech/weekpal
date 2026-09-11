import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import DescriptionEditor from "../DescriptionEditor";

jest.mock("react-i18next", () => ({
    useTranslation: () => ({ t: (key: string) => key }),
}));

const onChange = jest.fn<(value: string) => void>();

const editor = (value = "") => render(
    <DescriptionEditor
        value={value}
        onChange={onChange}
        label="task.description"
        placeholder="task.placeholder.description"
    />,
);

const box = () => screen.getByLabelText("task.description") as HTMLTextAreaElement;

beforeEach(() => {
    jest.clearAllMocks();
    // jsdom has no rAF in every environment the suite runs in; the component uses it only to put
    // the caret back after React re-renders, which is not what these assert.
    window.requestAnimationFrame = ((callback: FrameRequestCallback) => {
        callback(0);

        return 0;
    }) as typeof window.requestAnimationFrame;
});

describe("writing", () => {
    it("reports what was typed, unchanged", () => {
        // What is stored is the Markdown itself. Nothing is transformed on the way out of the
        // box, which is what keeps the column a string and per-field LWW untouched.
        editor();

        fireEvent.change(box(), { target: { value: "**ring** the plumber" } });

        expect(onChange).toHaveBeenCalledWith("**ring** the plumber");
    });

    it("offers the formatting a description actually needs", () => {
        editor();

        for (const control of ["bold", "italic", "strike", "code", "link", "bullet", "ordered", "quote"]) {
            expect(screen.queryByLabelText(`task.editor.${control}`)).toBeTruthy();
        }
    });

    it("formats the selection when a toolbar button is pressed", () => {
        editor("ring the plumber");

        const field = box();
        field.setSelectionRange(9, 16);

        // `mouseDown`, not `click`: a click blurs the textarea first and the selection is gone by
        // the time the handler runs, which is the bug this ordering exists to avoid.
        fireEvent.mouseDown(screen.getByLabelText("task.editor.bold"));

        expect(onChange).toHaveBeenCalledWith("ring the **plumber**");
    });

    it("formats on the keyboard shortcut too", () => {
        editor("plumber");

        const field = box();
        field.setSelectionRange(0, 7);
        fireEvent.keyDown(field, { key: "b", metaKey: true });

        expect(onChange).toHaveBeenCalledWith("**plumber**");
    });

    it("leaves an ordinary keystroke to the textarea", () => {
        editor("plumber");

        fireEvent.keyDown(box(), { key: "b" });

        expect(onChange).not.toHaveBeenCalled();
    });
});

describe("previewing", () => {
    it("offers a preview once there is something to preview", () => {
        // An empty tab that shows an empty box is a control that teaches people it does nothing.
        editor();
        expect(screen.queryByText("task.editor.preview")).toBeNull();

        editor("something");
        expect(screen.queryByText("task.editor.preview")).toBeTruthy();
    });

    it("renders the markdown rather than the source", () => {
        const { container } = editor("- milk\n- eggs");

        fireEvent.click(screen.getByText("task.editor.preview"));

        const preview = container.querySelector(".markdown-body");

        expect(preview?.querySelectorAll("li")).toHaveLength(2);
        expect(preview?.textContent).toBe("milkeggs");
    });

    it("cannot be made to render markup the user typed", () => {
        // The preview is the one place a description becomes HTML, so it is the one place worth
        // asserting that it cannot become *arbitrary* HTML.
        const { container } = editor("<img src=x onerror=alert(1)>");

        fireEvent.click(screen.getByText("task.editor.preview"));

        const preview = container.querySelector(".markdown-body");

        expect(preview?.querySelector("img")).toBeNull();
        expect(preview?.textContent).toContain("<img");
    });

    it("goes back to writing", () => {
        editor("something");

        fireEvent.click(screen.getByText("task.editor.preview"));
        expect(screen.queryByLabelText("task.description")).toBeNull();

        fireEvent.click(screen.getByText("task.editor.write"));
        expect(screen.queryByLabelText("task.description")).toBeTruthy();
    });
});
