import { describe, expect, it } from "@jest/globals";
import { applyMarkdownFormat, shortcutFormat } from "../markdownEditing";

const at = (value: string, start: number, end: number) => ({ value, start, end });

describe("wrapping the selection", () => {
    it("bolds the selected words", () => {
        expect(applyMarkdownFormat(at("ring the plumber", 9, 16), "bold"))
            .toEqual({ value: "ring the **plumber**", start: 11, end: 18 });
    });

    it("leaves the selection on the words, not around the markers", () => {
        // A toolbar that formats a word and then sends the cursor to the end of the box is one
        // people press exactly once.
        const next = applyMarkdownFormat(at("plumber", 0, 7), "italic");

        expect(next.value.slice(next.start, next.end)).toBe("plumber");
    });

    it("unwraps again when the selection is already inside the markers", () => {
        // The button is a toggle. Pressing bold twice should give back what you started with.
        expect(applyMarkdownFormat(at("ring the **plumber**", 11, 18), "bold"))
            .toEqual({ value: "ring the plumber", start: 9, end: 16 });
    });

    it("unwraps when the markers are inside the selection", () => {
        expect(applyMarkdownFormat(at("**plumber**", 0, 11), "bold").value).toBe("plumber");
    });

    it("inserts an empty pair when nothing is selected", () => {
        // Typing then happens between the markers, which is what a cursor sitting there means.
        const next = applyMarkdownFormat(at("", 0, 0), "bold");

        expect(next.value).toBe("****");
        expect(next.start).toBe(2);
        expect(next.end).toBe(2);
    });

    it("uses the right markers for each format", () => {
        expect(applyMarkdownFormat(at("x", 0, 1), "strike").value).toBe("~~x~~");
        expect(applyMarkdownFormat(at("x", 0, 1), "code").value).toBe("`x`");
    });
});

describe("prefixing lines", () => {
    it("turns the selected lines into a bullet list", () => {
        expect(applyMarkdownFormat(at("milk\neggs", 0, 9), "bullet").value)
            .toBe("- milk\n- eggs");
    });

    it("numbers a list down the selection rather than repeating one", () => {
        expect(applyMarkdownFormat(at("milk\neggs\nbread", 0, 15), "ordered").value)
            .toBe("1. milk\n2. eggs\n3. bread");
    });

    it("grows a part-line selection to the whole line", () => {
        // Formatting half a line as a list item is not a thing anybody means, and the marker only
        // works at the start of one.
        expect(applyMarkdownFormat(at("milk", 2, 3), "bullet").value).toBe("- milk");
    });

    it("takes the markers off again when every line already has one", () => {
        expect(applyMarkdownFormat(at("- milk\n- eggs", 0, 13), "bullet").value)
            .toBe("milk\neggs");
    });

    it("adds markers when only some lines have them", () => {
        // Half a list is not a list. The button's job is to make the selection one.
        expect(applyMarkdownFormat(at("- milk\neggs", 0, 11), "bullet").value)
            .toBe("- - milk\n- eggs");
    });

    it("quotes with the marker the renderer reads", () => {
        expect(applyMarkdownFormat(at("as agreed", 0, 9), "quote").value).toBe("> as agreed");
    });

    it("leaves the rest of the text alone", () => {
        expect(applyMarkdownFormat(at("intro\nmilk\noutro", 6, 10), "bullet").value)
            .toBe("intro\n- milk\noutro");
    });
});

describe("links", () => {
    it("wraps the selection and leaves the cursor on the target", () => {
        const next = applyMarkdownFormat(at("the docs", 4, 8), "link");

        expect(next.value).toBe("the [docs](url)");
        // Over the placeholder, so typing replaces it.
        expect(next.value.slice(next.start, next.end)).toBe("url");
    });

    it("inserts an empty link when nothing is selected", () => {
        const next = applyMarkdownFormat(at("", 0, 0), "link");

        expect(next.value).toBe("[](url)");
        expect(next.value.slice(next.start, next.end)).toBe("url");
    });
});

describe("keyboard shortcuts", () => {
    it("recognises the three people actually reach for", () => {
        const held = { metaKey: true, ctrlKey: false, altKey: false };

        expect(shortcutFormat({ ...held, key: "b" })).toBe("bold");
        expect(shortcutFormat({ ...held, key: "i" })).toBe("italic");
        expect(shortcutFormat({ ...held, key: "k" })).toBe("link");
    });

    it("takes control as well as command", () => {
        expect(shortcutFormat({ key: "b", metaKey: false, ctrlKey: true, altKey: false }))
            .toBe("bold");
    });

    it("ignores an unmodified keystroke, which is somebody typing", () => {
        expect(shortcutFormat({ key: "b", metaKey: false, ctrlKey: false, altKey: false }))
            .toBeNull();
    });

    it("stays out of the way of combinations that belong elsewhere", () => {
        expect(shortcutFormat({ key: "b", metaKey: true, ctrlKey: false, altKey: true })).toBeNull();
        expect(shortcutFormat({ key: "s", metaKey: true, ctrlKey: false, altKey: false })).toBeNull();
        expect(shortcutFormat({ key: "p", metaKey: true, ctrlKey: false, altKey: false })).toBeNull();
    });

    it("recognises a capital, which is what shift-holding produces", () => {
        expect(shortcutFormat({ key: "B", metaKey: true, ctrlKey: false, altKey: false }))
            .toBe("bold");
    });
});
