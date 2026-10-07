# RepoMind

A centralized, enterprise-grade AI-powered GitHub repository assistant designed to help developers seamlessly explore, index, and query their codebase using advanced Retrieval-Augmented Generation (RAG) and Google Gemini LLMs.

## Table of Contents

- [1. Project Overview](#1-project-overview)
- [2. Problem Statement](#2-problem-statement)
- [3. Key Features](#3-key-features)
- [4. Application Workflow](#4-application-workflow)
- [5. System Architecture](#5-system-architecture)
- [6. Technology Stack](#6-technology-stack)
- [7. Repository Directory Structure](#7-repository-directory-structure)
- [8. Frontend Architecture](#8-frontend-architecture)
- [9. Backend Architecture](#9-backend-architecture)
- [10. Authentication & Authorization](#10-authentication--authorization)
- [11. Core System Modules](#11-core-system-modules)
- [12. Code Chunking & Embedding Handling](#12-code-chunking--embedding-handling)
- [13. Database Schema & Entity Relationships](#13-database-schema--entity-relationships)
- [14. REST API Documentation](#14-rest-api-documentation)
- [15. Environment Setup & Configuration](#15-environment-setup--configuration)
- [16. Local Installation & Setup Guide](#16-local-installation--setup-guide)
- [17. Automated & Manual Testing](#17-automated--manual-testing)
- [18. Security Architecture](#18-security-architecture)
- [19. Error Handling & Reliability](#19-error-handling--reliability)
- [20. Deployment Architecture](#20-deployment-architecture)
- [21. Known Limitations & Future Roadmap](#21-known-limitations--future-roadmap)
- [22. Contributing](#22-contributing)
- [23. License](#23-license)

## 1. Project Overview

RepoMind modernizes and automates codebase onboarding and exploration. Traditionally, developers spend countless hours searching through files, tracing dependencies, and trying to understand undocumented architectures. This portal unifies semantic search, file exploration, and conversational AI into a single web application.

**Target Users:**
- **Software Engineers:** Quickly find relevant code snippets and understand complex logic.
- **Open-Source Contributors:** Onboard onto new projects instantly via AI-generated architecture guides.
- **Technical Leads:** Analyze repository structure and enforce architectural consistency.

## 2. Problem Statement

Modern engineering teams face critical operational bottlenecks when dealing with large codebases:
- **Steep Onboarding Curves:** Understanding undocumented architectures takes weeks.
- **Fragmented Search:** Standard regex searches fail to capture the semantic meaning of code.
- **Context Switching:** Developers constantly switch between IDEs, GitHub, and ChatGPT to understand code.
- **API Rate Limits:** Bulk embedding massive repositories often leads to 429 quota exhaustion.

RepoMind solves these issues via automated semantic code indexing, batched embedding pipelines, dynamic IDE-style file explorers, and a unified chat interface grounded entirely in your codebase context.

## 3. Key Features

### Authentication & Security
- **GitHub OAuth:** Secure, password-less authentication directly linked to GitHub profiles.
- **Session Security:** Session-based authentication via HTTP-only cookies.
- **IDOR Protection:** Endpoint ownership checks preventing users from querying or ingesting foreign repositories.

### Code Exploration & Onboarding
- **Semantic Code Search:** Deep vector-based code indexing using PostgreSQL and `pgvector`.
- **Code Explorer:** Navigate through your repository files in a web IDE-style interface.
- **Architecture Generation:** Automatically analyze and visualize your repository's high-level architecture.
- **Onboarding Guide:** Generate custom, context-aware onboarding documents detailing tech stacks and entry points.

### AI Capabilities
- **Ask Repo (RAG Chat):** Chat directly with your codebase. Get answers grounded in your actual code, complete with file references and citations.
- **Batch Embedding Engine:** Highly optimized ingestion pipeline processing multiple files via Google GenAI array batching, preventing rate limits.

## 4. Application Workflow

```mermaid
flowchart TD
    A[User Enters RepoMind] --> B{Authenticated?}
    B -->|No| C[Login via GitHub OAuth]
    B -->|Yes| D[Dashboard]
    D --> E[Connect / Sync Repository]
    E --> F[Repository Ingestion Engine]
    F --> G[Extract Code Files]
    G --> H[Chunk Code & Generate Embeddings]
    H --> I[Store in pgvector Database]
    I --> J[Workspace Ready]
    J --> K[Code Explorer]
    J --> L[Ask Repo Chat]
    L --> M[Semantic Search via Cosine Similarity]
    M --> N[Gemini 2.5 Flash Context Injection]
    N --> O[Response with File Citations]
```

## 5. System Architecture

```text
+----------------------------------+
|      Browser Client (SPA)        |
|  React 18 + Vite + Custom CSS    |
+----------------------------------+
                 |
      HTTPS / REST API Requests
                 v
+----------------------------------+
|      Node.js + Express API       |
|          Port 5000               |
+----------------------------------+
       |         |         |
+---------------------+    |       +---------------------+
|                     |    |       |                     |
v                     v    v       v                     v
+------------------------+ +-----------------------+ +------------------------+
|   GitHub OAuth Auth    | |   Embedding Engine    | |    RAG Orchestrator    |
|       Middleware       | |   gemini-embedding    | |  gemini-2.5-flash      |
+------------------------+ +-----------------------+ +------------------------+
       |                   |                         |
+---------------------+    |       +---------------------+
|                     |    |       |                     |
v                     v    v       v                     v
+----------------------------------+
|        Prisma ORM Client         |
+----------------------------------+
                 |
                 v
+----------------------------------+
|  PostgreSQL + pgvector Database  |
+----------------------------------+
```

## 6. Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend Core | React 18 | UI Component Framework |
| Build System | Vite | Production Bundler & Dev Server |
| Routing | React Router DOM | Client-side SPA Routing |
| HTTP Client | Fetch API | Centralized REST API Client |
| Backend Runtime | Node.js (v18+) | Server Runtime Environment |
| API Framework | Express.js | HTTP Server & REST API |
| Database ORM | Prisma | Type-Safe Database Client |
| Database Engine | PostgreSQL + pgvector | Relational Storage & Vector Search |
| LLM Engine | Google GenAI | Embeddings & RAG Chat |
| Authentication | GitHub OAuth | Identity Management |
| Infrastructure | Docker Compose | Local Database Orchestration |

## 7. Repository Directory Structure

```text
RepoMind/
├── frontend/                 # React SPA (Vite)
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   ├── context/          # React Contexts (AuthContext)
│   │   ├── layouts/          # Page layouts (MainLayout)
│   │   ├── pages/            # Application routes (AskRepo, Dashboard, CodeExplorer)
│   │   ├── utils/            # API Clients and helper functions
│   │   ├── App.jsx           # Main App Router
│   │   └── index.css         # Global Design System
│   └── vite.config.js
│
├── backend/                  # Node.js + Express API
│   ├── prisma/               
│   │   └── schema.prisma     # Prisma Database Schema Definition
│   ├── src/
│   │   ├── controllers/      # Express API Controllers (ingestion, chat, auth)
│   │   ├── routes/           # Express API Routers
│   │   ├── services/         # Business Logic Layer (rag, embeddings, chunking)
│   │   └── server.js         # HTTP Server Entry Point
│   └── .env                  # Environment Configuration
│
├── docker-compose.yml        # PostgreSQL infrastructure
└── README.md                 # Global Production Documentation
```

## 8. Frontend Architecture

- **Centralized API Client:** The `apiClient.js` serves as the single source of truth for the API base URL (`VITE_API_URL`), handling error normalization and automatic endpoint routing without hardcoded localhost references.
- **Modular Component Design:** Encapsulated workspaces for Chat, Code Explorer, and Architecture visualization ensuring decoupled state management.
- **Context-Driven State:** Global `AuthContext` seamlessly manages GitHub OAuth redirects and user session lifecycles.

## 9. Backend Architecture

The backend follows a strict Layered Controller-Service-Repository Architecture:
- **Express Router:** Maps endpoints (e.g., `/api/repositories/:id/ingestion`) to controllers.
- **Controller Layer:** Extracts parameters, enforces authorization, and triggers services.
- **Service Layer:** Houses the heavy lifting—such as `repositoryIngestionService.js` connecting to GitHub, and `ragService.js` orchestrating LLM interactions.
- **Prisma Client:** Communicates with the PostgreSQL database.

## 10. Authentication & Authorization

- **Flow:** User clicks "Login with GitHub" -> Redirects to GitHub OAuth -> Backend exchanges code for access token -> Backend creates User/Session -> Returns session cookie.
- **Protection:** Protected routes require an active session. Ingestion and exploration endpoints enforce exact user-repository ownership to prevent cross-account access.

## 11. Core System Modules

### Ingestion Module
Connects to GitHub APIs, fetches repository trees, filters supported files, and orchestrates the chunking and embedding pipeline using atomic database locks to prevent duplicate ingestion jobs.

### RAG & LLM Module
Takes user queries, generates an embedding, performs a fast cosine-similarity search against `pgvector`, injects the top results into a system prompt, and streams the response via Google Gemini 2.5 Flash.

### Code Explorer Module
A lightweight web IDE that reads indexed repository structures from the database and renders files using syntax-highlighted code blocks.

## 12. Code Chunking & Embedding Handling

- **Intelligent Chunking:** Source code files are split into smaller logical chunks using `chunkingService.js`.
- **Native Array Batching:** Embeddings are generated using the `gemini-embedding-001` model via highly efficient array batches (e.g., 20 chunks per API call) to avoid HTTP 429 rate limit storms.
- **Vector Storage:** Persisted to PostgreSQL using raw SQL statements to interact with the `vector(768)` data type.

## 13. Database Schema & Entity Relationships

```mermaid
erDiagram
    USER ||--o{ SESSION : "has"
    USER ||--o{ REPOSITORY : "syncs"
    REPOSITORY ||--o{ REPOSITORYFILE : "contains"
    REPOSITORY ||--o{ CONVERSATION : "owns"
    REPOSITORYFILE ||--o{ FILECHUNK : "split into"
    FILECHUNK ||--o| CHUNKEMBEDDING : "has vector"
    CONVERSATION ||--o{ CONVERSATIONMESSAGE : "contains"

    USER {
        string id PK
        string githubId
        string email
    }
    REPOSITORY {
        string id PK
        string userId FK
        string name
        string ingestionStatus
    }
    FILECHUNK {
        string id PK
        string repositoryFileId FK
        string content
    }
    CHUNKEMBEDDING {
        string id PK
        string fileChunkId FK
        vector embedding
    }
```

## 14. REST API Documentation

### Authentication Endpoints (/api/auth)
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/auth/github` | Initiates GitHub OAuth flow |
| POST | `/api/auth/logout` | Invalidates user session |

### Repository Endpoints (/api/repositories)
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/repositories` | Fetch user repositories |
| POST | `/api/repositories/:id/ingestion` | Start asynchronous ingestion pipeline |
| GET | `/api/repositories/:id/ingestion-status` | Poll ingestion progress |

### RAG Chat Endpoints (/api/conversations)
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/conversations` | Send a message to Ask Repo and retrieve LLM response |
| GET | `/api/conversations/:repoId` | Fetch chat history for a repository |

## 15. Environment Setup & Configuration

Create a `.env` file inside `backend/` and `frontend/`:

**Backend Environment (`backend/.env`)**
```env
DATABASE_URL=postgresql://repomind:repomind_dev_password@localhost:5432/repomind
GEMINI_API_KEY=your_gemini_api_key
GITHUB_CLIENT_ID=your_github_oauth_client_id
GITHUB_CLIENT_SECRET=your_github_oauth_client_secret
SESSION_SECRET=your_secure_session_secret
```

**Frontend Environment (`frontend/.env.development`)**
```env
VITE_API_URL=http://localhost:5000
```

## 16. Local Installation & Setup Guide

**Prerequisites:** Node.js (v18+), Docker Desktop, GitHub OAuth App, Google Gemini API Key.

**Step 1: Clone Repository & Start Database**
```bash
git clone <repository-url>
cd RepoMind
docker compose up -d postgres
```

**Step 2: Backend Setup & Database Migration**
```bash
cd backend
npm install
npx prisma generate
npx prisma migrate dev --name init
```

**Step 3: Frontend Setup**
```bash
cd ../frontend
npm install
```

**Step 4: Run Application Locally**
```bash
# In terminal 1
cd backend && npm run dev

# In terminal 2
cd frontend && npm run dev
```

## 17. Automated & Manual Testing
- Check repository connections via GitHub integration.
- Ensure the ingestion progress bar smoothly completes without 429 rate limit errors.
- Test "Ask Repo" to verify citation accuracy and RAG relevance.

## 18. Security Architecture
- **OAuth Exclusivity:** No passwords are stored; identity is strictly tied to GitHub.
- **Atomic Database Locks:** Ingestion requests use atomic `updateMany` operations to prevent duplicate background jobs and database contention.

## 19. Error Handling & Reliability
- **Idempotent Resumes:** If an ingestion job fails midway, restarting it automatically queries `pgvector` to skip already-embedded chunks.
- **Centralized API Error Catching:** Frontend API failures elegantly dispatch global error events mapped to intuitive UI popups.

## 20. Deployment Architecture
- **Frontend:** Vite SPA deployable to Vercel, Netlify, or Cloudflare Pages.
- **Backend:** Node.js Express service suitable for Render, Railway, or AWS ECS.
- **Database:** Managed PostgreSQL instance with the `pgvector` extension enabled.

## 21. Known Limitations & Future Roadmap
**Known Limitations:**
- Text chunking handles semantics decently, but language-aware Abstract Syntax Tree (AST) parsing is not yet implemented.

**Future Roadmap:**
- Multi-file code generation and pull request drafting directly from chat.
- Advanced RAG employing GraphRAG or Knowledge Graphs.

## 22. Contributing
Contributions are welcome! Please fork the repository, create a feature branch, and open a Pull Request.

## 23. License
All rights reserved by the RepoMind Project Maintainers.
