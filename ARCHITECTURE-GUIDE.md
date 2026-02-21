# Full-Stack Web App Architecture Guide

> **Purpose:** This document serves as a detailed reference for Claude (or any AI assistant) when helping design and build new web applications. It documents every service, automation, and configuration used in the G2E Trading App and explains what is essential to the architecture vs. what can be swapped out.

## Overview & Design Philosophy

This architecture uses **four managed services** on their free tiers to deliver a production web application with zero infrastructure management:

| Service | Role | Why This One |
|---------|------|-------------|
| **Firebase Hosting** | Frontend static hosting | Free, global CDN, auto-SSL, GitHub Actions integration |
| **Render** | Backend API hosting | Free Docker hosting, auto-deploy from GitHub, zero config |
| **Supabase** | PostgreSQL database | Free managed Postgres, built-in auth (unused here), REST API for admin |
| **GitHub Actions** | CI/CD pipeline | Free for public repos, native GitHub integration |

### What's Flexible vs. What's Essential

**Essential patterns (keep these):**
- Separate frontend hosting from backend hosting (allows independent scaling/deployment)
- Database managed externally from the backend host (survives backend resets)
- Auto-deploy pipelines triggered by git push (eliminates manual deployment)
- Environment variables for all secrets (never hardcoded)
- `.env` files gitignored (secrets never in source control)

**Flexible choices (swap freely):**
- Firebase Hosting could be Vercel, Netlify, Cloudflare Pages, or AWS Amplify
- Render could be Railway, Fly.io, Google Cloud Run, or AWS App Runner
- Supabase could be Neon, PlanetScale, Railway Postgres, or any managed Postgres
- React could be Next.js, Vue, Svelte, or any SPA framework
- FastAPI could be Express.js, Django, Flask, Go, or any API framework
- GitHub Actions could be GitLab CI, CircleCI, or any CI/CD system

**The key is the pattern, not the specific services.** When building a new app, choose services based on the project's needs (e.g., Vercel for Next.js, Railway for simpler setup, Neon for serverless Postgres). This guide documents HOW things connect so you can reproduce the pattern with different providers.

---

## 1. Project Structure

```
project-root/
├── frontend/                    # React SPA (or any frontend framework)
│   ├── src/
│   │   ├── pages/               # Route-level components
│   │   ├── components/          # Reusable UI components
│   │   ├── contexts/            # React contexts (Auth, Theme)
│   │   ├── hooks/               # Custom React hooks
│   │   ├── layouts/             # Page layout wrappers
│   │   ├── lib/                 # API client, utilities
│   │   ├── types/               # TypeScript type definitions
│   │   ├── App.tsx              # Main routing
│   │   ├── main.tsx             # React entry point
│   │   └── index.css            # Global styles + Tailwind
│   ├── .env.production          # Production API URL
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts           # Dev server, proxy, aliases
│   ├── tailwind.config.js       # Tailwind theme customization
│   └── postcss.config.js
│
├── backend/                     # FastAPI Python API (or any backend)
│   ├── app/
│   │   ├── api/v1/
│   │   │   ├── endpoints/       # Route handlers (one file per domain)
│   │   │   ├── deps.py          # Dependency injection (auth, DB)
│   │   │   └── router.py        # Combines all route files
│   │   ├── models/              # SQLAlchemy ORM models
│   │   ├── schemas/             # Pydantic request/response schemas
│   │   ├── services/            # Business logic layer
│   │   ├── core/                # Security, database, cache, config
│   │   ├── config.py            # Pydantic Settings (loads .env)
│   │   └── main.py              # FastAPI app, CORS, middleware
│   ├── migrations/              # SQL migration files
│   ├── tests/
│   ├── Dockerfile               # Production container
│   ├── .dockerignore
│   └── pyproject.toml           # Python dependencies
│
├── scripts/                     # DevOps utilities
│   ├── fetch-render-logs.sh     # Pull backend logs via API
│   └── run-supabase-sql.sh      # Run SQL via Supabase Management API
│
├── .github/workflows/
│   └── firebase-deploy.yml      # Auto-deploy frontend on push to main
│
├── firebase.json                # Firebase Hosting config
├── .firebaserc                  # Firebase project ID
├── .gitignore
├── .env                         # Local secrets (NEVER committed)
├── CLAUDE.md                    # AI assistant instructions
└── G2E-Overview.md              # Project documentation
```

