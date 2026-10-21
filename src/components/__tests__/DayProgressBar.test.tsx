import { describe, expect, it } from "@jest/globals";
import { render } from "@testing-library/react";
import React from "react";
import DayProgressBar from "../DayProgressBar";

jest.mock("react-i18next", () => ({
    useTranslation: () => ({ t: (key: string) => key }),
}));

const filled = (container: HTMLElement) =>
    [...container.querySelectorAll("span.flex-1")].filter((slot) => !slot.className.includes("bg-wp-track"));

describe("the day's progress slots", () => {
    it("draws nothing when the day has nothing on it", () => {
        const { container } = render(<DayProgressBar progress={null} />);

        expect(container.firstElementChild).toBeNull();
    });

    it("draws one slot per task, filled for those done, with the count beside it", () => {
        const { container } = render(<DayProgressBar progress={{ done: 1, total: 3 }} />);

        expect(container.querySelectorAll("span.flex-1")).toHaveLength(3);
        expect(filled(container)).toHaveLength(1);
        expect(container.textContent).toBe("1/3");
    });

    it("shows a single open slot for one task not yet done", () => {
        const { container } = render(<DayProgressBar progress={{ done: 0, total: 1 }} />);

        expect(container.querySelectorAll("span.flex-1")).toHaveLength(1);
        expect(filled(container)).toHaveLength(0);
    });

    it("becomes one bar when there are too many tasks to draw a slot each", () => {
        const { container } = render(<DayProgressBar progress={{ done: 10, total: 20 }} />);

        expect(container.querySelectorAll("span.flex-1")).toHaveLength(0);
        expect((container.querySelector("[style]") as HTMLElement).style.width).toBe("50%");
    });

    it("never warns: today is in the accent colour, other days in the muted one", () => {
        const { container: today } = render(<DayProgressBar progress={{ done: 1, total: 2 }} isToday />);
        const { container: other } = render(<DayProgressBar progress={{ done: 1, total: 2 }} />);

        expect(filled(today)[0].className).toContain("bg-wp-accent");
        expect(filled(other)[0].className).toContain("bg-wp-muted");
        expect(today.innerHTML + other.innerHTML).not.toMatch(/wp-warn|wp-danger/);
    });
});
