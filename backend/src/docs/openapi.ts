/**
 * OpenAPI 3.0 document for the Retro Bot REST API.
 * Keep in sync with route handlers under src/modules/.
 */
export const openApiDocument = {
  openapi: "3.0.3",
  info: {
    title: "Retro Bot API",
    version: "0.1.0",
    description:
      "Retrospective sessions API. Development auth: send `x-user-id` (UUID) on every request except health check.",
  },
  servers: [{ url: "/api", description: "API base (same origin as this server)" }],
  tags: [
    { name: "Health", description: "Liveness" },
    { name: "Templates", description: "Board templates" },
    { name: "Sessions", description: "Retrospective sessions" },
    { name: "Cards", description: "Anonymous cards" },
    { name: "Votes", description: "Voting" },
    { name: "WebSocket Events", description: "Real-time events emitted via Socket.IO. Connect to the server root and join a session room by emitting `join` with { sessionId }." },
  ],
  components: {
    securitySchemes: {
      UserIdHeader: {
        type: "apiKey",
        in: "header",
        name: "x-user-id",
        description: "User identifier (UUID) sent in this header.",
      },
    },
    schemas: {
      Error: {
        type: "object",
        properties: {
          error: { type: "string" },
          code: { type: "string" },
          details: { type: "array", items: { type: "string" } },
        },
      },
      Session: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          title: { type: "string" },
          creatorId: { type: "string" },
          currentPhase: { type: "string", enum: ["collect", "vote", "summary"] },
          currentStatus: { type: "string", enum: ["active", "completed", "archived"] },
          maxVotesPerUser: { type: "integer" },
          collectTimerSeconds: { type: "integer", nullable: true, description: "Collect phase timer duration set at creation (null if none)" },
          voteTimerSeconds: { type: "integer", nullable: true, description: "Vote phase timer duration set at creation (null if none)" },
          timerExpiresAt: { type: "string", format: "date-time", nullable: true, description: "ISO timestamp when the current phase timer expires (null if no timer)" },
          collectGraceAt: { type: "string", format: "date-time", nullable: true, description: "Set when collect timer expires — grace period active (one last card per column)" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
          reportMessageId: { type: "string", nullable: true },
        },
      },
      Card: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          sessionId: { type: "string", format: "uuid" },
          columnKey: { type: "string" },
          content: { type: "string" },
          votesCount: { type: "integer" },
        },
      },
    },
  },
  paths: {
    "/health": {
      get: {
        tags: ["Health"],
        summary: "Health check",
        security: [],
        responses: {
          "200": {
            description: "OK",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "string", example: "ok" },
                    timestamp: { type: "string", format: "date-time" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/templates": {
      get: {
        tags: ["Templates"],
        summary: "List all template types",
        security: [{ UserIdHeader: [] }],
        responses: {
          "200": { description: "List of templates" },
        },
      },
    },
    "/templates/{code}": {
      get: {
        tags: ["Templates"],
        summary: "Get template by code (e.g. SSC)",
        security: [{ UserIdHeader: [] }],
        parameters: [
          { name: "code", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "Template with values" },
          "404": { description: "Not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/sessions": {
      get: {
        tags: ["Sessions"],
        summary: "List sessions for a channel",
        security: [{ UserIdHeader: [] }],
        parameters: [
          {
            name: "channelId",
            in: "query",
            schema: { type: "string", default: "dev-channel" },
          },
        ],
        responses: { "200": { description: "Sessions list" } },
      },
      post: {
        tags: ["Sessions"],
        summary: "Create a session",
        security: [{ UserIdHeader: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["title", "templateTypeId"],
                properties: {
                  title: { type: "string", maxLength: 200 },
                  templateTypeId: { type: "string", format: "uuid" },
                  msTeamsId: { type: "string" },
                  msChannelId: { type: "string" },
                  maxVotesPerUser: { type: "integer", minimum: 1, maximum: 99 },
                  collectTimerSeconds: { type: "integer", minimum: 30, maximum: 3600, description: "Optional collect phase countdown (seconds)" },
                  voteTimerSeconds: { type: "integer", minimum: 30, maximum: 3600, description: "Optional vote phase countdown (seconds)" },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "Created", content: { "application/json": { schema: { $ref: "#/components/schemas/Session" } } } },
          "400": { description: "Validation error" },
          "429": { description: "Rate limit exceeded" },
        },
      },
    },
    "/sessions/{id}": {
      get: {
        tags: ["Sessions"],
        summary: "Get session by ID",
        security: [{ UserIdHeader: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          "200": { description: "Session" },
          "404": { description: "Not found" },
        },
      },
    },
    "/sessions/{id}/summary": {
      get: {
        tags: ["Sessions"],
        summary: "Aggregated summary for a session",
        security: [{ UserIdHeader: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: { "200": { description: "Summary payload" }, "404": { description: "Not found" } },
      },
    },
    "/sessions/{id}/publish": {
      post: {
        tags: ["Sessions"],
        summary: "Publish summary to Teams (moderator only, summary phase)",
        security: [{ UserIdHeader: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          "200": { description: "Published with Adaptive Card payload" },
          "400": { description: "Wrong phase" },
          "403": { description: "Not moderator" },
          "409": { description: "Already published" },
        },
      },
    },
    "/sessions/{id}/grace-status": {
      get: {
        tags: ["Sessions"],
        summary: "Check which columns the current user has already used their grace card in",
        description: "Returns graceActive: true only when the session is still in the collect phase and the grace period has started. After the phase advances, returns graceActive: false.",
        security: [{ UserIdHeader: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          "200": {
            description: "Grace period status",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    graceActive: { type: "boolean", description: "Whether the collect grace period is active (only true during collect phase)" },
                    usedColumns: { type: "array", items: { type: "string" }, description: "Column keys where the user already added a grace card" },
                  },
                },
              },
            },
          },
          "404": { description: "Session not found" },
          "429": { description: "Rate limit exceeded" },
        },
      },
    },
    "/sessions/{id}/start": {
      post: {
        tags: ["Sessions"],
        summary: "Start the retrospective — begins the collect timer (moderator only)",
        description: "Requires a collect timer to be configured at session creation. Fails with 400 if no timer is configured, or if the timer is already running / has already expired into the grace period. Uses an atomic claim to prevent duplicate starts.",
        security: [{ UserIdHeader: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          "200": { description: "{ started: true }" },
          "400": { description: "Not in collect phase, no timer configured, or timer already running" },
          "403": { description: "Not moderator" },
          "429": { description: "Rate limit exceeded" },
        },
      },
    },
    "/sessions/{id}/phase": {
      put: {
        tags: ["Sessions"],
        summary: "Advance session phase (moderator only)",
        security: [{ UserIdHeader: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["phase"],
                properties: {
                  phase: { type: "string", enum: ["collect", "vote", "summary"] },
                },
              },
            },
          },
        },
        responses: { "200": { description: "Updated session" }, "403": { description: "Not moderator" } },
      },
    },
    "/sessions/{sessionId}/cards": {
      get: {
        tags: ["Cards"],
        summary: "List cards for session",
        security: [{ UserIdHeader: [] }],
        parameters: [{ name: "sessionId", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: { "200": { description: "Cards array" } },
      },
      post: {
        tags: ["Cards"],
        summary: "Create a card",
        security: [{ UserIdHeader: [] }],
        parameters: [{ name: "sessionId", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["columnKey", "content"],
                properties: {
                  columnKey: { type: "string" },
                  content: { type: "string", maxLength: 500 },
                },
              },
            },
          },
        },
        responses: { "201": { description: "Created card" } },
      },
    },
    "/sessions/cards/{id}": {
      put: {
        tags: ["Cards"],
        summary: "Update card (owner, collect phase only)",
        security: [{ UserIdHeader: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: { type: "object", required: ["content"], properties: { content: { type: "string" } } },
            },
          },
        },
        responses: { "200": { description: "Updated" }, "403": { description: "Not owner or wrong phase" } },
      },
      delete: {
        tags: ["Cards"],
        summary: "Delete card (owner, collect phase only)",
        security: [{ UserIdHeader: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: { "200": { description: "{ success: true }" } },
      },
    },
    "/sessions/{sessionId}/my-votes": {
      get: {
        tags: ["Votes"],
        summary: "Card IDs the current user has voted on",
        security: [{ UserIdHeader: [] }],
        parameters: [{ name: "sessionId", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          "200": {
            description: "{ cardIds: string[] }",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { cardIds: { type: "array", items: { type: "string" } } },
                },
              },
            },
          },
        },
      },
    },
    "/cards/{cardId}/vote": {
      post: {
        tags: ["Votes"],
        summary: "Cast vote",
        security: [{ UserIdHeader: [] }],
        parameters: [{ name: "cardId", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          "200": { description: "{ cardId, votesCount }" },
          "409": { description: "Already voted or max votes" },
        },
      },
      delete: {
        tags: ["Votes"],
        summary: "Remove vote",
        security: [{ UserIdHeader: [] }],
        parameters: [{ name: "cardId", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: { "200": { description: "{ cardId, votesCount }" } },
      },
    },
    "/websocket-events": {
      get: {
        tags: ["WebSocket Events"],
        summary: "Socket.IO events reference (not a real HTTP endpoint)",
        description: [
          "Connect via Socket.IO to the server root (`ws://localhost:3000`). Join a session room by emitting `join` with `{ sessionId }`.",
          "",
          "**Server-to-client events:**",
          "",
          "| Event | Payload | Description |",
          "|---|---|---|",
          "| `card:created` | `{ id, sessionId, columnKey, content, ownerHash, votesCount, createdAt }` | A new card was added |",
          "| `card:updated` | Same as card:created | A card's content was edited |",
          "| `card:deleted` | `{ cardId }` | A card was removed |",
          "| `vote:updated` | `{ cardId, votesCount }` | A card's vote count changed |",
          "| `phase:changed` | `{ phase, timerExpiresAt }` | Session phase advanced (timerExpiresAt is null or ISO string) |",
          "| `timer:started` | `{ timerExpiresAt }` | A phase timer was started (ISO timestamp) |",
          "| `timer:expired` | `{}` | The vote phase timer expired — moderator should advance |",
          "| `collect:grace` | `{ collectGraceAt }` | Collect timer expired — grace period started (ISO timestamp, one last card per column) |",
        ].join("\n"),
        responses: {
          "200": { description: "N/A — this is a documentation-only entry for Socket.IO events" },
        },
      },
    },
  },
} as const;
