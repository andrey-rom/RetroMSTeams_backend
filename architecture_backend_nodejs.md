# Retro-Bot Backend Architecture — Node.js Option

## 1. Tech Stack

| Component | Technology | Why |
|---|---|---|
| Runtime | **Node.js 20 LTS** | Stable LTS, native TS support via tsx |
| Framework | **Express.js + TypeScript** | Mature, flexible, large ecosystem |
| ORM | **Prisma** | Type-safe queries, auto-generated client, migrations |
| Database | **PostgreSQL 16** | Reliable, free, excellent JSON support |
| Real-time | **Socket.IO** | Rooms for sessions, fallback transports |
| Auth | **Passport.js + passport-azure-ad** | MS identity platform integration |
| Validation | **Zod** | Schema-based, TS-first validation |
| Logging | **Pino** | Fast structured logging |
| API Docs | **Swagger (swagger-jsdoc + swagger-ui-express)** | Auto-generated API docs |
| Testing | **Vitest + Supertest** | Fast unit & integration tests |
| MS Graph | **@microsoft/microsoft-graph-client** | Publish summaries to Teams channels |

---

## 2. Project Structure

```
apps/backend/
├── prisma/
│   ├── schema.prisma              # DB schema definition
│   ├── migrations/                # Migration history
│   └── seed.ts                    # Template seeding
│
├── src/
│   ├── config/
│   │   ├── env.ts                 # Environment validation (Zod)
│   │   ├── db.ts                  # Prisma client singleton
│   │   └── azure.ts               # Azure AD config
│   │
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.middleware.ts
│   │   │   ├── strategies/
│   │   │   │   └── azure-ad.strategy.ts
│   │   │   └── auth.types.ts
│   │   │
│   │   ├── sessions/
│   │   │   ├── sessions.controller.ts
│   │   │   ├── sessions.service.ts
│   │   │   ├── sessions.repository.ts
│   │   │   ├── sessions.schema.ts     # Zod schemas
│   │   │   └── sessions.types.ts
│   │   │
│   │   ├── cards/
│   │   │   ├── cards.controller.ts
│   │   │   ├── cards.service.ts
│   │   │   ├── cards.repository.ts
│   │   │   ├── cards.schema.ts
│   │   │   └── cards.types.ts
│   │   │
│   │   ├── votes/
│   │   │   ├── votes.controller.ts
│   │   │   ├── votes.service.ts
│   │   │   ├── votes.repository.ts
│   │   │   └── votes.schema.ts
│   │   │
│   │   ├── templates/
│   │   │   ├── templates.controller.ts
│   │   │   ├── templates.service.ts
│   │   │   └── templates.repository.ts
│   │   │
│   │   └── teams/
│   │       ├── teams.service.ts       # MS Graph integration
│   │       └── adaptive-cards/
│   │           └── summary.card.ts    # Adaptive Card templates
│   │
│   ├── shared/
│   │   ├── middleware/
│   │   │   ├── error-handler.ts
│   │   │   ├── validate.ts            # Zod validation middleware
│   │   │   └── rate-limit.ts
│   │   ├── utils/
│   │   │   ├── hash.ts                # SHA256 hashing
│   │   │   └── response.ts            # Standardized responses
│   │   ├── errors/
│   │   │   └── app-error.ts           # Custom error classes
│   │   └── types/
│   │       └── express.d.ts           # Express type extensions
│   │
│   ├── socket/
│   │   ├── socket.ts                  # Socket.IO setup
│   │   ├── handlers/
│   │   │   ├── session.handler.ts     # Join/leave rooms
│   │   │   └── connection.handler.ts
│   │   └── emitters/
│   │       └── board.emitter.ts       # Emit card/vote/phase events
│   │
│   ├── routes.ts                      # Route aggregator
│   ├── app.ts                         # Express app setup
│   └── server.ts                      # Entry point
│
├── tests/
│   ├── unit/
│   └── integration/
│
├── .env.example
├── tsconfig.json
├── vitest.config.ts
└── package.json
```

