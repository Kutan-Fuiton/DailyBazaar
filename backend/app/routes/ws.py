"""
routes/ws.py — Real-time WebSocket endpoint for live household shopping list synchronization.

Protocol:
- Path: /api/v1/ws/household/{household_id}?token=<jwt>
- Authenticates token query parameter (since WebSockets cannot send HTTP auth headers).
- Keeps connection alive with heartbeat pings.
- Pushes events to client: ITEM_ADDED, ITEM_TOGGLED, LIST_SYNCED, USER_JOINED.
"""
import logging
from typing import Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, status

from ..core.security import decode_token
from ..core.redis_client import is_token_blocklisted
from ..core.database import SessionLocal
from ..models.user import User
from ..models.household import HouseholdMember
from ..core.ws_manager import ws_manager

logger = logging.getLogger("vaniq.routes.ws")

router = APIRouter(tags=["WebSockets"])


@router.websocket("/ws/household/{household_id}")
async def household_websocket_endpoint(
    websocket: WebSocket,
    household_id: int,
    token: Optional[str] = Query(None),
):
    # 1. Authenticate JWT token
    if not token or is_token_blocklisted(token):
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Missing or revoked token")
        return

    payload = decode_token(token)
    user_id_str = payload.get("sub") if payload else None
    if not user_id_str:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid token")
        return

    user_id = int(user_id_str)

    # 2. Verify user and household access
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="User not found")
            return

        # Check membership in the household
        member = (
            db.query(HouseholdMember)
            .filter(
                HouseholdMember.household_id == household_id,
                HouseholdMember.user_id == user_id,
            )
            .first()
        )
        # If user has household_id on profile or is member, permit access
        user_household_id = getattr(user, "household_id", None)
        if not member and user_household_id != household_id:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Access denied to this household")
            return
    finally:
        db.close()

    # 3. Connect to manager
    await ws_manager.connect(websocket, household_id, user_id)

    # 4. Broadcast join notification
    await ws_manager.broadcast_to_household(
        household_id=household_id,
        event_type="USER_CONNECTED",
        data={"user_id": user_id, "username": user.username},
        sender_user_id=user_id,
    )

    try:
        while True:
            # Handle messages from client (e.g. heartbeat ping)
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text('{"type": "pong"}')
            elif data:
                logger.debug(f"[WS] Received message from user {user_id}: {data[:60]}")
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, household_id, user_id)
        await ws_manager.broadcast_to_household(
            household_id=household_id,
            event_type="USER_DISCONNECTED",
            data={"user_id": user_id},
            sender_user_id=user_id,
        )
    except Exception as exc:
        logger.warning(f"[WS] Exception in household {household_id}: {exc}")
        ws_manager.disconnect(websocket, household_id, user_id)
