import { describe, it, expect, beforeEach } from "vitest";
import {
  addSocket,
  removeSocket,
  removeSocketFromAll,
  getActiveUserCount,
} from "./session-presence.js";

// The module uses module-level Maps, so we need a way to reset state.
// We re-import indirectly through the public API and rely on cleanup symmetry.

describe("session-presence", () => {
  const S1 = "session-1";
  const S2 = "session-2";
  const U1 = "user-1";
  const U2 = "user-2";
  const SK1 = "socket-1";
  const SK2 = "socket-2";
  const SK3 = "socket-3";

  beforeEach(() => {
    // Clean up any state from previous tests
    removeSocketFromAll(SK1, U1);
    removeSocketFromAll(SK2, U2);
    removeSocketFromAll(SK3, U1);
    removeSocketFromAll(SK2, U1);
  });

  it("starts with zero users", () => {
    expect(getActiveUserCount(S1)).toBe(0);
  });

  it("counts one user after a socket joins", () => {
    addSocket(S1, U1, SK1);
    expect(getActiveUserCount(S1)).toBe(1);
  });

  it("counts distinct users, not sockets", () => {
    addSocket(S1, U1, SK1);
    addSocket(S1, U1, SK2);
    expect(getActiveUserCount(S1)).toBe(1);
  });

  it("counts multiple different users", () => {
    addSocket(S1, U1, SK1);
    addSocket(S1, U2, SK2);
    expect(getActiveUserCount(S1)).toBe(2);
  });

  it("does not decrement count until ALL sockets of a user leave", () => {
    addSocket(S1, U1, SK1);
    addSocket(S1, U1, SK2);

    removeSocket(S1, U1, SK1);
    expect(getActiveUserCount(S1)).toBe(1);

    removeSocket(S1, U1, SK2);
    expect(getActiveUserCount(S1)).toBe(0);
  });

  it("removeSocketFromAll cleans up across sessions and returns affected IDs", () => {
    addSocket(S1, U1, SK1);
    addSocket(S2, U1, SK1);
    expect(getActiveUserCount(S1)).toBe(1);
    expect(getActiveUserCount(S2)).toBe(1);

    const affected = removeSocketFromAll(SK1, U1);
    expect(affected).toHaveLength(2);
    expect(affected).toContain(S1);
    expect(affected).toContain(S2);
    expect(getActiveUserCount(S1)).toBe(0);
    expect(getActiveUserCount(S2)).toBe(0);
  });

  it("removeSocketFromAll returns empty array for unknown socket", () => {
    expect(removeSocketFromAll("unknown", U1)).toEqual([]);
  });

  it("removeSocket is a no-op for unknown session", () => {
    removeSocket("no-such-session", U1, SK1);
    expect(getActiveUserCount("no-such-session")).toBe(0);
  });

  it("tracks sessions independently", () => {
    addSocket(S1, U1, SK1);
    addSocket(S2, U2, SK2);

    expect(getActiveUserCount(S1)).toBe(1);
    expect(getActiveUserCount(S2)).toBe(1);

    removeSocket(S1, U1, SK1);
    expect(getActiveUserCount(S1)).toBe(0);
    expect(getActiveUserCount(S2)).toBe(1);
  });
});
