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

// Top N voted cards per column to surface as action items
const ACTION_ITEMS_PER_COLUMN = 2;

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
                  text: `▲ ${card.votesCount}`,
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

function buildActionItemsBlock(columns: SummaryCardColumn[]): unknown[] {
  // Collect top voted cards per column (votes > 0 only)
  const items: { label: string; content: string; votes: number }[] = [];
  for (const col of columns) {
    const top = col.cards
      .filter((c) => c.votesCount > 0)
      .slice(0, ACTION_ITEMS_PER_COLUMN);
    for (const card of top) {
      items.push({ label: col.label, content: card.content, votes: card.votesCount });
    }
  }

  if (items.length === 0) return [];

  const header = {
    type: "TextBlock",
    text: "**ACTION ITEMS**",
    weight: "Bolder",
    size: "Small",
    wrap: true,
    separator: true,
    spacing: "Large",
  };

  const rows = items.map((item) => ({
    type: "ColumnSet",
    spacing: "Small",
    columns: [
      {
        type: "Column",
        width: "auto",
        verticalContentAlignment: "Center",
        items: [
          {
            type: "TextBlock",
            text: "→",
            weight: "Bolder",
            size: "Small",
            spacing: "None",
            color: "Accent",
          },
        ],
      },
      {
        type: "Column",
        width: "stretch",
        verticalContentAlignment: "Center",
        items: [
          {
            type: "TextBlock",
            text: item.content,
            wrap: true,
            size: "Small",
            spacing: "None",
          },
          {
            type: "TextBlock",
            text: item.label,
            isSubtle: true,
            size: "ExtraSmall",
            spacing: "None",
          },
        ],
      },
      {
        type: "Column",
        width: "auto",
        verticalContentAlignment: "Center",
        items: [
          {
            type: "TextBlock",
            text: `▲ ${item.votes}`,
            weight: "Bolder",
            size: "Small",
            spacing: "None",
          },
        ],
      },
    ],
  }));

  return [header, ...rows];
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
        text: data.title,
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
              { type: "TextBlock", text: "Cards", size: "Small", isSubtle: true, spacing: "None" },
              { type: "TextBlock", text: `${data.totals.cards}`, weight: "Bolder", spacing: "None" },
            ],
          },
          {
            type: "Column",
            width: "stretch",
            items: [
              { type: "TextBlock", text: "Votes", size: "Small", isSubtle: true, spacing: "None" },
              { type: "TextBlock", text: `${data.totals.votes}`, weight: "Bolder", spacing: "None" },
            ],
          },
          {
            type: "Column",
            width: "stretch",
            items: [
              { type: "TextBlock", text: "People", size: "Small", isSubtle: true, spacing: "None" },
              { type: "TextBlock", text: `${data.totals.participants}`, weight: "Bolder", spacing: "None" },
            ],
          },
        ],
      },
      // Columns
      ...data.columns.flatMap((col, i) => buildColumnBlock(col, i === 0)),
      // Action items
      ...buildActionItemsBlock(data.columns),
    ],
  };
}
