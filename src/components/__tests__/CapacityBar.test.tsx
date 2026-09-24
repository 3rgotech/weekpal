import { describe, expect, it, jest } from "@jest/globals";
import { render } from "@testing-library/react";
import React from "react";
import CapacityBar from "../CapacityBar";

jest.mock("react-i18next", () => ({
    useTranslation: () => ({ t: (key: string) => key }),
}));

const day = (planned: number, limit: number) => [{ key: "column", label: null, planned, limit }];

describe("the capacity slots", () => {
    it("draws nothing for a column with no limit", () => {
        // A gauge on every column all week is clutter for someone who never asked to be counted.
        const { container } = render(<CapacityBar gauges={day(4, 0)} />);

        expect(container.textContent).toBe("");
    });

    it("draws one slot per task the limit allows, filled up to what is planned", () => {
        const { container } = render(<CapacityBar gauges={day(1, 3)} />);
        const slots = container.querySelectorAll("span.flex-1");

        expect(slots).toHaveLength(3);
        expect([...slots].filter((slot) => !slot.className.includes("bg-wp-track"))).toHaveLength(1);
        expect(container.textContent).toBe("1/3");
    });

    it("stays quiet at the limit, warns past it, and turns red when well over", () => {
        const { container: at } = render(<CapacityBar gauges={day(3, 3)} />);
        const { container: past } = render(<CapacityBar gauges={day(4, 3)} />);
        const { container: over } = render(<CapacityBar gauges={day(6, 3)} />);

        expect(at.innerHTML).not.toMatch(/wp-warn|wp-danger/);
        expect(past.innerHTML).toMatch(/wp-warn/);
        expect(over.innerHTML).toMatch(/wp-danger/);
    });

    it("becomes one bar when the slots would be too thin to read", () => {
        const { container } = render(<CapacityBar gauges={day(10, 40)} />);

        expect(container.querySelectorAll("span.flex-1")).toHaveLength(0);
        expect((container.querySelector("[style]") as HTMLElement).style.width).toBe("25%");
    });
});
