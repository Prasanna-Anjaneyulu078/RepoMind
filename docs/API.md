# API Documentation

All API endpoints require authentication (except the OAuth entry points). Authentication is verified via the `authMiddleware` which expects a valid session cookie or token.

## Authentication Routes
* `GET /api/auth/github` - Initiates the GitHub OAuth flow.
* `GET /api/auth/github/callback` - OAuth callback endpoint.
* `GET /api/auth/me` - Returns the currently authenticated user's profile.
* `POST /api/auth/logout` - Terminates the user session.

## Repository Management Routes
* `GET /api/repositories/github` - Lists available repositories from the user's GitHub account.
* `POST /api/repositories` - Connects a GitHub repository to RepoMind.
* `GET /api/repositories` - Lists repositories already connected to the user's account.
* `DELETE /api/repositories/:id` - Deletes a repository and all its associated data (vectors, chunks, files).

## Ingestion & Indexing Routes
* `POST /api/repositories/:id/ingest` - Starts the background ingestion/indexing process for a repository.
* `POST /api/repositories/:id/sync` - Re-syncs a repository (incremental indexing).
* `GET /api/repositories/:id/ingestion` - Returns the real-time progress and status of the current ingestion job.

## Code Explorer Routes
* `GET /api/repositories/:id/files/tree` - Returns the hierarchical folder/file tree of the repository.
* `GET /api/repositories/:id/files/content` - Retrieves the raw text content of a specific file.

## RAG & Conversation Routes
* `POST /api/repositories/:id/ask` - (Legacy) Ask a one-off question about the repository.
* `GET /api/repositories/:id/recent-questions` - Retrieves recently asked questions for context.
* `GET /api/repositories/:id/recommended-questions` - Suggests relevant questions based on repository content.
* `POST /api/repositories/:id/conversations` - Initializes a new conversation thread.
* `GET /api/repositories/:id/conversations` - Lists all conversation threads for a repository.
* `GET /api/repositories/:conversationId` - Retrieves a specific conversation history.
* `DELETE /api/repositories/:conversationId` - Deletes a conversation.
* `POST /api/repositories/:conversationId/messages` - Sends a message to a conversation thread, executing the RAG flow.

## Architecture & Onboarding Routes
* `GET /api/repositories/:id/architecture` - Retrieves the generated architecture summary.
* `POST /api/repositories/:id/architecture/generate` - Triggers the generation of the architecture summary.
* `GET /api/repositories/:id/onboarding` - Retrieves the repository onboarding guide.
* `POST /api/repositories/:id/onboarding/generate` - Triggers the generation of the onboarding guide.

## System Routes
* `GET /api/health` - Checks backend and database connectivity.
