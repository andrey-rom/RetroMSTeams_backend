import { describe, it, expect } from "vitest";
import { generateOwnerHash } from "./hash.js";

describe("generateOwnerHash", () => {
  it("returns a 64-char hex string", () => {
    const hash = generateOwnerHash("user-1", "session-1");
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is deterministic for the same inputs", () => {
    const a = generateOwnerHash("user-1", "session-1");
    const b = generateOwnerHash("user-1", "session-1");
    expect(a).toBe(b);
  });

  it("differs when userId changes", () => {
    const a = generateOwnerHash("user-1", "session-1");
    const b = generateOwnerHash("user-2", "session-1");
    expect(a).not.toBe(b);
  });

  it("differs when sessionId changes", () => {
    const a = generateOwnerHash("user-1", "session-1");
    const b = generateOwnerHash("user-1", "session-2");
    expect(a).not.toBe(b);
  });
});
