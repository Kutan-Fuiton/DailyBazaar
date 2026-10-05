"""
app/main.py — FastAPI application entry point.

Startup:
- Initializes database schema (Supabase / PostgreSQL / SQLite)
- Registers all routers under /api/v1/
- Configures CORS for frontend dev server
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
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
from .routes import households
from .routes import gamification
from .routes import suggestions
from .routes import stats
from .routes import ws


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create all tables on startup if they don't exist
    init_db()
    # Seed lexicon database with bazaar items if empty
    from .core.database import SessionLocal
    from .core.seed_lexicon import seed_lexicon_if_empty
    db = SessionLocal()
    try:
        seed_lexicon_if_empty(db)
    except Exception as e:
        import logging
        logging.getLogger("vaniq.main").warning(f"Could not auto-seed lexicon: {e}")
    finally:
        db.close()
    yield


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

# CORS — allow frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:5173", "http://localhost:5174", "http://localhost:3000"],
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
app.include_router(households.router,      prefix=PREFIX)
app.include_router(gamification.router,    prefix=PREFIX)
app.include_router(suggestions.router,     prefix=PREFIX)
app.include_router(stats.router,           prefix=PREFIX)
app.include_router(ws.router,              prefix=PREFIX)




@app.get("/")
def root():
    return {"message": f"{settings.APP_NAME} API is running", "docs": "/docs"}


@app.get("/health")
@app.get("/api/v1/health")
def health():
    return {"status": "ok"}
