import { describe, expect, it } from "@jest/globals";
import { bookedMinutes, dayHours, minutesOfDay } from "../hours";
import Event from "../../data/event";
import { WeeklyTask } from "../../data/task";

/**
 * *(rt §5)* Six tasks on a day with four hours of meetings is catastrophic; six on an empty day
 * is a Tuesday. Counting tasks fires identically for both, which teaches people to ignore the
 * warning — worse than having none, because it also spends the next one.
 */
const event = (startHour: string | null, endHour: string | null) => new Event({
    id: `01930000-0000-7000-8000-0000000000${Math.random().toString(16).slice(2, 4)}`,
    title: "A meeting",
    weekCode: "2026w37",
    dayOfWeek: "2",
    startHour,
    endHour,
});

const task = (n: number, estimatedMinutes: number | null = null) => new WeeklyTask({
    id: `01930000-0000-7000-8000-00000000000${n}`,
    title: `Task ${n}`,
    weekCode: "2026w37",
    dayOfWeek: "2",
    order: n,
    subtasks: [],
    estimatedMinutes,
});

describe("reading a clock time", () => {
    it("reads hours and minutes", () => {
        expect(minutesOfDay("09:30")).toBe(570);
        expect(minutesOfDay("00:00")).toBe(0);
    });

    it("tolerates seconds", () => {
        expect(minutesOfDay("14:00:00")).toBe(840);
    });

    it("refuses nonsense rather than guessing", () => {
        expect(minutesOfDay(null)).toBeNull();
        expect(minutesOfDay("")).toBeNull();
        expect(minutesOfDay("lunchtime")).toBeNull();
        expect(minutesOfDay("25:00")).toBeNull();
        expect(minutesOfDay("09:73")).toBeNull();
    });
});

describe("what the calendar has already taken", () => {
    it("adds up separate meetings", () => {
        expect(bookedMinutes([event("09:00", "10:00"), event("14:00", "15:30")])).toBe(150);
    });

    it("counts overlapping meetings once", () => {
        // Two meetings booked over each other take an hour of your day, not two. Double-counting
        // would report a day as more than full while it still had an afternoon in it.
        expect(bookedMinutes([event("09:00", "10:00"), event("09:30", "10:00")])).toBe(60);
    });

    it("merges a chain of overlaps", () => {
        expect(bookedMinutes([
            event("09:00", "10:00"), event("09:45", "11:00"), event("10:30", "12:00"),
        ])).toBe(180);
    });

    it("keeps a gap between blocks", () => {
        expect(bookedMinutes([event("09:00", "10:00"), event("11:00", "12:00")])).toBe(120);
    });

    it("ignores an all-day event", () => {
        // "Family day" and "Q3 launch" are both all-day and only one means no work will happen.
        // Guessing wrong towards "no work is possible" would blank out the board.
        expect(bookedMinutes([event(null, null)])).toBe(0);
    });

    it("ignores a meeting that ends before it starts", () => {
        expect(bookedMinutes([event("15:00", "09:00")])).toBe(0);
    });

    it("says zero for a day with nothing in it", () => {
        expect(bookedMinutes([])).toBe(0);
    });
});

describe("measuring a day", () => {
    it("declines when the working day is not configured", () => {
        expect(dayHours([task(1, 60)], [], 0)).toBeNull();
    });

    it("declines when nothing carries an estimate", () => {
        // A day of unestimated tasks is not an empty day, and "0h of 8h" would be the fake zero
        // in a different costume.
        expect(dayHours([task(1), task(2)], [], 8)).toBeNull();
    });

    it("subtracts meetings from the day", () => {
        const measured = dayHours([task(1, 120)], [event("09:00", "13:00")], 8);

        expect(measured?.booked).toBe(240);
        expect(measured?.available).toBe(240);
        expect(measured?.planned).toBe(120);
        expect(measured?.level).toBe("ok");
    });

    it("finds the day that counting tasks would have called fine", () => {
        // Four hours of meetings and four hours of work: the count-based warning sees six
        // ordinary tasks and says nothing.
        const measured = dayHours(
            [task(1, 120), task(2, 120)],
            [event("09:00", "13:00")],
            8,
        );

        expect(measured?.level).toBe("at");
    });

    it("calls a day booked solid over as soon as anything is planned", () => {
        const measured = dayHours([task(1, 30)], [event("09:00", "17:00")], 8);

        expect(measured?.available).toBe(0);
        expect(measured?.level).toBe("over");
    });

    it("never reports less than no time left", () => {
        // More meetings than working hours is a real Tuesday, not a negative day.
        const measured = dayHours([task(1, 30)], [event("07:00", "20:00")], 8);

        expect(measured?.available).toBe(0);
    });

    it("still counts the unestimated so the total can say so", () => {
        const measured = dayHours([task(1, 60), task(2), task(3)], [], 8);

        expect(measured?.unestimated).toBe(2);
    });
});
