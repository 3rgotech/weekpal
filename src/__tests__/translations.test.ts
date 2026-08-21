import { describe, expect, it } from "@jest/globals";
import en from "../lang/en.json";
import fr from "../lang/fr.json";

/**
 * The two locale files have to carry the same keys.
 *
 * i18next falls back to the key's English value when a translation is missing, so a gap does not
 * break anything — it just quietly serves English to French users, which is why the whole
 * `visibility` section sat untranslated without anyone noticing. This is the check that would
 * have said so.
 */
const flatten = (value: unknown, prefix = ""): string[] => {
    if (typeof value !== "object" || value === null) {
        return [prefix];
    }

    return Object.entries(value as Record<string, unknown>)
        .flatMap(([key, nested]) => flatten(nested, prefix ? `${prefix}.${key}` : key));
};

const read = (source: unknown, key: string): unknown => key.split(".")
    .reduce<any>((value, part) => (value === undefined ? undefined : value[part]), source);

describe("translations", () => {
    const enKeys = flatten(en);
    const frKeys = flatten(fr);

    it("has a French entry for every English key", () => {
        expect(enKeys.filter((key) => !frKeys.includes(key))).toEqual([]);
    });

    it("has no French key that English does not have", () => {
        // The other direction matters too: a stale French key is dead weight nothing renders.
        expect(frKeys.filter((key) => !enKeys.includes(key))).toEqual([]);
    });

    it("leaves no value empty", () => {
        const empty = enKeys.filter((key) => read(en, key) === "" || read(fr, key) === "");

        expect(empty).toEqual([]);
    });

    it("keeps interpolation placeholders identical across locales", () => {
        // A translated string that drops `{{done}}` renders the literal braces to the user.
        const placeholders = (value: unknown): string[] =>
            (typeof value === "string" ? value.match(/{{\s*\w+\s*}}/g) ?? [] : []).sort();

        const mismatched = enKeys.filter((key) =>
            placeholders(read(en, key)).join() !== placeholders(read(fr, key)).join());

        expect(mismatched).toEqual([]);
    });
});
