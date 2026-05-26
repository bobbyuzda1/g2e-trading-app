# CLAUDE.md - G2E Trading App

This file provides guidance to Claude Code when working with this repository.

## Project Overview

G2E Trading is an AI-powered trading assistant with multi-brokerage support (E*TRADE, Alpaca). The app uses Google Gemini AI for trading analysis and recommendations.

**Slogan:** *Trade Smarter, Not Harder*

## Quick Links

- **Live Site:** https://etrade-ai-trading.web.app
- **Backend API:** https://g2e-backend.onrender.com
- **API Docs:** https://g2e-backend.onrender.com/docs
- **GitHub:** https://github.com/bobbyuzda1/g2e-trading-app

## Mac / New Machine Onboarding

When this repo is cloned to a new machine (Mac, fresh Windows, dev VM), the following
must be in place before the deployment pipeline and dev scripts will work. Everything
GitHub-side (Actions workflows, Firebase service account, Render auto-deploy) stays
intact across machines because the configuration lives in the repo and in remote
provider settings — only the local machine state has to be re-established.

### 1. Required local tools

| Tool | Why | Install on Mac |
|---|---|---|
| Node.js 18+ | frontend build, firebase-tools | already via `mac-setup` Brewfile (`brew "node"`) |
| Python 3.11+ | backend (`fastapi`, `alembic`) | already via `mac-setup` Brewfile (`brew "python@3.12"`) |
| `gh` (GitHub CLI) | repo cloning, PR workflow | already via `mac-setup` Brewfile |
| `firebase-tools` | manual hosting commands (rarely needed — deploys are automated) | `npm install -g firebase-tools` |
| `gcloud` CLI | Cloud Build runs (only if running `cloudbuild.yaml` locally; normal deploys don't need it) | optional — install from cloud.google.com/sdk |

### 2. Required local `.env` (gitignored — must be recreated)

`.env` lives at the repo root and is gitignored. After cloning, recreate it from
1Password. Required keys:

```
RENDER_API_KEY=<from 1Password: "Render API Key">
SUPABASE_ACCESS_TOKEN=<from 1Password: "Supabase Access Token">
SUPABASE_PROJECT_REF=<from 1Password: "Supabase Project Ref (g2e)">
```

The `scripts/fetch-render-logs.sh` and `scripts/run-supabase-sql.sh` helpers will
fail with a clear error if any are missing.

Backend runtime env vars (`DATABASE_URL`, `SECRET_KEY`, `GEMINI_API_KEY`, `FRONTEND_URL`)
are configured in the **Render dashboard**, not locally — Render injects them at
runtime. You don't need them on your dev machine unless running the backend locally.

### 3. Local-only authentication (one-time)

- **Firebase CLI:** Run `firebase login` once. After that, `firebase-tools` can
  trigger manual deploys if needed. Not required for normal work — GitHub Actions
  uses `secrets.FIREBASE_SERVICE_ACCOUNT` for deploys.
- **gcloud:** Run `gcloud auth login` only if you need to trigger Cloud Build
  manually. Normal deploys don't require it.
- **GitHub:** `gh auth status` should show you logged in (handled by `mac-setup`).

### 4. What stays intact automatically

These DO NOT need to be reconfigured per machine — they live remotely:

- **GitHub Actions** (`.github/workflows/firebase-deploy.yml`) — auto-triggers on push to `main` with frontend changes
- **Render auto-deploy** — auto-triggers on any push to `main` (configured in Render dashboard)
- **Firebase Hosting** project (`etrade-ai-trading`) — configured in `.firebaserc`
- **Supabase project** — referenced by `SUPABASE_PROJECT_REF` in `.env`
- **Cloud Build** (`cloudbuild.yaml`) — invoked by Cloud Build triggers in GCP, not from local machine

### 5. Verify the pipeline still works after onboarding

After setting up `.env` and authenticating, verify with a smoke test:

```bash
# Backend logs (proves Render API key works)
bash scripts/fetch-render-logs.sh 30m

# Database query (proves Supabase access token works)
bash scripts/run-supabase-sql.sh -q "SELECT 1;"

# Frontend build (proves the deploy pipeline path compiles cleanly)
cd frontend && npm ci && npm run build
```

If all three succeed, you're back online.

---

## Documentation

### G2E-Overview.md (IMPORTANT)

**The `G2E-Overview.md` file is the comprehensive technical documentation for this project.**

**You MUST keep this file updated whenever you:**
- Add new features or endpoints
- Change the architecture or services
- Modify database schema
- Update dependencies or configurations
- Fix significant bugs
- Add new integrations

Update the "Last Updated" date and add entries to the Changelog section at the bottom.

## Tech Stack

- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS + Tremor
- **Backend:** FastAPI + Python 3.11 + SQLAlchemy
- **Database:** Supabase (PostgreSQL with pgbouncer)
- **AI:** Google Gemini 2.5 Pro/Flash
- **Hosting:** Firebase (frontend) + Render (backend)

## Key Directories

| Directory | Purpose |
|-----------|---------|
| `backend/app/api/v1/endpoints/` | API route handlers |
| `backend/app/services/` | Business logic |
| `backend/app/models/` | SQLAlchemy models |
| `backend/app/brokers/` | Broker adapters (E*TRADE, Alpaca) |
| `backend/app/core/` | Config, security, database, AI |
| `frontend/src/pages/` | React page components |
| `frontend/src/components/` | Reusable components |
| `frontend/src/contexts/` | React contexts (Auth, Theme) |
| `frontend/src/lib/` | API client |

## Git Branch Workflow

- **Commit often — commits are rollback checkpoints.** Before any significant change, commit the current working state. After each discrete working unit, commit immediately. In autonomous/agentic mode, commit after each logical task step even if the feature is incomplete. A partial-but-working commit is always better than a large all-or-nothing commit that is hard to revert. For checkpoint commits with no better type, use `chore: checkpoint — [brief state description]`.
- **Working branch:** Always use `cli-comp` for Claude Code desktop session changes. Create it from `main`, push, open PR, merge to `main`.
- **Do NOT** create new branch names for each change. Reuse `cli-comp` every time.
- **Protected branch:** `render-logs-integration-RYGq4` is used by Claude Code mobile app. Never delete it.
- **Cleanup:** After merging a PR, delete the remote `cli-comp` branch (GitHub does this automatically if "delete branch on merge" is enabled). Recreate it fresh from `main` for the next set of changes.

## Deployment

### Backend (Automatic)
Push to `main` branch triggers Render auto-deploy.

### Frontend (Automatic)
Push to `main` branch with changes in `frontend/`, `firebase.json`, or `.firebaserc` triggers GitHub Actions auto-deploy to Firebase Hosting (`.github/workflows/firebase-deploy.yml`).

**When the user asks for frontend changes that need to go live:**
1. Make the changes on a feature branch
2. Commit and push to the feature branch
3. The user merges the PR to `main` (or pushes directly to `main`)
4. GitHub Actions automatically builds and deploys to Firebase — no manual steps needed

**Do NOT** attempt to run `firebase deploy` manually. The GitHub Actions workflow handles all builds and deploys.

### Render Logs
Backend logs can be fetched directly from Render's API:
```bash
bash scripts/fetch-render-logs.sh          # Recent log entries
bash scripts/fetch-render-logs.sh 30m      # Last 30 minutes
bash scripts/fetch-render-logs.sh 4h       # Last 4 hours
bash scripts/fetch-render-logs.sh errors   # Error-level only
bash scripts/fetch-render-logs.sh save 1d  # Save last day to logs/
```
Requires `RENDER_API_KEY` in `.env` (already configured).

### Supabase Database
Run SQL migrations and queries directly via the Supabase Management API:
```bash
bash scripts/run-supabase-sql.sh backend/migrations/002_user_broker_credentials.sql  # Run a migration file
bash scripts/run-supabase-sql.sh -q "SELECT count(*) FROM users;"                   # Run inline SQL
```
Requires `SUPABASE_ACCESS_TOKEN` and `SUPABASE_PROJECT_REF` in `.env` (already configured).

**When schema changes are needed**, always:
1. Create a new migration file in `backend/migrations/` (numbered sequentially)
2. Run it with the script above
3. Verify the change

## Environment Variables

Backend environment variables are configured in Render dashboard:
- `DATABASE_URL` - Supabase pooler connection string
- `SECRET_KEY` - JWT signing key
- `GEMINI_API_KEY` - Google AI API key
- `FRONTEND_URL` - CORS allowed origin

## Database Notes

- Uses Supabase connection pooler (pgbouncer) on port 6543
- Requires `statement_cache_size=0` for asyncpg compatibility
- Enums use lowercase values (e.g., 'revoked' not 'REVOKED')
- Schema defined in `backend/migrations_initial.sql`

## Common Issues

1. **bcrypt errors:** Pinned to version 4.0.1 for passlib compatibility
2. **Prepared statement errors:** Use pooler URL with cache disabled
3. **CORS errors:** Check FRONTEND_URL in backend environment
4. **Enum errors:** Ensure SQLAlchemy uses `values_callable` for enums

## Broker Integration Status

| Broker | Adapter | Status |
|--------|---------|--------|
| E*TRADE | Complete | Needs API keys |
| Alpaca | Complete | Needs API keys |
| Schwab | Planned | Not started |

### E*TRADE API References

Always consult these when troubleshooting or building E*TRADE features:

- **Sandbox API Docs** (primary reference for endpoints, request/response formats):
  - Accounts: https://apisb.etrade.com/docs/api/account/api-account-v1.html
  - Balances: https://apisb.etrade.com/docs/api/account/api-balance-v1.html
  - Portfolio: https://apisb.etrade.com/docs/api/account/api-portfolio-v1.html
  - Quotes: https://apisb.etrade.com/docs/api/market/api-quote-v1.html
- **Developer Guides** (OAuth, getting started, best practices):
  - Overview: https://developer.etrade.com/getting-started/developer-guides
  - OAuth Guide: https://developer.etrade.com/getting-started/developer-guides#tab_1

## AI Knowledge Base

- Strategy protocols in `backend/app/core/knowledge_base.py`
- Training data in `G2E-training-data.jsonl` (168 examples)
- Full knowledge in `G2E-knowledge.md` (1,870 lines)

## Testing

```bash
cd backend
pytest tests/
```

Note: Tests require database connection to run.
