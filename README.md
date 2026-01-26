# G2E Trading App

AI-powered trading assistant with multi-brokerage support.

## Features

- **Multi-Brokerage Support**: Connect Alpaca and E*TRADE accounts
- **Portfolio Aggregation**: View all positions across brokers in one dashboard
- **AI Trading Assistant**: Chat with Google Gemini for analysis and recommendations
- **9 Trading Strategies**: Value, Growth, Momentum, Swing, Day Trading, and more
- **Risk Assessment**: AI-powered risk analysis before placing trades
- **Feedback Learning**: AI learns from your preferences to personalize recommendations
- **Trading Rules**: Define explicit rules the AI follows

## Tech Stack

### Backend
- Python 3.11+
- FastAPI
- PostgreSQL + SQLAlchemy
- Redis (caching)
- Google Gemini AI

### Frontend
- React 18 + TypeScript
- Vite
- Tailwind CSS
- Tremor UI

## Getting Started

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL
- Redis (optional)

### Backend Setup
```bash
cd backend
cp .env.example .env
# Edit .env with your credentials
pip install -e .
uvicorn app.main:app --reload
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

## Environment Variables

See `backend/.env.example` for required configuration:
- Database URL
- JWT Secret
- Google Gemini API Key
- Alpaca API credentials
- E*TRADE API credentials

## License

Private - All rights reserved
