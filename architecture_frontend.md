# Retro-Bot Frontend Architecture

## 1. Tech Stack

| Component | Technology | Why |
|---|---|---|
| Framework | **React 18 + TypeScript** | Type safety, modern hooks, strong ecosystem |
| Build Tool | **Vite** | Fast HMR, optimized builds, native TS support |
| Routing | **React Router v6** | Standard routing, nested routes, lazy loading |
| State Management | **Zustand** | Lightweight, no boilerplate, excellent TS support |
| Real-time | **Socket.IO Client** | Reliable WebSocket with fallback, room support |
| UI Kit | **Fluent UI React v9** | Native MS Teams look & feel, accessibility built-in |
| Styling | **CSS Modules** | Scoped styles, no conflicts, works with Fluent UI |
| Forms | **React Hook Form + Zod** | Performant forms, schema-based validation |
| HTTP Client | **Axios** | Interceptors for auth, consistent error handling |
| Teams SDK | **@microsoft/teams-js ^2.19** | SSO, context, deep linking |

---

## 2. Project Structure

```
apps/frontend/
├── public/
│   └── manifest.json              # Teams app manifest
├── src/
│   ├── api/                       # API layer
│   │   ├── client.ts              # Axios instance with interceptors
│   │   ├── sessions.api.ts        # Session endpoints
│   │   ├── cards.api.ts           # Card endpoints
│   │   ├── votes.api.ts           # Vote endpoints
│   │   └── templates.api.ts       # Template endpoints
│   │
│   ├── components/                # Shared components
│   │   ├── ui/                    # Generic UI primitives
│   │   │   ├── Button/
│   │   │   ├── Input/
│   │   │   ├── Modal/
│   │   │   └── Timer/
│   │   ├── layout/                # Layout components
│   │   │   ├── AppShell.tsx
│   │   │   ├── Header.tsx
│   │   │   └── Sidebar.tsx
│   │   └── feedback/              # User feedback
│   │       ├── Toast.tsx
│   │       ├── LoadingSpinner.tsx
│   │       └── ErrorBoundary.tsx
│   │
│   ├── features/                  # Feature modules
│   │   ├── auth/
│   │   │   ├── hooks/
│   │   │   │   └── useTeamsAuth.ts
│   │   │   ├── store/
│   │   │   │   └── auth.store.ts
│   │   │   └── types/
│   │   │       └── auth.types.ts
│   │   │
│   │   ├── session/
│   │   │   ├── components/
│   │   │   │   ├── SessionConfig.tsx
│   │   │   │   ├── TemplateSelector.tsx
│   │   │   │   ├── PhaseControls.tsx
│   │   │   │   └── TimerDisplay.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useSession.ts
│   │   │   │   └── usePhaseTransition.ts
│   │   │   ├── store/
│   │   │   │   └── session.store.ts
│   │   │   └── types/
│   │   │       └── session.types.ts
│   │   │
│   │   ├── board/
│   │   │   ├── components/
│   │   │   │   ├── Board.tsx
│   │   │   │   ├── Column.tsx
│   │   │   │   ├── Card.tsx
│   │   │   │   ├── CardForm.tsx
│   │   │   │   └── VoteButton.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useBoard.ts
│   │   │   │   ├── useCards.ts
│   │   │   │   └── useVoting.ts
│   │   │   ├── store/
│   │   │   │   └── board.store.ts
│   │   │   └── types/
│   │   │       └── board.types.ts
│   │   │
│   │   ├── summary/
│   │   │   ├── components/
│   │   │   │   ├── SummaryPreview.tsx
│   │   │   │   ├── SummaryEditor.tsx
│   │   │   │   └── PublishConfirm.tsx
│   │   │   └── hooks/
│   │   │       └── useSummary.ts
│   │   │
│   │   └── history/
│   │       ├── components/
│   │       │   ├── HistoryList.tsx
│   │       │   └── SessionCard.tsx
│   │       └── hooks/
│   │           └── useHistory.ts
│   │
│   ├── hooks/                     # Global hooks
│   │   ├── useSocket.ts
│   │   └── useTeamsContext.ts
│   │
│   ├── lib/                       # Utilities
│   │   ├── socket.ts              # Socket.IO setup
│   │   ├── hash.ts                # SHA256 hashing for anonymity
│   │   └── teams.ts               # Teams SDK helpers
│   │
│   ├── pages/                     # Route pages
│   │   ├── ConfigPage.tsx         # Teams tab config
│   │   ├── BoardPage.tsx          # Main retro board
│   │   ├── SummaryPage.tsx        # Summary view
│   │   ├── HistoryPage.tsx        # Past sessions
│   │   └── NotFoundPage.tsx
│   │
│   ├── types/                     # Global types
│   │   ├── api.types.ts
│   │   ├── socket.types.ts
│   │   └── teams.types.ts
│   │
│   ├── styles/                    # Global styles
│   │   ├── variables.css
│   │   └── global.css
│   │
│   ├── App.tsx                    # Root component
│   ├── Router.tsx                 # Route definitions
│   └── main.tsx                   # Entry point
│
├── .env.example
├── vite.config.ts
├── tsconfig.json
└── package.json
```

