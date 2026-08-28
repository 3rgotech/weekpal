/**
 * @jest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { act, renderHook } from "@testing-library/react";
import { useAppUpdate } from "../appUpdate";

let update: jest.Mock<any>;
let listeners: Record<string, Array<() => void>>;

/** A service worker container that is only what the hook actually touches. */
const fakeWorker = (controller: unknown) => {
    listeners = {};

    return {
        controller,
        getRegistration: jest.fn(async () => ({ update })),
        addEventListener: (type: string, handler: () => void) => {
            listeners[type] = [...(listeners[type] ?? []), handler];
        },
        removeEventListener: (type: string, handler: () => void) => {
            listeners[type] = (listeners[type] ?? []).filter((h) => h !== handler);
        },
    };
};

const fireControllerChange = () => {
    (listeners.controllerchange ?? []).forEach((handler) => handler());
};

const install = (controller: unknown) => {
    Object.defineProperty(window.navigator, 'serviceWorker', {
        value: fakeWorker(controller),
        configurable: true,
    });
};

beforeEach(() => {
    update = jest.fn(async () => undefined);
    install({});
});

afterEach(() => {
    // @ts-expect-error — putting the container back the way jsdom had it.
    delete window.navigator.serviceWorker;
});

describe("noticing a new version", () => {
    it("says nothing until a new worker takes over", () => {
        const { result } = renderHook(() => useAppUpdate());

        expect(result.current.updateReady).toBe(false);

        act(() => { fireControllerChange(); });

        expect(result.current.updateReady).toBe(true);
    });

    it("stays quiet on the very first install", () => {
        // No controller at load: the worker claiming this page is it arriving, not an update.
        install(null);

        const { result } = renderHook(() => useAppUpdate());

        act(() => { fireControllerChange(); });

        expect(result.current.updateReady).toBe(false);
    });

    it("announces an update that lands after the first install claimed the page", () => {
        // The case a browser actually produces on a first visit: no controller at load, the
        // worker claims the page moments later, and the real update comes after that. Reading
        // "was it controlled" once at mount made every later update look like that first claim.
        install(null);

        const { result } = renderHook(() => useAppUpdate());

        act(() => { fireControllerChange(); });
        expect(result.current.updateReady).toBe(false);

        act(() => { fireControllerChange(); });
        expect(result.current.updateReady).toBe(true);
    });

    it("looks for a new version on mount, without waiting for a navigation", async () => {
        renderHook(() => useAppUpdate());

        await act(async () => { await Promise.resolve(); });

        // A board left open never navigates, which is when a browser would otherwise check.
        expect(update).toHaveBeenCalled();
    });

    it("looks again when the tab is brought back", async () => {
        renderHook(() => useAppUpdate());
        await act(async () => { await Promise.resolve(); });
        update.mockClear();

        act(() => { document.dispatchEvent(new Event('visibilitychange')); });
        await act(async () => { await Promise.resolve(); });

        expect(update).toHaveBeenCalled();
    });

    it("survives being unable to check at all", async () => {
        (window.navigator.serviceWorker as any).getRegistration = jest.fn(async () => { throw new Error('offline'); });

        const { result } = renderHook(() => useAppUpdate());
        await act(async () => { await Promise.resolve(); });

        // Offline is the normal case for this app, not an error to surface.
        expect(result.current.updateReady).toBe(false);
    });
});

describe("dismissing it", () => {
    it("hides the offer without remembering the refusal", () => {
        const { result } = renderHook(() => useAppUpdate());

        act(() => { fireControllerChange(); });
        act(() => { result.current.dismiss(); });

        expect(result.current.updateReady).toBe(false);

        // "Not now" is not "never": another release while they stay open asks again, and
        // reopening the app loads the new version regardless.
        act(() => { fireControllerChange(); });

        expect(result.current.updateReady).toBe(true);
    });
});

describe("without a service worker at all", () => {
    it("does nothing rather than throwing", () => {
        // @ts-expect-error — a browser that has none, or a page served over plain http.
        delete window.navigator.serviceWorker;

        const { result } = renderHook(() => useAppUpdate());

        expect(result.current.updateReady).toBe(false);
    });
});
