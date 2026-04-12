import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./sessions.repository.js", () => ({
  findById: vi.fn(),
  setTimerExpiresAt: vi.fn(),
  setCollectGraceAt: vi.fn(),
  updatePhase: vi.fn(),
  updateStatus: vi.fn(),
  claimTimerStart: vi.fn(),
}));

vi.mock("../../socket/emitters/board.emitter.js", () => ({
  emitPhaseChanged: vi.fn(),
  emitTimerStarted: vi.fn(),
  emitTimerExpired: vi.fn(),
  emitCollectGrace: vi.fn(),
}));

vi.mock("../../shared/utils/timer-manager.js", () => ({
  schedule: vi.fn(),
  cancel: vi.fn(),
}));

import { canTransition, advancePhase, startCollect } from "./sessions.service.js";
import * as repo from "./sessions.repository.js";
import { NotFoundError, AppError, ForbiddenError } from "../../shared/errors/app-error.js";

const mockedRepo = vi.mocked(repo);

function fakeSession(overrides = {}) {
  return {
    id: "s1",
    creatorId: "moderator",
    currentPhase: "collect" as const,
    currentStatus: "active" as const,
    collectTimerSeconds: 60,
    voteTimerSeconds: null,
    timerExpiresAt: null,
    collectGraceAt: null,
    ...overrides,
  };
}

beforeEach(() => vi.clearAllMocks());

describe("canTransition", () => {
  it("allows collect → vote", () => {
    expect(canTransition("collect", "vote")).toBe(true);
  });

  it("allows collect → summary", () => {
    expect(canTransition("collect", "summary")).toBe(true);
  });

  it("allows vote → summary", () => {
    expect(canTransition("vote", "summary")).toBe(true);
  });

  it("rejects summary → anything", () => {
    expect(canTransition("summary", "collect")).toBe(false);
    expect(canTransition("summary", "vote")).toBe(false);
  });

  it("rejects vote → collect", () => {
    expect(canTransition("vote", "collect")).toBe(false);
  });
});

describe("advancePhase", () => {
  it("throws NotFoundError for missing session", async () => {
    mockedRepo.findById.mockResolvedValue(null);
    await expect(advancePhase("s1", "vote", "user")).rejects.toThrow(NotFoundError);
  });

  it("throws ForbiddenError when non-moderator tries to advance", async () => {
    mockedRepo.findById.mockResolvedValue(fakeSession());
    await expect(advancePhase("s1", "vote", "not-moderator")).rejects.toThrow(ForbiddenError);
  });

  it("throws AppError for invalid transition", async () => {
    mockedRepo.findById.mockResolvedValue(fakeSession({ currentPhase: "summary" }));
    await expect(advancePhase("s1", "vote", "moderator")).rejects.toThrow(AppError);
  });

  it("advances collect → vote", async () => {
    const updated = fakeSession({ currentPhase: "vote" });
    mockedRepo.findById.mockResolvedValue(fakeSession());
    mockedRepo.updatePhase.mockResolvedValue(updated);

    const result = await advancePhase("s1", "vote", "moderator");
    expect(mockedRepo.updatePhase).toHaveBeenCalledWith("s1", "vote");
    expect(result).toEqual(updated);
  });

  it("sets status to completed when advancing to summary", async () => {
    const updated = fakeSession({ currentPhase: "summary" });
    mockedRepo.findById.mockResolvedValue(fakeSession({ currentPhase: "vote" }));
    mockedRepo.updatePhase.mockResolvedValue(updated);

    await advancePhase("s1", "summary", "moderator");
    expect(mockedRepo.updateStatus).toHaveBeenCalledWith("s1", "completed");
  });
});

describe("startCollect", () => {
  it("throws NotFoundError for missing session", async () => {
    mockedRepo.findById.mockResolvedValue(null);
    await expect(startCollect("s1", "moderator")).rejects.toThrow(NotFoundError);
  });

  it("throws ForbiddenError for non-moderator", async () => {
    mockedRepo.findById.mockResolvedValue(fakeSession());
    await expect(startCollect("s1", "outsider")).rejects.toThrow(ForbiddenError);
  });

  it("throws AppError if not in collect phase", async () => {
    mockedRepo.findById.mockResolvedValue(fakeSession({ currentPhase: "vote" }));
    await expect(startCollect("s1", "moderator")).rejects.toThrow(AppError);
  });

  it("throws AppError if no timer configured", async () => {
    mockedRepo.findById.mockResolvedValue(fakeSession({ collectTimerSeconds: null }));
    await expect(startCollect("s1", "moderator")).rejects.toThrow(AppError);
  });

  it("throws AppError if timer already running", async () => {
    mockedRepo.findById.mockResolvedValue(fakeSession({ timerExpiresAt: new Date() }));
    await expect(startCollect("s1", "moderator")).rejects.toThrow(AppError);
  });

  it("starts the collect timer successfully", async () => {
    mockedRepo.findById.mockResolvedValue(fakeSession());
    mockedRepo.claimTimerStart.mockResolvedValue(true);
    mockedRepo.setTimerExpiresAt.mockResolvedValue(undefined);

    const result = await startCollect("s1", "moderator");
    expect(result).toEqual({ started: true });
    expect(mockedRepo.claimTimerStart).toHaveBeenCalledWith("s1");
  });
});
