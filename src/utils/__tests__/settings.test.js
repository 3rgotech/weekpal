import { describe, expect, it } from "@jest/globals";
import { DEFAULT_SETTINGS } from "../settings";

/**
 * These defaults must stay in step with `App\Support\BoardSettings::defaults()`.
 *
 * They had already drifted once: `showEvents` and `showWeekend` were declared on
 * the `Settings` type but missing here, so a fresh browser started with them
 * undefined — which every call site reads as false. The board therefore hid
 * weekends and events by default, silently, for anyone with no stored settings.
 */
describe("DEFAULT_SETTINGS", () => {
  const EXPECTED_KEYS = [
    "theme",
    "language",
    "dayHeaderFormat",
    "weekHeaderFormat",
    "showCompletedTasks",
    "showEvents",
    "showWeekend",
    "subtaskDisplay",
  ];

  it("declares every field the Settings type requires", () => {
    expect(Object.keys(DEFAULT_SETTINGS).sort()).toEqual([...EXPECTED_KEYS].sort());
  });

  it("leaves no field undefined", () => {
    for (const key of EXPECTED_KEYS) {
      expect(DEFAULT_SETTINGS[key]).toBeDefined();
    }
  });

  it("shows weekends and events by default", () => {
    expect(DEFAULT_SETTINGS.showWeekend).toBe(true);
    expect(DEFAULT_SETTINGS.showEvents).toBe(true);
    expect(DEFAULT_SETTINGS.showCompletedTasks).toBe(true);
  });

  it("matches the server's defaults for the constrained fields", () => {
    expect(DEFAULT_SETTINGS.theme).toBe("system");
    expect(DEFAULT_SETTINGS.language).toBe("en");
    expect(DEFAULT_SETTINGS.subtaskDisplay).toBe("percentage");
  });
});
