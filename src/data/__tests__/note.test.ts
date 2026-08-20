import { describe, expect, it } from "@jest/globals";
import Note from "../note";
import HistoryEntry from "../history";

describe("Note", () => {
  it("mints a uuid so a note written offline can be sent as-is", () => {
    const note = new Note({ taskId: "task-1", body: "Ring the plumber" });

    expect(note.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
  });

  it("sends only the body, since everything else is the server's to decide", () => {
    const note = new Note({ taskId: "task-1", body: "Ring the plumber" });

    expect(note.toApiData()).toEqual({ body: "Ring the plumber" });
  });

  it("reads the API's snake_case shape", () => {
    const note = Note.createFromApiData({
      id: "01931c8f-7a2e-7c31-9f11-9c3a1b2d4e5f",
      task_id: "01931c8f-7a2e-7c31-9f11-000000000001",
      body: "Rescheduled to Friday",
      created_at: "2026-08-01T09:00:00+00:00",
      updated_at: null,
    });

    expect(note.id).toBe("01931c8f-7a2e-7c31-9f11-9c3a1b2d4e5f");
    expect(note.taskId).toBe("01931c8f-7a2e-7c31-9f11-000000000001");
    expect(note.body).toBe("Rescheduled to Friday");
    expect(note.updatedAt).toBeNull();
  });

  it("serializes dates as strings, because Dexie cannot store a Dayjs", () => {
    const note = Note.createFromApiData({
      id: "01931c8f-7a2e-7c31-9f11-9c3a1b2d4e5f",
      task_id: "task-1",
      body: "x",
      created_at: "2026-08-01T09:00:00+00:00",
    });

    expect(typeof note.serialize().createdAt).toBe("string");
  });
});

describe("HistoryEntry", () => {
  it("lists the fields an entry touched", () => {
    const entry = HistoryEntry.createFromApiData({
      id: "01931c8f-7a2e-7c31-9f11-9c3a1b2d4e5f",
      task_id: "task-1",
      event: "updated",
      changes: {
        title: { from: "Old", to: "New" },
        day_of_week: { from: 2, to: 4 },
      },
      created_at: "2026-08-01T09:00:00+00:00",
    });

    expect(entry.changedFields()).toEqual(["title", "day_of_week"]);
  });

  it("treats an event with no diff as having no changed fields", () => {
    // `created` and `completed` carry no `changes` — there is nothing to compare against.
    const entry = HistoryEntry.createFromApiData({
      id: "01931c8f-7a2e-7c31-9f11-9c3a1b2d4e5f",
      task_id: "task-1",
      event: "created",
      changes: null,
      created_at: "2026-08-01T09:00:00+00:00",
    });

    expect(entry.changes).toBeNull();
    expect(entry.changedFields()).toEqual([]);
  });
});
