#!/bin/bash
# G2E Trading App Deployment Script
# Run this from the project root directory

set -e

echo "========================================"
echo "G2E Trading App Deployment"
echo "========================================"
echo ""

# Check required tools
echo "Checking required tools..."
command -v gcloud >/dev/null 2>&1 || { echo "gcloud CLI not installed. Install from https://cloud.google.com/sdk/docs/install"; exit 1; }
command -v firebase >/dev/null 2>&1 || { echo "firebase CLI not installed. Run: npm install -g firebase-tools"; exit 1; }
command -v python3 >/dev/null 2>&1 || { echo "Python 3 not installed"; exit 1; }
echo "All required tools found!"
echo ""

# Step 1: Database Migrations
echo "========================================"
echo "Step 1: Running Database Migrations"
echo "========================================"
cd backend
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi
source venv/bin/activate 2>/dev/null || source venv/Scripts/activate
pip install -e . --quiet
echo "Running migrations..."
alembic upgrade head
echo "✓ Database migrations complete!"
cd ..
echo ""

# Step 2: Deploy Backend to Cloud Run
echo "========================================"
echo "Step 2: Deploying Backend to Cloud Run"
echo "========================================"
cd backend

# Build and push container
echo "Building Docker container..."
gcloud builds submit --tag gcr.io/etrade-ai-trading/g2e-backend --quiet

# Deploy to Cloud Run
echo "Deploying to Cloud Run..."
gcloud run deploy g2e-backend \
    --image gcr.io/etrade-ai-trading/g2e-backend \
    --platform managed \
    --region us-central1 \
    --allow-unauthenticated \
    --set-env-vars "DATABASE_URL=$(grep DATABASE_URL .env | cut -d'=' -f2-),SECRET_KEY=$(grep SECRET_KEY .env | cut -d'=' -f2-),GEMINI_API_KEY=$(grep GEMINI_API_KEY .env | cut -d'=' -f2-),FRONTEND_URL=https://etrade-ai-trading.web.app"

echo "✓ Backend deployed!"
cd ..
echo ""

# Step 3: Deploy Frontend to Firebase
echo "========================================"
echo "Step 3: Deploying Frontend to Firebase"
echo "========================================"
cd frontend
npm install --silent
npm run build
firebase deploy --only hosting
echo "✓ Frontend deployed!"
cd ..
echo ""

echo "========================================"
echo "Deployment Complete!"
echo "========================================"
echo ""
echo "Your app is now live at:"
echo "  Frontend: https://etrade-ai-trading.web.app"
echo "  Backend:  Check Cloud Run console for URL"
echo ""
echo "Next steps:"
echo "1. Visit https://etrade-ai-trading.web.app"
echo "2. Register a new account"
echo "3. Connect your E*TRADE sandbox account"
