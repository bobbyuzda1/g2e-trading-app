# G2E Trading App - Technical Overview

**Last Updated:** February 5, 2026
**Version:** 0.1.0
**Status:** MVP Deployed

---

## Executive Summary

G2E Trading is an AI-powered trading assistant that connects to multiple brokerages (E*TRADE, Alpaca) and provides intelligent trading recommendations using Google's Gemini AI. The app features 13 built-in trading strategies, a learning system that adapts to user preferences, and comprehensive portfolio management.

**Slogan:** *Trade Smarter, Not Harder*

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
│                    Firebase Hosting                              │
│              https://etrade-ai-trading.web.app                   │
│                                                                  │
│   React 18 + TypeScript + Vite + Tailwind CSS + Tremor          │
└─────────────────────────┬───────────────────────────────────────┘
                          │ HTTPS
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                         BACKEND                                  │
│                       Render.com                                 │
│              https://g2e-backend.onrender.com                    │
│                                                                  │
│        FastAPI + Python 3.11 + SQLAlchemy + asyncpg             │
└─────────────────────────┬───────────────────────────────────────┘
                          │ PostgreSQL (asyncpg)
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                        DATABASE                                  │
│                    Supabase (PostgreSQL)                         │
│         db.ekxxkfwhokfzzkhmqxbo.supabase.co                     │
│                                                                  │
│              11 Tables + Enums + Indexes                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Services & Infrastructure

### 1. Frontend Hosting - Firebase
- **Project ID:** `etrade-ai-trading`
- **Hosting URL:** https://etrade-ai-trading.web.app
- **Console:** https://console.firebase.google.com/project/etrade-ai-trading
- **Deployment:** `firebase deploy --only hosting`
- **Build Output:** `frontend/dist/`

### 2. Backend Hosting - Render.com
- **Service Name:** `g2e-backend`
- **URL:** https://g2e-backend.onrender.com
- **API Docs:** https://g2e-backend.onrender.com/docs
- **Auto-deploy:** Connected to GitHub `main` branch
- **Instance Type:** Free tier (spins down after 15 min inactivity)
- **Docker:** Uses `backend/Dockerfile`

### 3. Database - Supabase
- **Project:** `ekxxkfwhokfzzkhmqxbo`
- **Region:** US East
- **Connection:** PostgreSQL with connection pooler (pgbouncer)
- **Pooler URL:** `aws-1-us-east-1.pooler.supabase.com:6543`
- **Direct URL:** `db.ekxxkfwhokfzzkhmqxbo.supabase.co:5432`
- **Dashboard:** https://supabase.com/dashboard/project/ekxxkfwhokfzzkhmqxbo

### 4. AI Service - Google Gemini
- **Models Used:** Gemini 2.5 Pro, Gemini 2.5 Flash
- **SDK:** `google-generativeai` Python package
- **Features:** Trading analysis, strategy recommendations, portfolio insights

### 5. Version Control - GitHub
- **Repository:** `bobbyuzda1/g2e-trading-app`
- **URL:** https://github.com/bobbyuzda1/g2e-trading-app
- **Main Branch:** `main`
- **Auto-deploy:** Render watches for pushes to `main`

### 6. Google Cloud Platform
- **Project ID:** `etrade-ai-trading`
- **APIs Enabled:** Cloud Run, Container Registry (for future use)
- **gcloud CLI:** Authenticated for deployment

---

## Technology Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.x | UI Framework |
| TypeScript | 5.x | Type Safety |
| Vite | 5.4.x | Build Tool |
| Tailwind CSS | 3.x | Styling |
| Tremor | 3.x | Dashboard Components |
| Axios | 1.x | HTTP Client |
| React Router | 6.x | Routing |
| Heroicons | 2.x | Icons |
| Headless UI | 1.x | Accessible Components |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| Python | 3.11 | Runtime |
| FastAPI | 0.109+ | Web Framework |
| SQLAlchemy | 2.0+ | ORM |
| asyncpg | 0.29+ | Async PostgreSQL Driver |
| Pydantic | 2.5+ | Data Validation |
| python-jose | 3.3+ | JWT Tokens |
| passlib + bcrypt | 4.0.1 | Password Hashing |
| httpx | 0.26+ | HTTP Client |
| google-generativeai | 0.3+ | Gemini AI SDK |
| Authlib | 1.3+ | OAuth Support |

