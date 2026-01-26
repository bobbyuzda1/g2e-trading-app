"""API v1 router."""
from fastapi import APIRouter

from app.api.v1.endpoints import auth, users, brokerages, portfolio, trading, chat, strategies, feedback

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(brokerages.router)
api_router.include_router(portfolio.router)
api_router.include_router(trading.router)
api_router.include_router(chat.router)
api_router.include_router(strategies.router)
api_router.include_router(feedback.router)