**Why this structure:** Monorepo with `frontend/` and `backend/` directories. Both deploy independently. The monorepo makes it easy to manage in a single git repo while keeping concerns separated. Each directory has its own dependency management (`package.json` vs `pyproject.toml`).

---

## 2. Firebase Hosting (Frontend)

### What It Does
Serves the built frontend SPA as static files over a global CDN with automatic SSL.

### Setup Files

**`firebase.json`** - Hosting configuration:
```json
{
  "hosting": {
    "public": "frontend/dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      { "source": "**", "destination": "/index.html" }
    ],
    "headers": [
      {
        "source": "/assets/**",
        "headers": [
          { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
        ]
      }
    ]
  }
}
```

Key decisions:
- **`public: "frontend/dist"`** - Points to Vite's build output directory
- **SPA rewrite** - All routes serve `index.html` (React Router handles routing client-side)
- **Asset caching** - Vite-built assets have content hashes in filenames, so they can be cached forever (immutable)

**`.firebaserc`** - Project binding:
```json
{
  "projects": {
    "default": "your-project-id"
  }
}
```

### Initial Setup Steps
1. Create a Firebase project at https://console.firebase.google.com
2. Enable Hosting in the Firebase console
3. Install Firebase CLI: `npm install -g firebase-tools`
4. Run `firebase init hosting` in the project root (or create the files manually)
5. Generate a service account key for GitHub Actions (see CI/CD section)

### What's Flexible
- Could replace with Vercel (`vercel.json`), Netlify (`netlify.toml`), or Cloudflare Pages
- The SPA rewrite pattern is universal across all static hosts
- If using Next.js/Nuxt with SSR, you'd use Vercel/Netlify instead (they support server-side rendering)

---

## 3. Render (Backend)

### What It Does
Runs the FastAPI backend in a Docker container. Auto-deploys when code is pushed to `main`.

### Setup

**Render Dashboard Configuration:**
- **Service type:** Web Service
- **Repository:** Connected to GitHub repo
- **Branch:** `main`
- **Root directory:** `backend`
- **Build command:** (uses Dockerfile)
- **Auto-deploy:** Yes, on every push to `main`

**`backend/Dockerfile`:**
```dockerfile
FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PORT=8080

# Install system dependencies for PostgreSQL
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libpq-dev && \
    rm -rf /var/lib/apt/lists/*

COPY . .
RUN pip install --no-cache-dir -e .

EXPOSE 8080

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
```

Key decisions:
- **`python:3.11-slim`** - Small image, production-ready
- **`libpq-dev`** - Required for `asyncpg` (PostgreSQL async driver)
- **Port 8080** - Render's default expected port
- **`pip install -e .`** - Installs from `pyproject.toml` (editable mode for simplicity)

**Environment variables set in Render dashboard:**

| Variable | Purpose | Example |
|----------|---------|---------|
| `DATABASE_URL` | Supabase connection string | `postgresql+asyncpg://postgres.[ref]:[pwd]@...pooler.supabase.com:6543/postgres` |
| `SECRET_KEY` | JWT signing + credential encryption | Random 64-char string |
| `GEMINI_API_KEY` | Google AI API key | `AIza...` |
| `FRONTEND_URL` | CORS allowed origin | `https://your-app.web.app` |

### Auto-Deploy Behavior
1. Push to `main` branch
2. Render detects the push via GitHub webhook
3. Render builds the Docker image from `backend/Dockerfile`
4. Render deploys the new container, replacing the old one
5. Health check confirms the service is live

### Free Tier Limitations
- Service spins down after 15 minutes of inactivity
- First request after spin-down takes ~30-60 seconds (cold start)
- No Redis available (app must gracefully degrade)
- 750 hours/month (enough for one service running 24/7)

### What's Flexible
- Could replace with Railway (simpler setup, no Dockerfile needed), Fly.io, or any Docker host
- For Node.js backends, Render supports native Node without Docker
- If budget allows, a paid tier eliminates cold starts

---

## 4. Supabase (Database)

### What It Does
Provides managed PostgreSQL with connection pooling, plus a Management API for running SQL remotely.

### Connection Details

**Production connection string format:**
```
postgresql+asyncpg://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
```

Critical settings for the connection:
- **Port 6543** - This is the pgbouncer pooler port (NOT 5432)
- **`+asyncpg`** - Python async driver (required for FastAPI async)
- **`statement_cache_size=0`** - MUST be set in the SQLAlchemy engine config for pgbouncer compatibility

