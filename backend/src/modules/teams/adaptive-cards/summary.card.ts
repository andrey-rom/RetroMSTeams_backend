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

// Maps hex color to the closest Adaptive Card named color.
// AC only supports a fixed palette — we pick by hue.
function hexToAcColor(hex: string): string {
  const map: Array<[string, string]> = [
    ["#6BB700", "Good"],    // green  → Good
    ["#E74856", "Attention"], // red  → Attention
    ["#0078D4", "Accent"],   // blue  → Accent
    ["#8764B8", "Dark"],     // purple → Dark
    ["#6264A7", "Accent"],   // teams purple → Accent
  ];
  const normalised = hex.toUpperCase();
  for (const [src, acColor] of map) {
    if (normalised === src.toUpperCase()) return acColor;
  }
  return "Default";
}

function buildColumnBlock(col: SummaryCardColumn): unknown[] {
  const acColor = hexToAcColor(col.color);

  const header = {
    type: "Container",
    style: "emphasis",
    bleed: true,
    spacing: "Medium",
    items: [
      {
        type: "ColumnSet",
        columns: [
          {
            type: "Column",
            width: "stretch",
            items: [
              {
                type: "TextBlock",
                text: col.label.toUpperCase(),
                weight: "Bolder",
                size: "Small",
                color: acColor,
                spacing: "None",
              },
            ],
          },
          {
            type: "Column",
            width: "auto",
            items: [
              {
                type: "TextBlock",
                text: `${col.totalCards} card${col.totalCards !== 1 ? "s" : ""}  ·  ${col.totalVotes} vote${col.totalVotes !== 1 ? "s" : ""}`,
                size: "Small",
                isSubtle: true,
                spacing: "None",
              },
            ],
          },
        ],
      },
    ],
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
        italic: true,
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
                  color: acColor,
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
    version: "1.5",
    body: [
      // ── Header ──────────────────────────────────────────────
      {
        type: "Container",
        style: "accent",
        bleed: true,
        items: [
          {
            type: "TextBlock",
            text: `🔁 ${data.title}`,
            weight: "Bolder",
            size: "Large",
            color: "Light",
            wrap: true,
            spacing: "None",
          },
          {
            type: "TextBlock",
            text: `${data.templateName}  ·  ${date}`,
            size: "Small",
            color: "Light",
            isSubtle: true,
            spacing: "Small",
          },
        ],
      },

      // ── Stats row ────────────────────────────────────────────
      {
        type: "ColumnSet",
        spacing: "Medium",
        columns: [
          {
            type: "Column",
            width: "stretch",
            items: [
              { type: "TextBlock", text: "📋 Cards", size: "Small", isSubtle: true, spacing: "None" },
              { type: "TextBlock", text: `${data.totals.cards}`, weight: "Bolder", size: "Medium", spacing: "None" },
            ],
          },
          {
            type: "Column",
            width: "stretch",
            items: [
              { type: "TextBlock", text: "👍 Votes", size: "Small", isSubtle: true, spacing: "None" },
              { type: "TextBlock", text: `${data.totals.votes}`, weight: "Bolder", size: "Medium", spacing: "None" },
            ],
          },
          {
            type: "Column",
            width: "stretch",
            items: [
              { type: "TextBlock", text: "👥 People", size: "Small", isSubtle: true, spacing: "None" },
              { type: "TextBlock", text: `${data.totals.participants}`, weight: "Bolder", size: "Medium", spacing: "None" },
            ],
          },
        ],
      },

      // ── Divider ──────────────────────────────────────────────
      { type: "Separator", spacing: "Medium" },

      // ── Columns ──────────────────────────────────────────────
      ...data.columns.flatMap(buildColumnBlock),
    ],
  };
}
