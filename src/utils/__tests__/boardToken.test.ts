import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { boardToken, configureBoardToken, refreshBoardToken, resetBoardToken } from "../boardToken";

/**
 * The token refresh, which PROGRESS singles out as the one to test specifically.
 *
 * The failure it prevents is silent and slow: a board token lives twelve hours, the tab lives
 * weeks, and on the second morning every write 401s. The queue stops correctly — it does not
 * drop the writes and does not age them into dead letters — and then waits for ever, because
 * nothing was ever going to hand it a new token. The board goes on reporting that all is well.
 *
 * @see PROGRESS.md R28(b)
 */
const originalFetch = globalThis.fetch;

afterEach(() => {
    resetBoardToken();
    globalThis.fetch = originalFetch;
    jest.restoreAllMocks();
});

const respondWith = (body: unknown, ok = true) =>
    jest.fn(async () => ({ ok, json: async () => body }) as never);

describe("refreshing", () => {
    it("swaps in the new token", async () => {
        configureBoardToken("old-token", "https://weekpal.test/app/token");
        globalThis.fetch = respondWith({ data: { token: "new-token" } }) as never;

        expect(boardToken()).toBe("old-token");
        await refreshBoardToken();

        expect(boardToken()).toBe("new-token");
    });

    it("asks with the session cookie, which is the credential that has not expired", async () => {
        const fetchMock = respondWith({ data: { token: "new-token" } });
        configureBoardToken("old-token", "https://weekpal.test/app/token");
        globalThis.fetch = fetchMock as never;

        await refreshBoardToken();

        expect(fetchMock).toHaveBeenCalledWith(
            "https://weekpal.test/app/token",
            expect.objectContaining({ method: "POST", credentials: "same-origin" }),
        );
    });

    it("shares one request between everything waiting", async () => {
        // A board coming back online flushes a whole queue at once. Without the shared promise
        // each queued write mints its own token, and they prune each other out of existence.
        const fetchMock = respondWith({ data: { token: "new-token" } });
        configureBoardToken("old-token", "https://weekpal.test/app/token");
        globalThis.fetch = fetchMock as never;

        await Promise.all([refreshBoardToken(), refreshBoardToken(), refreshBoardToken()]);

        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("asks again after the first request has settled", async () => {
        const fetchMock = respondWith({ data: { token: "new-token" } });
        configureBoardToken("old-token", "https://weekpal.test/app/token");
        globalThis.fetch = fetchMock as never;

        await refreshBoardToken();
        await refreshBoardToken();

        expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it("gives up when the session has expired too", async () => {
        // The honest end of the line: that user does have to sign in again, and pretending
        // otherwise would be a retry loop against a door that is not going to open.
        configureBoardToken("old-token", "https://weekpal.test/app/token");
        globalThis.fetch = respondWith({}, false) as never;

        expect(await refreshBoardToken()).toBeUndefined();
    });

    it("survives the network being gone", async () => {
        // Not a reason to give up on the queue — the entry stays and the next attempt tries again.
        configureBoardToken("old-token", "https://weekpal.test/app/token");
        globalThis.fetch = jest.fn(async () => { throw new TypeError("Failed to fetch"); }) as never;

        expect(await refreshBoardToken()).toBeUndefined();
        expect(boardToken()).toBe("old-token");
    });

    it("does nothing on a board with nowhere to ask", async () => {
        // Demo and test boards have no session behind them.
        const fetchMock = respondWith({ data: { token: "new-token" } });
        configureBoardToken("test-key", undefined);
        globalThis.fetch = fetchMock as never;

        expect(await refreshBoardToken()).toBeUndefined();
        expect(fetchMock).not.toHaveBeenCalled();
    });
});
