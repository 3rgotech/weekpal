import { describe, expect, it, jest } from "@jest/globals";
import { playFlip, readPositions } from "../flip";

/**
 * The card travels; it does not teleport.
 *
 * jsdom reports every offset as 0, so the positions are stubbed onto the elements directly — the
 * behaviour under test is which rows are moved and where they start from, not what a real
 * browser lays out.
 */
const row = (key: string, offsetTop: number): HTMLElement => {
    const element = document.createElement("li");
    element.dataset.flipKey = key;
    Object.defineProperty(element, "offsetTop", { value: offsetTop, configurable: true });

    return element;
};

const listOf = (...rows: HTMLElement[]): HTMLElement => {
    const list = document.createElement("ul");
    rows.forEach((r) => list.appendChild(r));

    return list;
};

describe("reading where things were", () => {
    it("keys each row by its own identity", () => {
        const list = listOf(row("a", 0), row("b", 40));

        expect(readPositions(list)).toEqual(new Map([["a", 0], ["b", 40]]));
    });

    it("ignores anything without a key", () => {
        const list = listOf(row("a", 0));
        list.appendChild(document.createElement("li"));

        expect(readPositions(list).size).toBe(1);
    });

    it("copes with there being no list at all", () => {
        expect(readPositions(null).size).toBe(0);
    });
});

describe("playing it back", () => {
    it("starts a moved row at the difference", () => {
        // Then a transition takes it to nothing, which is what makes it look like travel rather
        // than a jump cut.
        const moved = row("a", 120);
        const list = listOf(moved);

        playFlip(list, new Map([["a", 0]]));

        expect(moved.style.transform).toBe("translateY(-120px)");
    });

    it("leaves a row that did not move alone", () => {
        // A column of forty cards should not repaint because one of them was ticked.
        const still = row("a", 40);
        const list = listOf(still);

        playFlip(list, new Map([["a", 40]]));

        expect(still.style.transform).toBe("");
        expect(still.className).toBe("");
    });

    it("does not animate a row that has just arrived", () => {
        // It has nowhere to travel from, and sliding it in from an invented position would be an
        // animation about nothing.
        const fresh = row("new", 80);
        const list = listOf(fresh);

        playFlip(list, new Map([["a", 0]]));

        expect(fresh.style.transform).toBe("");
    });

    it("does nothing before there is anything to compare against", () => {
        const anything = row("a", 40);
        const list = listOf(anything);

        playFlip(list, new Map());

        expect(anything.style.transform).toBe("");
    });

    it("releases the row to travel on a later frame", () => {
        // Two frames, not one: a single frame leaves the transition with nothing to interpolate
        // from and the row simply appears in place.
        const frames: FrameRequestCallback[] = [];
        const raf = jest.spyOn(globalThis, "requestAnimationFrame")
            .mockImplementation((cb: FrameRequestCallback) => { frames.push(cb); return frames.length; });

        const moved = row("a", 0);
        const list = listOf(moved);

        playFlip(list, new Map([["a", 100]]));
        expect(moved.style.transform).toBe("translateY(100px)");

        frames.forEach((frame) => frame(0));
        frames.splice(0).forEach((frame) => frame(0));

        expect(moved.style.transform).toBe("");
        expect(moved.className).toContain("task-travelling");

        raf.mockRestore();
    });
});
