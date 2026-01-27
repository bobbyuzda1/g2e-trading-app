# G2E Trading App Deployment Script (Windows PowerShell)
# Run this from the project root directory

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "G2E Trading App Deployment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check required tools
Write-Host "Checking required tools..." -ForegroundColor Yellow
if (-not (Get-Command gcloud -ErrorAction SilentlyContinue)) {
    Write-Host "gcloud CLI not installed. Install from https://cloud.google.com/sdk/docs/install" -ForegroundColor Red
    exit 1
}
if (-not (Get-Command firebase -ErrorAction SilentlyContinue)) {
    Write-Host "firebase CLI not installed. Run: npm install -g firebase-tools" -ForegroundColor Red
    exit 1
}
if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    Write-Host "Python not installed" -ForegroundColor Red
    exit 1
}
Write-Host "All required tools found!" -ForegroundColor Green
Write-Host ""

# Step 1: Database Migrations
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Step 1: Running Database Migrations" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Set-Location backend
if (-not (Test-Path "venv")) {
    python -m venv venv
}
& .\venv\Scripts\Activate.ps1
pip install -e . --quiet
Write-Host "Running migrations..."
alembic upgrade head
Write-Host "Database migrations complete!" -ForegroundColor Green
Set-Location ..
Write-Host ""

# Step 2: Deploy Backend to Cloud Run
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Step 2: Deploying Backend to Cloud Run" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Set-Location backend

# Read .env file
$envContent = Get-Content .env | Where-Object { $_ -match "=" }
$envVars = @{}
foreach ($line in $envContent) {
    $parts = $line -split "=", 2
    if ($parts.Count -eq 2) {
        $envVars[$parts[0].Trim()] = $parts[1].Trim()
    }
}

# Build and push container
Write-Host "Building Docker container..." -ForegroundColor Yellow
gcloud builds submit --tag gcr.io/etrade-ai-trading/g2e-backend --quiet

# Deploy to Cloud Run
Write-Host "Deploying to Cloud Run..." -ForegroundColor Yellow
$dbUrl = $envVars["DATABASE_URL"]
$secretKey = $envVars["SECRET_KEY"]
$geminiKey = $envVars["GEMINI_API_KEY"]

gcloud run deploy g2e-backend `
    --image gcr.io/etrade-ai-trading/g2e-backend `
    --platform managed `
    --region us-central1 `
    --allow-unauthenticated `
    --set-env-vars "DATABASE_URL=$dbUrl,SECRET_KEY=$secretKey,GEMINI_API_KEY=$geminiKey,FRONTEND_URL=https://etrade-ai-trading.web.app"

Write-Host "Backend deployed!" -ForegroundColor Green
Set-Location ..
Write-Host ""

# Step 3: Deploy Frontend to Firebase
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Step 3: Deploying Frontend to Firebase" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Set-Location frontend
npm install --silent
npm run build
firebase deploy --only hosting
Write-Host "Frontend deployed!" -ForegroundColor Green
Set-Location ..
Write-Host ""

Write-Host "========================================" -ForegroundColor Green
Write-Host "Deployment Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Your app is now live at:" -ForegroundColor White
Write-Host "  Frontend: https://etrade-ai-trading.web.app" -ForegroundColor Cyan
Write-Host "  Backend:  Check Cloud Run console for URL" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Visit https://etrade-ai-trading.web.app"
Write-Host "2. Register a new account"
Write-Host "3. Connect your E*TRADE sandbox account"
