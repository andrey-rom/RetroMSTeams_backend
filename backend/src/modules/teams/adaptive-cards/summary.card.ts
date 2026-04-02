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

export function buildSummaryCard(data: SummaryCardInput): Record<string, unknown> {
  const columnBlocks = data.columns.flatMap((col) => {
    const header = {
      type: "TextBlock",
      text: `${col.label}  (${col.totalCards} cards · ${col.totalVotes} votes)`,
      weight: "Bolder",
      size: "Medium",
      color: "Accent",
      spacing: "Medium",
    };

    if (col.cards.length === 0) {
      return [
        header,
        { type: "TextBlock", text: "_No cards_", isSubtle: true, spacing: "Small" },
      ];
    }

    const cardItems = col.cards.map((card) => ({
      type: "ColumnSet",
      spacing: "Small",
      columns: [
        {
          type: "Column",
          width: "stretch",
          items: [
            {
              type: "TextBlock",
              text: card.content,
              wrap: true,
              size: "Small",
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
                    text: `+${card.votesCount}`,
                    weight: "Bolder",
                    size: "Small",
                    color: "Accent",
                  },
                ],
              },
            ]
          : []),
      ],
    }));

    return [header, ...cardItems];
  });

  return {
    type: "AdaptiveCard",
    $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
    version: "1.5",
    body: [
      {
        type: "TextBlock",
        text: data.title,
        weight: "Bolder",
        size: "Large",
        wrap: true,
      },
      {
        type: "ColumnSet",
        spacing: "Small",
        columns: [
          {
            type: "Column",
            width: "auto",
            items: [
              { type: "TextBlock", text: `📋 ${data.totals.cards} cards`, size: "Small", isSubtle: true },
            ],
          },
          {
            type: "Column",
            width: "auto",
            items: [
              { type: "TextBlock", text: `👍 ${data.totals.votes} votes`, size: "Small", isSubtle: true },
            ],
          },
          {
            type: "Column",
            width: "auto",
            items: [
              { type: "TextBlock", text: `👥 ${data.totals.participants} participants`, size: "Small", isSubtle: true },
            ],
          },
        ],
      },
      { type: "TextBlock", text: " ", spacing: "Small" },
      ...columnBlocks,
      {
        type: "TextBlock",
        text: `${data.templateName} · ${new Date(data.createdAt).toLocaleDateString()}`,
        size: "Small",
        isSubtle: true,
        spacing: "Large",
        horizontalAlignment: "Right",
      },
    ],
  };
}
