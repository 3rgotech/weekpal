import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { AccountProvider, useAccount } from "../AccountContext";

const adapter = { get: jest.fn(async () => ({ id: 1, name: "Ada", subscribed: true })) };
const adapters = { accountAdapter: adapter as unknown as null };

jest.mock("../../adapter", () => ({
    __esModule: true,
    default: { createAdapters: () => adapters },
}));

const Probe = () => {
    const { subscribed, account } = useAccount();

    return <span data-testid="probe">{`${subscribed}:${account?.name ?? "none"}`}</span>;
};

const probe = () => screen.getByTestId("probe").textContent;

beforeEach(() => {
    jest.clearAllMocks();
    adapters.accountAdapter = adapter as unknown as null;
    adapter.get.mockImplementation(async () => ({ id: 1, name: "Ada", subscribed: true }));
});

describe("the account behind the board", () => {
    it("starts unsubscribed, before anything is known", () => {
        // The safe default while the request is in flight: offering a paid control and taking it
        // away a moment later is worse than offering it late. Held open rather than resolved, so
        // the assertion lands while the answer is genuinely still unknown.
        adapter.get.mockImplementation(() => new Promise(() => { }));

        render(<AccountProvider><Probe /></AccountProvider>);

        expect(probe()).toBe("false:none");
    });

    it("reports what the server said", async () => {
        render(<AccountProvider><Probe /></AccountProvider>);

        await waitFor(() => expect(probe()).toBe("true:Ada"));
    });

    it("stays unsubscribed when the account cannot be reached", async () => {
        adapter.get.mockImplementation(async () => { throw new Error("offline"); });
        jest.spyOn(console, "error").mockImplementation(() => { });

        render(<AccountProvider><Probe /></AccountProvider>);

        await waitFor(() => expect(adapter.get).toHaveBeenCalled());
        expect(probe()).toBe("false:none");
    });

    it("is unsubscribed with no backend at all — the demo board has no account", async () => {
        adapters.accountAdapter = null;

        render(<AccountProvider><Probe /></AccountProvider>);

        expect(probe()).toBe("false:none");
    });

    it("answers outside the provider rather than throwing", () => {
        // The print sheet and the tests render parts of the board on their own.
        render(<Probe />);

        expect(probe()).toBe("false:none");
    });
});
