"""
core/redis_client.py — Centralized Redis connection, distributed caching, and token revocation.

Features:
- Connects to Redis via REDIS_URL from settings.
- Graceful, non-blocking fallback if Redis server is offline:
  Falls back to in-memory TTL dictionary so the app runs smoothly in dev and test environments.
- JSON serialization/deserialization for caching complex objects.
- Centralized JWT blocklist for immediate token revocation upon logout.
"""
from typing import Any, Optional
import json
import logging
import time

from .config import settings

logger = logging.getLogger("vaniq.redis")

_redis_instance = None
_last_connect_attempt = 0.0
_redis_available = False

# Fallback in-memory store if Redis is unavailable: {key: (value, expire_timestamp)}
_in_memory_store: dict[str, tuple[Any, float]] = {}


def _mask_redis_url(url: str) -> str:
    """Masks password in Redis connection URL for safe logging."""
    try:
        import urllib.parse
        parsed = urllib.parse.urlsplit(url)
        if parsed.password:
            netloc = f"{parsed.username or ''}:***@{parsed.hostname}:{parsed.port or ''}"
            return urllib.parse.urlunsplit((parsed.scheme, netloc, parsed.path, parsed.query, parsed.fragment))
    except Exception:
        pass
    return "redis://***"


def get_redis():
    """Returns the Redis client instance if available, otherwise None.
    Supports both local 'redis://' and Cloud Redis with TLS ('rediss://' e.g. Upstash, Redis Cloud).
    Automatically retries connection every 30 seconds if previously unreachable.
    """
    global _redis_instance, _last_connect_attempt, _redis_available
    now = time.time()

    if _redis_instance is not None and _redis_available:
        return _redis_instance

    # Retry at most once every 30 seconds if offline
    if now - _last_connect_attempt < 30.0:
        return None

    _last_connect_attempt = now
    effective_url = settings.REDIS_URL
    if "upstash.io" in effective_url and effective_url.startswith("redis://"):
        effective_url = "rediss://" + effective_url[len("redis://"):]

    masked_url = _mask_redis_url(effective_url)

    try:
        import redis
        is_ssl = effective_url.startswith("rediss://")
        client_kwargs = {
            "decode_responses": True,
            "socket_timeout": 3.0,
            "socket_connect_timeout": 3.0,
        }
        if is_ssl:
            client_kwargs["ssl_cert_reqs"] = None

        client = redis.Redis.from_url(effective_url, **client_kwargs)
        client.ping()
        _redis_instance = client
        _redis_available = True
        logger.info(f"Connected to Cloud/Distributed Redis at {masked_url}")
        return _redis_instance
    except Exception as exc:
        _redis_available = False
        _redis_instance = None
        logger.info(
            f"Redis unreachable at {masked_url} ({type(exc).__name__}). "
            "Using high-performance in-memory fallback cache."
        )
        return None


def is_redis_online() -> bool:
    """Check whether active connection to Redis is available."""
    r = get_redis()
    if not r:
        return False
    try:
        r.ping()
        return True
    except Exception:
        return False


def cache_get(key: str) -> Optional[Any]:
    """Retrieve item from Redis or in-memory fallback."""
    r = get_redis()
    if r:
        try:
            val = r.get(key)
            if val is not None:
                try:
                    return json.loads(val)
                except (ValueError, TypeError):
                    return val
            return None
        except Exception as e:
            logger.warning(f"Redis get error for {key}: {e}")

    # In-memory fallback
    item = _in_memory_store.get(key)
    if item:
        data, exp = item
        if exp > time.time():
            return data
        else:
            _in_memory_store.pop(key, None)
    return None


def cache_set(key: str, value: Any, ttl: int = 300) -> None:
    """Store item in Redis or in-memory fallback with TTL in seconds."""
    r = get_redis()
    if r:
        try:
            payload = json.dumps(value, default=str)
            r.set(key, payload, ex=ttl)
            return
        except Exception as e:
            logger.warning(f"Redis set error for {key}: {e}")

    # In-memory fallback
    _in_memory_store[key] = (value, time.time() + ttl)


def cache_delete(key: str) -> None:
    """Delete a specific cache key."""
    r = get_redis()
    if r:
        try:
            r.delete(key)
        except Exception as e:
            logger.warning(f"Redis delete error for {key}: {e}")
    _in_memory_store.pop(key, None)


def cache_delete_pattern(pattern: str) -> None:
    """Delete all keys matching a prefix or pattern (e.g., 'dashboard:123:*')."""
    r = get_redis()
    if r:
        try:
            keys = r.keys(pattern)
            if keys:
                r.delete(*keys)
        except Exception as e:
            logger.warning(f"Redis delete pattern error for {pattern}: {e}")

    # In-memory pattern cleanup
    import fnmatch
    to_delete = [k for k in _in_memory_store.keys() if fnmatch.fnmatch(k, pattern)]
    for k in to_delete:
        _in_memory_store.pop(k, None)


# ── Token Blocklist (Revocation on Logout) ──
def blocklist_token(token: str, exp_seconds: int = 900) -> None:
    """Blocklist a revoked JWT token until its natural expiration."""
    key = f"blocklist:token:{token[-32:]}"  # use tail hash / slice for compact key
    cache_set(key, "revoked", ttl=max(60, exp_seconds))


def is_token_blocklisted(token: str) -> bool:
    """Check if token was revoked via logout."""
    key = f"blocklist:token:{token[-32:]}"
    val = cache_get(key)
    return val == "revoked"
