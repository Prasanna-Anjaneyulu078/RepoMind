# RepoMind Backend

Node.js + Express REST API backend for RepoMind, an AI-powered GitHub repository assistant.

## Current Phase

Phase 2 provides:
* PostgreSQL Database running in Docker
* Prisma ORM and Schema migrations
* Service Layer foundation (Users, Sessions, Repositories)
* Database-aware Health Check
* Prisma integration with Express error handling

### Database Architecture
```text
Express (Host)
 ↓
Service Layer (Host)
 ↓
Prisma (Host)
 ↓
PostgreSQL (Docker: localhost:5432)
```

## Setup & Installation

```bash
# 1. Install dependencies
cd backend
npm install

# 2. Configure environment
# Copy .env.example to .env
# Important: Keep the DATABASE_URL as postgresql://repomind:repomind_dev_password@localhost:5432/repomind for local dev

# 3. Start PostgreSQL via Docker Compose
cd ..
docker compose up -d postgres

# 4. Initialize Prisma Database
cd backend
npx prisma generate
npx prisma migrate dev --name init
```

## Development

```bash
npm run dev
```

## Docker Commands
- Start DB: `docker compose up -d postgres`
- Stop DB: `docker compose stop postgres`
- Important: Do NOT run `docker compose down -v` unless you intend to completely wipe the local database volume and lose all test data.

## Health Check

```
GET /api/health
```

Expected response:
```json
{
  "success": true,
  "message": "RepoMind API is running",
  "database": "connected"
}
```
