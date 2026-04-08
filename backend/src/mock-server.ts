/**
 * Standalone mock server for POC/demo purposes.
 * No database, no Azure AD — pure in-memory state.
 * Build: tsup src/mock-server.ts --format cjs --no-dts --outDir dist-mock
 */
import express from "express";
import cors from "cors";
import { createServer } from "http";
import crypto from "crypto";
import path from "path";

const app = express();
app.use(cors());
app.use(express.json());

// ── In-memory store ──────────────────────────────────────────────────────────

const templates = [
  {
    id: "tpl-ssc",
    code: "SSC",
    name: "Start / Stop / Continue",
    description: "Classic retrospective format",
    values: [
      { id: "v1", value: "START",    label: "Start",    color: "#4CAF50", sortOrder: 0 },
      { id: "v2", value: "STOP",     label: "Stop",     color: "#F44336", sortOrder: 1 },
      { id: "v3", value: "CONTINUE", label: "Continue", color: "#2196F3", sortOrder: 2 },
    ],
  },
  {
    id: "tpl-4l",
    code: "4L",
    name: "4Ls",
    description: "Liked, Learned, Lacked, Longed For",
    values: [
      { id: "v4", value: "LIKED",   label: "Liked",   color: "#8BC34A", sortOrder: 0 },
      { id: "v5", value: "LEARNED", label: "Learned", color: "#03A9F4", sortOrder: 1 },
      { id: "v6", value: "LACKED",  label: "Lacked",  color: "#FF5722", sortOrder: 2 },
      { id: "v7", value: "LONGED",  label: "Longed For", color: "#9C27B0", sortOrder: 3 },
    ],
  },
  {
    id: "tpl-msg",
    code: "MSG",
    name: "Mad / Sad / Glad",
    description: "Emotional retrospective",
    values: [
      { id: "v8", value: "MAD",  label: "Mad",  color: "#E53935", sortOrder: 0 },
      { id: "v9", value: "SAD",  label: "Sad",  color: "#1E88E5", sortOrder: 1 },
      { id: "v10", value: "GLAD", label: "Glad", color: "#43A047", sortOrder: 2 },
    ],
  },
];

const sessions: Record<string, any> = {};
const cards: Record<string, any[]> = {};
const votes: Record<string, Set<string>> = {}; // cardId -> Set<voterHash>

// ── Auth middleware ──────────────────────────────────────────────────────────

function auth(req: any, res: any, next: any) {
  const userId = req.headers["x-user-id"];
  if (!userId) return res.status(401).json({ error: "Missing x-user-id header" });
  req.userId = userId;
  next();
}

// ── Routes ───────────────────────────────────────────────────────────────────

app.get("/api/health", (_req, res) => res.json({ status: "ok", timestamp: new Date() }));

app.get("/api/templates", auth, (_req, res) => res.json(templates));

app.get("/api/sessions", auth, (_req: any, res) => {
  res.json(Object.values(sessions));
});

app.post("/api/sessions", auth, (req: any, res) => {
  const { title, templateTypeId, collectTimerSeconds, voteTimerSeconds } = req.body;
  const tpl = templates.find((t) => t.id === templateTypeId);
  if (!tpl) return res.status(400).json({ error: "Unknown template" });

  const id = crypto.randomUUID();
  const session = {
    id,
    title,
    creatorId: req.userId,
    msTeamsId: "mock",
    msChannelId: "mock",
    templateTypeId,
    currentStatus: "active",
    currentPhase: "collect",
    maxVotesPerUser: 5,
    collectTimerSeconds: collectTimerSeconds || null,
    voteTimerSeconds: voteTimerSeconds || null,
    timerExpiresAt: null,
    collectGraceAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    reportMessageId: null,
    templateType: tpl,
  };
  sessions[id] = session;
  cards[id] = [];
  res.status(201).json(session);
});

app.get("/api/sessions/:id", auth, (req, res) => {
  const s = sessions[req.params.id];
  if (!s) return res.status(404).json({ error: "Not found" });
  res.json(s);
});

app.post("/api/sessions/:id/start", auth, (req, res) => {
  const s = sessions[req.params.id];
  if (!s) return res.status(404).json({ error: "Not found" });
  res.json({ started: true });
});

