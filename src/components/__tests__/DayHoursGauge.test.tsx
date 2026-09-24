import { describe, expect, it, jest } from "@jest/globals";
import { render } from "@testing-library/react";
import React from "react";
import DayHoursGauge from "../DayHoursGauge";

jest.mock("react-i18next", () => ({
    useTranslation: () => ({
        t: (key: string, options?: any) => (options?.time ? `${options.time} free` : key),
    }),
}));

/**
 * *(rt §5)* Declared work against the hours no meeting has already taken — the reading a task
 * count cannot give.
 */
describe("the hours gauge", () => {
    it("draws nothing for a day that cannot honestly be measured", () => {
        // No working day set, or nothing estimated. Most days, for most people.
        const { container } = render(<DayHoursGauge hours={null} />);

        expect(container.textContent).toBe("");
    });

    it("reports the work against what the calendar left, not against the whole day", () => {
        const { container } = render(<DayHoursGauge hours={{
            planned: 120, available: 240, booked: 240, unestimated: 0, level: "ok",
        }} />);

        expect(container.textContent).toContain("~2h");
        expect(container.textContent).toContain("~4h free");
        // Never the nominal day length — the number that matters is what is left.
        expect(container.textContent).not.toContain("~8h");
    });

    it("warns at the limit", () => {
        const { container } = render(<DayHoursGauge hours={{
            planned: 240, available: 240, booked: 240, unestimated: 0, level: "at",
        }} />);

        expect(container.innerHTML).toMatch(/wp-warn/);
    });

    it("warns in danger past it", () => {
        const { container } = render(<DayHoursGauge hours={{
            planned: 600, available: 240, booked: 240, unestimated: 0, level: "over",
        }} />);

        expect(container.innerHTML).toMatch(/wp-danger/);
    });

    it("reuses the capacity colours rather than inventing a third vocabulary", () => {
        // A board should not have two different ways of saying "this is too much".
        const { container } = render(<DayHoursGauge hours={{
            planned: 60, available: 240, booked: 0, unestimated: 0, level: "ok",
        }} />);

        expect(container.innerHTML).not.toMatch(/wp-warn|wp-danger/);
    });

    it("says so plainly when a day has no time left", () => {
        const { container } = render(<DayHoursGauge hours={{
            planned: 30, available: 0, booked: 480, unestimated: 0, level: "over",
        }} />);

        expect(container.textContent).toContain("estimate.no_time");
    });
});