### Database
| Technology | Purpose |
|------------|---------|
| PostgreSQL 15 | Primary Database |
| pgbouncer | Connection Pooling |
| UUID | Primary Keys |
| JSONB | Flexible Data Storage |
| Enums | Type Safety |

---

## Database Schema

### Enum Types
```sql
CREATE TYPE brokerid AS ENUM ('etrade', 'alpaca', 'schwab', 'ibkr');
CREATE TYPE connectionstatus AS ENUM ('pending', 'active', 'expired', 'revoked', 'error');
CREATE TYPE strategysource AS ENUM ('manual', 'ai_generated', 'ai_refined');
CREATE TYPE messagerole AS ENUM ('user', 'assistant', 'system');
CREATE TYPE feedbacktype AS ENUM ('accept', 'reject', 'modify', 'question');
CREATE TYPE auditaction AS ENUM ('login', 'logout', 'broker_connect', ...);
```

### Tables (11 Total)

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `users` | User accounts | id, email, hashed_password, full_name |
| `brokerage_connections` | Broker OAuth connections | user_id, broker_id, status, token_secret_id |
| `brokerage_accounts` | Individual broker accounts | connection_id, broker_account_id, account_type |
| `trading_strategies` | User trading strategies | user_id, name, config (JSONB), is_active |
| `trading_plans` | Trading plan tracking | strategy_id, objectives, progress |
| `conversations` | AI chat sessions | user_id, title, context_snapshot |
| `messages` | Chat messages | conversation_id, role, content, tokens |
| `audit_logs` | Compliance logging | user_id, action, resource_type, details |
| `recommendation_feedback` | AI feedback tracking | feedback_type, user_reasoning |
| `user_preference_profiles` | Learned preferences | risk_tolerance, preferred_sectors |
| `explicit_user_rules` | User-defined rules | rule_text, category, is_active |

---

## API Endpoints

### Authentication (`/api/v1/auth`)
- `POST /register` - Create account
- `POST /login` - Login (OAuth2 form data)
- `GET /me` - Current user info
- `POST /refresh` - Refresh token

### Brokerages (`/api/v1/brokerages`)
- `GET /supported` - List supported brokers
- `POST /connect/{broker_id}` - Start OAuth flow
- `POST /callback/{broker_id}` - Complete OAuth
- `GET /connections` - List connections
- `DELETE /connections/{id}` - Disconnect

### Portfolio (`/api/v1/portfolio`)
- `GET /summary` - Portfolio overview
- `GET /positions` - Current positions
- `GET /history` - Historical data

### Trading (`/api/v1/trading`)
- `POST /preview` - Preview order
- `POST /order` - Submit order
- `GET /orders` - List orders
- `DELETE /orders/{id}` - Cancel order

### AI Chat (`/api/v1/chat`)
- `GET /conversations` - List conversations
- `POST /conversations` - New conversation
- `GET /conversations/{id}/messages` - Get messages
- `POST /conversations/{id}/messages` - Send message

### Strategies (`/api/v1/strategy`)
- `GET /` - List strategies
- `GET /analyze/{symbol}` - Analyze symbol

### Feedback (`/api/v1/feedback`)
- `POST /` - Submit feedback
- `GET /profile` - User preference profile
- `GET /rules` - Explicit rules
- `POST /rules` - Add rule

---

## Authentication Flow

1. **Registration:** Email + password → bcrypt hash → JWT issued
2. **Login:** OAuth2 password flow → JWT access token (30 min)
3. **Protected Routes:** Bearer token in Authorization header
4. **Token Storage:** localStorage (access_token, refresh_token)

### JWT Configuration
- Algorithm: HS256
- Expiration: 30 minutes
- Payload: `{sub: user_id, email, exp}`

---

## Broker Integration

### E*TRADE
- **OAuth:** 1.0a (3-legged)
- **Environment:** Sandbox / Production
- **Features:** Stocks, Options, Account data
- **Token Refresh:** Daily renewal required

### Alpaca
- **OAuth:** 2.0
- **Environment:** Paper / Live trading
- **Features:** Stocks, Fractional shares, Extended hours
- **Token Refresh:** Standard OAuth refresh

---

## AI Integration

