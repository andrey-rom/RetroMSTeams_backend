interface SummaryCardColumn {
  label: string;
  color: string;
  cards: { content: string; votesCount: number }[];
  totalCards: number;
  totalVotes: number;
}

interface SummaryCardInput {
  title: string;
  templateName: string;
  createdAt: string;
  columns: SummaryCardColumn[];
  totals: { cards: number; votes: number; participants: number };
}

function buildColumnBlock(col: SummaryCardColumn, first: boolean): unknown[] {
  const header = {
    type: "TextBlock",
    text: `**${col.label.toUpperCase()}**  —  ${col.totalCards} card${col.totalCards !== 1 ? "s" : ""},  ${col.totalVotes} vote${col.totalVotes !== 1 ? "s" : ""}`,
    weight: "Bolder",
    size: "Small",
    wrap: true,
    separator: !first,
    spacing: first ? "Medium" : "Large",
  };

  if (col.cards.length === 0) {
    return [
      header,
      {
        type: "TextBlock",
        text: "No cards",
        isSubtle: true,
        size: "Small",
        spacing: "Small",
      },
    ];
  }

  const cardItems = col.cards.map((card) => ({
    type: "ColumnSet",
    spacing: "Small",
    columns: [
      {
        type: "Column",
        width: "stretch",
        verticalContentAlignment: "Center",
        items: [
          {
            type: "TextBlock",
            text: card.content,
            wrap: true,
            size: "Small",
            spacing: "None",
          },
        ],
      },
      ...(card.votesCount > 0
        ? [
            {
              type: "Column",
              width: "auto",
              verticalContentAlignment: "Center",
              items: [
                {
                  type: "TextBlock",
                  text: `👍 ${card.votesCount}`,
                  weight: "Bolder",
                  size: "Small",
                  spacing: "None",
                },
              ],
            },
          ]
        : []),
    ],
  }));

  return [header, ...cardItems];
}

export function buildSummaryCard(data: SummaryCardInput): Record<string, unknown> {
  const date = new Date(data.createdAt).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });

  return {
    type: "AdaptiveCard",
    $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
    version: "1.4",
    body: [
      // Title
      {
        type: "TextBlock",
        text: `🔁 ${data.title}`,
        weight: "Bolder",
        size: "Large",
        wrap: true,
        spacing: "None",
      },
      // Subtitle
      {
        type: "TextBlock",
        text: `${data.templateName}  ·  ${date}`,
        size: "Small",
        isSubtle: true,
        spacing: "Small",
      },
      // Stats row
      {
        type: "ColumnSet",
        spacing: "Medium",
        separator: true,
        columns: [
          {
            type: "Column",
            width: "stretch",
            items: [
              { type: "TextBlock", text: "📋 Cards", size: "Small", isSubtle: true, spacing: "None" },
              { type: "TextBlock", text: `${data.totals.cards}`, weight: "Bolder", spacing: "None" },
            ],
          },
          {
            type: "Column",
            width: "stretch",
            items: [
              { type: "TextBlock", text: "👍 Votes", size: "Small", isSubtle: true, spacing: "None" },
              { type: "TextBlock", text: `${data.totals.votes}`, weight: "Bolder", spacing: "None" },
            ],
          },
          {
            type: "Column",
            width: "stretch",
            items: [
              { type: "TextBlock", text: "👥 People", size: "Small", isSubtle: true, spacing: "None" },
              { type: "TextBlock", text: `${data.totals.participants}`, weight: "Bolder", spacing: "None" },
            ],
          },
        ],
      },
      // Columns
      ...data.columns.flatMap((col, i) => buildColumnBlock(col, i === 0)),
    ],
  };
}
