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
    "dayCapacityCategories",
    "somedayLimit",
    "thisWeekLimit",
    "hardLimits",
    "completionResort",
    "workingDayHours",
    "subtaskDisplay",
    "onboardingVersion",
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

  it("leaves a ticked task where it was written", () => {
    // *(rt §4)* Moving it destroys spatial memory — the card someone has been looking at all
    // morning jumps, and every card below it shifts up — at the one moment the board should be
    // quiet. The other behaviour is a real preference, so it is offered, not assumed.
    expect(DEFAULT_SETTINGS.completionResort).toBe(false);
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

  it("keeps the Some day limit separate from the per-day one", () => {
    expect(DEFAULT_SETTINGS.somedayLimit).toBe(0);
    expect(withDefaults({ dayCapacity: 6 }).somedayLimit).toBe(0);
    expect(withDefaults({ somedayLimit: 20 }).dayCapacity).toBe(0);
    expect(withDefaults({ somedayLimit: -4 }).somedayLimit).toBe(0);
  });

  it("counts every category toward the day limit until told otherwise", () => {
    // Empty is "everything", matching how the board's own filter stores a selection — so a
    // limit nobody has narrowed counts the whole day.
    expect(DEFAULT_SETTINGS.dayCapacityCategories).toEqual([]);
    expect(withDefaults({ dayCapacityCategories: "work" }).dayCapacityCategories).toEqual([]);
    expect(withDefaults({ dayCapacityCategories: ["work", 4] }).dayCapacityCategories)
      .toEqual(["work"]);
  });

  it("leaves limits soft unless asked otherwise", () => {
    // Every limit warned and nothing else before the prompt existed.
    expect(DEFAULT_SETTINGS.hardLimits).toBe(false);
    expect(withDefaults({}).hardLimits).toBe(false);
    expect(withDefaults({ hardLimits: true }).hardLimits).toBe(true);
  });

  it("repairs a week start that is not a day", () => {
    expect(withDefaults({ weekStartsOn: 0 }).weekStartsOn).toBe(1);
    expect(withDefaults({ weekStartsOn: 8 }).weekStartsOn).toBe(1);
    expect(withDefaults({ weekStartsOn: "monday" }).weekStartsOn).toBe(1);
  });
});

/**
 * The first-run tour's record of itself.
 *
 * A number rather than a flag, so a reworked tour can be offered again. Everything here turns on
 * 0 meaning "has finished none of them" — the value a browser with nothing stored must produce.
 */
describe("onboardingVersion", () => {
  it("starts at zero, so a browser with nothing stored is offered the tour", () => {
    expect(withDefaults(null).onboardingVersion).toBe(0);
  });

  it("keeps a version that was actually stored", () => {
    expect(withDefaults({ onboardingVersion: 2 }).onboardingVersion).toBe(2);
  });

  it("reads settings saved before the field existed as zero", () => {
    // Every browser that has used the board until now. They are offered the tour, which during a
    // beta is the point — those are the people whose first impression is worth having.
    expect(withDefaults({ theme: "dark" }).onboardingVersion).toBe(0);
  });

  it("reads a hand-edited value as zero rather than trusting it", () => {
    // Offering a tour twice is a small cost. A localStorage edit that suppresses it permanently
    // is a support conversation nobody can diagnose.
    for (const bad of ["3", 1.5, true, null, {}]) {
      expect(withDefaults({ onboardingVersion: bad }).onboardingVersion).toBe(0);
    }
  });
});
