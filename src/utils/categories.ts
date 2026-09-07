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

/**
 * Every key the filter can hold: the categories, plus the entry standing in for tasks with none.
 *
 * The order the dropdown lists them in, and the set "everything" has to match in size for the
 * filter to be stored as empty.
 */
export function allCategoryKeys(categoryIds: string[]): string[] {
    return [...categoryIds, NO_CATEGORY_KEY];
}

/**
 * Which rows the dropdown should draw as on.
 *
 * The stored filter is a list of what to *show*, and empty means everything — so an unfiltered
 * board has to render as every row ticked rather than as none, which is what the list used to do.
 */
export function activeCategories(selected: string[], all: string[]): string[] {
    return selected.length === 0 ? all : selected;
}

/**
 * Tick or untick one row.
 *
 * Reads as a set of things being shown, which is the way round people expect a filter to work:
 * everything is on until you turn something off. That inverts the stored value's meaning at both
 * ends — the first untick has to expand "empty means all" into the real list before removing
 * from it, and ticking the last one back on collapses to empty again rather than leaving a list
 * that stops matching the day a new category is created.
 *
 * Unticking the last row is refused. A board showing nothing at all is not a filter anybody
 * wants, and it cannot be stored: empty already means the opposite.
 */
export function toggleCategory(selected: string[], id: string, all: string[]): string[] {
    const active = activeCategories(selected, all);

    if (!active.includes(id)) {
        const next = [...active, id];

        return next.length === all.length ? [] : next;
    }

    if (active.length === 1) {
        return selected;
    }

    const next = active.filter((held) => held !== id);

    return next.length === all.length ? [] : next;
}

/**
 * Drop a deleted category out of the filter, wherever it was hiding.
 *
 * Three places to look, and missing any one of them strands the board: it may be in the
 * selection, it may be the focused category, and it may be in the selection focus is holding to
 * restore later. A filter left pointing at a category that no longer exists shows an empty week
 * with no row left to click to undo it.
 */
export function forgetCategory(
    current: CategoryFilterState,
    categoryId: string,
): CategoryFilterState {
    const without = (ids: string[]) => ids.filter((id) => id !== categoryId);

    // Focus on the deleted category has nothing left to focus, so it falls back to whatever the
    // selection was before it — minus the category, if it was in there too.
    if (current.focus?.categoryId === categoryId) {
        return { selected: without(current.focus.previous), focus: null };
    }

    return {
        selected: without(current.selected),
        focus: current.focus
            ? { ...current.focus, previous: without(current.focus.previous) }
            : null,
    };
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
