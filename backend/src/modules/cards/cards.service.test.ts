import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./cards.repository.js", () => ({
  create: vi.fn(),
  findById: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  countByOwnerInColumnSince: vi.fn(),
}));

vi.mock("../sessions/sessions.repository.js", () => ({
  findById: vi.fn(),
}));

vi.mock("../../socket/emitters/board.emitter.js", () => ({
  emitCardCreated: vi.fn(),
  emitCardUpdated: vi.fn(),
  emitCardDeleted: vi.fn(),
}));

vi.mock("../../shared/utils/hash.js", () => ({
  generateOwnerHash: vi.fn(
    (userId: string, sessionId: string) => `hash:${userId}:${sessionId}`,
  ),
}));

import { createCard, updateCard, deleteCard } from "./cards.service.js";
import * as cardsRepo from "./cards.repository.js";
import * as sessionsRepo from "../sessions/sessions.repository.js";
import { NotFoundError, AppError, ForbiddenError } from "../../shared/errors/app-error.js";

const mockedCards = vi.mocked(cardsRepo);
const mockedSessions = vi.mocked(sessionsRepo);

function fakeSession(overrides = {}) {
  return {
    id: "s1",
    currentPhase: "collect" as const,
    collectGraceAt: null,
    ...overrides,
  };
}

function fakeCard(overrides = {}) {
  return {
    id: "c1",
    sessionId: "s1",
    columnKey: "good",
    content: "Great work",
    ownerHash: "hash:user-1:s1",
    votesCount: 0,
    createdAt: new Date(),
    ...overrides,
  };
}

beforeEach(() => vi.clearAllMocks());

describe("createCard", () => {
  it("throws NotFoundError if session does not exist", async () => {
    mockedSessions.findById.mockResolvedValue(null);
    await expect(createCard("s1", "good", "text", "user-1")).rejects.toThrow(NotFoundError);
  });

  it("throws AppError if session is not in collect phase", async () => {
    mockedSessions.findById.mockResolvedValue(fakeSession({ currentPhase: "vote" }));
    await expect(createCard("s1", "good", "text", "user-1")).rejects.toThrow(AppError);
  });

  it("creates a card during collect phase", async () => {
    const card = fakeCard();
    mockedSessions.findById.mockResolvedValue(fakeSession());
    mockedCards.create.mockResolvedValue(card);

    const result = await createCard("s1", "good", "Great work", "user-1");
    expect(result).toEqual(card);
    expect(mockedCards.create).toHaveBeenCalledWith({
      sessionId: "s1",
      columnKey: "good",
      content: "Great work",
      ownerHash: "hash:user-1:s1",
    });
  });

  it("enforces grace limit of one card per column", async () => {
    const graceAt = new Date();
    mockedSessions.findById.mockResolvedValue(fakeSession({ collectGraceAt: graceAt }));
    mockedCards.countByOwnerInColumnSince.mockResolvedValue(1);

    await expect(createCard("s1", "good", "text", "user-1")).rejects.toThrow(
      "you've already added your last card",
    );
  });
});

describe("updateCard", () => {
  it("throws NotFoundError if card does not exist", async () => {
    mockedCards.findById.mockResolvedValue(null);
    await expect(updateCard("c1", "new text", "user-1")).rejects.toThrow(NotFoundError);
  });

  it("throws AppError if session is not in collect phase", async () => {
    mockedCards.findById.mockResolvedValue(fakeCard());
    mockedSessions.findById.mockResolvedValue(fakeSession({ currentPhase: "vote" }));
    await expect(updateCard("c1", "new text", "user-1")).rejects.toThrow(AppError);
  });

  it("throws ForbiddenError if user is not the card owner", async () => {
    mockedCards.findById.mockResolvedValue(fakeCard());
    mockedSessions.findById.mockResolvedValue(fakeSession());
    await expect(updateCard("c1", "new text", "user-2")).rejects.toThrow(ForbiddenError);
  });

  it("updates the card when authorized", async () => {
    const updated = fakeCard({ content: "new text" });
    mockedCards.findById.mockResolvedValue(fakeCard());
    mockedSessions.findById.mockResolvedValue(fakeSession());
    mockedCards.update.mockResolvedValue(updated);

    const result = await updateCard("c1", "new text", "user-1");
    expect(result.content).toBe("new text");
    expect(mockedCards.update).toHaveBeenCalledWith("c1", "new text");
  });
});

describe("deleteCard", () => {
  it("throws NotFoundError if card does not exist", async () => {
    mockedCards.findById.mockResolvedValue(null);
    await expect(deleteCard("c1", "user-1")).rejects.toThrow(NotFoundError);
  });

  it("throws ForbiddenError if user is not the card owner", async () => {
    mockedCards.findById.mockResolvedValue(fakeCard());
    mockedSessions.findById.mockResolvedValue(fakeSession());
    await expect(deleteCard("c1", "user-2")).rejects.toThrow(ForbiddenError);
  });

  it("throws AppError if not in collect phase", async () => {
    mockedCards.findById.mockResolvedValue(fakeCard());
    mockedSessions.findById.mockResolvedValue(fakeSession({ currentPhase: "summary" }));
    await expect(deleteCard("c1", "user-1")).rejects.toThrow(AppError);
  });

  it("deletes the card when authorized", async () => {
    mockedCards.findById.mockResolvedValue(fakeCard());
    mockedSessions.findById.mockResolvedValue(fakeSession());
    mockedCards.remove.mockResolvedValue(undefined as any);

    await deleteCard("c1", "user-1");
    expect(mockedCards.remove).toHaveBeenCalledWith("c1");
  });
});
