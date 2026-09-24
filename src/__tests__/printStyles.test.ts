/**
 * The print stylesheet hides everything beside the board's root, so modals rendered into portals
 * stay off the paper. It used to name only `#root` — the standalone dev page — and so hid
 * `#weekpal-root` as well: every print from the real app came out blank.
 *
 * Checked here, against the source, because the browser suite never loads the board's own
 * stylesheet, so no test there could have caught it.
 */
import { describe, expect, it } from "@jest/globals";
import { readFileSync } from "fs";
import { join } from "path";

const css = readFileSync(join(__dirname, "..", "css", "index.css"), "utf8");

/** Selectors that set `display: none` inside an `@media print` block. */
const printHidingSelectors = (): string[] => {
    const selectors: string[] = [];
    const printBlock = /@media print\s*{/g;
    let match: RegExpExecArray | null;

    while ((match = printBlock.exec(css)) !== null) {
        let depth = 1;
        let index = printBlock.lastIndex;

        while (depth > 0 && index < css.length) {
            if (css[index] === "{") depth++;
            if (css[index] === "}") depth--;
            index++;
        }

        const body = css.slice(printBlock.lastIndex, index - 1).replace(/\/\*[\s\S]*?\*\//g, "");

        for (const rule of body.matchAll(/([^{}]+){([^{}]*)}/g)) {
            if (/display\s*:\s*none/.test(rule[2])) {
                selectors.push(...rule[1].split(",").map((selector) => selector.trim()));
            }
        }
    }

    return selectors;
};

describe("the print stylesheet", () => {
    it("never hides the board's root, embedded or standalone", () => {
        document.body.innerHTML = '<div id="weekpal-root"></div><div id="root"></div><div id="portal"></div>';

        const hiding = printHidingSelectors();
        const hides = (id: string) => hiding.some((selector) => document.getElementById(id)!.matches(selector));

        expect(hiding.length).toBeGreaterThan(0);
        expect(hides("weekpal-root")).toBe(false);
        expect(hides("root")).toBe(false);
        // …while still keeping portals, which are what the rule is for, off the paper.
        expect(hides("portal")).toBe(true);
    });
});
