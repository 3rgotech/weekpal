import { describe, expect, it } from "@jest/globals";
import Event from "../event";

/**
 * The API sends snake_case for events, unlike settings.
 *
 * Handing a raw API row straight to the constructor produced an event with no
 * week, no day and no times — every field read `undefined` and defaulted to null,
 * so it simply vanished from the board instead of failing anywhere visible.
 */
describe("Event.createFromApiData", () => {
  const row = {
    id: "01931c8f-7a2e-7c31-9f11-9c3a1b2d4e5f",
    user_calendar_id: "01931c20-0000-7000-8000-000000000001",
    category_id: "01931c10-0000-7000-8000-000000000002",
    week_number: "2026w30",
    day_of_week: 3,
    start_hour: "09:30",
    end_hour: "10:45",
    title: "Dentist",
    description: "Second floor",
  };

  it("maps every snake_case field across", () => {
    const event = Event.createFromApiData(row);

    expect(event.id).toBe(row.id);
    expect(event.title).toBe("Dentist");
    expect(event.weekCode).toBe("2026w30");
    expect(event.startHour).toBe("09:30");
    expect(event.endHour).toBe("10:45");
    expect(event.categoryId).toBe(row.category_id);
  });

  it("stringifies the day, matching how the board keys its columns", () => {
    expect(Event.createFromApiData(row).dayOfWeek).toBe("3");
  });

  it("renders a time range", () => {
    expect(Event.createFromApiData(row).hours).toBe("09:30 - 10:45");
  });

  it("treats an event with no times as all day", () => {
    const event = Event.createFromApiData({
      ...row,
      start_hour: null,
      end_hour: null,
    });

    expect(event.isAllDay).toBe(true);
    expect(event.hours).toBeNull();
  });

  it("is not all day when it has times", () => {
    expect(Event.createFromApiData(row).isAllDay).toBe(false);
  });

  it("returns null for an unusable row", () => {
    expect(Event.createFromApiData(null)).toBeNull();
    expect(Event.createFromApiData({ title: "No id" })).toBeNull();
  });

  it("keeps the server's id rather than minting one", () => {
    // Events are server-created, so an id invented here would be replaced on the
    // next pull and duplicate the event in IndexedDB.
    expect(Event.createFromApiData(row).id).toBe(row.id);
  });
});
