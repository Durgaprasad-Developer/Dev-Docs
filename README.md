```
╔══════════════════════════════════════════════════════════════════╗
║                                                                  ║
║   ██████╗  ██████╗  ██████╗    ███████╗███╗   ██╗ ██████╗       ║
║   ██╔══██╗██╔═══██╗██╔════╝    ██╔════╝████╗  ██║██╔════╝       ║
║   ██║  ██║██║   ██║██║         █████╗  ██╔██╗ ██║██║  ███╗      ║
║   ██║  ██║██║   ██║██║         ██╔══╝  ██║╚██╗██║██║   ██║      ║
║   ██████╔╝╚██████╔╝╚██████╗    ███████╗██║ ╚████║╚██████╔╝      ║
║   ╚═════╝  ╚═════╝  ╚═════╝    ╚══════╝╚═╝  ╚═══╝ ╚═════╝       ║
║                                                                  ║
║          AI-POWERED DEVELOPER DOCUMENTATION ENGINE               ║
║                         [  v1.0  |  2026  ]                      ║
╚══════════════════════════════════════════════════════════════════╝
```

> `$ import { DocEngine } from "@dev-docs/engine"` ✓  
> `$ world.status` → **documentation debt: 0** · **sync: LIVE** · **AI: READY**

---

![Next.js](https://img.shields.io/badge/Next.js-15.2-black?style=flat-square&logo=next.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-5.22-2D3748?style=flat-square&logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-pgvector-336791?style=flat-square&logo=postgresql&logoColor=white)
![Gemini AI](https://img.shields.io/badge/Gemini_2.5_Flash-AI-FF6F00?style=flat-square&logo=google&logoColor=white)
![Vercel](https://img.shields.io/badge/Deployed_on-Vercel-000?style=flat-square&logo=vercel&logoColor=white)

---

## `// OVERVIEW`

Modern software evolves fast. Documentation does not. The result: **documentation debt** that kills onboarding speed, causes incorrect API usage, and wastes developer hours.

**Doc Engine** treats documentation as a living, continuously synchronized asset — not a manually maintained afterthought. It ingests your GitHub repositories, parses source code using Abstract Syntax Trees, uses Gemini 2.5 Flash to generate and update documentation, and provides a conversational AI assistant for exploring your codebase.

```text
┌─────────────────────────────────────────────────────────────┐
│                    SYSTEM ARCHITECTURE                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   GitHub Repository                                         │
│         │                                                   │
│         ▼                                                   │
│   Repository Ingestion Layer  ←──── GitHub Webhooks         │
│         │                                  ▲               │
│         ▼                                  │               │
│   Code Parsing Service                Change Detection      │
│   (Babel AST + ts-morph)                   │               │
│         │                                  │               │
│         ▼                                  │               │
│   Gemini 2.5 Flash  ─────────────────► Staleness Detection  │
│         │                                  │               │
│         ▼                                  ▼               │
│   PostgreSQL + pgvector  ◄──────── Documentation Diff       │
│         │                                                   │
│    ┌────┴────┐                                              │
│    ▼         ▼                                              │
│  Portal   Chat RAG ──► Conversational AI Assistant          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## `// KEY FEATURES`

| Feature | Description |
|---|---|
| 🔗 **Repository Ingestion** | Connect public or private GitHub repos via OAuth |
| 🧬 **AST Code Analysis** | Parses JS/TS to extract functions, classes, interfaces, APIs |
| 🤖 **AI Doc Generation** | Gemini 2.5 Flash writes markdown docs per code unit |
| 🔔 **Webhook Change Detection** | Monitors pushes, identifies impacted documentation |
| 🏷️ **Staleness Classification** | Tags docs as `BROKEN` · `OUTDATED` · `REVIEW_REQUIRED` |
| 📝 **AI Update Drafting** | Auto-drafts doc revisions with a side-by-side diff view |
| 🔍 **Documentation Portal** | Searchable, browsable documentation website |
| 💬 **Chat Assistant (RAG)** | Semantic Q&A over your codebase using pgvector |

---

## `// TECH STACK`

```
┌─────────────────┬────────────────────────────────────────────┐
│   LAYER         │   TECHNOLOGY                               │
├─────────────────┼────────────────────────────────────────────┤
│ Frontend        │ Next.js 15 · React 19 · Tailwind CSS       │
│ Backend         │ Node.js · Next.js API Routes · TypeScript  │
│ Auth            │ NextAuth.js · GitHub OAuth                 │
│ AI              │ Google Gemini 2.5 Flash                    │
│ Code Parsing    │ @babel/parser · ts-morph                   │
│ ORM             │ Prisma 5                                   │
│ Database        │ PostgreSQL (Neon) + pgvector               │
│ Monitoring      │ GitHub Webhooks · @octokit/rest            │
│ Deployment      │ Vercel                                     │
└─────────────────┴────────────────────────────────────────────┘
```

> **Why these choices?**
> - **PostgreSQL over MongoDB** → Strong relational integrity for version tracking and GitHub metadata *(ADR-001)*
> - **pgvector over Pinecone** → Unified database, zero extra cost, no 3rd-party dependency *(ADR-002)*
> - **Gemini 2.5 Flash** → Fastest inference, largest context window at the lowest cost *(ADR-003)*

---

## `// USER FLOW`

> **How to use Doc Engine from zero to fully-documented codebase:**

```
STEP 1 — SIGN IN
──────────────────────────────────────────────────────────────
  ► Navigate to https://your-app.vercel.app
  ► Click  [ Sign in with GitHub ]
  ► Authorize the OAuth app — you're in.

STEP 2 — CONNECT A REPOSITORY
──────────────────────────────────────────────────────────────
  ► Go to [ Repositories ] → [ + Add Repository ]
  ► Paste your GitHub repo URL (public or private)
  ► Click [ Analyze Repository ]
  ► The engine fetches all source files and begins analysis.

STEP 3 — AI DOCUMENTATION GENERATION
──────────────────────────────────────────────────────────────
  ► Doc Engine parses every .js / .ts file using Babel AST
  ► Extracts: functions · classes · interfaces · APIs · types
  ► Gemini 2.5 Flash generates markdown docs for each unit
  ► Docs are stored, versioned, and indexed with embeddings
  ► Status: [ GENERATING... ] → [ COMPLETE ✓ ]

STEP 4 — EXPLORE THE DOCUMENTATION PORTAL
──────────────────────────────────────────────────────────────
  ► Navigate to [ Documentation ] tab
  ► Browse your project's modules, functions, and APIs
  ► Use the search bar to find any component by name
  ► Each entry shows: Purpose · Parameters · Returns · Examples

STEP 5 — CHAT WITH YOUR CODEBASE
──────────────────────────────────────────────────────────────
  ► Go to [ Chat ] tab
  ► Ask anything about your project:
      "How does authentication work?"
      "What parameters does createUser() accept?"
      "Which module handles GitHub webhook events?"
  ► The RAG pipeline retrieves relevant docs via pgvector
  ► Gemini grounds its answer in your actual code — no hallucinations.

STEP 6 — REVIEW STALE DOCUMENTATION (CONTINUOUS)
──────────────────────────────────────────────────────────────
  ► You push new code to GitHub
  ► GitHub Webhook fires → Doc Engine detects changed files
  ► Impacted docs are classified:
      🔴  BROKEN           → Docs no longer match code
      🟡  OUTDATED         → Changes likely affect accuracy
      🟢  REVIEW_REQUIRED  → Should be checked by a human
  ► Go to [ Review ] tab to see flagged documentation

STEP 7 — APPROVE OR REJECT AI-DRAFTED UPDATES
──────────────────────────────────────────────────────────────
  ► For each flagged doc, Gemini drafts a new version
  ► You see a side-by-side DIFF:
      [ Existing Docs ]   ←→   [ AI-Proposed Update ]
  ► Click [ ✓ Approve ] to publish or [ ✗ Reject ] to discard
  ► All decisions are versioned in documentation_versions table

STEP 8 — REPEAT
──────────────────────────────────────────────────────────────
  ► Every push triggers Steps 6–7 automatically
  ► Documentation stays synchronized with your codebase
  ► Documentation debt: 0
```

---

## `// LOCAL SETUP`

### Prerequisites

- [Node.js](https://nodejs.org/) v20+
- npm
- PostgreSQL instance ([Neon](https://neon.tech) recommended — free tier works)
- [GitHub OAuth App](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app)
- [Google Gemini API Key](https://aistudio.google.com/app/apikey)

### 1 · Clone

```bash
git clone https://github.com/Durgaprasad-Developer/Dev-Docs.git
cd Dev-Docs
```

### 2 · Install Dependencies

```bash
npm install
```

### 3 · Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local` with your values:

```env
# ── Database ──────────────────────────────────────────────────
DATABASE_URL="postgresql://user:password@host:5432/dbname?schema=public"

# ── AI ────────────────────────────────────────────────────────
GEMINI_API_KEY="your_gemini_api_key_here"

# ── Authentication ────────────────────────────────────────────
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate_with: openssl rand -base64 32"
GITHUB_CLIENT_ID="your_github_oauth_client_id"
GITHUB_CLIENT_SECRET="your_github_oauth_client_secret"

# ── Webhooks ──────────────────────────────────────────────────
GITHUB_WEBHOOK_SECRET="your_webhook_secret"

# ── App ───────────────────────────────────────────────────────
APP_URL="http://localhost:3000"
LOG_LEVEL="info"
```

> **Getting a `NEXTAUTH_SECRET`:** Run `openssl rand -base64 32` in your terminal.

### 4 · Database Setup

```bash
# Generate the Prisma client
npx prisma generate

# Apply database migrations
npx prisma migrate dev --name init

# (Optional) View your database in a GUI
npx prisma studio
```

### 5 · Start Dev Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you're live. 🟢

---

## `// DATABASE SCHEMA`

```
repositories         → Tracked GitHub repositories
files                → Source files per repository
code_units           → Parsed AST nodes (functions, classes, APIs)
documentation        → Active AI-generated docs per code unit
documentation_versions → Version history + review status (Pending/Approved/Rejected)
embeddings           → pgvector vectors for semantic search
chat_history         → Audit log of developer–AI conversations
```

---

## `// FOLDER STRUCTURE`

```
Dev-Docs/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── dashboard/          # Main dashboard
│   │   ├── repositories/       # Repo management
│   │   ├── documentation/      # Doc portal
│   │   ├── chat/               # AI chat interface
│   │   └── api/                # API route handlers
│   │       ├── repositories/
│   │       ├── documentation/
│   │       ├── chat/
│   │       └── webhooks/github/
│   ├── services/               # Core business logic
│   │   ├── embeddings.ts       # pgvector embedding service
│   │   ├── generator.ts        # Gemini doc generation
│   │   └── staleness/          # Change & staleness detection
│   ├── lib/
│   │   ├── github.ts           # Octokit GitHub integration
│   │   ├── auth.ts             # NextAuth configuration
│   │   └── prisma.ts           # Prisma client singleton
│   └── types/
│       └── index.ts            # Shared TypeScript types
├── prisma/
│   └── schema.prisma           # Database schema
├── .env.example                # Environment variable template
├── next.config.js
└── tailwind.config.js
```

---

## `// TEAM WORKFLOW`

### Branching Strategy

```
main          ← production-ready · CI/CD deploys here
  └── develop ← primary integration branch
        ├── feature/<name>   ← new features
        └── bugfix/<name>    ← bug fixes
```

### Contribution Steps

```bash
# 1. Sync latest changes
git pull origin develop

# 2. Create your branch
git checkout -b feature/your-feature-name

# 3. Make changes, then commit with conventional format
git commit -m "feat(ai): add fallback model pipeline for rate limits"

# 4. Push and open a PR → targeting 'develop'
git push origin feature/your-feature-name
```

### Commit Convention

| Prefix | Use |
|---|---|
| `feat:` | New feature |
| `fix:` | Bug fix |
| `docs:` | Documentation change |
| `refactor:` | Code improvement (no feature/fix) |
| `chore:` | Build, deps, tooling |

### PR Checklist

Before requesting a review, confirm:
- [ ] `npm run lint` passes with no errors
- [ ] `npm run build` compiles successfully
- [ ] Prisma schema changes include a migration file
- [ ] New environment variables are added to `.env.example`
- [ ] At least 1 team member has reviewed and approved

---

## `// API REFERENCE`

```http
# Repositories
POST   /api/repositories          → Add & analyze a new repository
GET    /api/repositories          → List all tracked repositories
GET    /api/repositories/:id      → Fetch one repository

# Documentation
POST   /api/docs/generate         → Trigger documentation generation
GET    /api/docs/:id              → Get documentation for a code unit
PATCH  /api/docs/:id              → Approve or reject an AI update draft

# Chat
POST   /api/chat                  → Send a message to the RAG assistant

# Webhooks
POST   /api/webhooks/github       → GitHub push event receiver
```

---

## `// ACADEMIC EVALUATION`

This project demonstrates integration of the following advanced engineering concepts:

| Concept | Implementation |
|---|---|
| **Static Analysis** | Babel AST + ts-morph for deep code structure extraction |
| **Large Language Models** | Gemini 2.5 Flash for generation, update drafting, and RAG chat |
| **Vector Databases** | pgvector for semantic embedding storage and similarity search |
| **Event-Driven Architecture** | GitHub Webhooks triggering real-time staleness detection |
| **RAG Pipeline** | Question → Embedding Search → Top-K Docs → Grounded LLM Answer |
| **Version Control** | Full documentation versioning with human-in-the-loop review |

Architecture decision rationale is documented in [`ARCHITECTURE_DECISIONS.md`](./ARCHITECTURE_DECISIONS.md).  
Full system design is in [`Design.md`](./Design.md).

---

```
// status ──────────────────────────────────────────────────────
$ git log --oneline HEAD → main ✓
$ build: success ✓
$ deploy: vercel → LIVE ✓
// ─────────────────────────────────────────────────────────────
//   Built with ❤️  by the team
// ─────────────────────────────────────────────────────────────
```
