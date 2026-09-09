import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import EstimatePicker from "../EstimatePicker";

jest.mock("react-i18next", () => ({
    useTranslation: () => ({ t: (key: string) => key }),
}));

const onChange = jest.fn((_minutes: number | null) => undefined);

beforeEach(() => { onChange.mockClear(); });

describe("choosing an estimate", () => {
    it("offers the six chips", () => {
        render(<EstimatePicker value={null} onChange={onChange} />);

        for (const label of ["5m", "15m", "30m", "1h", "2h", "4h"]) {
            expect(screen.getByRole("button", { name: label })).toBeTruthy();
        }
    });

    it("reports the chip that was pressed", () => {
        render(<EstimatePicker value={null} onChange={onChange} />);

        fireEvent.click(screen.getByRole("button", { name: "30m" }));

        expect(onChange).toHaveBeenCalledWith(30);
    });

    it("clears when the chosen chip is pressed again", () => {
        // "Actually I don't know" has to be reachable without a control of its own.
        render(<EstimatePicker value={60} onChange={onChange} />);

        fireEvent.click(screen.getByRole("button", { name: "1h" }));

        expect(onChange).toHaveBeenCalledWith(null);
    });

    it("marks the chosen chip for a screen reader", () => {
        render(<EstimatePicker value={120} onChange={onChange} />);

        expect(screen.getByRole("button", { name: "2h" }).getAttribute("aria-pressed")).toBe("true");
        expect(screen.getByRole("button", { name: "5m" }).getAttribute("aria-pressed")).toBe("false");
    });

    it("takes a value the chips do not offer", () => {
        render(<EstimatePicker value={null} onChange={onChange} />);

        fireEvent.change(screen.getByLabelText("estimate.custom"), { target: { value: "75" } });

        expect(onChange).toHaveBeenCalledWith(75);
    });

    it("treats an emptied field as no estimate rather than zero", () => {
        // Absence is information; a zero is the lie the capacity maths would inherit.
        render(<EstimatePicker value={30} onChange={onChange} />);

        fireEvent.change(screen.getByLabelText("estimate.custom"), { target: { value: "" } });

        expect(onChange).toHaveBeenCalledWith(null);
    });

    it("shows an empty field when there is no estimate", () => {
        // Not "0". The field is blank because the answer is genuinely absent.
        render(<EstimatePicker value={null} onChange={onChange} />);

        expect((screen.getByLabelText("estimate.custom") as HTMLInputElement).value).toBe("");
    });

    it("numbers the chips only where numbers mean something", () => {
        // The editor is a place people type; 1–6 would fight the keyboard. Batch mode is not.
        // Counted by the decoration itself rather than by text, because "1" also appears inside
        // "15m" and "1h".
        const badges = (root: HTMLElement) => root.querySelectorAll('[aria-hidden="true"].opacity-50').length;

        const { container: plain } = render(<EstimatePicker value={null} onChange={onChange} />);
        expect(badges(plain)).toBe(0);

        const { container: numbered } = render(<EstimatePicker value={null} onChange={onChange} numbered />);
        expect(badges(numbered)).toBe(6);
    });
});
