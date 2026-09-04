import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import InstallModal from "../InstallModal";

jest.mock("react-i18next", () => ({
    useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock("../../utils/install", () => ({ isIosSafari: () => true }));

const share = jest.fn(async () => undefined);

beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(window.navigator, "share", { value: share, configurable: true });
});

describe("the how-to-install sheet", () => {
    it("spells out the steps, which on iOS is all a page is allowed to do", () => {
        render(<InstallModal isOpen onOpenChange={jest.fn()} />);

        expect(screen.getByText("install.step_share")).toBeInTheDocument();
        expect(screen.getByText("install.step_add")).toBeInTheDocument();
    });

    it("opens the share sheet, where 'Add to Home Screen' lives", () => {
        render(<InstallModal isOpen onOpenChange={jest.fn()} />);

        fireEvent.click(screen.getByText("install.open_share"));

        expect(share).toHaveBeenCalled();
    });

    it("offers no share button where the platform has no share sheet", () => {
        Object.defineProperty(window.navigator, "share", { value: undefined, configurable: true });

        render(<InstallModal isOpen onOpenChange={jest.fn()} />);

        expect(screen.queryByText("install.open_share")).not.toBeInTheDocument();
    });
});