**Database engine setup (`backend/app/core/database.py`):**
```python
engine = create_async_engine(
    settings.database_url,
    connect_args={
        "statement_cache_size": 0,       # Required for pgbouncer
        "prepared_statement_cache_size": 0,
    },
    pool_pre_ping=True,                  # Detect stale connections
)
```

### Schema Management

Migrations are plain SQL files in `backend/migrations/`, numbered sequentially:
```
backend/migrations/
├── 001_initial.sql                      # Full schema creation
└── 002_user_broker_credentials.sql      # Incremental addition
```

Migrations are run via the Supabase Management API (NOT direct psql, which may be blocked in some environments):

**`scripts/run-supabase-sql.sh`:**
```bash
# Usage:
bash scripts/run-supabase-sql.sh backend/migrations/002_*.sql    # Run a file
bash scripts/run-supabase-sql.sh -q "SELECT count(*) FROM users;" # Inline query

# Requires in .env:
# SUPABASE_ACCESS_TOKEN=sbp_xxxx  (from Supabase Account > Access Tokens)
# SUPABASE_PROJECT_REF=xxxx       (from Supabase project URL)
```

The script calls:
```
POST https://api.supabase.com/v1/projects/{ref}/database/query
Authorization: Bearer {access_token}
Body: {"query": "..."}
```

### Initial Setup Steps
1. Create a Supabase project at https://supabase.com
2. Note the project reference from the URL (e.g., `ekxxkfwhokfzzkhmqxbo`)
3. Get the database password from Settings > Database
4. Get the pooler connection string from Settings > Database > Connection Pooling
5. Generate an access token from Account > Access Tokens (for the management API script)
6. Run the initial migration: `bash scripts/run-supabase-sql.sh backend/migrations_initial.sql`

### What's Flexible
- Could replace with Neon (serverless Postgres, similar free tier), Railway Postgres, PlanetScale (MySQL), or any managed database
- The migration approach (numbered SQL files + script) is portable to any database
- Alembic (Python migration tool) is configured in the project but the manual SQL approach is simpler for small teams

---

## 5. GitHub Actions (CI/CD)

### What It Does
Automatically builds and deploys the frontend to Firebase Hosting when changes are pushed to `main`.

**`.github/workflows/firebase-deploy.yml`:**
```yaml
name: Deploy to Firebase Hosting
on:
  push:
    branches: [main]
    paths:
      - 'frontend/**'
      - 'firebase.json'
      - '.firebaserc'
      - '.github/workflows/firebase-deploy.yml'

jobs:
  build_and_deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json

      - name: Install dependencies
        run: npm ci
        working-directory: frontend

      - name: Build
        run: npm run build
        working-directory: frontend

      - uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: '${{ secrets.GITHUB_TOKEN }}'
          firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT }}'
          channelId: live
```

Key decisions:
- **`paths` filter** - Only triggers when frontend files actually change (saves CI minutes)
- **`npm ci`** - Clean install from lockfile (deterministic builds)
- **`npm run build`** - Runs TypeScript compilation + Vite production build
- **`channelId: live`** - Deploys directly to production (no preview channels)

### Required GitHub Secrets

| Secret | How to Get It |
|--------|--------------|
| `FIREBASE_SERVICE_ACCOUNT` | Firebase Console > Project Settings > Service Accounts > Generate New Private Key. Paste the entire JSON as the secret value. |
| `GITHUB_TOKEN` | Automatic - provided by GitHub Actions |

### What's Flexible
- If using Vercel/Netlify instead of Firebase, they have their own GitHub integrations (no workflow file needed)
- Could add test steps before deploy (e.g., `npm test`, `npm run lint`)
- Could add preview deployments on PRs (Firebase supports preview channels)
- Backend auto-deploy is handled by Render's native GitHub integration, not GitHub Actions

---

## 6. Backend Architecture (FastAPI)

### Request Flow
```
Client Request
  → CORS Middleware (checks origin)
  → FastAPI Router (/api/v1/...)
  → Dependency Injection (auth, DB session, cache)
  → Endpoint Handler
  → Service Layer (business logic)
  → Adapter/ORM (external APIs, database)
  → Response (Pydantic schema serialization)
```

### Layer Responsibilities

