/**
 * @jest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { act, renderHook } from "@testing-library/react";
import { isInstalled, isIosSafari, useInstallPrompt } from "../install";

const IOS_SAFARI = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const IOS_CHROME = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0 Mobile/15E148 Safari/604.1';
const ANDROID = 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36';

const setAgent = (agent: string) => {
    Object.defineProperty(window.navigator, 'userAgent', { value: agent, configurable: true });
};

/** jsdom ships no matchMedia, which is also the shape of a browser that cannot answer. */
const setDisplayMode = (standalone: boolean) => {
    (window as any).matchMedia = (query: string) => ({
        matches: standalone && query.includes('standalone'),
        media: query,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
    });
};

const fireInstallable = () => {
    const event: any = new Event('beforeinstallprompt');
    event.prompt = jest.fn(async () => undefined);
    event.userChoice = Promise.resolve({ outcome: 'accepted' });
    window.dispatchEvent(event);

    return event;
};

beforeEach(() => {
    setAgent(ANDROID);
    setDisplayMode(false);
    delete (window.navigator as any).standalone;
});

afterEach(() => {
    delete (window as any).matchMedia;
});

describe("knowing whether it is already installed", () => {
    it("reads the standard display mode", () => {
        setDisplayMode(true);

        expect(isInstalled()).toBe(true);
    });

    it("reads Apple's own flag, which predates the standard", () => {
        setDisplayMode(false);
        (window.navigator as any).standalone = true;

        expect(isInstalled()).toBe(true);
    });

    it("says no when neither says yes", () => {
        expect(isInstalled()).toBe(false);
    });
});

describe("which iOS browsers can install", () => {
    it("is Safari and only Safari", () => {
        setAgent(IOS_SAFARI);
        expect(isIosSafari()).toBe(true);

        // Same engine, no ability to add to a home screen — so it is told nothing.
        setAgent(IOS_CHROME);
        expect(isIosSafari()).toBe(false);
    });
});

describe("the offer", () => {
    it("stays hidden until the browser says the site is installable", () => {
        const { result } = renderHook(() => useInstallPrompt());

        expect(result.current.canInstall).toBe(false);

        act(() => { fireInstallable(); });

        expect(result.current.canInstall).toBe(true);
        expect(result.current.needsManualSteps).toBe(false);
    });

    it("never appears inside the installed app", () => {
        setDisplayMode(true);

        const { result } = renderHook(() => useInstallPrompt());

        act(() => { fireInstallable(); });

        // The whole point: an entry offering to install what you are already running.
        expect(result.current.canInstall).toBe(false);
    });

    it("offers directions on iOS Safari, where there is no prompt to fire", () => {
        setAgent(IOS_SAFARI);

        const { result } = renderHook(() => useInstallPrompt());

        expect(result.current.canInstall).toBe(true);
        expect(result.current.needsManualSteps).toBe(true);
    });

    it("says nothing on an iOS browser that cannot install", () => {
        setAgent(IOS_CHROME);

        const { result } = renderHook(() => useInstallPrompt());

        expect(result.current.canInstall).toBe(false);
    });

    it("fires the browser's prompt once, and goes quiet afterwards", async () => {
        const { result } = renderHook(() => useInstallPrompt());

        let event: any;
        act(() => { event = fireInstallable(); });

        await act(async () => { await result.current.install(); });

        expect(event.prompt).toHaveBeenCalledTimes(1);
        // The event cannot be fired twice, so the offer is spent whatever the answer was.
        expect(result.current.canInstall).toBe(false);
    });

    it("disappears the moment the app is installed", () => {
        const { result } = renderHook(() => useInstallPrompt());

        act(() => { fireInstallable(); });
        expect(result.current.canInstall).toBe(true);

        act(() => { window.dispatchEvent(new Event('appinstalled')); });

        expect(result.current.canInstall).toBe(false);
    });
});
