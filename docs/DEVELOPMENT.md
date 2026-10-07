# Local Development Guide

This guide explains how to run RepoMind locally for development.

## Prerequisites
* **Node.js**: v18 or newer
* **PostgreSQL**: Must have the `pgvector` extension installed. (Can be run via Docker).
* **GitHub OAuth App**: Create one in your GitHub Developer Settings.
  * Homepage URL: `http://localhost:3000`
  * Authorization callback URL: `http://localhost:5000/api/auth/github/callback`
* **Google Gemini API Key**: Obtain from Google AI Studio.

## 1. Database Setup (Docker)
If you don't have PostgreSQL installed locally with `pgvector`, you can use the provided `docker-compose.yml` (if available in your setup) or run:

```bash
docker run -d --name repomind-db \
  -e POSTGRES_USER=user \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=repomind \
  -p 5432:5432 \
  pgvector/pgvector:pg16
```

## 2. Backend Setup
Navigate to the backend directory:
```bash
cd backend
npm install
```

Create a `.env` file based on `.env.example`:
```env
PORT=5000
DATABASE_URL="postgresql://user:password@localhost:5432/repomind?schema=public"
SESSION_SECRET="your-development-secret-key"
FRONTEND_URL="http://localhost:3000"
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"
GITHUB_CALLBACK_URL="http://localhost:5000/api/auth/github/callback"
GEMINI_API_KEY="your-gemini-api-key"
GEMINI_MODEL="gemini-2.5-flash"
VECTOR_SIMILARITY_THRESHOLD="0.60"
INGESTION_STALE_TIMEOUT_MS="1800000"
```

Initialize the database schema:
```bash
npx prisma migrate dev --name init
```

Start the backend development server (uses `nodemon` for hot-reloading):
```bash
npm run dev
```

## 3. Frontend Setup
Navigate to the frontend directory:
```bash
cd frontend
npm install
```

Create a `.env` file:
```env
VITE_API_URL="http://localhost:5000/api"
```

Start the Vite development server:
```bash
npm run dev
```

The frontend will be accessible at `http://localhost:3000`.

## Debugging Guidance
* **Ingestion Failures**: If repository ingestion fails, check the `lastIngestionError` column in the database or the backend console logs. Ensure the Gemini API key is valid and not rate-limited.
* **Vector Search Issues**: If RAG is returning no results, lower the `VECTOR_SIMILARITY_THRESHOLD` temporarily to verify chunks are being returned before filtering.
* **Database Reset**: If you need to completely reset the local database:
  ```bash
  npx prisma migrate reset
  ```
