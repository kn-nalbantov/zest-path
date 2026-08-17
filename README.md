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

`db:setup` pushes the schema and seeds 3 skills with 3 tasks each.

Optional Docker Postgres instead of a local install:

```bash
cd server
docker compose up -d
```

### Frontend

```bash
npm install
npm run dev
```

### API

```bash
npm run dev:api
```

FE defaults to Vite proxy (`/api` → `http://localhost:4000`).

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
