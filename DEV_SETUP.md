# Retro MS Teams Plugin — Developer Setup

## Prerequisites

- **Node.js** >= 22.x
- **npm** >= 11.x
- **PostgreSQL** >= 16 (running locally or via Docker)

## Project Structure

```
├── backend/          # Express + Prisma + Socket.IO API
├── frontend/         # React Teams tab (served by @microsoft/teams.apps)
```

## 1. Clone & Install

```bash
git clone <repo-url>
cd "Retro MS Teams Plugin"

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

## 2. Database Setup

Create a PostgreSQL database:

```bash
createdb retrobot
```

Configure the connection string in `backend/.env`:

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env` and set your `DATABASE_URL`:

```
DATABASE_URL="postgresql://<your-user>@localhost:5432/retrobot?schema=public"
```

Run migrations and seed template data:

```bash
cd backend
npm run db:migrate
npm run db:seed
```

## 3. Run

Open **two terminals**:

**Terminal 1 — Backend** (API + WebSocket on port 3000):

```bash
cd backend
npm run dev
```

**Terminal 2 — Frontend** (Teams tab on port 3978):

```bash
cd frontend
npm run dev
```

## 4. Open in Browser

```
http://localhost:3978/tabs/home/
```

> The backend API is at `http://localhost:3000/api/health`

## Multi-User Testing

Open the same URL in a second browser or incognito window. Each browser gets a unique anonymous user ID (stored in `localStorage`). The user who creates a session is the **moderator** and can control phase transitions.

## Useful Commands

| Command | Directory | Description |
|---------|-----------|-------------|
| `npm run dev` | `backend/` | Start backend with hot-reload |
| `npm run dev` | `frontend/` | Build & start frontend with nodemon |
| `npm run db:migrate` | `backend/` | Run Prisma migrations |
| `npm run db:seed` | `backend/` | Seed template types (SSC, MSG, 4L) |
| `npm run db:studio` | `backend/` | Open Prisma Studio (DB browser) |
| `npm run db:reset` | `backend/` | Reset DB (drop all data + re-migrate + re-seed) |

## Troubleshooting

**Port already in use (3978/3979)**
```bash
lsof -ti:3978 -ti:3979 | xargs kill -9
```

**Port already in use (3000)**
```bash
lsof -ti:3000 | xargs kill -9
```

**Prisma client out of date**
```bash
cd backend && npx prisma generate
```
