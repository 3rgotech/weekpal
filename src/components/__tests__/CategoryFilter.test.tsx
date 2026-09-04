import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import React from "react";
import CategoryFilter from "../CategoryFilter";
import Category from "../../data/category";

jest.mock("react-i18next", () => ({
    useTranslation: () => ({
        t: (key: string, options?: Record<string, unknown>) =>
            (options?.count === undefined ? key : `${key}:${options.count}`),
    }),
}));

const data = {
    categories: [] as unknown[],
    selectedCategories: [] as string[],
    setSelectedCategories: jest.fn(),
};

jest.mock("../../contexts/DataContext", () => ({ useData: () => data }));

const work = new Category({ id: "work", name: "Work", color: "blue" });
const home = new Category({ id: "home", name: "Home", color: "green" });

beforeEach(() => {
    jest.clearAllMocks();
    data.categories = [work, home];
    data.selectedCategories = [];
});

describe("what the category filter says it is showing", () => {
    // The popover's own list is rendered by the stand-in as well, so the assertions are on the
    // trigger — which is the thing that was rendering wrongly.
    const summary = () => screen.getByTestId("category-summary").textContent;

    it("says everything when nothing is picked", () => {
        render(<CategoryFilter />);

        expect(summary()).toBe("category.all");
    });

    it("names the one category when one is picked", () => {
        data.selectedCategories = ["work"];

        render(<CategoryFilter />);

        expect(summary()).toBe("Work");
    });

    it("counts them when there are several, rather than stacking one per line", () => {
        // `Select.Value` rendered each selected item's own content — a colour swatch above its
        // label, and every chosen category below the last, which grew the trigger past the bar
        // it sits in.
        data.selectedCategories = ["work", "home"];

        render(<CategoryFilter />);

        expect(summary()).toBe("category.selected:2");
    });
});
