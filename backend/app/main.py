"""FastAPI application entry point."""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.api.v1.router import api_router

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler for startup/shutdown."""
    # Startup
    print(f"Starting {settings.app_name}...")
    yield
    # Shutdown
    print(f"Shutting down {settings.app_name}...")


app = FastAPI(
    title=settings.app_name,
    description="AI-powered trading assistant with multi-brokerage support",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS middleware - configure allowed origins
cors_origins = [
    "http://localhost:3000",  # React dev server
    "http://localhost:5173",  # Vite default port
]

# Add production Firebase hosting URLs if configured
if settings.frontend_url:
    cors_origins.append(settings.frontend_url)

# Add common Firebase hosting patterns
cors_origins.extend([
    "https://etrade-ai-trading.web.app",
    "https://etrade-ai-trading.firebaseapp.com",
])

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API router
app.include_router(api_router, prefix=settings.api_v1_prefix)


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "app": settings.app_name}


@app.get("/")
async def root():
    """Root endpoint."""
    return {"message": f"Welcome to {settings.app_name}", "docs": "/docs"}
