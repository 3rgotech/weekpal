import { describe, expect, it } from "@jest/globals";
import { classifyFailure, SyncError } from "../SyncService";

/**
 * The queue drains oldest-first and stops at the first entry that still needs retrying, so this
 * classification decides whether a failure blocks everything behind it or steps aside. Getting
 * it wrong in either direction is expensive: a permanent failure treated as transient jams the
 * queue forever, and a transient one treated as permanent throws the write away.
 */
describe("classifyFailure", () => {
  const withStatus = (status) => ({ response: { status } });

  it("treats a validation failure as permanent", () => {
    // A 422 will fail identically however many times it is retried — this is the case that
    // used to stall the whole queue behind it.
    expect(classifyFailure(withStatus(422))).toBe("permanent");
  });

  it("treats an id owned by someone else as a conflict", () => {
    expect(classifyFailure(withStatus(409))).toBe("conflict");
  });

  it("distinguishes an expired session from a plan limit", () => {
    expect(classifyFailure(withStatus(401))).toBe("unauthorized");
    expect(classifyFailure(withStatus(403))).toBe("forbidden");
  });

  it("treats server errors and rate limiting as transient", () => {
    expect(classifyFailure(withStatus(500))).toBe("transient");
    expect(classifyFailure(withStatus(503))).toBe("transient");
    expect(classifyFailure(withStatus(429))).toBe("transient");
  });

  it("treats a request that never got a response as transient", () => {
    expect(classifyFailure(new TypeError("Failed to fetch"))).toBe("transient");
    expect(classifyFailure(undefined)).toBe("transient");
  });

  it("treats other client errors as permanent", () => {
    expect(classifyFailure(withStatus(400))).toBe("permanent");
    expect(classifyFailure(withStatus(404))).toBe("permanent");
  });

  it("reads the kind straight off a SyncError", () => {
    expect(classifyFailure(new SyncError("gone", "permanent"))).toBe("permanent");
    expect(classifyFailure(new SyncError("no adapter", "transient"))).toBe("transient");
  });

  it("reads a status placed directly on the error", () => {
    expect(classifyFailure({ status: 422 })).toBe("permanent");
  });
});
