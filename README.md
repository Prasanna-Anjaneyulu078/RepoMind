# RepoMind

RepoMind is an AI-powered GitHub repository assistant designed to help developers seamlessly explore, index, and query their codebase. By combining semantic search with Google Gemini LLMs, RepoMind allows users to chat with their repositories, automatically generate project architectures, and create dynamic developer onboarding guides.

## Overview

Modern codebases are massive and complex. Developers spend countless hours searching through files, tracing dependencies, and trying to understand undocumented architecture. RepoMind solves this by syncing your GitHub repositories, semantically indexing the codebase using vector embeddings, and providing a ChatGPT-like interface (Ask Repo) directly grounded in your code. 

**Target Users**: Software engineers, open-source contributors, technical leads, and engineering teams.

## Features

- **GitHub Integration**: Authenticate securely and sync your repositories via GitHub OAuth.
- **Semantic Code Search**: Deep vector-based code indexing using pgvector.
- **Ask Repo (RAG Chat)**: Chat with your codebase. Get answers grounded in your actual code, complete with file references and citations.
- **Code Explorer**: Navigate through your repository files in a web IDE-style interface.
- **Architecture Generation**: Automatically analyze and visualize your repository's high-level architecture.
- **Onboarding Guide**: Generate a custom, context-aware onboarding document outlining the tech stack, entry points, and project structure for new developers.

## Application Workflow

```text
User 
 ↓
Authenticate via GitHub OAuth
 ↓
Dashboard (Select or Connect Repository)
 ↓
Repository Ingestion (Clone, Chunk, Embed via Google GenAI)
 ↓
Explore Code / Generate Architecture / View Onboarding
 ↓
Ask Repo (Chat with Code)
 ↓
Backend queries pgvector for semantic similarity
 ↓
Context injected into Gemini 2.5 Flash Prompt
 ↓
Grounded Response returned with Source Citations
```

## System Architecture

- **Frontend**: React Single-Page Application (SPA) providing an IDE-like workspace.
- **Backend**: Node.js/Express API layer managing authentication, ingestion pipelines, and LLM orchestration.
- **Database**: PostgreSQL with `pgvector` for storing code chunks and dense vector embeddings.
- **AI/LLM**: Google GenAI (`gemini-2.5-flash` for reasoning, `gemini-embedding-001` for vectorization).

## Tech Stack

| Category | Technologies |
|---|---|
| **Frontend** | React 18, Vite, React Router, custom CSS variables |
| **Backend** | Node.js, Express.js |
| **Database** | PostgreSQL, Prisma ORM, pgvector |
| **AI / RAG** | `@google/genai`, Gemini 2.5 Flash, Gemini Embeddings |
| **Authentication** | GitHub OAuth, Session-based auth |
| **DevOps** | Docker (for local database), nodemon |

## Project Structure

```text
RepoMind/
├── frontend/                 # React SPA (Vite)
│   ├── src/
│   │   ├── components/       # Reusable UI components (Sidebar, Header, etc.)
│   │   ├── context/          # React Contexts (AuthContext)
│   │   ├── layouts/          # Page layouts (MainLayout)
│   │   ├── pages/            # Application routes (AskRepo, Dashboard, CodeExplorer)
│   │   ├── utils/            # Helper functions
│   │   └── index.css         # Global Design System
│
├── backend/                  # Node.js/Express API
│   ├── src/
│   │   ├── routes/           # Express routers (auth, repository, conversation, etc.)
│   │   ├── services/         # Business logic (ragService, embeddingService, chunkingService)
│   │   └── server.js         # API entry point
│   ├── prisma/               # Database schema & migrations
│   └── .env                  # Environment configuration
│
├── docker-compose.yml        # PostgreSQL infrastructure
└── README.md
```

## AI / RAG Implementation

RepoMind utilizes a robust Retrieval-Augmented Generation (RAG) pipeline to provide accurate answers about the user's code:

1. **Ingestion & Extraction**: Repositories are fetched from GitHub and text files are extracted.
2. **Chunking**: Code files are processed through `chunkingService.js` to preserve logical blocks.
3. **Embeddings**: `embeddingService.js` generates 768-dimensional vectors using Google's `gemini-embedding-001` model.
4. **Vector Storage**: Embeddings are persisted in PostgreSQL using the `pgvector` extension.
5. **Retrieval**: When a user asks a question, `retrievalService.js` performs a cosine similarity search against `pgvector` (filtering for similarity > 0.60).
6. **Generation**: `ragService.js` constructs a context window with the retrieved file chunks, injects it into a prompt, and queries `gemini-2.5-flash` to generate a grounded response.

## Database schema

Built with **Prisma ORM**, the primary entities are:

- **User**: Authenticated GitHub users.
- **Session**: Manages user access sessions.
- **Repository**: Synced GitHub repositories linked to a user.
- **RepositoryFile**: Extracted files from a repository.
- **FileChunk**: Specific text segments of a file.
- **ChunkEmbedding**: 768-dimensional vector representations stored via `pgvector`.
- **Conversation / ConversationMessage**: Chat history for the Ask Repo feature.
- **RepositoryArchitecture / RepositoryOnboarding**: Cached AI-generated repository summaries.

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- Docker Desktop (for running the PostgreSQL database)
- A GitHub OAuth App (for authentication)
- A Google Gemini API Key

### Installation

1. **Clone the repository:**
```bash
git clone <repository-url>
cd RepoMind
```

2. **Install Frontend Dependencies:**
```bash
cd frontend
npm install
```

3. **Install Backend Dependencies:**
```bash
cd ../backend
npm install
```

### Environment Variables

Create a `.env` file in the `backend/` directory based on the `.env.example`:

```env
DATABASE_URL=postgresql://repomind:repomind_dev_password@localhost:5432/repomind
GEMINI_API_KEY=your_gemini_api_key
GITHUB_CLIENT_ID=your_github_oauth_client_id
GITHUB_CLIENT_SECRET=your_github_oauth_client_secret
SESSION_SECRET=your_secure_session_secret
```

### Database Setup

Start the PostgreSQL database via Docker Compose:
```bash
# From the project root
docker compose up -d postgres
```

Initialize the database schema using Prisma:
```bash
cd backend
npx prisma generate
npx prisma migrate dev --name init
```

### Running the Application

**Start the Backend (Port 5000):**
```bash
cd backend
npm run dev
```

**Start the Frontend (Port 5173):**
```bash
cd frontend
npm run dev
```

## Security

- **Authentication**: GitHub OAuth ensures secure, password-less logins.
- **Authorization**: API endpoints validate user sessions before granting access to repository data.
- **Rate Limiting**: Configured in Express via `express-rate-limit`.
- **Security Headers**: Managed securely via `helmet`.
- **Secrets Management**: Sensitive keys are loaded exclusively from the backend environment and never exposed to the client.
