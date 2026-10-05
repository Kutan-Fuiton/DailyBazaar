"""
core/ws_manager.py — Real-Time WebSocket Connection Manager & Redis Pub/Sub Event Broker.

Enables instant live household collaboration:
- Zero-latency broadcast of shopping list item additions, price updates, and check-offs.
- Multi-worker scalability via Redis Pub/Sub (with graceful single-process fallback if Redis is offline).
"""
from typing import Dict, Set, Optional, Any
import json
import logging
import asyncio
from fastapi import WebSocket

from .redis_client import get_redis, is_redis_online

logger = logging.getLogger("vaniq.websocket")


class ConnectionManager:
    def __init__(self):
        # Maps household_id -> set of active WebSockets
        self.active_households: Dict[int, Set[WebSocket]] = {}
        # Maps user_id -> set of active WebSockets (for user-specific notifications)
        self.active_users: Dict[int, Set[WebSocket]] = {}
        self._pubsub_task: Optional[asyncio.Task] = None

    async def connect(self, websocket: WebSocket, household_id: int, user_id: int):
        await websocket.accept()
        if household_id not in self.active_households:
            self.active_households[household_id] = set()
        self.active_households[household_id].add(websocket)

        if user_id not in self.active_users:
            self.active_users[user_id] = set()
        self.active_users[user_id].add(websocket)

        logger.info(f"[WS] Connected: user_id={user_id} in household_id={household_id} (active: {len(self.active_households[household_id])})")

    def disconnect(self, websocket: WebSocket, household_id: int, user_id: int):
        if household_id in self.active_households:
            self.active_households[household_id].discard(websocket)
            if not self.active_households[household_id]:
                del self.active_households[household_id]

        if user_id in self.active_users:
            self.active_users[user_id].discard(websocket)
            if not self.active_users[user_id]:
                del self.active_users[user_id]

        logger.info(f"[WS] Disconnected: user_id={user_id} from household_id={household_id}")

    async def broadcast_to_household(
        self,
        household_id: int,
        event_type: str,
        data: dict,
        sender_user_id: Optional[int] = None,
    ):
        """Broadcasts an event message to all connected members of a household."""
        payload = {
            "type": event_type,
            "household_id": household_id,
            "sender_user_id": sender_user_id,
            "data": data,
        }
        raw_msg = json.dumps(payload, default=str)

        # 1. Publish to Redis channel for multi-worker relay if Redis is online
        r = get_redis()
        if r and is_redis_online():
            try:
                r.publish(f"household:{household_id}", raw_msg)
            except Exception as e:
                logger.warning(f"[WS] Redis publish failed: {e}")

        # 2. Local delivery to active WebSockets in this process
        await self._deliver_local(household_id, raw_msg)

    async def _deliver_local(self, household_id: int, raw_msg: str):
        sockets = list(self.active_households.get(household_id, []))
        if not sockets:
            return

        dead_sockets = []
        for ws in sockets:
            try:
                await ws.send_text(raw_msg)
            except Exception:
                dead_sockets.append(ws)

        if dead_sockets and household_id in self.active_households:
            for ws in dead_sockets:
                self.active_households[household_id].discard(ws)


# Global singleton manager
ws_manager = ConnectionManager()
