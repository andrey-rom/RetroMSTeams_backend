# Code Review Findings

## Backend

### Bugs (should fix)

#### 1. Missing try/catch on async route handlers

**Files:** `sessions.controller.ts`, `cards.controller.ts`, `votes.controller.ts`, `templates.controller.ts`

Six handlers lack error handling. If Prisma throws, it becomes an unhandled promise rejection instead of a proper 500 response.


| Route                               | File                      |
| ----------------------------------- | ------------------------- |
| `POST /sessions`                    | `sessions.controller.ts`  |
| `GET /sessions`                     | `sessions.controller.ts`  |
| `GET /:sessionId/cards`             | `cards.controller.ts`     |
| `GET /sessions/:sessionId/my-votes` | `votes.controller.ts`     |
| `GET /templates`                    | `templates.controller.ts` |
| `GET /templates/:code`              | `templates.controller.ts` |


**Fix:** Wrap in try/catch passing errors to `next(err)`, or add an `asyncHandler` utility.

---

#### 2. Race condition in castVote — max votes can be exceeded

**File:** `backend/src/modules/votes/votes.service.ts`

`findVote` -> `countByVoterInSession` -> `addVote` are 3 separate DB calls. Two concurrent requests can both pass the count check and both insert, exceeding the limit.

**Fix:** Wrap the entire check+insert in a single `$transaction` with serializable isolation.

---

#### 3. votesCount can go negative

**File:** `backend/src/modules/votes/votes.repository.ts`

`removeVote` does `decrement: 1` with no guard against the count already being 0.

**Fix:** Add a DB-level `CHECK (votes_count >= 0)` constraint or guard in the transaction.

---

#### 4. Null session gives misleading error

**File:** `backend/src/modules/cards/cards.service.ts`

If a session is deleted but the card still exists, `session?.currentPhase !== "collect"` evaluates to true. The error says "Cards can only be edited during collect phase" instead of "Session not found".

**Fix:** Add explicit `if (!session) throw new NotFoundError("Session")` before the phase check.

---

#### 5. Phase + status update are not atomic

**File:** `backend/src/modules/sessions/sessions.service.ts`

`updatePhase` then `updateStatus("completed")` are two separate DB calls in `advancePhase`. If the second fails, phase is "summary" but status remains "active".

**Fix:** Combine into a single `prisma.session.update` call or wrap in `$transaction`.

---

### Security (fix before deployment)

#### 6. WebSocket has no real authentication

**File:** `backend/src/socket/socket.ts`

Any client can connect and supply any `userId` string. No token verification. Blocked by Azure AD SSO not being implemented yet.

**Fix:** Validate a JWT/SSO token in the socket handshake auth payload.

---

#### 7. No socket room join authorization

**File:** `backend/src/socket/handlers/session.handler.ts`

No validation that the user belongs to the session's team/channel. Any socket can join any session room.

**Fix:** Verify session access before allowing `socket.join`.

---

#### 8. ownerHash is predictable without HMAC secret

**File:** `backend/src/shared/utils/hash.ts`

`SHA256(userId:sessionId)` with no secret/salt. Anyone who knows a userId and sessionId can compute any user's ownerHash.

**Fix:** Use `createHmac("sha256", env.hashSecret).update(...)` with a server-side secret.

---

#### 9. No trust proxy setting

**File:** `backend/src/app.ts`

`express-rate-limit` keys on `req.ip`. Behind a reverse proxy, all users share the same IP.

**Fix:** Add `app.set("trust proxy", 1)` when behind a proxy.

---

#### 10. validateEnv never catches missing JWT_SECRET

**File:** `backend/src/config/env.ts`

The fallback `"dev-secret-change-in-production"` makes `env.jwt.secret` always truthy, so the check always passes.

**Fix:** Check `process.env.JWT_SECRET` directly instead of `env.jwt.secret`.

---

#### 11. No input validation on socket sessionId

**File:** `backend/src/socket/handlers/session.handler.ts`

`sessionId` is used directly to construct a room name with no UUID format check.

**Fix:** Validate sessionId is a valid UUID before using it.

---

### Logic / Consistency

#### 12. columnKey not validated against template values

**File:** `backend/src/modules/cards/cards.service.ts`

`createCard` accepts any `columnKey` string. Clients can create cards with arbitrary column keys that the frontend can't display.

**Fix:** Check `session.templateType.values.some(v => v.value === columnKey)` after fetching the session.

---

#### 13. publishSummary uses raw AppError instead of ForbiddenError

**File:** `backend/src/modules/teams/teams.service.ts`

`throw new AppError("...", 403, "FORBIDDEN")` should use the existing `ForbiddenError` class.

---

#### 14. collect -> summary transition skips voting

**File:** `backend/src/modules/sessions/sessions.service.ts`

`ALLOWED_TRANSITIONS` allows `collect -> summary`, skipping the vote phase. Confirm if intentional.

---

#### 15. Health check accepts all HTTP methods

**File:** `backend/src/app.ts`

`app.use("/api/health", ...)` matches DELETE, POST, etc. Should be `app.get(...)`.

---

#### 16. No graceful shutdown

**File:** `backend/src/index.ts`

