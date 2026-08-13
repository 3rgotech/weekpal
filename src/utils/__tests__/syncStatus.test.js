import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import {
  getSyncHealth,
  reportSyncFailure,
  reportSyncHealth,
  resetSyncHealth,
  subscribeToSyncHealth,
} from "../syncStatus";

beforeEach(() => {
  resetSyncHealth();
});

describe("sync health", () => {
  it("starts out fine", () => {
    expect(getSyncHealth()).toBe("ok");
  });

  it("raises the alarm only for failures that concern our standing with the backend", () => {
    reportSyncFailure("transient");
    expect(getSyncHealth()).toBe("ok");

    reportSyncFailure("permanent");
    expect(getSyncHealth()).toBe("ok");

    reportSyncFailure("conflict");
    expect(getSyncHealth()).toBe("ok");
  });

  it("reports an expired session", () => {
    reportSyncFailure("unauthorized");

    expect(getSyncHealth()).toBe("unauthorized");
  });

  it("reports the retention gate separately from an expired session", () => {
    reportSyncFailure("forbidden");

    expect(getSyncHealth()).toBe("forbidden");
  });

  it("clears once something gets through again", () => {
    reportSyncFailure("unauthorized");
    reportSyncHealth("ok");

    expect(getSyncHealth()).toBe("ok");
  });

  it("gives a new subscriber the current state immediately", () => {
    reportSyncFailure("unauthorized");

    const listener = jest.fn();
    subscribeToSyncHealth(listener);

    expect(listener).toHaveBeenCalledWith("unauthorized");
  });

  it("notifies subscribers when the state changes", () => {
    const listener = jest.fn();
    subscribeToSyncHealth(listener);
    listener.mockClear();

    reportSyncFailure("forbidden");

    expect(listener).toHaveBeenCalledWith("forbidden");
  });

  it("does not notify when nothing changed", () => {
    const listener = jest.fn();
    subscribeToSyncHealth(listener);
    listener.mockClear();

    reportSyncHealth("ok");

    expect(listener).not.toHaveBeenCalled();
  });

  it("stops notifying after unsubscribe", () => {
    const listener = jest.fn();
    const unsubscribe = subscribeToSyncHealth(listener);
    unsubscribe();
    listener.mockClear();

    reportSyncFailure("unauthorized");

    expect(listener).not.toHaveBeenCalled();
  });
});