### Knowledge Base
- **File:** `backend/app/core/knowledge_base.py`
- **Strategies:** 13 trading strategies with protocols
- **Injection:** Dynamic system prompt generation

### System Prompts (3 Roles)
1. **Trading Advisor** - General trading guidance
2. **Portfolio Analyst** - Portfolio-specific analysis
3. **Strategy Consultant** - Strategy recommendations

### Context Injection
- Active trading plan
- User preference profile
- Strategy-specific protocols

---

## Frontend Architecture

### Pages (8)
- Login, Register
- Dashboard
- Portfolio
- Trading
- Chat (AI Assistant)
- Strategies
- Settings

### Key Components
- `Sidebar` - Navigation (dark theme support)
- `Header` - User menu, theme toggle
- `DashboardLayout` - Main layout wrapper
- `ProtectedRoute` - Auth guard

### State Management
- `AuthContext` - User authentication state
- `ThemeContext` - Light/dark mode preference

### Theme System
- Light mode (default)
- Dark mode (toggle in header)
- Stored in localStorage
- CSS variables + Tailwind dark: classes

---

## Environment Variables

### Backend (Render)
```
DATABASE_URL=postgresql+asyncpg://...pooler.supabase.com:6543/postgres
SECRET_KEY=<jwt-secret>
GEMINI_API_KEY=<google-api-key>
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
API_V1_PREFIX=/api/v1
FRONTEND_URL=https://etrade-ai-trading.web.app
```

### Frontend
```
VITE_API_URL=https://g2e-backend.onrender.com/api/v1
```

---

## Deployment Process

### Backend (Auto via Render)
1. Push to `main` branch on GitHub
2. Render detects changes
3. Builds Docker image from `backend/Dockerfile`
4. Deploys new version

### Frontend (Manual)
```powershell
cd frontend
npx tsc && npx vite build
cd ..
firebase deploy --only hosting
```

---

## Security Considerations

### Implemented
- Password hashing (bcrypt)
- JWT authentication
- CORS configuration
- SQL injection protection (SQLAlchemy ORM)
- Environment variable secrets

### Future Improvements Needed
- Move secrets to GCP Secret Manager
- Implement rate limiting
- Add 2FA support
- Rotate exposed credentials
- Add Redis for session management

---

## Known Issues & Limitations

1. **Render Free Tier:** Spins down after 15 min, ~30s cold start
2. **No Redis:** Tokens stored in memory, lost on restart
3. **Broker Keys:** E*TRADE/Alpaca keys not yet configured
4. **Fine-tuning:** AI uses base Gemini, not fine-tuned model

---

## File Structure

```
g2e/
├── backend/
│   ├── app/
│   │   ├── api/v1/endpoints/    # API routes
│   │   ├── brokers/             # Broker adapters
│   │   ├── core/                # Config, security, database
│   │   ├── models/              # SQLAlchemy models
│   │   ├── schemas/             # Pydantic schemas
│   │   └── services/            # Business logic
│   ├── Dockerfile
│   ├── pyproject.toml
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/          # React components
│   │   ├── contexts/            # React contexts
│   │   ├── layouts/             # Page layouts
│   │   ├── lib/                 # API client
│   │   ├── pages/               # Page components
│   │   └── types/               # TypeScript types
│   ├── public/                  # Static assets
│   ├── tailwind.config.js
│   └── vite.config.ts
├── firebase.json
├── .firebaserc
├── G2E-knowledge.md             # Trading knowledge base
├── G2E-training-data.jsonl      # AI training examples
└── G2E-Overview.md              # This file
```

---

## Contacts & Resources

- **GitHub:** https://github.com/bobbyuzda1/g2e-trading-app
- **Firebase Console:** https://console.firebase.google.com/project/etrade-ai-trading
- **Render Dashboard:** https://dashboard.render.com
- **Supabase Dashboard:** https://supabase.com/dashboard
- **API Documentation:** https://g2e-backend.onrender.com/docs

---

## Changelog

### 2026-02-05
- Initial deployment to Render + Firebase
- Fixed bcrypt compatibility (pinned to 4.0.1)
- Fixed Supabase pooler connection (statement cache disabled)
- Added light/dark mode toggle
- Added G2E branding with logo
- Added slogan: "Trade Smarter, Not Harder"
- Fixed brokerage API paths and enum case issues
