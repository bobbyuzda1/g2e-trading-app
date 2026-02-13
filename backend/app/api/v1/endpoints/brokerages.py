"""Brokerage connection endpoints."""
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.cache import get_cache, CacheService
from app.services.brokerage import BrokerageService
from app.models.brokerage import BrokerId
from app.schemas.brokerage import (
    BrokerageConnectionResponse,
    BrokerageAccountResponse,
    OAuthStartResponse,
    OAuthCallbackRequest,
    BrokerCredentialSave,
    BrokerCredentialResponse,
)
from app.schemas.common import MessageResponse
from app.models.brokerage import UserBrokerCredential
from app.core.encryption import encrypt_value, decrypt_value
from app.api.deps import CurrentUser
from sqlalchemy import select

router = APIRouter(prefix="/brokerages", tags=["Brokerages"])


async def get_brokerage_service(
    db: Annotated[AsyncSession, Depends(get_db)],
    cache: Annotated[CacheService, Depends(get_cache)],
) -> BrokerageService:
    """Dependency for brokerage service."""
    return BrokerageService(db, cache)


@router.get("/supported")
async def list_supported_brokerages():
    """List all supported brokerages and their features."""
    from app.brokers import AlpacaAdapter, ETradeAdapter

    adapters = [
        AlpacaAdapter(client_id="", client_secret="", paper=True),
        ETradeAdapter(consumer_key="", consumer_secret="", sandbox=True),
    ]

    return [
        {
            "broker_id": adapter.broker_id.value,
            "name": adapter.broker_name,
            "features": {
                "stock_trading": adapter.features.stock_trading,
                "options_trading": adapter.features.options_trading,
                "crypto_trading": adapter.features.crypto_trading,
                "fractional_shares": adapter.features.fractional_shares,
                "extended_hours": adapter.features.extended_hours,
                "paper_trading": adapter.features.paper_trading,
            },
        }
        for adapter in adapters
    ]


@router.post("/connect/{broker_id}", response_model=OAuthStartResponse)
async def initiate_connection(
    broker_id: BrokerId,
    current_user: CurrentUser,
    service: Annotated[BrokerageService, Depends(get_brokerage_service)],
    redirect_uri: str = Query(..., description="OAuth redirect URI"),
):
    """Initiate OAuth connection to a brokerage."""
    try:
        auth_url, state, is_oob = await service.initiate_connection(
            user_id=current_user.id,
            broker_id=broker_id,
            redirect_uri=redirect_uri,
        )
        return OAuthStartResponse(
            authorization_url=auth_url,
            state=state,
            expires_in=600,  # 10 minutes
            is_oob=is_oob,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post("/callback/{broker_id}", response_model=BrokerageConnectionResponse)
async def complete_connection(
    broker_id: BrokerId,
    callback_data: OAuthCallbackRequest,
    current_user: CurrentUser,
    service: Annotated[BrokerageService, Depends(get_brokerage_service)],
    redirect_uri: str = Query(..., description="OAuth redirect URI"),
):
    """Complete OAuth callback and establish connection."""
    try:
        # Build callback data dict
        data = {
            "state": callback_data.state,
        }
        if callback_data.code:
            data["code"] = callback_data.code
        if callback_data.oauth_token:
            data["oauth_token"] = callback_data.oauth_token
        if callback_data.oauth_verifier:
            data["oauth_verifier"] = callback_data.oauth_verifier

        connection = await service.complete_connection(
            user_id=current_user.id,
            broker_id=broker_id,
            callback_data=data,
            redirect_uri=redirect_uri,
        )
        return connection
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.get("/connections", response_model=list[BrokerageConnectionResponse])
async def list_connections(
    current_user: CurrentUser,
    service: Annotated[BrokerageService, Depends(get_brokerage_service)],
):
    """List all brokerage connections for current user."""
    connections = await service.get_connections(current_user.id)
    return connections


@router.get("/connections/{connection_id}", response_model=BrokerageConnectionResponse)
async def get_connection(
    connection_id: UUID,
    current_user: CurrentUser,
    service: Annotated[BrokerageService, Depends(get_brokerage_service)],
):
    """Get a specific brokerage connection."""
    connection = await service.get_connection(connection_id, current_user.id)
    if not connection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Connection not found",
        )
    return connection


