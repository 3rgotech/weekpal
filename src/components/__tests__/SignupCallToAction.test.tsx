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

    it("hides the pulsing halo from anyone who asked for less motion", () => {
        // A toolbar element that pulses forever is exactly what the preference is for. The halo
        // is decorative, so it goes entirely rather than merely slowing down.
        const { container } = render(<SignupCallToAction signupUrl="/register" />);
        const halo = container.querySelector('[aria-hidden="true"].animate-ping');

        expect(halo).not.toBeNull();
        expect(halo).toHaveClass('motion-reduce:hidden');
    });

    it("keeps the halo out of the accessibility tree", () => {
        // It carries no information; a screen reader should hear the link and nothing else.
        render(<SignupCallToAction signupUrl="/register" />);

        expect(screen.getByRole("link", { name: /sign_up/ })).toBeInTheDocument();
        expect(screen.queryAllByRole("presentation")).toHaveLength(0);
    });

    it("does not let its halo swallow clicks on whatever sits beside it", () => {
        // `animate-ping` scales the halo to twice the button, so a halo that accepts pointer
        // events covers its neighbours in the toolbar — the settings button, on staging.
        const { container } = render(<SignupCallToAction signupUrl="/register" loginUrl="/login" />);
        const halo = container.querySelector(".animate-ping") as HTMLElement;

        expect(halo).not.toBeNull();
        expect(halo.className).toContain("pointer-events-none");
    });
});
