"""
app/main.py — FastAPI application entry point.

Startup:
- Initializes database schema (Supabase / PostgreSQL / SQLite)
- Registers all routers under /api/v1/
- Configures CORS for frontend dev server
"""
import time
import logging
from datetime import datetime
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from contextlib import asynccontextmanager

from .core.config import settings
from .core.database import init_db
from . import models  # Ensures all ORM models & relationship mappers are registered
from .routes import transactions
from .routes import scan
from .routes import profile
from .routes import auth
from .routes import dashboard
from .routes import items
from .routes import locations
from .routes import shopping_lists
from .routes import intelligence
from .routes import gamification
from .routes import stats
from .routes import ws
from .routes import global_items
from .core.global_item_db import init_global_item_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize main and global item database schemas
    init_db()
    init_global_item_db()
    from .core.database import SessionLocal
    from .core.seed_lexicon import seed_lexicon_if_empty
    db = SessionLocal()
    try:
        seed_lexicon_if_empty(db)
        _backfill_missing_tags(db)
    except Exception as e:
        logging.getLogger("vaniq.main").warning(f"Could not auto-seed: {e}")
    finally:
        db.close()

    # Log credentials readiness for developer visibility
    gid = settings.effective_google_client_id
    if gid and gid.strip():
        masked_gid = gid[:12] + "..." + gid[-18:] if len(gid) > 30 else gid
        logging.getLogger("vaniq.auth").info(f"Google OAuth: Ready ({masked_gid})")
    else:
        logging.getLogger("vaniq.auth").warning("Google OAuth: Not configured (missing VITE_GOOGLE_CLIENT_ID in .env)")
    yield


def _backfill_missing_tags(db):
    """Backfills missing tags for any existing registered users."""
    from .models.user import User
    from .core.security import generate_user_tag

    # Backfill missing tags for any existing users
    no_tag_users = db.query(User).filter(User.tag.is_(None)).all()
    for u in no_tag_users:
        while True:
            t = generate_user_tag()
            if not db.query(User).filter(User.tag == t).first():
                u.tag = t
                break
    if no_tag_users:
        db.commit()



from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from .core.limiter import limiter

app = FastAPI(
    title=settings.APP_NAME,
    description="Vaniq — Hyper-fast financial intelligence. Track your bazaar spending.",
    version="2.0.0",
    lifespan=lifespan,
)

# Rate Limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Lightweight processing duration header
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.perf_counter()
    response = await call_next(request)
    duration_ms = (time.perf_counter() - start_time) * 1000.0
    response.headers["X-Process-Time-Ms"] = f"{duration_ms:.2f}"
    return response

# GZip compression for responses > 1KB (reduces payload transmission latency)
app.add_middleware(GZipMiddleware, minimum_size=1000)

# CORS — allow frontend dev servers and Vercel deployments
allowed_origins = [
    origin.strip() for origin in (settings.FRONTEND_URL or "").split(",") if origin.strip()
] + ["http://localhost:5173", "http://localhost:5174", "http://localhost:3000"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(set(allowed_origins)),
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

PREFIX = "/api/v1"

app.include_router(auth.router,            prefix=PREFIX)
app.include_router(scan.router,            prefix=PREFIX)
app.include_router(items.router,           prefix=PREFIX)
app.include_router(transactions.router,    prefix=PREFIX)
app.include_router(locations.router,       prefix=PREFIX)
app.include_router(dashboard.router,       prefix=PREFIX)
app.include_router(profile.router,         prefix=PREFIX)
app.include_router(shopping_lists.router,  prefix=PREFIX)
app.include_router(intelligence.router,    prefix=PREFIX)
app.include_router(gamification.router,    prefix=PREFIX)
app.include_router(global_items.router,     prefix=PREFIX)
app.include_router(stats.router,           prefix=PREFIX)
app.include_router(ws.router,              prefix=PREFIX)




@app.get("/")
def root():
    return {"message": f"{settings.APP_NAME} API is running", "docs": "/docs"}


@app.get("/health")
@app.get("/api/v1/health")
def health():
    return {"status": "ok"}
