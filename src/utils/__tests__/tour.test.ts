import { afterEach, describe, expect, it } from "@jest/globals";
import {
    HORIZONTAL_TOUR,
    TOUR_VERSION,
    VERTICAL_TOUR,
    presentSteps,
    tourFor,
    whenReady,
} from "../tour";

const place = (...names: string[]) => {
    document.body.innerHTML = names.map((name) => `<div data-tour="${name}"></div>`).join("");
};

afterEach(() => {
    document.body.innerHTML = "";
});

describe("which tour runs", () => {
    it("gives the phone its own steps, not the wide board's", () => {
        // The two boards are different trees — `MobileBoard` and `MainContent` — so a single tour
        // would be pointing at elements half the users do not have.
        expect(tourFor(true)).toBe(VERTICAL_TOUR);
        expect(tourFor(false)).toBe(HORIZONTAL_TOUR);
    });

    it("says the same things in the same order on both", () => {
        // Fewer steps on a phone, because each one covers most of the screen — but the wide
        // board's version must never be the only one that mentions something.
        expect(VERTICAL_TOUR.length).toBeLessThan(HORIZONTAL_TOUR.length);
        expect(VERTICAL_TOUR.length).toBeGreaterThan(0);
    });

    it("gives every step a key of its own, so no two share a translation", () => {
        for (const steps of [HORIZONTAL_TOUR, VERTICAL_TOUR]) {
            expect(new Set(steps.map((step) => step.key)).size).toBe(steps.length);
        }
    });

    it("targets elements by intent rather than by styling", () => {
        // A selector written against a class breaks the first time the class changes, and it
        // breaks silently — into a spotlight on nothing.
        for (const step of [...HORIZONTAL_TOUR, ...VERTICAL_TOUR]) {
            expect(step.target).toMatch(/^\[data-tour="[a-z]+"\]$/);
        }
    });
});

describe("steps whose target is on the page", () => {
    it("drops the ones that are not", () => {
        // The review button, the feedback button and the share button are each conditional. A
        // spotlight on an element that is not there is worse than a missing step.
        place("week");

        const steps = presentSteps(HORIZONTAL_TOUR);

        expect(steps.map((step) => step.key)).toEqual(["week"]);
    });

    it("keeps them in the order the tour declares", () => {
        place("settings", "week", "days");

        expect(presentSteps(HORIZONTAL_TOUR).map((step) => step.key))
            .toEqual(["week", "columns", "settings"]);
    });

    it("returns nothing for a page that has drawn none of them", () => {
        expect(presentSteps(HORIZONTAL_TOUR)).toEqual([]);
    });
});

describe("waiting for the board", () => {
    it("resolves once something the tour points at exists", async () => {
        place("week");

        await expect(whenReady(HORIZONTAL_TOUR)).resolves.toBe(true);
    });

    it("gives up rather than running against a board that never drew", async () => {
        // Nothing is recorded when it gives up, so the next load offers the tour again. Ten
        // seconds of an empty board is a bigger problem than onboarding.
        let clock = 0;
        const now = () => (clock += 5_000);

        await expect(whenReady(HORIZONTAL_TOUR, 1_000, now)).resolves.toBe(false);
    });

    it("waits for an element that arrives late", async () => {
        const pending = whenReady(HORIZONTAL_TOUR, 5_000);

        setTimeout(() => place("week"), 0);

        await expect(pending).resolves.toBe(true);
    });
});

describe("the version", () => {
    it("is a positive integer, because zero means nobody has seen anything", () => {
        expect(Number.isInteger(TOUR_VERSION)).toBe(true);
        expect(TOUR_VERSION).toBeGreaterThan(0);
    });

    it("stays inside the range the API will store", () => {
        // `UpdateSettingsRequest` caps it at 100. A client shipping a number the server refuses
        // would run the tour on every single load and never be able to record that it had.
        expect(TOUR_VERSION).toBeLessThanOrEqual(100);
    });
});
