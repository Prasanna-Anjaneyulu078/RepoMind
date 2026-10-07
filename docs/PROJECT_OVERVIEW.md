# Project Overview

## Problem Statement
When software developers join a new project, contribute to open-source, or navigate a large legacy codebase, they spend a significant amount of time merely trying to understand how things work. Conventional IDE tools and keyword searches often fail because they lack semantic understanding. Keyword search cannot easily answer questions like "How is authentication handled in this app?" or "Where are the database relationships defined?", which are critical for codebase comprehension.

## Objectives
RepoMind aims to solve this problem by providing a semantic understanding of software repositories. The primary objectives are to:
1. Connect directly to GitHub repositories.
2. Ingest, parse, and semantically index source code efficiently.
3. Allow developers to ask natural language questions about the codebase.
4. Retrieve highly relevant source code chunks as context to provide accurate, grounded answers.
5. Provide traceable citations (file and line numbers) for every claim made by the AI.

## Key Features
* **GitHub Integration**: Connect and ingest public and private repositories securely.
* **Intelligent File Filtering**: Automatically skips non-text, binary, and un-ingestable files.
* **Semantic Embeddings**: Uses Google Gemini to generate vector representations of code chunks.
* **Vector Similarity Search**: Leverages PostgreSQL `pgvector` to find semantically relevant code instantly.
* **RAG-based Question Answering**: Feeds retrieved repository context into Gemini to produce factually grounded answers.
* **Incremental Indexing**: Uses GitHub Blob SHAs to detect unmodified files, drastically reducing redundant embedding generation on sync.
* **Stale Job Recovery**: Automatically detects and resets ingestion jobs interrupted by server crashes.
* **Traceable Citations**: Identifies the exact files and lines used to formulate answers.

## Workflow
1. **Authentication**: User logs in via GitHub OAuth.
2. **Repository Selection**: User connects a repository to their account.
3. **Ingestion**: The backend fetches the repository tree, filters files, downloads content, and applies chunking.
4. **Vectorization**: Code chunks are sent to Gemini to generate embeddings, which are stored in `pgvector`.
5. **Question Answering**: The user submits a question. The query is embedded and searched against the repository's vectors.
6. **Grounding**: The top semantically similar chunks (cosine similarity >= 0.60) are retrieved and presented to Gemini to generate the final response.

## Limitations
* Uses line-based semantic chunking rather than AST-aware chunking.
* Re-indexing is triggered manually rather than automatically via GitHub webhooks.

## Future Scope
* GraphRAG capabilities for deeper structural understanding.
* AST-aware parsing for precise function and class boundary isolation.
* Automated code generation directly into Pull Requests.

## Academic/Project Description
RepoMind is an AI-powered repository understanding system that combines GitHub integration, semantic code indexing, vector similarity search, and retrieval-augmented generation to help developers understand and query software repositories using natural language.