app.put("/api/sessions/:id/phase", auth, (req, res) => {
  const s = sessions[req.params.id];
  if (!s) return res.status(404).json({ error: "Not found" });
  s.currentPhase = req.body.phase;
  s.updatedAt = new Date().toISOString();
  res.json(s);
});

app.get("/api/sessions/:id/cards", auth, (req, res) => {
  res.json(cards[req.params.id] || []);
});

app.post("/api/sessions/:id/cards", auth, (req: any, res) => {
  const s = sessions[req.params.id];
  if (!s) return res.status(404).json({ error: "Not found" });
  const { columnKey, content } = req.body;
  const card = {
    id: crypto.randomUUID(),
    sessionId: req.params.id,
    columnKey,
    content,
    ownerHash: req.userId,
    votesCount: 0,
    createdAt: new Date().toISOString(),
  };
  cards[req.params.id].push(card);
  res.status(201).json(card);
});

app.get("/api/sessions/:id/my-votes", auth, (req: any, res) => {
  const sessionCards = cards[req.params.id] || [];
  const cardIds = sessionCards
    .filter((c) => votes[c.id]?.has(req.userId))
    .map((c) => c.id);
  res.json({ cardIds });
});

app.get("/api/sessions/:id/grace-status", auth, (_req, res) => {
  res.json({ graceActive: false, usedColumns: [] });
});

app.get("/api/sessions/:id/summary", auth, (req, res) => {
  const s = sessions[req.params.id];
  if (!s) return res.status(404).json({ error: "Not found" });
  const tpl = templates.find((t) => t.id === s.templateTypeId)!;
  const sessionCards = cards[req.params.id] || [];
  const columns = tpl.values.map((v) => {
    const colCards = sessionCards
      .filter((c) => c.columnKey === v.value)
      .sort((a: any, b: any) => b.votesCount - a.votesCount);
    return {
      key: v.value,
      label: v.label,
      color: v.color,
      cards: colCards,
      totalCards: colCards.length,
      totalVotes: colCards.reduce((n: number, c: any) => n + c.votesCount, 0),
    };
  });
  res.json({
    sessionId: s.id,
    title: s.title,
    templateName: tpl.name,
    currentPhase: s.currentPhase,
    currentStatus: s.currentStatus,
    createdAt: s.createdAt,
    columns,
    totals: {
      cards: sessionCards.length,
      votes: sessionCards.reduce((n: number, c: any) => n + c.votesCount, 0),
      participants: 1,
    },
  });
});

app.post("/api/sessions/:id/publish", auth, (req, res) => {
  res.json({ sessionId: req.params.id, messageId: "mock-msg-id", published: true });
});

app.post("/api/cards/:id/vote", auth, (req: any, res) => {
  // Find card across all sessions
  let card: any;
  for (const sessionId of Object.keys(cards)) {
    card = cards[sessionId].find((c) => c.id === req.params.id);
    if (card) break;
  }
  if (!card) return res.status(404).json({ error: "Card not found" });
  if (!votes[card.id]) votes[card.id] = new Set();
  if (!votes[card.id].has(req.userId)) {
    votes[card.id].add(req.userId);
    card.votesCount++;
  }
  res.json({ cardId: card.id, votesCount: card.votesCount });
});

app.delete("/api/cards/:id/vote", auth, (req: any, res) => {
  let card: any;
  for (const sessionId of Object.keys(cards)) {
    card = cards[sessionId].find((c) => c.id === req.params.id);
    if (card) break;
  }
  if (!card) return res.status(404).json({ error: "Card not found" });
  if (votes[card.id]?.has(req.userId)) {
    votes[card.id].delete(req.userId);
    card.votesCount = Math.max(0, card.votesCount - 1);
  }
  res.json({ cardId: card.id, votesCount: card.votesCount });
});

// ── Frontend static files ─────────────────────────────────────────────────────

const frontendDir = path.join(__dirname, "public");
app.use("/tabs/home", express.static(frontendDir));
app.get("/tabs/home/*splat", (_req, res) => {
  res.sendFile(path.join(frontendDir, "index.html"));
});
app.get("/", (_req, res) => res.redirect("/tabs/home"));

// ── Start ─────────────────────────────────────────────────────────────────────

const server = createServer(app);
const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`Mock server running on port ${port}`);
});
