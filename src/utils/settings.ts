import { Language, Settings, SubtaskDisplay } from "../types";
import { normaliseDayCapacity } from "./capacity";
import {
    DEFAULT_WEEK_STARTS_ON,
    DEFAULT_WORKING_DAYS,
    normaliseWeekStart,
    normaliseWorkingDays,
} from "./week";

/**
 * Must stay in step with `App\Support\BoardSettings::defaults()` on the server.
 *
 * `showEvents` and `showWeekend` were missing here while being declared on the
 * `Settings` type, so a fresh browser started with them undefined — which reads
 * as false at every call site that tests them. {@link withDefaults} is what stops
 * that happening again as fields are added: a browser holding a settings object
 * saved before this release has none of the new keys.
 */
export const DEFAULT_SETTINGS: Settings = {
    theme: "system",
    language: "en",
    dayHeaderFormat: "dddd | D MMMM YYYY",
    weekHeaderFormat: "[[WEEK]] W - MMMM YYYY",
    showCompletedTasks: true,
    showEvents: true,
    workingDays: DEFAULT_WORKING_DAYS,
    showNonWorkingDays: true,
    weekStartsOn: DEFAULT_WEEK_STARTS_ON,
    dayCapacity: 0,
    somedayLimit: 0,
    subtaskDisplay: "percentage",
}

/**
 * A complete settings object out of whatever was in storage.
 *
 * localStorage holds one JSON blob written by whichever version of the app saved it last, so a
 * returning browser is a partial object from the app's point of view — missing every field added
 * since. Defaults fill the gaps, and the two shapes that cannot simply be defaulted are repaired:
 * an unusable working-day set and a week start outside 1–7 would both render a broken board.
 */
export function withDefaults(stored: Partial<Settings> | null | undefined): Settings {
    return {
        ...DEFAULT_SETTINGS,
        ...(stored ?? {}),
        workingDays: normaliseWorkingDays(stored?.workingDays),
        weekStartsOn: normaliseWeekStart(stored?.weekStartsOn),
        dayCapacity: normaliseDayCapacity(stored?.dayCapacity),
        somedayLimit: normaliseDayCapacity(stored?.somedayLimit),
    };
}

export const LANGUAGES: Array<Language> = [
    'fr',
    'en'
];

export const LANGUAGE_FLAGS: Record<Language, string> = {
    'fr': 'fr',
    'en': 'us',
}

// Pipe is line break
export const DAY_HEADER_FORMATS = [
    "dddd",
    "dddd D",
    "dddd | D MMMM",
    "dddd | D MMMM YYYY",
    "dddd | MMMM D",
    "dddd | MMMM D YYYY",
];

export const WEEK_HEADER_FORMATS = [
    "[[WEEK]] W - MMMM YYYY",
    "[[WEEK]] W [[OF]] YYYY",
    "MMMM YYYY - [[WEEK]] W",
    "YYYY - [[WEEK]] W",
];

export const SUBTASK_DISPLAYS: Array<SubtaskDisplay> = [
    'percentage',
    'number',
    'none',
];

/**
 * What the top bar's leftover badge reads, or null when there is nothing to say.
 *
 * Caps at "9+": the badge sits on a 16px icon, and a three-digit count there is a smudge rather
 * than a number. The exact figure is in the review the badge points at.
 */
export function leftoverBadge(count: number): string | null {
    if (count <= 0) {
        return null;
    }

    return count > 9 ? '9+' : `${count}`;
}

/**
 * A week's heading, per the `weekHeaderFormat` setting.
 *
 * The stored formats carry `[[WEEK]]` and `[[OF]]` placeholders: dayjs emits them as the
 * literals `[WEEK]` and `[OF]`, which are then swapped for the translated words. Doing that
 * inline is how the week selector and the leftover review would drift apart.
 */
export function weekHeaderLabel(
    formatted: string,
    words: { week: string; of: string },
): string {
    return formatted.replace("[WEEK]", words.week).replace("[OF]", words.of);
}

/**
 * How a task's subtask progress reads on the board, per the `subtaskDisplay` setting.
 *
 * Returns null when there is nothing worth showing — no subtasks, or the setting turned off.
 * A task with none shows nothing whatever the setting: an empty "0/0" on every row would be
 * noise on a board that is mostly single-line tasks.
 */
export function subtaskProgressLabel(
    display: SubtaskDisplay,
    done: number,
    total: number,
): string | null {
    if (total === 0 || display === 'none') {
        return null;
    }

    return display === 'percentage'
        ? `${Math.round((done / total) * 100)}%`
        : `${done}/${total}`;
}
