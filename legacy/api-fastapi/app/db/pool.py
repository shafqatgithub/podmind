"""Database connectivity: a single asyncpg pool for the process lifetime.

Why asyncpg (not an ORM):
* The schema is migration-first (supabase/migrations is the source of truth),
  so an ORM's metadata would be a second, drift-prone description of it.
* Repositories (app/repositories) own all SQL; models (app/models) own all
  shapes. asyncpg gives us speed and prepared statements without a mapping
  layer in between.

JSONB columns are encoded/decoded as Python dicts automatically via the
codec registered in ``_init_connection``.
"""

from __future__ import annotations

import json
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import asyncpg

from app.core.config import get_settings
from app.core.logging import get_logger

log = get_logger(__name__)

_pool: asyncpg.Pool | None = None


async def _init_connection(conn: asyncpg.Connection) -> None:
    """Per-connection setup: transparent JSONB <-> dict conversion."""
    await conn.set_type_codec(
        "jsonb", encoder=json.dumps, decoder=json.loads, schema="pg_catalog"
    )
    await conn.set_type_codec(
        "json", encoder=json.dumps, decoder=json.loads, schema="pg_catalog"
    )


async def create_pool() -> asyncpg.Pool:
    """Called once from the app lifespan on startup."""
    global _pool
    settings = get_settings()
    _pool = await asyncpg.create_pool(
        dsn=str(settings.database_url),
        min_size=settings.db_pool_min_size,
        max_size=settings.db_pool_max_size,
        init=_init_connection,
        command_timeout=60,
        # Supabase transaction pooler (pgbouncer) does not support prepared
        # statements across transactions; disabling the cache keeps us
        # compatible with both session and transaction pooling modes.
        statement_cache_size=0,
    )
    async with _pool.acquire() as conn:
        version = await conn.fetchval("select version()")
    log.info("db.pool_created", postgres=version.split(" on ")[0])
    return _pool


async def close_pool() -> None:
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None
        log.info("db.pool_closed")


def get_pool() -> asyncpg.Pool:
    if _pool is None:  # programming error: lifespan not run
        raise RuntimeError("Database pool not initialized — app lifespan did not run")
    return _pool


@asynccontextmanager
async def transaction() -> AsyncIterator[asyncpg.Connection]:
    """Acquire a connection wrapped in a transaction.

    Usage::

        async with transaction() as conn:
            await repo_a.create(conn, ...)
            await repo_b.log(conn, ...)
    """
    pool = get_pool()
    async with pool.acquire() as conn:
        async with conn.transaction():
            yield conn
