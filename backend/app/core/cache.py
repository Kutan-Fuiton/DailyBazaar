"""
core/cache.py — Hybrid caching layer:
- Distributed Redis Cache for JSON metrics (Dashboards, Stats, Market prices, Token blocklist)
- In-Memory TTLCache for live SQLAlchemy ORM objects (Catalog items, Lexicon entries)
"""
from typing import Any, Optional
import logging
from cachetools import TTLCache

from .redis_client import (
    cache_get,
    cache_set,
    cache_delete,
    cache_delete_pattern,
    is_redis_online,
)

logger = logging.getLogger("vaniq.cache")

# ── In-Memory Stores for SQLAlchemy ORM models (not JSON serializable) ──
_USER_CATALOG_CACHE: TTLCache = TTLCache(maxsize=1000, ttl=300)      # key: catalog:{user_id}
_LEXICON_CACHE: TTLCache      = TTLCache(maxsize=1000, ttl=900)      # key: lexicon:{name_or_alias}


# ── Catalog Cache (In-Memory for ORM objects) ──
def get_cached_catalog(user_id: int) -> Optional[Any]:
    return _USER_CATALOG_CACHE.get(f"catalog:{user_id}")


def set_cached_catalog(user_id: int, data: Any) -> None:
    _USER_CATALOG_CACHE[f"catalog:{user_id}"] = data


# ── Lexicon Cache (In-Memory for ORM objects) ──
def get_cached_lexicon(key: str) -> Optional[Any]:
    return _LEXICON_CACHE.get(key.lower().strip())


def set_cached_lexicon(key: str, data: Any) -> None:
    _LEXICON_CACHE[key.lower().strip()] = data


# ── Dashboard Cache (Distributed Redis) ──
def get_cached_dashboard(user_id: int) -> Optional[Any]:
    return cache_get(f"dashboard:{user_id}")


def set_cached_dashboard(user_id: int, data: Any) -> None:
    cache_set(f"dashboard:{user_id}", data, ttl=300)


# ── Market Price Cache (Distributed Redis) ──
def get_cached_market_price(location_id: Optional[int], item_name: str) -> Optional[float]:
    key = f"market:{location_id or 'all'}:{item_name.lower().strip()}"
    return cache_get(key)


def set_cached_market_price(location_id: Optional[int], item_name: str, price: float) -> None:
    key = f"market:{location_id or 'all'}:{item_name.lower().strip()}"
    cache_set(key, price, ttl=600)


# ── Stats Cache (Distributed Redis) ──
def get_cached_stats(user_id: int, range_days: int) -> Optional[Any]:
    return cache_get(f"stats:{user_id}:{range_days}")


def set_cached_stats(user_id: int, range_days: int, data: Any) -> None:
    cache_set(f"stats:{user_id}:{range_days}", data, ttl=600)


# ── Invalidation Hooks ──
def invalidate_user_cache(user_id: int) -> None:
    """Invalidate all caches associated with a specific user."""
    _USER_CATALOG_CACHE.pop(f"catalog:{user_id}", None)
    cache_delete(f"dashboard:{user_id}")
    cache_delete_pattern(f"stats:{user_id}:*")
    cache_delete_pattern(f"autocomplete:{user_id}:*")
    logger.debug(f"[Cache] Invalidated caches for user_id={user_id}")


def invalidate_market_cache() -> None:
    """Clear market price cache on new confirmed transactions."""
    cache_delete_pattern("market:*")
    logger.debug("[Cache] Market price cache cleared")


def invalidate_market_price_cache(location_id: Optional[int] = None, item_name: Optional[str] = None) -> None:
    if location_id is not None and item_name is not None:
        key = f"market:{location_id or 'all'}:{item_name.lower().strip()}"
        cache_delete(key)
    else:
        cache_delete_pattern("market:*")


def invalidate_lexicon_cache() -> None:
    """Clear shared lexicon corpus cache."""
    _LEXICON_CACHE.clear()
    cache_delete_pattern("lexicon:*")
    logger.debug("[Cache] Lexicon cache cleared")


# Aliases
invalidate_user_caches = invalidate_user_cache