---

## 3. State Management

### 3.1 Auth Store (Zustand)

```typescript
// features/auth/store/auth.store.ts
interface AuthState {
  user: TeamsUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Actions
  setUser: (user: TeamsUser, token: string) => void;
  logout: () => void;
  
  // Computed (for anonymity)
  getOwnerHash: (sessionId: string) => Promise<string>;
}
```

### 3.2 Session Store

```typescript
// features/session/store/session.store.ts
interface SessionState {
  currentSession: Session | null;
  phase: SessionPhase;          // 'collect' | 'vote' | 'summary'
  status: SessionStatus;        // 'active' | 'completed' | 'archived'
  timerExpiresAt: Date | null;
  templateType: TemplateType;
  
  // Actions
  setSession: (session: Session) => void;
  updatePhase: (phase: SessionPhase) => void;
  updateTimer: (expiresAt: Date | null) => void;
  clearSession: () => void;
}
```

### 3.3 Board Store

```typescript
// features/board/store/board.store.ts
interface BoardState {
  cards: Record<string, Card>;     // Keyed by card ID
  columns: TemplateValue[];        // Column definitions from template
  myCardIds: Set<string>;          // Cards owned by current user (by hash match)
  
  // Actions
  addCard: (card: Card) => void;
  updateCard: (id: string, updates: Partial<Card>) => void;
  removeCard: (id: string) => void;
  updateVoteCount: (cardId: string, count: number) => void;
  setColumns: (columns: TemplateValue[]) => void;
  resetBoard: () => void;
}
```

---

## 4. Real-time Communication

### 4.1 Socket Events

```typescript
// types/socket.types.ts

// Client → Server
interface ClientToServerEvents {
  'session:join': (sessionId: string) => void;
  'session:leave': (sessionId: string) => void;
}

// Server → Client
interface ServerToClientEvents {
  'card:created': (card: Card) => void;
  'card:updated': (card: Card) => void;
  'card:deleted': (data: { cardId: string }) => void;
  'vote:updated': (data: { cardId: string; voteCount: number }) => void;
  'phase:changed': (data: { phase: SessionPhase; timerExpiresAt?: string }) => void;
  'session:completed': (data: { sessionId: string }) => void;
}
```

### 4.2 Socket Hook

```typescript
// hooks/useSocket.ts
export function useSocket(sessionId: string) {
  const socket = useRef<Socket<ServerToClientEvents, ClientToServerEvents>>();
  const addCard = useBoardStore((s) => s.addCard);
  const updatePhase = useSessionStore((s) => s.updatePhase);
  
  useEffect(() => {
    socket.current = io(import.meta.env.VITE_WS_URL, {
      auth: { token: getStoredToken() },
    });
    
    socket.current.emit('session:join', sessionId);
    
    socket.current.on('card:created', addCard);
    socket.current.on('phase:changed', ({ phase }) => updatePhase(phase));
    // ... other listeners
    
    return () => {
      socket.current?.emit('session:leave', sessionId);
      socket.current?.disconnect();
    };
  }, [sessionId]);
}
```

