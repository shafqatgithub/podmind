"""Shared model foundations: base classes, pagination, error envelope.

Every domain model inherits from one of the two bases:

* ``DomainModel``  — rows read from the database (``from_attributes`` so
  asyncpg Records / ORM objects map directly).
* ``RequestModel`` — inbound payloads. ``extra='forbid'`` rejects unknown
  fields loudly instead of silently dropping them, and
  ``str_strip_whitespace`` normalizes user input at the boundary.
"""

from __future__ import annotations

from datetime import datetime
from typing import Generic, TypeVar
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

T = TypeVar("T")


class DomainModel(BaseModel):
    """Base for entities read from the database."""

    model_config = ConfigDict(from_attributes=True, frozen=False)


class RequestModel(BaseModel):
    """Base for inbound request bodies — strict by default."""

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class OwnedEntity(DomainModel):
    """Common columns for every user-owned row."""

    id: UUID
    user_id: UUID
    created_at: datetime


class CursorPage(BaseModel, Generic[T]):
    """Cursor pagination envelope used by every list endpoint.

    ``next_cursor`` is an opaque base64 token (created_at + id) — clients
    must not parse it. ``None`` means the final page.
    """

    items: list[T]
    next_cursor: str | None = None
    has_more: bool = False


class APIError(BaseModel):
    """RFC-7807-inspired error body: {"error": {code, message, details}}."""

    code: str = Field(examples=["insufficient_credits"])
    message: str
    details: dict | None = None


class APIErrorEnvelope(BaseModel):
    error: APIError
