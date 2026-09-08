import { afterEach, describe, expect, it } from "@jest/globals";
import { WeeklyTask, SomedayTask } from "../../data/task";
import { claimEverything, claimPosition, dirtyBetween, mergeDirty } from "../taskDirty";
import { resetSyncClock } from "../syncClock";

/**
 * What a write claims to change.
 *
 * The map is derived from a diff rather than declared by the caller, precisely so no call site
 * can forget a field — a forgotten claim looks identical to a field nobody touched, and no test
 * at the call site could tell them apart.
 */
afterEach(() => resetSyncClock());

const weekly = (overrides: Record<string, any> = {}) => new WeeklyTask({
    id: "01930000-0000-7000-8000-000000000001",
    title: "A task",
    weekCode: "2026w37",
    dayOfWeek: "3",
    order: 1,
    subtasks: [],
    ...overrides,
});

const fields = (map: Record<string, string>) => Object.keys(map).sort();

describe("diffing a write against what is stored", () => {
    it("claims everything for a task the database has never seen", () => {
        // Nothing to diff against, and nothing on the server to lose to.
        expect(fields(dirtyBetween(undefined, weekly()))).toEqual(
            fields(claimEverything())
        );
    });

    it("claims nothing when nothing changed", () => {
        // The payload still goes up and still heals anything that had drifted — it simply does
        // not claim to be news.
        expect(dirtyBetween(weekly(), weekly())).toEqual({});
    });

    it("claims only the field that moved", () => {
        expect(fields(dirtyBetween(weekly(), weekly({ title: "Renamed" })))).toEqual(["title"]);
    });

    it("treats week, day and order as one position", () => {
        // Resolved separately, two devices moving the same card can each win a different column
        // and leave it somewhere neither user chose.
        expect(fields(dirtyBetween(weekly(), weekly({ dayOfWeek: "5" })))).toEqual(["position"]);
        expect(fields(dirtyBetween(weekly(), weekly({ order: 9 })))).toEqual(["position"]);
        expect(fields(dirtyBetween(weekly(), weekly({ weekCode: "2026w38" })))).toEqual(["position"]);
    });

    it("counts a drop into Some day as a position change", () => {
        const someday = new SomedayTask({
            id: "01930000-0000-7000-8000-000000000001",
            title: "A task",
            order: 1,
            subtasks: [],
        });

        expect(fields(dirtyBetween(weekly(), someday))).toEqual(["position"]);
    });

    it("claims subtasks as a whole array", () => {
        const changed = weekly({ subtasks: [{ title: "New", completed: false }] });

        expect(fields(dirtyBetween(weekly(), changed))).toEqual(["subtasks"]);
    });

    it("does not confuse an absent value with an empty one", () => {
        expect(dirtyBetween(weekly({ description: undefined }), weekly({ description: null })))
            .toEqual({});
    });

    it("claims several fields when a gesture changed several", () => {
        const changed = weekly({ title: "Renamed", dayOfWeek: "5" });

        expect(fields(dirtyBetween(weekly(), changed))).toEqual(["position", "title"]);
    });
});

describe("merging two sets of claims", () => {
    it("keeps the later stamp for a field in both", () => {
        const merged = mergeDirty(
            { title: "2026-09-08T10:00:00.000000Z" },
            { title: "2026-09-08T11:00:00.000000Z" }
        );

        expect(merged.title).toBe("2026-09-08T11:00:00.000000Z");
    });

    it("keeps the earlier stamp when the incoming one is older", () => {
        const merged = mergeDirty(
            { title: "2026-09-08T11:00:00.000000Z" },
            { title: "2026-09-08T10:00:00.000000Z" }
        );

        expect(merged.title).toBe("2026-09-08T11:00:00.000000Z");
    });

    it("keeps claims the newer gesture did not touch", () => {
        // "Newest entry wins" would drop the title claim here, which is exactly the loss the
        // map exists to prevent.
        const merged = mergeDirty(
            { title: "2026-09-08T10:00:00.000000Z" },
            claimPosition()
        );

        expect(fields(merged)).toEqual(["position", "title"]);
    });

    it("survives having nothing to merge into", () => {
        expect(fields(mergeDirty(undefined, { title: "2026-09-08T10:00:00.000000Z" })))
            .toEqual(["title"]);
    });
});
