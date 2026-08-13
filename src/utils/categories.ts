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