---

## 3. Database Schema (Prisma)

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─────────────────────────────────────────────────────────────
// ENUMS
// ─────────────────────────────────────────────────────────────

enum SessionPhase {
  collect
  vote
  summary
}

enum SessionStatus {
  active
  completed
  archived
}

// ─────────────────────────────────────────────────────────────
// TEMPLATE TABLES
// ─────────────────────────────────────────────────────────────

model TemplateType {
  id             String          @id @default(uuid())
  code           String          @unique  // SSC, MSG, 4L
  
  values         TemplateValue[]
  sessions       Session[]
  
  @@map("template_types")
}

model TemplateValue {
  id              String       @id @default(uuid())
  templateTypeId  String       @map("template_type_id")
  value           String       // START, STOP, CONTINUE, MAD, SAD, GLAD, etc.
  
  templateType    TemplateType @relation(fields: [templateTypeId], references: [id])
  
  @@unique([templateTypeId, value])
  @@map("template_values")
}

// ─────────────────────────────────────────────────────────────
// SESSION & CARDS
// ─────────────────────────────────────────────────────────────

model Session {
  id              String        @id @default(uuid())
  msTeamsId       String        @map("ms_teams_id")
  msChannelId     String        @map("ms_channel_id")
  templateTypeId  String        @map("template_type_id")
  currentStatus   SessionStatus @default(active) @map("current_status")
  currentPhase    SessionPhase  @default(collect) @map("current_phase")
  timerExpiresAt  DateTime?     @map("timer_expires_at")
  createdAt       DateTime      @default(now()) @map("created_at")
  reportMessageId String?       @map("report_message_id")
  
  templateType    TemplateType  @relation(fields: [templateTypeId], references: [id])
  cards           Card[]
  
  @@map("sessions")
}

model Card {
  id         String   @id @default(uuid())
  sessionId  String   @map("session_id")
  columnKey  String   @map("column_key")  // matches TemplateValue.value
  content    String   @db.VarChar(500)
  ownerHash  String   @map("owner_hash")  // SHA256(userOid + sessionId)
  createdAt  DateTime @default(now()) @map("created_at")
  
  session    Session  @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  votes      Vote[]
  
  @@map("cards")
}

model Vote {
  id         String @id @default(uuid())
  cardId     String @map("card_id")
  voterHash  String @map("voter_hash")  // SHA256(userOid + sessionId)
  
  card       Card   @relation(fields: [cardId], references: [id], onDelete: Cascade)
  
  @@unique([cardId, voterHash])  // One vote per user per card
  @@map("votes")
}
```

---

## 4. Layer Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Controllers                            │
│         (HTTP request/response, Socket events)              │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                       Services                              │
│         (Business logic, validation, orchestration)         │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                     Repositories                            │
│              (Prisma queries, data access)                  │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                      PostgreSQL                             │
└─────────────────────────────────────────────────────────────┘
```

**Rules:**
- Controllers handle HTTP I/O, call services
- Services contain business logic, call repositories
- Repositories are the only layer that touches Prisma/DB
- Socket emitters are called from services after mutations

---

## 5. REST API Endpoints

### 5.1 Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/teams` | Exchange Teams SSO token for app JWT |

### 5.2 Sessions

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/sessions` | Create new retrospective session |
| GET | `/api/sessions/:id` | Get session details |
| GET | `/api/sessions` | List sessions for channel (query: `channelId`) |
| PUT | `/api/sessions/:id/phase` | Advance session phase |
| GET | `/api/sessions/:id/summary` | Get summary data for preview |
| POST | `/api/sessions/:id/publish` | Publish summary to Teams channel |

### 5.3 Cards

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/sessions/:sessionId/cards` | Create anonymous card |
| GET | `/api/sessions/:sessionId/cards` | Get all cards for session |
| PUT | `/api/cards/:id` | Update card (owner only) |
| DELETE | `/api/cards/:id` | Delete card (owner only) |

