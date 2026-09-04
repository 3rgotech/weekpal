/**
 * Sentinel keys used by the category filter.
 *
 * Category ids are UUID strings, so these cannot collide with a real id. They used to be the
 * numbers -1 and -2, which worked only because ids were positive integers.
 */

/** Matches tasks and events with no category at all. */
export const NO_CATEGORY_KEY = '-1';

/** Not a filter value: choosing it clears the selection. */
export const CLEAR_SELECTION_KEY = '-2';

/**
 * Whether something carrying this category belongs on a board filtered to `selected`.
 *
 * An empty selection is "everything", not "nothing" — and a task with no category at all is
 * matched by the inbox entry rather than by every filter, which is what `NO_CATEGORY_KEY` is
 * standing in for.
 */
export function matchesCategorySelection(
    categoryId: string | null | undefined,
    selected: string[],
): boolean {
    return selected.length === 0 || selected.includes(categoryId ?? NO_CATEGORY_KEY);
}

/**
 * Whether a project's list belongs on the board while one category has focus.
 *
 * A project with no category of its own is kept: its category is only the authority for the
 * tasks in it when it has one, so its backlog can still hold tasks in the focused category.
 * Those tasks are filtered individually with `matchesCategorySelection`.
 */
export function projectMatchesFocus(
    projectCategoryId: string | null | undefined,
    focusedCategory: string | null,
): boolean {
    if (focusedCategory === null || projectCategoryId === null || projectCategoryId === undefined) {
        return true;
    }

    return projectCategoryId === focusedCategory;
}

/**
 * The board's category filter: what is selected, and whether one category has focus.
 *
 * One value rather than two pieces of state, because focus *is* a selection — of exactly one
 * category — and every transition below has to read both halves to decide the next one. Split
 * across two `useState`s, each transition wrote one from a stale copy of the other.
 *
 * `previous` is what focus replaced. Leaving focus restores it, so a one-tap look at a single
 * category puts the board back the way it was instead of dropping the person into an unfiltered
 * week they never asked for.
 */
export interface CategoryFilterState {
    selected: string[];
    focus: { categoryId: string; previous: string[] } | null;
}

/** No filter and no focus: the whole week. */
export const NO_CATEGORY_FILTER: CategoryFilterState = { selected: [], focus: null };

/**
 * Filter by hand, through the multi-select.
 *
 * This ends focus rather than keeping it aside: once the selection has been changed deliberately,
 * the one focus would restore is not the one anybody wants back.
 */
export function selectCategories(categories: string[]): CategoryFilterState {
    return { selected: categories, focus: null };
}

/** Narrow the board to one category, remembering the selection it replaces. */
export function focusCategory(
    current: CategoryFilterState,
    categoryId: string,
): CategoryFilterState {
    return {
        selected: [categoryId],
        // Carried over when focus is already on, so moving from one focused category to another
        // is still one step away from the selection rather than two.
        focus: { categoryId, previous: current.focus?.previous ?? current.selected },
    };
}

/** Leave focus, restoring the selection focus replaced. */
export function leaveFocus(current: CategoryFilterState): CategoryFilterState {
    return current.focus ? { selected: current.focus.previous, focus: null } : current;
}

/** Focus a category, or leave focus when that category already has it. */
export function toggleFocus(
    current: CategoryFilterState,
    categoryId: string,
): CategoryFilterState {
    return current.focus?.categoryId === categoryId
        ? leaveFocus(current)
        : focusCategory(current, categoryId);
}
