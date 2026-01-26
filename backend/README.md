# G2E Trading App Backend

AI-powered trading assistant with multi-brokerage support.

## Setup

### Prerequisites

- Python 3.11+
- PostgreSQL 15+
- Redis 7+

### Installation

1. Create a virtual environment:
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. Install dependencies:
   ```bash
   pip install -e ".[dev]"
   ```

3. Configure environment:
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

4. Run database migrations:
   ```bash
   alembic upgrade head
   ```

### Running the Server

Development:
```bash
uvicorn app.main:app --reload --port 8000
```

Production:
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### API Documentation

Once running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Project Structure

```
backend/
├── app/
│   ├── api/           # API routes
│   │   └── v1/        # API version 1
│   │       └── endpoints/
│   ├── brokers/       # Brokerage integrations
│   ├── core/          # Core utilities (auth, database)
│   ├── models/        # SQLAlchemy models
│   ├── schemas/       # Pydantic schemas
│   ├── services/      # Business logic
│   ├── config.py      # Settings management
│   └── main.py        # FastAPI app
├── tests/             # Test suite
├── pyproject.toml     # Project dependencies
└── .env.example       # Environment template
```

## Testing

```bash
pytest
pytest --cov=app  # With coverage
```
