import { Language, Settings } from "../types";

export const DEFAULT_SETTINGS: Settings = {
    theme: "system",
    language: "en",
    dayHeaderFormat: "dddd | D MMMM YYYY",
    weekHeaderFormat: "[[WEEK]] W - MMMM YYYY",
    showCompletedTasks: true,
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