| Layer | Location | Purpose |
|-------|----------|---------|
| **Endpoints** | `api/v1/endpoints/` | HTTP handling, request validation, response formatting |
| **Dependencies** | `api/deps.py` | JWT auth, DB session, cache injection |
| **Schemas** | `schemas/` | Pydantic models for request/response validation |
| **Services** | `services/` | Business logic, orchestration between adapters |
| **Models** | `models/` | SQLAlchemy ORM table definitions |
| **Core** | `core/` | Security, database engine, cache, encryption |
| **Config** | `config.py` | Environment variable loading via Pydantic Settings |

### CORS Configuration (`backend/app/main.py`)

```python
origins = [
    "http://localhost:3000",                    # React dev server
    "http://localhost:5173",                    # Vite default
    "https://your-app.web.app",                # Firebase production
    "https://your-app.firebaseapp.com",        # Firebase alias
    settings.frontend_url,                     # Dynamic from env
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**Important:** Always include both `localhost` origins for development AND the production URL. The `FRONTEND_URL` env var on Render should match the Firebase Hosting URL exactly.

### Authentication System

**Password hashing:**
```python
# bcrypt via passlib (pin bcrypt==4.0.1 for passlib compatibility)
from passlib.context import CryptContext
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
```

**JWT tokens:**
```python
# python-jose with HS256
from jose import jwt
payload = {"sub": str(user_id), "email": email, "exp": expiration}
token = jwt.encode(payload, SECRET_KEY, algorithm="HS256")
```

**Auth dependency injection:**
```python
# Every protected endpoint uses CurrentUser
CurrentUser = Annotated[User, Depends(get_current_user)]

@router.get("/protected")
async def protected_endpoint(current_user: CurrentUser):
    # current_user is guaranteed to be authenticated
    ...
```

### What's Flexible
- FastAPI could be Django, Flask, Express.js, or any API framework
- SQLAlchemy could be Prisma, Drizzle, or raw SQL
- Pydantic schemas could be marshmallow, attrs, or manual validation
- The layered architecture (endpoints > services > models) is a universal pattern worth keeping regardless of framework

---

## 7. Frontend Architecture (React + Vite)

### Tech Stack
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first styling
- **Tremor** - Pre-built dashboard components (charts, cards, tables)
- **Headless UI** - Accessible unstyled components (modals, dropdowns)
- **Heroicons** - Icon library
- **Axios** - HTTP client with interceptors
- **React Router** - Client-side routing

### Dev Server Proxy (`vite.config.ts`)

```typescript
export default defineConfig({
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: { '@': '/src' },
  },
});
```

This means during development:
- Frontend runs on `http://localhost:3000`
- API calls to `/api/v1/...` are proxied to `http://localhost:8000` (backend)
- No CORS issues during development

In production:
- Frontend is served from Firebase (`https://your-app.web.app`)
- API calls go directly to `https://your-backend.onrender.com/api/v1` (set via `VITE_API_URL`)

### API Client Pattern (`frontend/src/lib/api.ts`)

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
});

