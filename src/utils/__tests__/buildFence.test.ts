import { afterEach, describe, expect, it } from "@jest/globals";
import {
    checkBuildFence,
    configureBuildFence,
    resetBuildFence,
    subscribeToBuildMismatch,
} from "../buildFence";

/**
 * Noticing that the server has moved on from the bundle this page is running.
 *
 * A tab open for a month runs month-old JavaScript, which is harmless until a deploy in between
 * changed what a request looks like — and then the errors it gets back are validation failures
 * on data that was never wrong.
 */
const response = (build: string | null) => ({
    headers: { get: (name: string) => (name === "X-WeekPal-Build" ? build : null) },
});

afterEach(() => resetBuildFence());

describe("the fence", () => {
    it("says nothing while the builds match", () => {
        configureBuildFence("abc123");
        let fired = false;
        subscribeToBuildMismatch(() => { fired = true; });

        checkBuildFence(response("abc123"));

        expect(fired).toBe(false);
    });

    it("fires when the server has a different build", () => {
        configureBuildFence("abc123");
        let fired = false;
        subscribeToBuildMismatch(() => { fired = true; });

        checkBuildFence(response("def456"));

        expect(fired).toBe(true);
    });

    it("fires once, however many requests mismatch", () => {
        // A stale tab makes many requests and every one of them mismatches. Telling the user
        // forty times is telling them nothing.
        configureBuildFence("abc123");
        let count = 0;
        subscribeToBuildMismatch(() => { count++; });

        checkBuildFence(response("def456"));
        checkBuildFence(response("def456"));
        checkBuildFence(response("ghi789"));

        expect(count).toBe(1);
    });

    it("ignores a response with no build header", () => {
        // The middleware may not be deployed yet. A fence that fired on its own absence would be
        // worse than no fence.
        configureBuildFence("abc123");
        let fired = false;
        subscribeToBuildMismatch(() => { fired = true; });

        checkBuildFence(response(null));

        expect(fired).toBe(false);
    });

    it("ignores a server that has no bundle of its own", () => {
        // A developer running the SPA off the Vite dev server against a built backend would
        // otherwise be told to reload on every request.
        configureBuildFence("abc123");
        let fired = false;
        subscribeToBuildMismatch(() => { fired = true; });

        checkBuildFence(response("unknown"));

        expect(fired).toBe(false);
    });

    it("does nothing on a page that loaded without a build id", () => {
        configureBuildFence(undefined);
        let fired = false;
        subscribeToBuildMismatch(() => { fired = true; });

        checkBuildFence(response("def456"));

        expect(fired).toBe(false);
    });
});
