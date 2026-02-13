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
