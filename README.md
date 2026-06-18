# DevDocs AI — AI-Powered Developer Documentation Engine

> Code that documents itself — and stays accurate as the codebase evolves.

![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-5-2D3748?style=flat-square&logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-pgvector-336791?style=flat-square&logo=postgresql&logoColor=white)
![Gemini](https://img.shields.io/badge/Gemini_1.5-AI-FF6F00?style=flat-square&logo=google&logoColor=white)

---

## Overview

Outdated documentation wastes developer hours and causes incorrect API usage. The fix is not *more* documentation — it is documentation that stays accurate automatically.

**DevDocs AI** treats documentation as a living asset. It ingests a GitHub repository, parses the source code into an Abstract Syntax Tree, uses an LLM to generate Markdown docs for every function, class, and API, and then keeps those docs in sync as the code changes. When a signature changes, the affected docs are flagged by severity and an updated draft is proposed for human review. A built-in chat assistant answers questions grounded in the generated docs — no hallucinated answers.

---

## Core Features

| Feature | What it does |
|---|---|
| **Code Ingestion & Parsing** | Connects a GitHub repo via OAuth, fetches source files, and parses JS/TS (Babel AST) and Python to extract functions, classes, methods, interfaces, parameters, return types, and async/export flags. |
| **Documentation Generation** | Generates comprehensive Markdown per code unit — purpose, parameters, return values, side effects, usage examples, and edge cases. |
| **Change Detection** | Detects code changes via GitHub webhooks **and** by re-analyzing a repo and comparing AST signatures against stored versions. |
| **Staleness Flagging** | Classifies affected docs by severity: `BROKEN`, `OUTDATED`, or `REVIEW_REQUIRED`. Removed code units are flagged `BROKEN`. |
| **Update Drafting** | Drafts an updated doc version reflecting the code change, presented as a side-by-side diff for approve/reject. Every decision is versioned. |
| **Documentation Chat (RAG)** | Semantic Q&A over the docs using pgvector similarity search, with a keyword fallback. Answers are grounded in the docs and cite their sources. |
| **Documentation Health Insights** | A dashboard that summarizes coverage and staleness for a repo, with an AI-generated health briefing on what to prioritize. |
| **How It Works** | A guided walkthrough of the full documentation pipeline, stage by stage. |

---

## How It Works

```
GitHub Repository
      │  (OAuth + Octokit)
      ▼
Ingestion ──► AST Parser ──► Code Units (functions, classes, APIs)
                                  │
                                  ▼
                         LLM Doc Generation ──► Markdown docs (versioned)
                                  │
                                  ▼
                         Embeddings (text-embedding-004) ──► pgvector
                                  │
        ┌─────────────────────────┼──────────────────────────┐
        ▼                         ▼                            ▼
  Documentation Portal      Chat (RAG)              Change & Staleness Detection
                                                    (webhooks + re-analysis)
                                                            │
                                                            ▼
                                                  Update Drafts + Diff Review
```

### AI model fallback

To stay available under rate limits or quota exhaustion, documentation and chat generation run through a fallback chain (see `src/lib/gemini.ts`):

1. **Gemini 1.5 Flash** — fast, low cost, primary model
2. **Gemini 1.5 Pro** — higher accuracy, used if Flash fails
3. **NVIDIA NIM → `meta/llama-3.3-70b-instruct`** — open-weight fallback if both Gemini calls fail

Embeddings are always generated with Google `text-embedding-004` (768 dimensions) and stored in PostgreSQL via the `pgvector` extension.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 (App Router), React 19, Tailwind CSS |
| Backend | Next.js API Routes, TypeScript |
| Auth | NextAuth.js + GitHub OAuth |
| AI (generation) | Gemini 1.5 Flash → Gemini 1.5 Pro → NVIDIA Llama 3.3 70B |
| Embeddings | Google `text-embedding-004` |
| Code parsing | `@babel/parser`, `ts-morph`, custom Python parser |
| ORM | Prisma 5 |
| Database | PostgreSQL + `pgvector` |
| Monitoring | GitHub Webhooks, `@octokit/rest` |
| Validation / logging | Zod, Winston |

---

## Local Setup

### Prerequisites

- Node.js v20+
- A PostgreSQL instance with the `pgvector` extension (e.g. [Neon](https://neon.tech))
- A [GitHub OAuth App](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app)
- A [Google Gemini API key](https://aistudio.google.com/app/apikey)
- *(optional)* An [NVIDIA NIM API key](https://integrate.api.nvidia.com) for the third-tier fallback

### 1. Clone & install

```bash
git clone https://github.com/Durgaprasad-Developer/Dev-Docs.git
cd Dev-Docs
npm install
```

### 2. Configure environment

Create a `.env.local` file in the project root:

```env
# Database
DATABASE_URL="postgresql://user:password@host:5432/dbname?schema=public"
DIRECT_URL="postgresql://user:password@host:5432/dbname?schema=public"

# AI
GEMINI_API_KEY="your_gemini_api_key"
NVIDIA_API_KEY="nvapi-your_nvidia_key"   # optional fallback

# Auth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate_with: openssl rand -base64 32"
GITHUB_CLIENT_ID="your_github_oauth_client_id"
GITHUB_CLIENT_SECRET="your_github_oauth_client_secret"

# Webhooks (optional)
GITHUB_WEBHOOK_SECRET="your_webhook_secret"
```

Generate a `NEXTAUTH_SECRET` with `openssl rand -base64 32`.

### 3. Database

```bash
npx prisma generate
npx prisma migrate dev --name init
```

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Using the App

1. **Sign in** with GitHub.
2. **Add a repository** — select one of your GitHub repos or paste a URL.
3. **Analyze** — the engine fetches files, parses them, generates docs, and builds embeddings. Status goes `PENDING → ANALYZING → READY`.
4. **Documentation** — browse the generated docs per code unit.
5. **Chat** — ask questions about the codebase; answers are grounded in the docs and cite sources.
6. **Insights** — view documentation coverage and a per-severity staleness breakdown, and generate an AI health briefing on what needs attention.
7. **How It Works** — a guided walkthrough of the documentation pipeline.
8. **Review & approve** — when code changes, affected docs are flagged and an updated draft is proposed; review the diff and approve or reject.

---

## Database Schema

| Table | Purpose |
|---|---|
| `repositories` | Tracked GitHub repositories |
| `files` | Source files per repository (with content hash) |
| `code_units` | Parsed AST nodes — functions, classes, methods, interfaces |
| `documentation` | Active generated docs per code unit (with status) |
| `documentation_versions` | Version history for review and rollback |
| `embeddings` | `vector(768)` embeddings for semantic search |
| `chat_history` | Developer ↔ assistant conversation log |

---

## Project Structure

```
src/
├── app/
│   ├── dashboard/        # Repository management
│   ├── repositories/     # Repo detail + file views
│   ├── documentation/    # Documentation portal
│   ├── chat/             # RAG chat interface
│   ├── insights/         # Documentation health insights
│   ├── how-it-works/     # Pipeline walkthrough
│   ├── diff/             # Update-draft diff review
│   └── api/              # API route handlers
│       ├── repositories/ # add, list, fetch, analyze
│       ├── docs/         # get doc, approve/reject update
│       ├── chat/         # RAG chat endpoint
│       └── webhooks/github/  # push-event receiver
├── services/
│   ├── parser.ts         # AST parsing (JS/TS + Python)
│   ├── generator.ts      # LLM doc generation & updates
│   ├── staleness.ts      # change detection & severity classification
│   ├── embeddings.ts     # pgvector embedding + similarity search
│   ├── chat.ts           # RAG pipeline
│   └── diff.ts           # LCS-based text diff
├── lib/
│   ├── gemini.ts         # AI model fallback chain + embeddings
│   ├── github.ts         # Octokit integration
│   ├── auth.ts           # NextAuth configuration
│   └── prisma.ts         # Prisma client singleton
└── components/           # Shared UI (Sidebar, etc.)
```

---

## API Reference

```http
# Repositories
POST   /api/repositories              Add a repository
GET    /api/repositories              List repositories
GET    /api/repositories/:id          Fetch one repository (with stats & code units)
POST   /api/repositories/:id/analyze  Parse + generate docs + embeddings

# Documentation
GET    /api/docs/:id                  Get documentation for a code unit
PATCH  /api/docs/:id                  Approve or reject an update draft

# Chat
POST   /api/chat                      Ask the RAG assistant
GET    /api/chat?repositoryId=        Fetch chat history

# Webhooks
POST   /api/webhooks/github           GitHub push-event receiver
```

---

## Scripts

```bash
npm run dev       # start dev server
npm run build     # prisma generate + production build
npm run start     # run production build
npm run lint      # lint
```

---

Built with Next.js, Prisma, PostgreSQL/pgvector, and Google Gemini.
