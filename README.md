# 📖 AI-Powered Developer Documentation Engine

![Next.js](https://img.shields.io/badge/Next.js-15.2-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)
![Prisma](https://img.shields.io/badge/Prisma-5.22-2D3748?style=for-the-badge&logo=prisma)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-pgvector-336791?style=for-the-badge&logo=postgresql)
![Gemini AI](https://img.shields.io/badge/Gemini_2.5_Flash-AI-FF6F00?style=for-the-badge&logo=google)

An intelligent, autonomous system that continuously generates, maintains, and validates documentation directly from source code while providing developers with a conversational interface for exploring project knowledge.

## 🚀 Project Overview

Modern software projects evolve rapidly, causing documentation to become outdated and unreliable. This creates documentation debt, reduces productivity, and slows onboarding. 

The **AI-Powered Developer Documentation Engine** solves this by treating documentation as a continuously updated and reviewable asset. It ingests GitHub repositories, uses Abstract Syntax Trees (AST) to understand code structure, and employs Large Language Models (Gemini 2.5 Flash) to draft, update, and validate documentation automatically when code changes occur.

## ✨ Key Features

- **Automated Repository Ingestion:** Seamlessly connects to GitHub to fetch source code and build project structure maps.
- **Deep Code Analysis:** Parses JavaScript and TypeScript codebases via ASTs to identify functions, classes, interfaces, and APIs.
- **AI-Generated Documentation:** Uses Gemini API to automatically generate comprehensive module, parameter, and return value descriptions.
- **Continuous Staleness Detection:** Integrates with GitHub Webhooks to detect code changes, flag outdated documentation, and automatically draft updates for developer review.
- **Conversational Documentation Assistant:** A vector-backed (pgvector) chat interface allowing developers to ask semantic queries about their codebase.

## 🏗️ Technical Architecture

- **Frontend:** Next.js (v15 App Router), React 19, Tailwind CSS
- **Backend:** Node.js, Next.js API Routes, NextAuth.js
- **Database:** PostgreSQL (Neon) with `pgvector` for semantic search
- **ORM:** Prisma
- **AI Integration:** Google Gemini 2.5 Flash (via `@google/generative-ai`)
- **Code Parsing:** Babel AST Parser (`@babel/parser`)
- **Version Control Integration:** Octokit (`@octokit/rest`) & GitHub Webhooks

> **Architecture Decisions (ADRs):**
> - **ADR-001:** PostgreSQL over MongoDB for strong relational integrity, version tracking, and GitHub metadata alignment.
> - **ADR-002:** `pgvector` over Pinecone for architecture simplicity, cost efficiency, and unified database management.
> - **ADR-003:** Gemini 2.5 Flash chosen for high-speed inference, large context window, and cost effectiveness.

---

## 🛠️ Local Setup & Installation

### Prerequisites

Ensure you have the following installed on your local machine:
- [Node.js](https://nodejs.org/en/) (v20 or higher)
- npm or yarn
- A PostgreSQL database instance (local or cloud like Neon/Supabase)
- A [GitHub OAuth App](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app) (for authentication)
- A [Google Gemini API Key](https://aistudio.google.com/app/apikey)

### 1. Clone the repository
```bash
git clone <repository-url>
cd Dev-Docs
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
Copy the sample environment file and configure your variables:
```bash
cp .env.example .env.local
```
Fill in the necessary values in `.env.local`:
```env
# Database Configuration
DATABASE_URL="postgresql://user:password@host:port/database?schema=public"

# AI Configuration
GEMINI_API_KEY="your_gemini_api_key"

# Authentication (NextAuth & GitHub)
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate_a_random_secret_string"
GITHUB_CLIENT_ID="your_github_oauth_client_id"
GITHUB_CLIENT_SECRET="your_github_oauth_client_secret"

# GitHub Webhooks
GITHUB_WEBHOOK_SECRET="your_webhook_secret"
```

### 4. Database Setup
Initialize the database schema and generate the Prisma client:
```bash
npx prisma generate
npx prisma migrate dev --name init
```

### 5. Run the Development Server
```bash
npm run dev
```
The application will be available at [http://localhost:3000](http://localhost:3000).

---

## 🤝 Team Collaboration & Git Workflow

To ensure smooth collaboration, code quality, and maintainability, our team follows a structured Git workflow. 

### Branching Strategy
- `main`: Production-ready code. Commits here must pass all CI/CD checks.
- `develop`: Primary integration branch for active development.
- `feature/<feature-name>`: Branched from `develop` for implementing new features (e.g., `feature/ast-parser`).
- `bugfix/<issue-name>`: Branched from `develop` for resolving bugs.

### Making Contributions
1. **Sync your local repository:** `git pull origin develop`
2. **Create a new branch:** `git checkout -b feature/your-feature-name`
3. **Commit your changes:** Follow conventional commits (see below).
4. **Push to GitHub:** `git push origin feature/your-feature-name`
5. **Open a Pull Request:** Target the `develop` branch. Ensure your PR description clearly outlines the changes, architectural impacts, and any new environment variables required.

### Commit Message Conventions
We follow [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` A new feature
- `fix:` A bug fix
- `docs:` Documentation only changes
- `refactor:` Code changes that neither fix a bug nor add a feature
- `chore:` Changes to the build process, auxiliary tools, or libraries

*Example:* `feat(ai): integrate gemini 2.5 flash for doc generation`

### PR Review Process
- At least one team member must approve the PR.
- Ensure the Prisma schema remains backward compatible or includes appropriate migrations.
- Verify that `npm run lint` and `npm run build` pass successfully locally before requesting a review.

---

## 🗄️ Database Schema Overview

Our data model is designed to map codebase structures and track documentation versions efficiently:
- `repositories`: Tracked GitHub repositories.
- `files`: Tracked source files within repositories.
- `code_units`: Parsed AST nodes (functions, classes, APIs).
- `documentation`: The current active AI-generated documentation for a code unit.
- `documentation_versions`: Historical tracking and developer review statuses (Pending, Approved, Rejected).
- `embeddings`: pgvector embeddings for conversational semantic search.
- `chat_history`: Audit logs for developer interactions with the assistant.

---

## 🎓 Academic Evaluation Note

This repository constitutes the primary submission for the project evaluation. The source code demonstrates advanced integration of Abstract Syntax Tree (AST) parsing, Large Language Models (LLMs) via the Gemini API, automated event-driven architectures via GitHub Webhooks, and Vector Database semantic search capabilities. 

All architecture decisions and trade-offs have been intentionally documented within `ARCHITECTURE_DECISIONS.md`.

---
*Built with ❤️ by the team.*
