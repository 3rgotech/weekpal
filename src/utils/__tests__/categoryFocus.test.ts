import { describe, expect, it } from "@jest/globals";
import {
    NO_CATEGORY_FILTER,
    NO_CATEGORY_KEY,
    focusCategory,
    leaveFocus,
    matchesCategorySelection,
    projectMatchesFocus,
    selectCategories,
    toggleFocus,
} from "../categories";

describe("what a category filter matches", () => {
    it("matches everything when nothing is selected", () => {
        expect(matchesCategorySelection("work", [])).toBe(true);
        expect(matchesCategorySelection(null, [])).toBe(true);
    });

    it("matches only what is selected", () => {
        expect(matchesCategorySelection("work", ["work", "home"])).toBe(true);
        expect(matchesCategorySelection("errands", ["work", "home"])).toBe(false);
    });

    it("treats a task with no category as the inbox entry, not as a wildcard", () => {
        expect(matchesCategorySelection(null, [NO_CATEGORY_KEY])).toBe(true);
        expect(matchesCategorySelection(null, ["work"])).toBe(false);
    });
});

describe("focus mode", () => {
    it("narrows the board to one category", () => {
        const focused = focusCategory(NO_CATEGORY_FILTER, "work");

        expect(focused.selected).toEqual(["work"]);
        expect(focused.focus?.categoryId).toBe("work");
    });

    it("puts the filter back the way it was on the way out", () => {
        const filtered = selectCategories(["work", "home"]);

        const focused = focusCategory(filtered, "home");
        expect(focused.selected).toEqual(["home"]);

        expect(leaveFocus(focused).selected).toEqual(["work", "home"]);
        expect(leaveFocus(focused).focus).toBeNull();
    });

    it("keeps the original selection when focus moves from one category to another", () => {
        // Two hops through focus, one trip back: the second focus must not record the first
        // focus's single-category selection as what to restore.
        const filtered = selectCategories(["work", "home"]);
        const focused = focusCategory(focusCategory(filtered, "home"), "work");

        expect(leaveFocus(focused).selected).toEqual(["work", "home"]);
    });

    it("leaves focus when the focused category is tapped again", () => {
        const filtered = selectCategories(["work", "home"]);
        const focused = toggleFocus(filtered, "home");

        const left = toggleFocus(focused, "home");

        expect(left.focus).toBeNull();
        expect(left.selected).toEqual(["work", "home"]);
    });

    it("switches focus when a different category is tapped", () => {
        const focused = toggleFocus(NO_CATEGORY_FILTER, "home");
        const switched = toggleFocus(focused, "work");

        expect(switched.focus?.categoryId).toBe("work");
        expect(switched.selected).toEqual(["work"]);
    });

    it("ends focus when the filter is used by hand", () => {
        const focused = focusCategory(NO_CATEGORY_FILTER, "work");

        expect(selectCategories(["home"]).focus).toBeNull();
        expect(focused.focus).not.toBeNull();
    });

    it("does nothing when there is no focus to leave", () => {
        const filtered = selectCategories(["work"]);

        expect(leaveFocus(filtered)).toBe(filtered);
    });
});

describe("which project lists survive focus", () => {
    it("keeps the focused category's projects and drops the others", () => {
        expect(projectMatchesFocus("work", "work")).toBe(true);
        expect(projectMatchesFocus("home", "work")).toBe(false);
    });

    it("keeps a project with no category, whose tasks carry their own", () => {
        expect(projectMatchesFocus(null, "work")).toBe(true);
    });

    it("keeps everything when nothing has focus", () => {
        expect(projectMatchesFocus("home", null)).toBe(true);
    });
});