@router.delete("/connections/{connection_id}", response_model=MessageResponse)
async def disconnect(
    connection_id: UUID,
    current_user: CurrentUser,
    service: Annotated[BrokerageService, Depends(get_brokerage_service)],
):
    """Disconnect a brokerage connection."""
    success = await service.disconnect(connection_id, current_user.id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Connection not found",
        )
    return MessageResponse(message="Disconnected successfully")


@router.get("/accounts", response_model=list[BrokerageAccountResponse])
async def list_accounts(
    current_user: CurrentUser,
    service: Annotated[BrokerageService, Depends(get_brokerage_service)],
    broker_id: BrokerId | None = None,
):
    """List all brokerage accounts for current user."""
    accounts = await service.get_accounts(current_user.id, broker_id)
    return accounts


# --- Per-user broker API credentials ---

def _mask_key(key: str) -> str:
    """Show first 3 and last 3 chars of a key."""
    if len(key) <= 8:
        return key[:2] + "..." + key[-2:]
    return key[:3] + "..." + key[-3:]


@router.get("/credentials", response_model=list[BrokerCredentialResponse])
async def list_credentials(
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """List which brokers the user has saved API keys for."""
    stmt = select(UserBrokerCredential).where(
        UserBrokerCredential.user_id == current_user.id,
    )
    result = await db.execute(stmt)
    creds = result.scalars().all()

    return [
        BrokerCredentialResponse(
            broker_id=c.broker_id,
            has_credentials=True,
            is_sandbox=c.is_sandbox,
            api_key_hint=_mask_key(decrypt_value(c.encrypted_key)),
        )
        for c in creds
    ]


@router.put("/credentials", response_model=BrokerCredentialResponse)
async def save_credentials(
    body: BrokerCredentialSave,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Save or update broker API credentials for the current user."""
    if not body.api_key.strip() or not body.api_secret.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="API key and secret are required.",
        )

    # Upsert
    stmt = select(UserBrokerCredential).where(
        UserBrokerCredential.user_id == current_user.id,
        UserBrokerCredential.broker_id == body.broker_id,
    )
    result = await db.execute(stmt)
    cred = result.scalar_one_or_none()

    if cred:
        cred.encrypted_key = encrypt_value(body.api_key.strip())
        cred.encrypted_secret = encrypt_value(body.api_secret.strip())
        cred.is_sandbox = body.is_sandbox
    else:
        cred = UserBrokerCredential(
            user_id=current_user.id,
            broker_id=body.broker_id,
            encrypted_key=encrypt_value(body.api_key.strip()),
            encrypted_secret=encrypt_value(body.api_secret.strip()),
            is_sandbox=body.is_sandbox,
        )
        db.add(cred)

    await db.commit()
    await db.refresh(cred)

    return BrokerCredentialResponse(
        broker_id=cred.broker_id,
        has_credentials=True,
        is_sandbox=cred.is_sandbox,
        api_key_hint=_mask_key(body.api_key.strip()),
    )


@router.delete("/credentials/{broker_id}", response_model=MessageResponse)
async def delete_credentials(
    broker_id: BrokerId,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Delete saved broker API credentials."""
    stmt = select(UserBrokerCredential).where(
        UserBrokerCredential.user_id == current_user.id,
        UserBrokerCredential.broker_id == broker_id,
    )
    result = await db.execute(stmt)
    cred = result.scalar_one_or_none()

    if not cred:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No credentials found")

    await db.delete(cred)
    await db.commit()
    return MessageResponse(message="Credentials deleted")
