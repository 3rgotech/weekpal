import { describe, expect, it } from "@jest/globals";
import Task, { SomedayTask, WeeklyTask } from "../task";

describe("Task identity", () => {
  it("mints a uuid when none is supplied", () => {
    const task = new SomedayTask({ title: "Test" });

    expect(task.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
  });

  it("keeps a supplied id rather than replacing it", () => {
    const id = "01931c8f-7a2e-7c31-9f11-9c3a1b2d4e5f";

    expect(new SomedayTask({ title: "Test", id }).id).toBe(id);
  });

  it("gives two tasks distinct ids", () => {
    const first = new SomedayTask({ title: "One" });
    const second = new SomedayTask({ title: "Two" });

    expect(first.id).not.toBe(second.id);
  });

  it("has no separate server id", () => {
    const task = new SomedayTask({ title: "Test", serverId: 456 });

    expect(task.serverId).toBeUndefined();
  });
});

describe("Task.createFromApiData", () => {
  const row = {
    id: "01931c8f-7a2e-7c31-9f11-9c3a1b2d4e5f",
    title: "Ship the contract",
    description: "Everything lands",
    category_id: "01931c10-0000-7000-8000-000000000001",
    project_id: null,
    week_number: "2026w30",
    day_of_week: 3,
    order: 2,
    subtasks: [{ title: "Draft", completed: true }],
    completed_at: null,
    created_at: "2026-07-20T09:00:00Z",
    updated_at: "2026-07-24T13:41:00Z",
  };

  it("builds a weekly task when the row carries a week", () => {
    const task = Task.createFromApiData(row);

    expect(task).toBeInstanceOf(WeeklyTask);
    expect(task.id).toBe(row.id);
    expect(task.weekCode).toBe("2026w30");
    expect(task.categoryId).toBe(row.category_id);
    expect(task.order).toBe(2);
  });

  it("stringifies the day, because the board keys its columns by string", () => {
    expect(Task.createFromApiData(row).dayOfWeek).toBe("3");
  });

  it("keeps day zero as the this-week bucket rather than treating it as absent", () => {
    const task = Task.createFromApiData({ ...row, day_of_week: 0 });

    expect(task).toBeInstanceOf(WeeklyTask);
    expect(task.dayOfWeek).toBe("0");
  });

  it("builds a someday task when the row has no week", () => {
    const task = Task.createFromApiData({ ...row, week_number: null, day_of_week: null });

    expect(task).toBeInstanceOf(SomedayTask);
    expect(task.dayOfWeek).toBe("someday");
  });

  it("reads subtasks as an array", () => {
    expect(Task.createFromApiData(row).subtasks).toEqual([
      { title: "Draft", completed: true },
    ]);
  });

  it("returns null for an unusable row", () => {
    expect(Task.createFromApiData(null)).toBeNull();
    expect(Task.createFromApiData({ title: "No id" })).toBeNull();
  });
});

describe("Task.toApiPayload", () => {
  it("sends subtasks as an array, not a json string", () => {
    const task = new SomedayTask({
      title: "Test",
      subtasks: [{ title: "One", completed: false }],
    });

    const payload = task.toApiPayload();

    expect(Array.isArray(payload.subtasks)).toBe(true);
    expect(typeof payload.subtasks).not.toBe("string");
  });

  it("describes a someday task as one with no week and no day", () => {
    const payload = new SomedayTask({ title: "Test" }).toApiPayload();

    expect(payload.week_number).toBeNull();
    expect(payload.day_of_week).toBeNull();
  });

  it("sends the day as a number", () => {
    const payload = new WeeklyTask({
      title: "Test",
      weekCode: "2026w30",
      dayOfWeek: "4",
    }).toApiPayload();

    expect(payload.week_number).toBe("2026w30");
    expect(payload.day_of_week).toBe(4);
  });

  it("sends day zero rather than dropping it", () => {
    const payload = new WeeklyTask({
      title: "Test",
      weekCode: "2026w30",
      dayOfWeek: "0",
    }).toApiPayload();

    expect(payload.day_of_week).toBe(0);
  });

  it("round-trips through the API shape without changing identity", () => {
    const original = new WeeklyTask({
      title: "Test",
      weekCode: "2026w30",
      dayOfWeek: "2",
    });

    const restored = Task.createFromApiData({
      ...original.toApiPayload(),
      created_at: "2026-07-20T09:00:00Z",
    });

    expect(restored.id).toBe(original.id);
    expect(restored.title).toBe(original.title);
    expect(restored.weekCode).toBe(original.weekCode);
    expect(restored.dayOfWeek).toBe(original.dayOfWeek);
  });
});

/**
 * Dexie writes an object's own enumerable properties and rebuilds instances from what it read, so
 * the shape of a task *is* its storage schema. `dayOfWeek` behind an accessor would be stored
 * under the backing field's name and come back undefined — every task in IndexedDB losing its day.
 */
describe("what IndexedDB will store", () => {
    it("keeps the location fields as own properties", () => {
        const task = new WeeklyTask({ title: "Mow lawn", weekCode: "2026w35", dayOfWeek: "3" });
        const stored = { ...task };

        expect(Object.keys(stored)).toEqual(expect.arrayContaining(["id", "title", "weekCode", "dayOfWeek"]));
        expect(new WeeklyTask(stored).dayOfWeek).toBe("3");
        expect(new WeeklyTask(stored).weekCode).toBe("2026w35");
    });
});
