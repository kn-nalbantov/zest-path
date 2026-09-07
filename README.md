# ZestPath

Gamified cooking learning app — Duolingo-inspired React mockup with a PostgreSQL API.

## Stack

- **FE:** React + Vite
- **BE:** Express + Prisma
- **DB:** PostgreSQL 16

## Setup

### Database

PostgreSQL should be running locally. Create the DB (once):

```bash
psql -U postgres -c "CREATE DATABASE zestpath;"
```

Copy env and install API deps:

```bash
cd server
cp .env.example .env
npm install
npm run db:setup
```

Set Google OAuth (optional but recommended) in `server/.env`:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- Redirect URI: `http://localhost:4000/api/auth/google/callback`

Guest mode works without Google and still stores progress in Postgres via cookie sessions.

### Frontend

```bash
npm install
npm run dev
```

### API

```bash
npm run dev:api
```

FE proxies `/api` and `/uploads` to `http://localhost:4000` with cookie sessions (`credentials: 'include'`).

## Docker demo

Three containers: nginx frontend, Express API, PostgreSQL. Only port **8080** (local) or **80** (Azure VM) is published.

```bash
cp .env.example .env
# set GEMINI_API_KEY and CLIENT_URL
docker compose up --build
```

Open `http://localhost:8080`. On an Azure VM, set `FE_PORT=80` and `CLIENT_URL=http://<public-ip>` in `.env`, then `docker compose up -d --build`. Do not expose 5432 or 4000.

## Task template

Every task uses the same JSON payload shape:

```json
{
  "choices": [{ "id": "a", "text": "..." }],
  "answer": { "mode": "single" | "multiple" | "ordered", "correctIds": ["a"] },
  "feedback": { "correct": "...", "incorrect": "..." }
}
```

`LessonScreen` reads that envelope from the API and renders one of three interactions without per-task custom UI.

## AI Chef

- Pantry mock: `InventoryItem` rows per user (stand-in for Grocy).
- Prompt: [`server/prompts/ai-chef.md`](server/prompts/ai-chef.md) injected on every Gemini call.
- Key: `GEMINI_API_KEY` in `server/.env` only (never `VITE_*`).
- `POST /api/ai/chat` loads inventory from DB, sends it with the system prompt, returns JSON `{ assistantMessage, recipe, shoppingSuggestions }`.