No `SIGTERM`/`SIGINT` handlers. Server, WebSocket, and Prisma client are not closed on shutdown.

---

#### 17. Prisma errors not mapped to user-friendly responses

**File:** `backend/src/shared/middleware/error-handler.ts`

Prisma errors (unique constraint P2002, record not found P2025) fall through to generic 500.

---

#### 18. No createdAt on Vote model

**File:** `backend/prisma/schema.prisma`

Makes it impossible to audit when votes were cast.

---

#### 19. No index on creatorId

**File:** `backend/prisma/schema.prisma`

Looking up "sessions I created" would be a full table scan.

---

#### 20. Sessions list has no pagination

**File:** `backend/src/modules/sessions/sessions.repository.ts`

`findByChannel` returns unbounded results with no `take`/`skip`.

---

#### 21. Production PrismaClient has no logging

**File:** `backend/src/config/db.ts`

Production gets a bare `PrismaClient()` with no log options. Should at least log `["warn", "error"]`.

---

#### 22. MSAL config eager-loaded with empty credentials

**File:** `backend/src/config/msal.ts`

Module-level config runs with empty strings in dev. Should be lazy-initialized.

---

## Frontend

### Bugs (should fix)

#### 1. Socket event listener memory leak / duplicate processing

**File:** `frontend/src/Tab/pages/BoardPage.tsx` (lines 53-88)

`useEffect` registers 5 socket handlers but returns no cleanup function. In StrictMode, effects run twice, stacking duplicate handlers.

**Fix:** Return a cleanup function that calls `off` for each registered event.

---

#### 2. useSocket on() never removes previous handler

**File:** `frontend/src/Tab/hooks/useSocket.ts` (lines 38-41)

`on()` stores in ref map and registers on socket. If called again for the same event, the old handler is never removed via `socket.off()`. Socket.IO's `on` is additive.

**Fix:** Call `socket.off(event, prevHandler)` before registering the new one.

---

#### 3. Hardcoded API/Socket URLs

**Files:** `frontend/src/Tab/lib/api-client.ts` (line 1), `frontend/src/Tab/hooks/useSocket.ts` (line 5)

`http://localhost:3000/api` and `http://localhost:3000` will break in any non-local deployment.

**Fix:** Use `import.meta.env.VITE_API_URL` with localhost fallback.

---

### Improvements

#### 4. No loading state on HomePage

**File:** `frontend/src/Tab/pages/HomePage.tsx`

Blank page while templates/sessions load. No spinner or skeleton.

---

#### 5. getSessions error silently swallowed

**File:** `frontend/src/Tab/pages/HomePage.tsx` (line 20)

`.catch(() => {})` hides failures. User sees empty sessions list with no explanation.

---

#### 6. No double-click protection on phase/publish buttons

**File:** `frontend/src/Tab/pages/BoardPage.tsx`

Phase advance and publish buttons have no `isSubmitting` guard. Double-clicking fires duplicate requests.

---

#### 7. alert() used for error feedback (4 places)

**File:** `frontend/src/Tab/pages/BoardPage.tsx`

Blocks UI, can't be styled, doesn't fit Teams UX.

---

#### 8. No request timeout on fetch calls

**File:** `frontend/src/Tab/lib/api-client.ts`

No `AbortController`/timeout. If backend is unreachable, user sees infinite loading.

---

#### 9. No socket disconnect feedback

**File:** `frontend/src/Tab/hooks/useSocket.ts`

No handling for `disconnect` or `connect_error`. User has no idea real-time updates stopped.

---

#### 10. No Error Boundary

**Files:** `frontend/src/Tab/App.tsx`, `frontend/src/Tab/client.tsx`

Any render crash = white screen with no recovery.

---

#### 11. SummaryView has no .catch() on getSummary

**File:** `frontend/src/Tab/pages/BoardPage.tsx` (lines 328-329)

Unhandled promise rejection. Error details silently lost.

---

### Minor

#### 12. Dead Router.tsx file

**File:** `frontend/src/Tab/Router.tsx`

Never imported, broken types, unnecessary `react-router-dom` dependency.

---

#### 13. 100vh in CSS problematic in Teams iframe

**File:** `frontend/src/Tab/App.css` (line 23)

Does not account for Teams chrome. Use `height: 100%` or `100dvh`.

---

#### 14. Unsafe type assertions on socket payloads

**File:** `frontend/src/Tab/pages/BoardPage.tsx`

Bare `as Card` casts with no runtime validation. Malformed payloads silently produce incorrect state.

---

## Priority

### Fix now (bugs/correctness)

1. Missing try/catch on async handlers (backend)
2. Socket listener cleanup + dedup (frontend)
3. Non-atomic vote race condition (backend)
4. Null session misleading error (backend)
5. Phase + status atomicity (backend)

### Fix before deployment

1. Hardcoded URLs (frontend)
2. trust proxy + validateEnv JWT check (backend)
3. HMAC for ownerHash (backend)
4. WebSocket auth (backend — blocked by Azure AD)

### Nice-to-have

1. Loading states, error boundaries, disconnect feedback (frontend UX)
2. columnKey validation, Prisma error mapping, graceful shutdown (backend)
3. Pagination, Vote createdAt, creatorId index (backend schema)