// Auto-attach JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-handle 401 (expired token)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Domain-specific API groups
export const authApi = { login: (data) => api.post('/auth/login', data), ... };
export const portfolioApi = { getSummary: () => api.get('/portfolio/summary'), ... };
```

### Auth Context Pattern

```typescript
// AuthContext provides global auth state
const AuthContext = createContext<AuthContextType>(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing token on app load
    const token = localStorage.getItem('access_token');
    if (token) refreshUser();
    else setIsLoading(false);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

// Usage in any component:
const { user, isAuthenticated } = useAuth();
```

### Theme Context (Dark Mode)

```typescript
// ThemeContext manages light/dark mode
// Persists preference to localStorage
// Toggles 'dark' class on <html> element
// Tailwind's 'class' dark mode strategy reads this class
```

**Tailwind config for dark mode:**
```javascript
// tailwind.config.js
module.exports = {
  darkMode: 'class',  // Uses class strategy, not OS preference
  // ...
};
```

### What's Flexible
- React could be Vue, Svelte, Next.js, or any frontend framework
- Vite could be webpack, Turbopack, or framework-specific bundlers
- Tremor is specific to React dashboards - could use shadcn/ui, Material UI, Ant Design, etc.
- Tailwind is popular but any CSS approach works (CSS modules, styled-components, etc.)
- Axios could be the native `fetch` API or libraries like `ky`

---

## 8. Environment Variables & Secrets

### Local Development (`.env` in project root)

```bash
# Render API (for log fetching from dev environment)
RENDER_API_KEY=rnd_xxxx
RENDER_SERVICE_ID=srv-xxxx
RENDER_OWNER_ID=tea-xxxx

# Supabase (for running migrations from dev environment)
SUPABASE_DB_URL=postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres
SUPABASE_PROJECT_REF=xxxx
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...
SUPABASE_ACCESS_TOKEN=sbp_xxxx
```

This `.env` is **only used by the dev scripts** (log fetching, SQL execution). It is gitignored and never deployed.

### Production Backend (Render Dashboard)

```bash
DATABASE_URL=postgresql+asyncpg://postgres.[ref]:[pwd]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
SECRET_KEY=your-random-64-char-secret-key
GEMINI_API_KEY=AIza...
FRONTEND_URL=https://your-app.web.app
```

These are set in the Render service's Environment tab. They are injected into the Docker container at runtime.

### Production Frontend (`frontend/.env.production`)

```bash
VITE_API_URL=https://your-backend.onrender.com/api/v1
```

This is committed to the repo (it's not secret - just a URL). Vite inlines it at build time.

### GitHub Actions Secrets

```bash
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"..."}
```

Set in GitHub repo > Settings > Secrets and variables > Actions.

### Security Rules
1. **NEVER commit `.env` files** - They contain API keys and passwords
2. **NEVER hardcode secrets** - Always use environment variables
3. **NEVER log secrets** - Be careful with debug logging
4. **Rotate `SECRET_KEY` carefully** - Changing it invalidates all JWTs and encrypted credentials
5. **Use different secrets per environment** - Dev and prod should have different keys

---

## 9. Deployment Workflows

### Frontend Deployment (Fully Automatic)

```
Developer pushes to main (with frontend/ changes)
        │
        ▼
GitHub Actions triggers (.github/workflows/firebase-deploy.yml)
        │
        ├── Checkout code
        ├── Setup Node 20
        ├── npm ci (install dependencies)
        ├── npm run build (TypeScript + Vite)
        └── Firebase deploy to live channel
                │
                ▼
        Live at https://your-app.web.app
```

### Backend Deployment (Fully Automatic)

```
Developer pushes to main (with backend/ changes)
        │
        ▼
Render detects push via GitHub webhook
        │
        ├── Pull latest code
        ├── Build Docker image from backend/Dockerfile
        ├── Deploy new container
        └── Health check
                │
                ▼
        Live at https://your-backend.onrender.com
```

### Database Migration (Manual but Scripted)

```
Developer creates backend/migrations/003_new_feature.sql
        │
        ▼
bash scripts/run-supabase-sql.sh backend/migrations/003_new_feature.sql
        │
        ▼
Supabase Management API executes the SQL
        │
        ▼
Schema updated in production database
```

### Typical Development Flow

```
1. Create feature branch:  git checkout -b feature/new-thing
2. Make changes to frontend/ and/or backend/
3. Test locally (frontend: npm run dev, backend: uvicorn app.main:app)
4. Commit and push to feature branch
5. Create PR to main
6. Merge PR
7. Auto-deploy kicks in:
   - Frontend changes → GitHub Actions → Firebase
   - Backend changes → Render auto-deploy
8. If database changes needed:
   - Create migration SQL file
   - Run via: bash scripts/run-supabase-sql.sh <file>
```

---

## 10. DevOps Scripts

### Log Fetching (`scripts/fetch-render-logs.sh`)

Fetches backend logs from Render's REST API without needing SSH access.

```bash
bash scripts/fetch-render-logs.sh          # Recent log entries
bash scripts/fetch-render-logs.sh 30m      # Last 30 minutes
bash scripts/fetch-render-logs.sh 4h       # Last 4 hours
bash scripts/fetch-render-logs.sh errors   # Error-level only
bash scripts/fetch-render-logs.sh save 1d  # Save to logs/ directory
```

Uses Render's `/v1/logs` API endpoint with Bearer token auth. The Python helper script (`fetch_render_logs.py`) handles pagination and formatting.

### SQL Execution (`scripts/run-supabase-sql.sh`)

Runs SQL against the production database via Supabase's Management API.

```bash
bash scripts/run-supabase-sql.sh backend/migrations/002_file.sql   # Run migration
bash scripts/run-supabase-sql.sh -q "SELECT count(*) FROM users;"  # Inline query
```

Uses `POST https://api.supabase.com/v1/projects/{ref}/database/query` with access token auth.

