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
  ],
  components: {
    securitySchemes: {
      UserIdHeader: {
        type: "apiKey",
        in: "header",
        name: "x-user-id",
        description: "Dev-only user identifier (UUID). Replaced by Azure AD SSO in production.",
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
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "Created", content: { "application/json": { schema: { $ref: "#/components/schemas/Session" } } } },
          "400": { description: "Validation error" },
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
  },
} as const;