---

## 5. Anonymity Implementation

### 5.1 Owner Hash Generation

```typescript
// lib/hash.ts
export async function generateOwnerHash(
  userAzureOid: string,
  sessionId: string
): Promise<string> {
  const data = `${userAzureOid}:${sessionId}`;
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
```

### 5.2 Card Ownership Check

```typescript
// features/board/hooks/useCards.ts
export function useCardOwnership(card: Card) {
  const getOwnerHash = useAuthStore((s) => s.getOwnerHash);
  const sessionId = useSessionStore((s) => s.currentSession?.id);
  const [isOwner, setIsOwner] = useState(false);
  
  useEffect(() => {
    if (!sessionId) return;
    getOwnerHash(sessionId).then((hash) => {
      setIsOwner(hash === card.ownerHash);
    });
  }, [card.ownerHash, sessionId]);
  
  return isOwner;
}
```

---

## 6. Teams Integration

### 6.1 Teams Context Hook

```typescript
// hooks/useTeamsContext.ts
import * as microsoftTeams from '@microsoft/teams-js';

export function useTeamsContext() {
  const [context, setContext] = useState<microsoftTeams.app.Context | null>(null);
  const [isInTeams, setIsInTeams] = useState(false);
  
  useEffect(() => {
    microsoftTeams.app.initialize().then(() => {
      setIsInTeams(true);
      return microsoftTeams.app.getContext();
    }).then(setContext).catch(() => {
      // Running outside Teams (dev mode)
      setIsInTeams(false);
      setContext(getMockContext()); // Dev fallback
    });
  }, []);
  
  return { context, isInTeams };
}
```

### 6.2 SSO Authentication

```typescript
// features/auth/hooks/useTeamsAuth.ts
export function useTeamsAuth() {
  const setUser = useAuthStore((s) => s.setUser);
  
  const authenticate = async () => {
    try {
      const token = await microsoftTeams.authentication.getAuthToken();
      const response = await api.post('/auth/teams', { token });
      setUser(response.data.user, response.data.accessToken);
    } catch (error) {
      console.error('Teams auth failed:', error);
    }
  };
  
  return { authenticate };
}
```

---

## 7. Routing

```typescript
// Router.tsx
import { createBrowserRouter } from 'react-router-dom';

export const router = createBrowserRouter([
  {
    path: '/config',
    element: <ConfigPage />,                    // Teams tab configuration
  },
  {
    path: '/session/:sessionId',
    element: <SessionLayout />,
    children: [
      { path: 'board', element: <BoardPage /> },
      { path: 'summary', element: <SummaryPage /> },
    ],
  },
  {
    path: '/history',
    element: <HistoryPage />,
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);
```

---

## 8. Key Dependencies

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "@microsoft/teams-js": "^2.19.0",
    "@fluentui/react-components": "^9.46.0",
    "zustand": "^4.4.0",
    "socket.io-client": "^4.7.0",
    "axios": "^1.6.0",
    "react-hook-form": "^7.49.0",
    "zod": "^3.22.0",
    "@hookform/resolvers": "^3.3.0"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "vite": "^5.0.0",
    "@vitejs/plugin-react": "^4.2.0",
    "@types/react": "^18.2.0",
    "vitest": "^1.0.0",
    "@testing-library/react": "^14.1.0"
  }
}
```

---

## 9. Environment Variables

```bash
# .env.example
VITE_API_URL=http://localhost:3000/api
VITE_WS_URL=http://localhost:3000
VITE_TEAMS_APP_ID=your-teams-app-id
```
