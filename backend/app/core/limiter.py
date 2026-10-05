"""
core/limiter.py — Shared API rate limiter using slowapi.
"""
from slowapi import Limiter
from slowapi.util import get_remote_address

# Default rate limit: 120 requests per minute per IP address
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["120/minute"],
    headers_enabled=False,
)
