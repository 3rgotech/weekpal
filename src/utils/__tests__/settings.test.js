import { describe, expect, it } from "@jest/globals";
import { DEFAULT_SETTINGS, withDefaults } from "../settings";

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
    "workingDays",
    "showNonWorkingDays",
    "weekStartsOn",
    "dayCapacity",
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

  it("shows events and completed tasks by default", () => {
    expect(DEFAULT_SETTINGS.showEvents).toBe(true);
    expect(DEFAULT_SETTINGS.showCompletedTasks).toBe(true);
  });

  it("draws the board it always drew: Monday to Friday, weekend beside them", () => {
    expect(DEFAULT_SETTINGS.workingDays).toEqual([1, 2, 3, 4, 5]);
    expect(DEFAULT_SETTINGS.showNonWorkingDays).toBe(true);
    expect(DEFAULT_SETTINGS.weekStartsOn).toBe(1);
  });

  it("matches the server's defaults for the constrained fields", () => {
    expect(DEFAULT_SETTINGS.theme).toBe("system");
    expect(DEFAULT_SETTINGS.language).toBe("en");
    expect(DEFAULT_SETTINGS.subtaskDisplay).toBe("percentage");
  });
});

/**
 * localStorage holds one blob written by whichever version of the app saved it last, so a
 * returning browser is a partial object — this is what stops a field added today reading as
 * `undefined` on every board that has been used before.
 */
describe("withDefaults", () => {
  it("fills in the fields a stored object predates", () => {
    const stored = { theme: "dark", showEvents: false };

    expect(withDefaults(stored)).toEqual({
      ...DEFAULT_SETTINGS,
      theme: "dark",
      showEvents: false,
    });
  });

  it("keeps what was stored", () => {
    const settings = withDefaults({ workingDays: [6, 7], weekStartsOn: 6 });

    expect(settings.workingDays).toEqual([6, 7]);
    expect(settings.weekStartsOn).toBe(6);
  });

  it("returns the defaults for nothing at all", () => {
    expect(withDefaults(null)).toEqual(DEFAULT_SETTINGS);
    expect(withDefaults(undefined)).toEqual(DEFAULT_SETTINGS);
  });

  it("repairs a working week that could not be drawn", () => {
    // An empty set would leave the board with no day columns; duplicates and days outside
    // 1–7 would put it in a state nothing downstream expects.
    expect(withDefaults({ workingDays: [] }).workingDays).toEqual([1, 2, 3, 4, 5]);
    expect(withDefaults({ workingDays: "every day" }).workingDays).toEqual([1, 2, 3, 4, 5]);
    expect(withDefaults({ workingDays: [3, 9, 3, 1] }).workingDays).toEqual([1, 3]);
  });

  it("leaves the day-capacity warning off unless it was set", () => {
    expect(DEFAULT_SETTINGS.dayCapacity).toBe(0);
    expect(withDefaults({}).dayCapacity).toBe(0);
    expect(withDefaults({ dayCapacity: 6 }).dayCapacity).toBe(6);
    expect(withDefaults({ dayCapacity: -1 }).dayCapacity).toBe(0);
  });

  it("repairs a week start that is not a day", () => {
    expect(withDefaults({ weekStartsOn: 0 }).weekStartsOn).toBe(1);
    expect(withDefaults({ weekStartsOn: 8 }).weekStartsOn).toBe(1);
    expect(withDefaults({ weekStartsOn: "monday" }).weekStartsOn).toBe(1);
  });
});
