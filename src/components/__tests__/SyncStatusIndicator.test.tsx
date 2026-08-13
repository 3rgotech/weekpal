import { beforeEach, describe, expect, it } from "@jest/globals";
import { render, screen, act } from "@testing-library/react";
import React from "react";
import SyncStatusIndicator from "../SyncStatusIndicator";
import { reportSyncFailure, reportSyncHealth, resetSyncHealth } from "../../utils/syncStatus";

/**
 * The last link in the chain that tells a user their work is not being saved.
 *
 * The API returning 401 is covered on the backend, `classifyFailure` mapping it is covered in
 * syncFailures, and `syncStatus` holding it is covered in its own test — but none of that helps
 * if nothing renders. That was the actual regression: a board that had stopped syncing looked
 * exactly like one that was up to date.
 */
jest.mock("../../contexts/DataContext", () => ({
    useData: () => ({
        taskStore: { getPendingChangesCount: () => Promise.resolve(0) },
        categoryStore: null,
    }),
}));

beforeEach(() => {
    resetSyncHealth();
});

// The indicator reads the pending count asynchronously, so let that settle before asserting —
// otherwise every test logs an act() warning for a state update it did not wait for.
const renderIndicator = async () => {
    let result!: ReturnType<typeof render>;
    await act(async () => {
        result = render(<SyncStatusIndicator />);
    });

    return result;
};

describe("SyncStatusIndicator", () => {
    it("stays out of the way when everything is fine", async () => {
        const { container } = await renderIndicator();

        expect(container).toBeEmptyDOMElement();
    });

    it("tells the user to reload when the session has expired", async () => {
        await renderIndicator();

        await act(async () => { reportSyncFailure("unauthorized"); });

        expect(screen.getByText(/session expired/i)).toBeInTheDocument();
        expect(screen.getByText(/reload the page/i)).toBeInTheDocument();
    });

    it("explains a retention-gate refusal differently from an expired session", async () => {
        await renderIndicator();

        await act(async () => { reportSyncFailure("forbidden"); });

        expect(screen.getByText(/outside your plan/i)).toBeInTheDocument();
        expect(screen.queryByText(/session expired/i)).not.toBeInTheDocument();
    });

    it("says nothing for failures that are not about our standing with the backend", async () => {
        const { container } = await renderIndicator();

        await act(async () => { reportSyncFailure("transient"); });
        await act(async () => { reportSyncFailure("permanent"); });

        expect(container).toBeEmptyDOMElement();
    });

    it("clears once a request gets through again", async () => {
        await renderIndicator();

        await act(async () => { reportSyncFailure("unauthorized"); });
        expect(screen.getByText(/session expired/i)).toBeInTheDocument();

        await act(async () => { reportSyncHealth("ok"); });
        expect(screen.queryByText(/session expired/i)).not.toBeInTheDocument();
    });
});
