# RepoMind

**RepoMind** is an AI-powered repository understanding system that combines GitHub integration, semantic code indexing, vector similarity search, and retrieval-augmented generation to help developers understand and query software repositories using natural language.

RepoMind helps developers overcome the steep learning curve associated with large, unfamiliar codebases by providing deep semantic search and contextual answers about the implementation details, architecture, and behavior of the code.

## 🚀 Key Features

* **GitHub Integration**: Authenticate with GitHub and easily import repositories.
* **Semantic Code Indexing**: Automatically filter and chunk repository files, extracting their contents for embeddings.
* **Vector Similarity Search**: Store embeddings in PostgreSQL using `pgvector` for incredibly fast and accurate semantic retrieval.
* **Retrieval-Augmented Generation (RAG)**: Ask natural language questions about your codebase, grounded by actual repository context to minimize hallucinations.
* **Traceable Citations**: Every answer provided by RepoMind includes direct links and line-number references to the exact source files used.
* **Incremental Indexing**: Efficient re-indexing only processes new or modified files by comparing GitHub file SHAs, saving time and API costs.
* **Resilient Ingestion**: Built-in mechanisms to handle GitHub and Gemini API rate limits, duplicate ingestion protection, and startup crash recovery for stale ingestion jobs.
* **Code Explorer & Architecture View**: Navigate repository files seamlessly and request automated architecture summaries.

## 🏗 System Architecture

RepoMind is built with a modern, full-stack architecture:

* **Frontend**: React, Vite, Tailwind CSS, React Router. Provides a responsive and interactive user interface.
* **Backend**: Node.js, Express.js. Handles API requests, GitHub integration, ingestion workflows, and orchestrates the AI logic.
* **Database**: PostgreSQL with `pgvector` extension and Prisma ORM for relational and vector data storage.
* **AI/LLM**: Google Gemini API for both generating high-dimensional embeddings and synthesizing answers using RAG.

## 📦 Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | React + Vite | UI framework and fast build tool |
| Styling | Tailwind CSS | Utility-first CSS framework |
| Backend | Node.js + Express | API Server and ingestion engine |
| Database | PostgreSQL | Persistent data storage |
| ORM | Prisma | Type-safe database interactions |
| Vector Search | pgvector | PostgreSQL extension for vector similarity search |
| AI / LLM | Google Gemini (2.5 Flash) | Generating answers and embeddings |
| Authentication | GitHub OAuth | User authentication and API access |

## ⚙️ Setup and Installation

### Prerequisites
* Node.js (v18+)
* PostgreSQL database with `pgvector` extension installed
* GitHub OAuth Application credentials (Client ID & Secret)
* Google Gemini API Key

### 1. Clone the Repository
```bash
git clone <repository-url>
cd RepoMind
```

### 2. Backend Setup
```bash
cd backend
npm install
```
Configure environment variables. Copy `.env.example` to `.env` and fill in:
```env
PORT=5000
DATABASE_URL="postgresql://user:password@localhost:5432/repomind?schema=public"
SESSION_SECRET="your_session_secret"
FRONTEND_URL="http://localhost:3000"
GITHUB_CLIENT_ID="your_client_id"
GITHUB_CLIENT_SECRET="your_client_secret"
GITHUB_CALLBACK_URL="http://localhost:5000/api/auth/github/callback"
GEMINI_API_KEY="your_gemini_api_key"
GEMINI_MODEL="gemini-2.5-flash"
VECTOR_SIMILARITY_THRESHOLD="0.60"
INGESTION_STALE_TIMEOUT_MS="1800000"
```
Run Prisma migrations and start the server:
```bash
npx prisma migrate dev --name init
npm run dev
```

### 3. Frontend Setup
```bash
cd ../frontend
npm install
```
Configure environment variables. Create `.env`:
```env
VITE_API_URL="http://localhost:5000/api"
```
Start the development server:
```bash
npm run dev
```

## 🛡️ Validation & Reliability
RepoMind v1.0 has successfully passed **18/18** critical test scenarios, including:
- Incremental indexing of unchanged, modified, and deleted files.
- Resilient recovery from server restarts during active ingestion.
- Effective RAG retrieval with isolated repository boundaries.
- API 429 rate limit handling.

## ⚠️ Limitations
- Uses semantic chunking rather than full Abstract Syntax Tree (AST)-aware chunking, which may occasionally split functions across chunks.
- Repository synchronization is currently manual/polling-based. Webhook integration is not yet implemented.

## 🔮 Future Enhancements
- AST-aware code chunking for improved code context boundaries.
- GitHub webhooks for automatic re-indexing on push.
- Automated Pull Request and code generation capabilities.

---
See the `/docs` folder for detailed Architecture, API, Security, and Database documentation.