**Why not direct psql?** Some development environments (like Claude Code's sandbox) block outbound DNS resolution to database hosts. The HTTPS Management API works everywhere.

### Important: Line Endings

Files created in some environments may have Windows-style `\r` line endings. Always run this on new shell scripts:
```bash
sed -i 's/\r$//' scripts/new-script.sh
```

---

## 11. Common Pitfalls & Solutions

| Issue | Cause | Solution |
|-------|-------|---------|
| **bcrypt import error** | passlib incompatible with bcrypt >=4.1 | Pin `bcrypt==4.0.1` in dependencies |
| **"prepared statement already exists"** | pgbouncer doesn't support prepared statements | Set `statement_cache_size=0` in engine connect_args |
| **CORS errors in browser** | `FRONTEND_URL` doesn't match actual origin | Ensure exact match including `https://` and no trailing slash |
| **Enum case mismatch** | PostgreSQL enums are case-sensitive | Use lowercase values everywhere; SQLAlchemy `values_callable` |
| **Redis connection refused** | Redis not available on free tier | Cache module checks `_available` flag; falls back gracefully |
| **OAuth state lost between requests** | State stored in instance variable | Use module-level dict or database for OAuth state storage |
| **Frontend white screen** | Uncaught error in React component tree | Add Error Boundaries; use `Number()` for Pydantic Decimal values |
| **422 on API calls** | Pydantic validation error detail is array, not string | Stringify error detail before rendering in React |
| **Cold start latency** | Render free tier spins down after 15min idle | Accept it or upgrade to paid tier |
| **`firebase deploy` fails locally** | GitHub Actions handles deployment | Never run `firebase deploy` manually; push to main instead |

---

## 12. Adapting This Template for New Projects

### Minimum Viable Setup

For a new project, you need:

1. **Create accounts** (all free):
   - Firebase project (for frontend hosting)
   - Render account (for backend hosting)
   - Supabase project (for database)
   - GitHub repo (for code + CI/CD)

2. **Set up auto-deploy**:
   - Connect Render to your GitHub repo
   - Add Firebase service account to GitHub Secrets
   - Copy the GitHub Actions workflow file

3. **Configure environment**:
   - Set env vars in Render dashboard
   - Create `frontend/.env.production` with backend URL
   - Create local `.env` with Supabase/Render API keys

4. **Create the database**:
   - Write initial migration SQL
   - Run via `run-supabase-sql.sh`

### What to Change Per Project

| Item | What to Change |
|------|---------------|
| Firebase project ID | `.firebaserc` |
| Render service | Create new service, point to repo |
| Supabase project | Create new project, new connection string |
| `FRONTEND_URL` | Update in Render env vars |
| `VITE_API_URL` | Update in `frontend/.env.production` |
| Database schema | Write new `migrations_initial.sql` |
| CORS origins | Update in `backend/app/main.py` |
| API routes | Add/modify `backend/app/api/v1/endpoints/` |
| Frontend pages | Add/modify `frontend/src/pages/` |

### What Stays the Same

- Project directory structure (`frontend/`, `backend/`, `scripts/`)
- Dockerfile pattern
- GitHub Actions workflow structure
- Auth system (JWT + bcrypt)
- API client pattern (Axios with interceptors)
- DevOps scripts (adapted for new service IDs)
- `.gitignore` patterns
- CORS middleware setup pattern
- Database engine configuration (pgbouncer settings)

---

## 13. Cost Summary (Free Tier)

| Service | Free Tier Limits | When to Upgrade |
|---------|-----------------|-----------------|
| **Firebase Hosting** | 10 GB storage, 360 MB/day transfer | Very high traffic sites |
| **Render** | 750 hours/month, spins down after 15min | Need always-on or more RAM |
| **Supabase** | 500 MB database, 2 GB bandwidth | Large datasets or high query volume |
| **GitHub Actions** | 2,000 min/month (public repos unlimited) | Private repos with heavy CI |
| **Google Gemini** | Free tier with rate limits | High-volume AI usage |

**Total cost for a hobby/MVP project: $0/month**

When scaling to production with real users, expect ~$25-50/month total for paid tiers of all services.
