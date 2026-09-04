import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import CategoryFocusBar from "../CategoryFocusBar";
import Category from "../../data/category";

jest.mock("react-i18next", () => ({
    useTranslation: () => ({
        t: (key: string, options?: Record<string, unknown>) =>
            (options?.name ? `${key}:${options.name}` : key),
    }),
}));

const data = {
    categories: [] as unknown[],
    focusedCategory: null as string | null,
    clearFocus: jest.fn(),
};

jest.mock("../../contexts/DataContext", () => ({ useData: () => data }));

const work = new Category({ id: "work", name: "Work", color: "blue" });

beforeEach(() => {
    jest.clearAllMocks();
    data.categories = [work];
    data.focusedCategory = null;
});

describe("the focus strip", () => {
    it("says nothing while no category has focus", () => {
        const { container } = render(<CategoryFocusBar />);

        expect(container).toBeEmptyDOMElement();
    });

    it("names the focused category, since focus hides the rest of the board", () => {
        data.focusedCategory = "work";

        render(<CategoryFocusBar />);

        expect(screen.getByText("category.focused:Work")).toBeInTheDocument();
    });

    it("leaves focus from its own button", () => {
        data.focusedCategory = "work";

        render(<CategoryFocusBar />);
        fireEvent.click(screen.getByRole("button", { name: "category.focus_exit" }));

        expect(data.clearFocus).toHaveBeenCalled();
    });

    it("leaves focus on Escape, wherever the pointer has gone", () => {
        data.focusedCategory = "work";

        render(<CategoryFocusBar />);
        fireEvent.keyDown(window, { key: "Escape" });

        expect(data.clearFocus).toHaveBeenCalled();
    });

    it("falls back to the inbox label for a focus on tasks with no category", () => {
        data.focusedCategory = "-1";

        render(<CategoryFocusBar />);

        expect(screen.getByText("category.focused:category.none")).toBeInTheDocument();
    });
});
