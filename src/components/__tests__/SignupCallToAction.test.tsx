import { describe, expect, it, jest } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import React from "react";
import SignupCallToAction from "../SignupCallToAction";

jest.mock("react-i18next", () => ({
    useTranslation: () => ({ t: (key: string) => key }),
}));

describe("SignupCallToAction", () => {
    it("offers signup, and login beside it", () => {
        render(<SignupCallToAction signupUrl="/register" loginUrl="/auth/login" />);

        expect(screen.getByRole("link", { name: /sign_up/ })).toHaveAttribute("href", "/register");
        expect(screen.getByRole("link", { name: /log_in/ })).toHaveAttribute("href", "/auth/login");
    });

    it("shows signup alone when there is no login url", () => {
        render(<SignupCallToAction signupUrl="/register" />);

        expect(screen.getAllByRole("link")).toHaveLength(1);
    });

    it("draws nothing that moves", () => {
        // The pulsing halo went with the redesign: the only filled button in a bar of bare
        // glyphs already reads as the way out of the demo, and a toolbar element that pulses
        // forever is exactly what a reduced-motion preference exists to stop.
        const { container } = render(<SignupCallToAction signupUrl="/register" loginUrl="/login" />);

        expect(container.querySelector(".animate-ping")).toBeNull();
    });
});
