import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { watchForReturn } from "../resumeWatch";

let visibility: DocumentVisibilityState = "visible";

const setVisibility = (next: DocumentVisibilityState) => {
    visibility = next;
    document.dispatchEvent(new Event("visibilitychange"));
};

beforeEach(() => {
    jest.useFakeTimers();
    visibility = "visible";
    jest.spyOn(document, "visibilityState", "get").mockImplementation(() => visibility);
});

afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
});

describe("watching for the board to come back", () => {
    it("re-reads when the app returns after a while away", () => {
        const onReturn = jest.fn();
        const stop = watchForReturn(onReturn);

        setVisibility("hidden");
        jest.advanceTimersByTime(60_000);
        setVisibility("visible");

        expect(onReturn).toHaveBeenCalledTimes(1);
        stop();
    });

    it("ignores a glance away and back", () => {
        const onReturn = jest.fn();
        const stop = watchForReturn(onReturn);

        setVisibility("hidden");
        jest.advanceTimersByTime(5_000);
        setVisibility("visible");

        expect(onReturn).not.toHaveBeenCalled();
        stop();
    });

    it("re-reads a board left on screen every few minutes", () => {
        const onReturn = jest.fn();
        const stop = watchForReturn(onReturn);

        jest.advanceTimersByTime(5 * 60_000);

        expect(onReturn).toHaveBeenCalledTimes(1);
        stop();
    });

    it("re-reads a page restored from the back-forward cache", () => {
        const onReturn = jest.fn();
        const stop = watchForReturn(onReturn);

        const event = new Event("pageshow") as PageTransitionEvent;
        Object.defineProperty(event, "persisted", { value: true });
        window.dispatchEvent(event);

        expect(onReturn).toHaveBeenCalledTimes(1);
        stop();
    });
});
