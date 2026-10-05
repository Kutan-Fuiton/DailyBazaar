"""
core/database.py — SQLAlchemy engine and session management.

Supports:
1. Supabase PostgreSQL (Primary cloud database via SUPABASE_DB_URL or PostgreSQL env)
2. MySQL (Local/production MySQL database fallback)
3. SQLite (Development & offline fallback)

All models are registered under a unified metadata Base with user_id foreign key multitenancy.
"""
import os
import logging
from sqlalchemy import create_engine, text
from sqlalchemy.engine import URL
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from .config import settings

logger = logging.getLogger("vaniq.database")

# ── Shared Base for all models ──
Base = declarative_base()


def get_db_url() -> str:
    """Determine active database URL (Supabase PostgreSQL, MySQL, or SQLite fallback)."""
    # 1. Supabase PostgreSQL URI from settings/environment
    supabase_url = settings.SUPABASE_DB_URL or os.getenv("SUPABASE_DB_URL") or os.getenv("DATABASE_URL")
    if supabase_url:
        if supabase_url.startswith("postgres://"):
            supabase_url = supabase_url.replace("postgres://", "postgresql://", 1)
        try:
            import psycopg2
            # 8-second ping to verify remote cloud database availability over TLS
            test_conn = psycopg2.connect(supabase_url, connect_timeout=8)
            test_conn.close()
            logger.info("Using configured Supabase PostgreSQL database")
            return supabase_url
        except Exception as e:
            logger.warning(f"Supabase PostgreSQL unreachable ({e}). Falling back to local database chain...")

    # 2. Local MySQL database configuration
    if settings.MYSQL_HOST and settings.MYSQL_USER:
        from urllib.parse import quote_plus
        encoded_password = quote_plus(settings.MYSQL_PASSWORD or "")
        mysql_url = (
            f"mysql+pymysql://{settings.MYSQL_USER}:{encoded_password}"
            f"@{settings.MYSQL_HOST}:{settings.MYSQL_PORT}/{settings.MYSQL_MAIN_DB}"
        )
        try:
            import pymysql
            conn = pymysql.connect(
                host=settings.MYSQL_HOST,
                user=settings.MYSQL_USER,
                password=settings.MYSQL_PASSWORD,
                port=int(settings.MYSQL_PORT),
                connect_timeout=3,
            )
            cursor = conn.cursor()
            cursor.execute(f"CREATE DATABASE IF NOT EXISTS `{settings.MYSQL_MAIN_DB}`;")
            conn.close()
            logger.info(f"Using local MySQL database '{settings.MYSQL_MAIN_DB}' at {settings.MYSQL_HOST}:{settings.MYSQL_PORT}")
            return mysql_url
        except Exception as e:
            logger.warning(f"MySQL connection failed ({e}). Falling back to SQLite...")

    # 3. SQLite fallback for local offline development
    logger.info("Using SQLite fallback database (sqlite:///./vaniq.db)")
    return "sqlite:///./vaniq.db"


def create_db_engine():
    db_url = get_db_url()
    
    if db_url.startswith("sqlite"):
        return create_engine(db_url, connect_args={"check_same_thread": False})
    
    connect_args = {}
    if "postgresql" in db_url:
        connect_args["connect_timeout"] = 10

    return create_engine(
        db_url,
        connect_args=connect_args,
        pool_pre_ping=True,
        pool_recycle=1800,
        pool_size=10,
        max_overflow=20,
    )


engine = create_db_engine()
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def get_main_db():
    """FastAPI dependency — yields database session for the active engine."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_user_db(current_user=None):
    """FastAPI dependency wrapper for backward compatibility."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Initialize all tables in the unified database schema and ensure columns exist."""
    from .. import models  # noqa - registers all ORM models
    from sqlalchemy import inspect
    Base.metadata.create_all(bind=engine)
    try:
        inspector = inspect(engine)
        existing_tables = set(inspector.get_table_names())
        with engine.connect() as conn:
            for table_name, table in Base.metadata.tables.items():
                if table_name in existing_tables:
                    db_cols = {col["name"] for col in inspector.get_columns(table_name)}
                    q = "`" if engine.dialect.name == "mysql" else '"'
                    for col in table.columns:
                        if col.name not in db_cols:
                            col_type = col.type.compile(engine.dialect)
                            alter_stmt = f"ALTER TABLE {q}{table_name}{q} ADD COLUMN {q}{col.name}{q} {col_type};"
                            try:
                                conn.execute(text(alter_stmt))
                                conn.commit()
                                logger.info(f"Added missing column '{col.name}' to '{table_name}'")
                            except Exception as e:
                                logger.warning(f"Could not auto-add column '{col.name}' to '{table_name}': {e}")
    except Exception as e:
        logger.debug(f"Auto-migration check notice: {e}")
    logger.info("Database schema initialized successfully.")
