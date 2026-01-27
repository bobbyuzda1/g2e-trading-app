# G2E Trading App Deployment Guide

This guide walks you through deploying the G2E Trading App using:
- **Firebase Hosting** - Frontend (React)
- **Google Cloud Run** - Backend (FastAPI)
- **Supabase** - Database (PostgreSQL)

**Estimated Cost: $0/month** (within free tiers)

---

## Prerequisites

1. Google Account (for Firebase and Cloud Run)
2. GitHub account (already set up)
3. Node.js 18+ installed
4. Python 3.11+ installed

---

## Step 1: Create Supabase Project (Free Database)

1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click **"New Project"**
3. Fill in:
   - **Name**: `g2e-trading-app`
   - **Database Password**: Generate a strong password (SAVE THIS!)
   - **Region**: Choose closest to you (e.g., `us-east-1`)
4. Click **"Create new project"** (takes ~2 minutes)

### Get Your Database URL

1. In Supabase dashboard, go to **Settings → Database**
2. Scroll to **"Connection string"** section
3. Select **"URI"** tab
4. Copy the connection string - it looks like:
   ```
   postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
   ```
5. **Important**: Replace `[YOUR-PASSWORD]` with your actual database password
6. **Important**: Change `postgresql://` to `postgresql+asyncpg://` for our app

Your final DATABASE_URL should look like:
```
postgresql+asyncpg://postgres.abcdefgh:MySecretPassword123@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

---

## Step 2: Create Firebase Project

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Click **"Create a project"** (or "Add project")
3. Enter project name: `g2e-trading-app`
4. Disable Google Analytics (optional, not needed)
5. Click **"Create project"**

### Enable Firebase Hosting

1. In Firebase console, click **"Hosting"** in left sidebar
2. Click **"Get started"**
3. Follow the prompts (we'll configure locally)

### Install Firebase CLI

```bash
npm install -g firebase-tools
firebase login
```

### Initialize Firebase in Your Project

```bash
cd C:\projects\g2e-trading-app
firebase init hosting
```

When prompted:
- Select your Firebase project (`g2e-trading-app`)
- Public directory: `frontend/dist`
- Single-page app: `Yes`
- Don't overwrite `index.html`

---

## Step 3: Set Up Google Cloud Run (Backend)

### Enable Cloud Run API

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Select your Firebase project (same project)
3. Search for **"Cloud Run API"** and enable it
4. Search for **"Cloud Build API"** and enable it
5. Search for **"Container Registry API"** and enable it

### Install Google Cloud CLI

Download from: https://cloud.google.com/sdk/docs/install

Then authenticate:
```bash
gcloud auth login
gcloud config set project YOUR_FIREBASE_PROJECT_ID
```

---

## Step 4: Get API Keys

### Google Gemini API Key

1. Go to [makersuite.google.com/app/apikey](https://makersuite.google.com/app/apikey)
2. Click **"Create API Key"**
3. Copy the key

### Alpaca API Keys (for paper trading)

1. Go to [alpaca.markets](https://alpaca.markets) and create account
2. Go to **Paper Trading** → **API Keys**
3. Generate new keys
4. Copy Client ID and Client Secret

---

## Step 5: Configure Environment Variables

### For Local Development

Create `backend/.env`:
```bash
cd backend
cp .env.example .env
```

Edit `.env` with your values:
```
DATABASE_URL=postgresql+asyncpg://postgres.xxxxx:password@aws-0-us-east-1.pooler.supabase.com:6543/postgres
GEMINI_API_KEY=your-gemini-key
JWT_SECRET=generate-a-random-32-char-string
ALPACA_CLIENT_ID=your-alpaca-client-id
ALPACA_CLIENT_SECRET=your-alpaca-client-secret
```

### For Production (Cloud Run)

We'll set these during deployment.

---

## Step 6: Run Database Migrations

```bash
cd backend
pip install -e .
alembic upgrade head
```

This creates all tables in your Supabase PostgreSQL database.

---

## Step 7: Deploy Backend to Cloud Run

### Build and Deploy

```bash
cd C:\projects\g2e-trading-app\backend

# Build the Docker image
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/g2e-backend

# Deploy to Cloud Run
gcloud run deploy g2e-backend \
  --image gcr.io/YOUR_PROJECT_ID/g2e-backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "DATABASE_URL=your-supabase-url,JWT_SECRET=your-secret,GEMINI_API_KEY=your-key"
```

After deployment, you'll get a URL like:
```
https://g2e-backend-xxxxx-uc.a.run.app
```

Save this URL!

---

## Step 8: Deploy Frontend to Firebase

### Update API URL

Edit `frontend/src/lib/api.ts` and update the base URL for production, or set it via environment variable.

### Build and Deploy

```bash
cd C:\projects\g2e-trading-app\frontend

# Install dependencies
npm install

# Build for production
npm run build

# Deploy to Firebase
firebase deploy --only hosting
```

After deployment, you'll get a URL like:
```
https://g2e-trading-app.web.app
```

---

## Step 9: Configure CORS

Update your backend's `app/main.py` to allow your Firebase hosting domain:

```python
origins = [
    "http://localhost:3000",
    "https://g2e-trading-app.web.app",
    "https://YOUR_PROJECT_ID.web.app",
]
```

Redeploy the backend after this change.

---

## Verification Checklist

- [ ] Supabase project created and database URL obtained
- [ ] Firebase project created
- [ ] Cloud Run API enabled
- [ ] Gemini API key obtained
- [ ] Alpaca API keys obtained (paper trading)
- [ ] Database migrations run successfully
- [ ] Backend deployed to Cloud Run
- [ ] Frontend deployed to Firebase Hosting
- [ ] Can access the app at your Firebase URL
- [ ] Can register/login
- [ ] Can connect Alpaca account

---

## Costs Breakdown

| Service | Free Tier | Your Expected Usage | Cost |
|---------|-----------|---------------------|------|
| Supabase | 500MB DB, 2GB bandwidth | Well under | $0 |
| Firebase Hosting | 10GB/month | Well under | $0 |
| Cloud Run | 2M requests/month | Well under | $0 |
| Gemini API | Free tier available | Depends on usage | $0-5 |

**Total: $0/month** for development and light usage.

---

## Deploying Other Apps (e.g., Flip7)

You can deploy additional apps to the same Firebase project:

```bash
# For a different app
firebase hosting:sites:create flip7-game
firebase target:apply hosting flip7 flip7-game
firebase deploy --only hosting:flip7
```

Each app gets its own URL: `flip7-game.web.app`

---

## Custom Domain (Optional, Later)

When you're ready for a custom domain:

1. Firebase Console → Hosting → Add custom domain
2. Follow DNS verification steps
3. SSL is automatic and free

---

## Troubleshooting

### "Connection refused" to database
- Check your DATABASE_URL has `+asyncpg` in it
- Ensure you're using the pooler connection (port 6543)
- Check password doesn't have special characters that need URL encoding

### CORS errors
- Add your frontend URL to the CORS origins in `main.py`
- Redeploy backend

### Cloud Run deployment fails
- Check Cloud Build logs in Google Cloud Console
- Ensure all APIs are enabled
- Check Dockerfile syntax