### 5.4 Votes

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/cards/:cardId/vote` | Add vote to card |
| DELETE | `/api/cards/:cardId/vote` | Remove vote from card |

### 5.5 Templates

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/templates` | List all template types |
| GET | `/api/templates/:code` | Get template with values |

---

## 6. WebSocket Events

### 6.1 Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `session:join` | `{ sessionId: string }` | Join session room |
| `session:leave` | `{ sessionId: string }` | Leave session room |

### 6.2 Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `card:created` | `Card` | New card added |
| `card:updated` | `Card` | Card content changed |
| `card:deleted` | `{ cardId: string }` | Card removed |
| `vote:updated` | `{ cardId: string, voteCount: number }` | Vote count changed |
| `phase:changed` | `{ phase: SessionPhase, timerExpiresAt?: string }` | Phase transitioned |
| `session:completed` | `{ sessionId: string }` | Session finished |

---

## 7. Key Implementation Details

### 7.1 Anonymity — Hash Generation

```typescript
// shared/utils/hash.ts
import { createHash } from 'crypto';

export function generateOwnerHash(userOid: string, sessionId: string): string {
  return createHash('sha256')
    .update(`${userOid}:${sessionId}`)
    .digest('hex');
}
```

### 7.2 Phase Transition Validation

```typescript
// modules/sessions/sessions.service.ts
const ALLOWED_TRANSITIONS: Record<SessionPhase, SessionPhase[]> = {
  collect: ['vote', 'summary'],
  vote: ['summary'],
  summary: [],
};

export function canTransition(from: SessionPhase, to: SessionPhase): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}
```

### 7.3 Card Ownership Verification

```typescript
// modules/cards/cards.service.ts
export async function verifyOwnership(
  cardId: string,
  userOid: string,
  sessionId: string
): Promise<boolean> {
  const card = await cardsRepository.findById(cardId);
  if (!card) return false;
  
  const hash = generateOwnerHash(userOid, sessionId);
  return card.ownerHash === hash;
}
```

### 7.4 Socket Room Broadcasting

```typescript
// socket/emitters/board.emitter.ts
import { io } from '../socket';

export function emitCardCreated(sessionId: string, card: Card) {
  io.to(`session:${sessionId}`).emit('card:created', card);
}

export function emitPhaseChanged(sessionId: string, phase: SessionPhase, timerExpiresAt?: Date) {
  io.to(`session:${sessionId}`).emit('phase:changed', {
    phase,
    timerExpiresAt: timerExpiresAt?.toISOString(),
  });
}
```

---

## 8. Key Dependencies

```json
{
  "dependencies": {
    "express": "^4.18.0",
    "socket.io": "^4.7.0",
    "@prisma/client": "^5.7.0",
    "passport": "^0.7.0",
    "passport-azure-ad": "^4.3.0",
    "jsonwebtoken": "^9.0.0",
    "@microsoft/microsoft-graph-client": "^3.0.0",
    "zod": "^3.22.0",
    "pino": "^8.17.0",
    "pino-http": "^9.0.0",
    "helmet": "^7.1.0",
    "cors": "^2.8.5",
    "dotenv": "^16.3.0"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "tsx": "^4.6.0",
    "prisma": "^5.7.0",
    "@types/express": "^4.17.21",
    "@types/passport": "^1.0.16",
    "@types/jsonwebtoken": "^9.0.5",
    "vitest": "^1.0.0",
    "supertest": "^6.3.0",
    "@types/supertest": "^2.0.16"
  }
}
```

---

## 9. Environment Variables

```bash
# .env.example

# Server
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/retrobot

# Azure AD
AZURE_TENANT_ID=your-tenant-id
AZURE_CLIENT_ID=your-client-id
AZURE_CLIENT_SECRET=your-client-secret

# JWT
JWT_SECRET=your-jwt-secret
JWT_EXPIRES_IN=24h

# MS Graph (for publishing summaries)
GRAPH_CLIENT_ID=your-graph-client-id
GRAPH_CLIENT_SECRET=your-graph-client-secret
```
