import { prisma } from "../../config/db.js";
import { NotFoundError } from "../../shared/errors/app-error.js";

interface SummaryCard {
  id: string;
  content: string;
  votesCount: number;
}

interface SummaryColumn {
  key: string;
  label: string;
  color: string;
  cards: SummaryCard[];
  totalCards: number;
  totalVotes: number;
}

interface SessionSummary {
  sessionId: string;
  title: string;
  templateName: string;
  currentPhase: string;
  currentStatus: string;
  createdAt: string;
  columns: SummaryColumn[];
  totals: {
    cards: number;
    votes: number;
    participants: number;
  };
}

export async function getSessionSummary(
  sessionId: string,
): Promise<SessionSummary> {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: {
      templateType: {
        include: { values: { orderBy: { sortOrder: "asc" } } },
      },
      cards: {
        orderBy: { votesCount: "desc" },
      },
    },
  });

  if (!session) throw new NotFoundError("Session");

  const uniqueOwners = new Set(session.cards.map((c) => c.ownerHash));

  const columns: SummaryColumn[] = session.templateType.values.map((tv) => {
    const colCards = session.cards
      .filter((c) => c.columnKey === tv.value)
      .map((c) => ({
        id: c.id,
        content: c.content,
        votesCount: c.votesCount,
      }));

    return {
      key: tv.value,
      label: tv.label,
      color: tv.color,
      cards: colCards,
      totalCards: colCards.length,
      totalVotes: colCards.reduce((sum, c) => sum + c.votesCount, 0),
    };
  });

  return {
    sessionId: session.id,
    title: session.title,
    templateName: session.templateType.name,
    currentPhase: session.currentPhase,
    currentStatus: session.currentStatus,
    createdAt: session.createdAt.toISOString(),
    columns,
    totals: {
      cards: session.cards.length,
      votes: session.cards.reduce((sum, c) => sum + c.votesCount, 0),
      participants: uniqueOwners.size,
    },
  };
}
