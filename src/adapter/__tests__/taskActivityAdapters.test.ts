/**
 * @jest-environment node
 *
 * The adapters speak HTTP and touch no DOM. jsdom does not expose Node's fetch stack — no
 * `Response`, no `TextEncoder` — which ky needs the moment it is imported, so this file runs in
 * the node environment rather than pulling in a fetch polyfill just for the test.
 */
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import APITaskNoteAdapter from "../api/APITaskNoteAdapter";
import APITaskHistoryAdapter from "../api/APITaskHistoryAdapter";
import Note from "../../data/note";

const TASK = "01931c8f-7a2e-7c31-9f11-000000000001";
const NOTE = "01931c8f-7a2e-7c31-9f11-000000000002";

let calls: Array<{ url: string; method: string; body: string | null }>;

const respondWith = (payload: unknown, status = 200) => {
  (globalThis as any).fetch = jest.fn(async (request: any) => {
    // ky hands fetch a fully-built Request, and its body must be read: leaving the stream
    // unconsumed hangs the call rather than failing it, which looks exactly like a timeout.
    calls.push({
      url: request.url,
      method: request.method.toUpperCase(),
      body: request.body ? await request.text() : null,
    });

    return new Response(status === 204 ? null : JSON.stringify(payload), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  });
};

beforeEach(() => {
  calls = [];
});

describe("APITaskNoteAdapter", () => {
  it("reads a task's notes from the nested route", async () => {
    respondWith({
      data: [
        { id: NOTE, task_id: TASK, body: "First", created_at: "2026-08-01T09:00:00+00:00" },
      ],
    });

    const notes = await new APITaskNoteAdapter("https://example.test/api/v1", "token").list(TASK);

    expect(calls[0].url).toBe(`https://example.test/api/v1/tasks/${TASK}/notes`);
    expect(calls[0].method).toBe("GET");
    expect(notes).toHaveLength(1);
    expect(notes[0].body).toBe("First");
  });

  it("PUTs a note under the client's own id, so a retry updates rather than duplicates", async () => {
    respondWith({ data: { id: NOTE, task_id: TASK, body: "Ring the plumber" } });

    const note = new Note({ id: NOTE, taskId: TASK, body: "Ring the plumber" });
    await new APITaskNoteAdapter("https://example.test/api/v1", "token").upsert(note);

    expect(calls[0].method).toBe("PUT");
    expect(calls[0].url).toBe(`https://example.test/api/v1/tasks/${TASK}/notes/${NOTE}`);
    // Only the body: id and timestamps are not the client's to set.
    expect(JSON.parse(calls[0].body!)).toEqual({ body: "Ring the plumber" });
  });

  it("addresses a delete by task as well as id", async () => {
    respondWith(null, 204);

    await new APITaskNoteAdapter("https://example.test/api/v1", "token").delete(TASK, NOTE);

    expect(calls[0].method).toBe("DELETE");
    expect(calls[0].url).toBe(`https://example.test/api/v1/tasks/${TASK}/notes/${NOTE}`);
  });

  it("survives a response with no notes", async () => {
    respondWith({ data: [] });

    await expect(
      new APITaskNoteAdapter("https://example.test/api/v1", "token").list(TASK)
    ).resolves.toEqual([]);
  });
});

describe("APITaskHistoryAdapter", () => {
  it("keeps the API's newest-first order rather than reversing it", async () => {
    // The endpoint orders by created_at descending. Re-sorting client-side would put the
    // oldest entry at the top of a changelog, which is the wrong way round to read one.
    respondWith({
      data: [
        { id: "c", task_id: TASK, event: "completed", changes: null, created_at: "2026-08-03T09:00:00+00:00" },
        { id: "b", task_id: TASK, event: "updated", changes: { title: { from: "A", to: "B" } }, created_at: "2026-08-02T09:00:00+00:00" },
        { id: "a", task_id: TASK, event: "created", changes: null, created_at: "2026-08-01T09:00:00+00:00" },
      ],
    });

    const history = await new APITaskHistoryAdapter("https://example.test/api/v1", "token").list(TASK);

    expect(calls[0].url).toBe(`https://example.test/api/v1/tasks/${TASK}/history`);
    expect(history.map((entry) => entry.id)).toEqual(["c", "b", "a"]);
    expect(history[1].changedFields()).toEqual(["title"]);
  });
});
