import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../cards/cards.repository.js", () => ({
  findById: vi.fn(),
}));

vi.mock("../sessions/sessions.repository.js", () => ({
  findById: vi.fn(),
}));

vi.mock("./votes.repository.js", () => ({
  castVoteAtomic: vi.fn(),
  findVote: vi.fn(),
  removeVote: vi.fn(),
}));

vi.mock("../../socket/emitters/board.emitter.js", () => ({
  emitVoteUpdated: vi.fn(),
}));

vi.mock("../../shared/utils/hash.js", () => ({
  generateOwnerHash: vi.fn(
    (userId: string, sessionId: string) => `hash:${userId}:${sessionId}`,
  ),
}));

import { castVote, removeVote } from "./votes.service.js";
import * as cardsRepo from "../cards/cards.repository.js";
import * as sessionsRepo from "../sessions/sessions.repository.js";
import * as votesRepo from "./votes.repository.js";
import { NotFoundError, AppError } from "../../shared/errors/app-error.js";

const mockedCards = vi.mocked(cardsRepo);
const mockedSessions = vi.mocked(sessionsRepo);
const mockedVotes = vi.mocked(votesRepo);

function fakeCard(overrides = {}) {
  return {
    id: "c1",
    sessionId: "s1",
    columnKey: "good",
    content: "text",
    ownerHash: "hash:owner:s1",
    votesCount: 0,
    createdAt: new Date(),
    ...overrides,
  };
}

function fakeSession(overrides = {}) {
  return { id: "s1", currentPhase: "vote" as const, ...overrides };
}

beforeEach(() => vi.clearAllMocks());

describe("castVote", () => {
  it("throws NotFoundError if card does not exist", async () => {
    mockedCards.findById.mockResolvedValue(null);
    await expect(castVote("c1", "voter")).rejects.toThrow(NotFoundError);
  });

  it("throws NotFoundError if session does not exist", async () => {
    mockedCards.findById.mockResolvedValue(fakeCard());
    mockedSessions.findById.mockResolvedValue(null);
    await expect(castVote("c1", "voter")).rejects.toThrow(NotFoundError);
  });

  it("throws AppError if session is not in vote phase", async () => {
    mockedCards.findById.mockResolvedValue(fakeCard());
    mockedSessions.findById.mockResolvedValue(fakeSession({ currentPhase: "collect" }));
    await expect(castVote("c1", "voter")).rejects.toThrow(AppError);
  });

  it("casts a vote successfully", async () => {
    const updatedCard = fakeCard({ votesCount: 1 });
    mockedCards.findById.mockResolvedValue(fakeCard());
    mockedSessions.findById.mockResolvedValue(fakeSession());
    mockedVotes.castVoteAtomic.mockResolvedValue({
      vote: { id: "v1", cardId: "c1", voterHash: "hash:voter:s1" },
      card: updatedCard,
    } as any);

    const result = await castVote("c1", "voter");
    expect(result.votesCount).toBe(1);
    expect(mockedVotes.castVoteAtomic).toHaveBeenCalledWith("c1", "hash:voter:s1");
  });
});

describe("removeVote", () => {
  it("throws NotFoundError if card does not exist", async () => {
    mockedCards.findById.mockResolvedValue(null);
    await expect(removeVote("c1", "voter")).rejects.toThrow(NotFoundError);
  });

  it("throws AppError if session is not in vote phase", async () => {
    mockedCards.findById.mockResolvedValue(fakeCard());
    mockedSessions.findById.mockResolvedValue(fakeSession({ currentPhase: "summary" }));
    await expect(removeVote("c1", "voter")).rejects.toThrow(AppError);
  });

  it("throws NotFoundError if vote does not exist", async () => {
    mockedCards.findById.mockResolvedValue(fakeCard());
    mockedSessions.findById.mockResolvedValue(fakeSession());
    mockedVotes.findVote.mockResolvedValue(null);
    await expect(removeVote("c1", "voter")).rejects.toThrow(NotFoundError);
  });

  it("removes a vote successfully", async () => {
    const updatedCard = fakeCard({ votesCount: 0 });
    mockedCards.findById.mockResolvedValue(fakeCard({ votesCount: 1 }));
    mockedSessions.findById.mockResolvedValue(fakeSession());
    mockedVotes.findVote.mockResolvedValue({ id: "v1" } as any);
    mockedVotes.removeVote.mockResolvedValue({
      vote: { id: "v1" },
      card: updatedCard,
    } as any);

    const result = await removeVote("c1", "voter");
    expect(result.votesCount).toBe(0);
    expect(mockedVotes.removeVote).toHaveBeenCalledWith("c1", "hash:voter:s1");
  });
});
