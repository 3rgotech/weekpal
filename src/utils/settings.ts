import { Language, LayoutPreset, Settings, SubtaskDisplay } from "../types";
import { normaliseDayCapacity } from "./capacity";
import {
    DEFAULT_WEEK_STARTS_ON,
    DEFAULT_WORKING_DAYS,
    normaliseWeekStart,
    normaliseWorkingDays,
} from "./week";

/** Every named layout, in the order the settings offer them. */
export const LAYOUT_PRESETS: LayoutPreset[] = ["compressed", "classic", "front", "rows", "columns"];

/**
 * The device's language, among the two the board speaks.
 *
 * Only ever a default. Before an account exists — the demo, a first open of the installed app —
 * the phone's own setting is the only thing anyone has said about language, and a French phone
 * opening an English board, then signing up on a French page, reads as two different products.
 * Once the server's copy arrives it wins: an account starts in the language it signed up in.
 */
export function deviceLanguage(): Language {
    const preferred = typeof navigator === "undefined"
        ? []
        : (navigator.languages?.length ? navigator.languages : [navigator.language]);

    for (const tag of preferred) {
        const base = tag?.toLowerCase().split("-")[0];

        if (base === "fr" || base === "en") {
            return base;
        }
    }

    return "en";
}

/**
 * Must stay in step with `App\Support\BoardSettings::defaults()` on the server, the language
 * aside: the server knows which page an account signed up on, the board only knows the device.
 *
 * `showEvents` and `showWeekend` were missing here while being declared on the
 * `Settings` type, so a fresh browser started with them undefined — which reads
 * as false at every call site that tests them. {@link withDefaults} is what stops
 * that happening again as fields are added: a browser holding a settings object
 * saved before this release has none of the new keys.
 */
export const DEFAULT_SETTINGS: Settings = {
    theme: "system",
    language: deviceLanguage(),
    dayHeaderFormat: "dddd | D MMMM YYYY",
    weekHeaderFormat: "[[WEEK]] W - MMMM YYYY",
    showCompletedTasks: true,
    showEvents: true,
    expandEvents: false,
    workingDays: DEFAULT_WORKING_DAYS,
    showNonWorkingDays: true,
    weekStartsOn: DEFAULT_WEEK_STARTS_ON,
    dayCapacity: 0,
    dayCapacityCategories: [],
    somedayLimit: 0,
    thisWeekLimit: 0,
    hardLimits: false,
    completionResort: false,
    workingDayHours: 0,
    subtaskDisplay: "percentage",
    // The board everyone has had: the days off stacked into one column. Presets are Pro (R14).
    layoutPreset: "compressed",
    // Nobody has finished a tour they have not been shown. A browser with no stored settings and
    // an account that predates the field both land here, and both are offered it.
    onboardingVersion: 0,
    briefingEnabled: false,
    briefingDays: DEFAULT_WORKING_DAYS,
    briefingTime: "08:00",
    briefingWhenEmpty: false,
    timezone: null,
}

/**
 * The times a briefing or a task reminder can be set to: every quarter of an hour, which is how
 * often the server looks.
 */
export const QUARTER_HOURS: string[] = Array.from({ length: 96 }, (_, index) => (
    `${String(Math.floor(index / 4)).padStart(2, "0")}:${String((index % 4) * 15).padStart(2, "0")}`
));

/**
 * "08:15" as this language writes a time: 8:15 AM, 08:15. Intl rather than dayjs's "LT", which
 * needs a plugin the board does not load and prints the letters "LT" without it.
 */
export function timeLabel(language: string, time: string): string {
    const [hour, minute] = time.split(":").map(Number);

    return new Intl.DateTimeFormat(language, { hour: "numeric", minute: "2-digit" })
        .format(new Date(2000, 0, 1, hour, minute));
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
        dayCapacityCategories: Array.isArray(stored?.dayCapacityCategories)
            ? stored.dayCapacityCategories.filter((id): id is string => typeof id === "string")
            : [],
        somedayLimit: normaliseDayCapacity(stored?.somedayLimit),
        thisWeekLimit: normaliseDayCapacity(stored?.thisWeekLimit),
        // Anything unreadable is read as "has seen none". Offering a tour twice is a small cost;
        // a hand-edited localStorage silently suppressing it forever is a support conversation.
        layoutPreset: LAYOUT_PRESETS.includes(stored?.layoutPreset as LayoutPreset)
            ? (stored!.layoutPreset as LayoutPreset)
            : "compressed",
        onboardingVersion: Number.isInteger(stored?.onboardingVersion)
            ? (stored!.onboardingVersion as number)
            : 0,
        briefingEnabled: stored?.briefingEnabled === true,
        briefingDays: normaliseWorkingDays(stored?.briefingDays),
        briefingTime: QUARTER_HOURS.includes(stored?.briefingTime as string)
            ? (stored!.briefingTime as string)
            : DEFAULT_SETTINGS.briefingTime,
        briefingWhenEmpty: stored?.briefingWhenEmpty === true,
        timezone: typeof stored?.timezone === "string" ? stored.timezone : null,
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
