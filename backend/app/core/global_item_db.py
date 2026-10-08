"""
core/global_item_db.py — Dedicated engine and session for the Global Item Database.

This database is completely isolated and decoupled from user-specific tenant databases
or user session tables. It serves as the master, shared global catalog of item details
that any user or admin can query and contribute to.
"""
import os
import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from .config import settings

logger = logging.getLogger("vaniq.global_item_db")

GlobalItemBase = declarative_base()


def get_global_item_db_url() -> str:
    """Returns the dedicated database URL for the global item catalog."""
    return settings.GLOBAL_ITEMS_DB_URL or os.getenv("GLOBAL_ITEMS_DB_URL") or "sqlite:///./global_items.db"


global_item_engine = create_engine(
    get_global_item_db_url(),
    connect_args={"check_same_thread": False} if "sqlite" in get_global_item_db_url() else {},
    pool_pre_ping=True,
)

GlobalItemSessionLocal = sessionmaker(bind=global_item_engine, autoflush=False, autocommit=False)


def get_global_items_db():
    """FastAPI dependency — yields database session for the dedicated Global Item DB."""
    db = GlobalItemSessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_global_item_db():
    """Initializes tables for the dedicated Global Item Database."""
    from ..models.global_item import GlobalItem  # noqa: F401
    GlobalItemBase.metadata.create_all(bind=global_item_engine)
    logger.info("Dedicated Global Item Database initialized successfully.")
