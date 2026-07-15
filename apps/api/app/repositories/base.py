"""Repository pattern foundation.

Rules every repository follows (enforced by this base class's helpers):

1. **Ownership is non-optional.** Every read/write helper requires
   ``user_id`` and injects ``and user_id = $n`` — a repository physically
   cannot fetch another tenant's row. (The API runs as the service role,
   which bypasses RLS; this layer is the primary guard.)
2. **SQL lives here, shapes live in app/models.** Routes and services never
   see SQL or asyncpg Records.
3. **Cursor pagination** is (created_at, id) keyset-based — stable under
   concurrent inserts, no OFFSET scans.
"""

from __future__ import annotations

import base64
import binascii
import json
from datetime import datetime
from typing import Any, ClassVar, Generic, TypeVar
from uuid import UUID

import asyncpg
from pydantic import BaseModel

from app.core.exceptions import NotFoundError, ValidationFailedError
from app.db.pool import get_pool

M = TypeVar("M", bound=BaseModel)


def encode_cursor(created_at: datetime, row_id: UUID) -> str:
    raw = json.dumps({"t": created_at.isoformat(), "id": str(row_id)})
    return base64.urlsafe_b64encode(raw.encode()).decode()


def decode_cursor(cursor: str) -> tuple[datetime, UUID]:
    try:
        raw = json.loads(base64.urlsafe_b64decode(cursor.encode()))
        return datetime.fromisoformat(raw["t"]), UUID(raw["id"])
    except (ValueError, KeyError, binascii.Error) as exc:
        raise ValidationFailedError("Invalid pagination cursor") from exc


class BaseRepository(Generic[M]):
    """Shared CRUD plumbing. Subclasses set table/model and add queries."""

    table: ClassVar[str]
    model: type[M]
    # Columns selected by default; subclasses override to exclude heavy
    # payloads (e.g. research content) from list queries.
    columns: ClassVar[str] = "*"

    # ------------------------------------------------------------------ util
    @staticmethod
    async def _fetchrow(
        query: str, *args: Any, conn: asyncpg.Connection | None = None
    ) -> asyncpg.Record | None:
        if conn is not None:
            return await conn.fetchrow(query, *args)
        async with get_pool().acquire() as c:
            return await c.fetchrow(query, *args)

    @staticmethod
    async def _fetch(
        query: str, *args: Any, conn: asyncpg.Connection | None = None
    ) -> list[asyncpg.Record]:
        if conn is not None:
            return await conn.fetch(query, *args)
        async with get_pool().acquire() as c:
            return await c.fetch(query, *args)

    @classmethod
    def _to_model(cls, record: asyncpg.Record) -> M:
        return cls.model.model_validate(dict(record))

    # ------------------------------------------------------------- ownership
    @classmethod
    async def get_owned(
        cls, user_id: UUID, row_id: UUID, *, conn: asyncpg.Connection | None = None
    ) -> M:
        """Fetch a row the user owns, or raise 404 (never 403 — existence of
        other tenants' rows is not leaked)."""
        record = await cls._fetchrow(
            f"select {cls.columns} from {cls.table} where id = $1 and user_id = $2",
            row_id,
            user_id,
            conn=conn,
        )
        if record is None:
            raise NotFoundError(cls.table.rstrip("s"), row_id)
        return cls._to_model(record)

    @classmethod
    async def delete_owned(
        cls, user_id: UUID, row_id: UUID, *, conn: asyncpg.Connection | None = None
    ) -> None:
        record = await cls._fetchrow(
            f"delete from {cls.table} where id = $1 and user_id = $2 returning id",
            row_id,
            user_id,
            conn=conn,
        )
        if record is None:
            raise NotFoundError(cls.table.rstrip("s"), row_id)

    # ------------------------------------------------------------ pagination
    @classmethod
    async def paginate(
        cls,
        base_query: str,
        args: list[Any],
        *,
        cursor: str | None,
        limit: int,
        conn: asyncpg.Connection | None = None,
    ) -> tuple[list[M], str | None, bool]:
        """Keyset-paginate ``base_query`` (must NOT contain ORDER BY/LIMIT and
        must expose created_at + id). Returns (items, next_cursor, has_more).
        """
        n = len(args)
        if cursor:
            after_at, after_id = decode_cursor(cursor)
            base_query += f" and (created_at, id) < (${n + 1}, ${n + 2})"
            args = [*args, after_at, after_id]
            n += 2

        query = f"{base_query} order by created_at desc, id desc limit ${n + 1}"
        records = await cls._fetch(query, *args, limit + 1, conn=conn)

        has_more = len(records) > limit
        records = records[:limit]
        items = [cls._to_model(r) for r in records]
        next_cursor = (
            encode_cursor(records[-1]["created_at"], records[-1]["id"])
            if has_more and records
            else None
        )
        return items, next_cursor, has_more
