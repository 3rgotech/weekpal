import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import ProTeaserBar from "../ProTeaserBar";
import { ProTeaserProvider } from "../../contexts/ProTeaserContext";
import { useProTeaser } from "../../contexts/proTeaser";
import { ProTeaserDecision, ProTeaserOutcome } from "../../types";

jest.mock("react-i18next", () => ({
    useTranslation: () => ({ t: (key: string) => key }),
}));

const adapter = {
    avoidance: jest.fn(async () => null),
    reviewed: jest.fn(async (_week: string): Promise<ProTeaserDecision> => ({ show: true, signature: "task:42:5-6" })),
    respond: jest.fn(async (_signature: string, _outcome: ProTeaserOutcome) => undefined),
};

let subscribed = false;
let proUrl: string | undefined;


jest.mock("../../contexts/DataContext", () => ({
    useData: () => ({ insightsAdapter: adapter }),
}));

jest.mock("../../contexts/AccountContext", () => ({
    useAccount: () => ({ account: null, subscribed }),
}));

/** Stands in for the Leftover Review: the one thing that reports a closed review. */
const CloseReview: React.FC = () => {
    const { reviewClosed } = useProTeaser();

    return <button onClick={() => reviewClosed("2026w39")}>close review</button>;
};

const setup = () => render(
    <ProTeaserProvider proUrl={proUrl}>
        <CloseReview />
        <ProTeaserBar />
    </ProTeaserProvider>,
);

describe("ProTeaserBar", () => {
    beforeEach(() => {
        subscribed = false;
        proUrl = "https://weekpal.test/pro";
        adapter.reviewed.mockClear();
        adapter.respond.mockClear();
        adapter.reviewed.mockImplementation(async () => ({ show: true, signature: "task:42:5-6" }));
    });

    it("shows nothing until a review closes", () => {
        setup();

        expect(screen.queryByText("teaser.message", { exact: false })).not.toBeInTheDocument();
    });

    it("shows the fact and its door once the server says so", async () => {
        setup();
        fireEvent.click(screen.getByText("close review"));

        const link = await screen.findByRole("link", { name: "teaser.cta" });
        expect(link).toHaveAttribute("href", "https://weekpal.test/pro#avoidance");
        expect(adapter.reviewed).toHaveBeenCalledWith("2026w39");
    });

    it("stays quiet when the server says no", async () => {
        adapter.reviewed.mockImplementation(async () => ({ show: false, signature: null }));
        setup();
        fireEvent.click(screen.getByText("close review"));

        await waitFor(() => expect(adapter.reviewed).toHaveBeenCalled());
        expect(screen.queryByRole("link", { name: "teaser.cta" })).not.toBeInTheDocument();
    });

    it("records a click and goes away", async () => {
        setup();
        fireEvent.click(screen.getByText("close review"));
        fireEvent.click(await screen.findByRole("link", { name: "teaser.cta" }));

        expect(adapter.respond).toHaveBeenCalledWith("task:42:5-6", "clicked");
        expect(screen.queryByRole("link", { name: "teaser.cta" })).not.toBeInTheDocument();
    });

    it("records a dismissal and goes away", async () => {
        setup();
        fireEvent.click(screen.getByText("close review"));
        await screen.findByRole("link", { name: "teaser.cta" });
        fireEvent.click(screen.getByRole("button", { name: "teaser.dismiss" }));

        expect(adapter.respond).toHaveBeenCalledWith("task:42:5-6", "dismissed");
        expect(screen.queryByRole("link", { name: "teaser.cta" })).not.toBeInTheDocument();
    });

    it("never asks for an account that already has Pro", async () => {
        subscribed = true;
        setup();
        await act(async () => fireEvent.click(screen.getByText("close review")));

        expect(adapter.reviewed).not.toHaveBeenCalled();
    });

    it("never asks without a Pro page to send anyone to", async () => {
        proUrl = undefined;
        setup();
        await act(async () => fireEvent.click(screen.getByText("close review")));

        expect(adapter.reviewed).not.toHaveBeenCalled();
    });
});
