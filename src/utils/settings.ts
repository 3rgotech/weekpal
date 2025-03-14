import { Language, Settings } from "../types";

export const DEFAULT_SETTINGS: Settings = {
    theme: "system",
    language: "en",
    dayHeaderFormat: "MMM D, YYYY",
    weekHeaderFormat: "[WEEK] W - MMMM YYYY",
}

export const LANGUAGES: Array<Language> = [
    'fr',
    'en'
];

export const LANGUAGE_FLAGS: Record<Language, string> = {
    'fr': 'fr',
    'en': 'us',
}

export const DAY_HEADER_FORMATS = [
    "dddd D",
    "dddd",
    "ddd D",
    "ddd",
    "dd D",
    "dd",
];

export const WEEK_HEADER_FORMATS = [
    "[[WEEK]] W - MMMM YYYY",
    "[[WEEK]] W [[OF]] YYYY",
    "YYYY[w]W",
    "DD/MM/YYYY",
    "MM/DD/YYYY",
    "YYYY-MM-DD",
];