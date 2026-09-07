import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import CategoryFilter from "../CategoryFilter";
import Category from "../../data/category";

jest.mock("react-i18next", () => ({
    useTranslation: () => ({
        // Interpolates, because the focus buttons are told apart by the name in their label —
        // a stub that returned the bare key would give all three the same accessible name.
        t: (key: string, options?: Record<string, unknown>) => {
            if (options?.count !== undefined) {
                return `${key}:${options.count}`;
            }

            return options?.name === undefined ? key : `${key}:${options.name}`;
        },
    }),
}));

const data = {
    categories: [] as unknown[],
    selectedCategories: [] as string[],
    setSelectedCategories: jest.fn((_next: string[]) => undefined),
    focusCategory: jest.fn((_id: string) => undefined),
};

jest.mock("../../contexts/DataContext", () => ({ useData: () => data }));

const account = { account: null, subscribed: true };

jest.mock("../../contexts/AccountContext", () => ({ useAccount: () => account }));

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

describe("the filter's rows", () => {
    const row = (name: string) => screen.getByRole("button", { name });

    it("draws every row on while nothing is filtered", () => {
        render(<CategoryFilter />);

        expect(row("Work").getAttribute("aria-pressed")).toBe("true");
        expect(row("Home").getAttribute("aria-pressed")).toBe("true");
    });

    it("turns a row off on a click, rather than on", () => {
        render(<CategoryFilter />);

        fireEvent.click(row("Work"));

        // Everything except Work — the opposite of what clicking used to do.
        expect(data.setSelectedCategories).toHaveBeenCalledWith(["Home", "-1"].map(
            (id) => (id === "Home" ? "home" : id),
        ));
    });

    it("states 'off' twice over, so it does not read as disabled", () => {
        data.selectedCategories = ["work"];

        render(<CategoryFilter />);

        expect(row("Home").className).toContain("italic");
        expect(row("Home").className).toContain("opacity-45");
        expect(row("Work").className).not.toContain("italic");
    });

    it("focuses one category from its own button, without toggling the row", () => {
        // The whole reason the rows are not listbox items: an item swallows clicks inside it, so
        // Focus and the row could not be told apart.
        render(<CategoryFilter />);

        fireEvent.click(screen.getByRole("button", { name: "category.focus_only:Work" }));

        expect(data.focusCategory).toHaveBeenCalledWith("work");
        expect(data.setSelectedCategories).not.toHaveBeenCalled();
    });

    it("focuses on shift+click of the row itself", () => {
        render(<CategoryFilter />);

        fireEvent.click(row("Work"), { shiftKey: true });

        expect(data.focusCategory).toHaveBeenCalledWith("work");
        expect(data.setSelectedCategories).not.toHaveBeenCalled();
    });

    it("restores everything from Show all", () => {
        data.selectedCategories = ["work"];

        render(<CategoryFilter />);
        fireEvent.click(row("category.show_all"));

        expect(data.setSelectedCategories).toHaveBeenCalledWith([]);
    });

    it("offers nothing to restore when nothing is filtered", () => {
        render(<CategoryFilter />);

        expect((row("category.show_all") as HTMLButtonElement).disabled).toBe(true);
    });
});
