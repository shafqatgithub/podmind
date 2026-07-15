"""Research Library organization models — folders & tags (Feature 6)."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import Field

from app.models.common import DomainModel, RequestModel
from app.models.enums import ColorLabel


class Folder(DomainModel):
    id: UUID
    user_id: UUID
    name: str
    color: ColorLabel
    position: int = 0
    created_at: datetime
    updated_at: datetime


class FolderCreate(RequestModel):
    name: str = Field(min_length=1, max_length=80)
    color: ColorLabel = ColorLabel.SLATE
    position: int = Field(default=0, ge=0)


class FolderUpdate(RequestModel):
    name: str | None = Field(default=None, min_length=1, max_length=80)
    color: ColorLabel | None = None
    position: int | None = Field(default=None, ge=0)


class Tag(DomainModel):
    id: UUID
    user_id: UUID
    name: str
    color: ColorLabel
    created_at: datetime


class TagCreate(RequestModel):
    name: str = Field(min_length=1, max_length=40)
    color: ColorLabel = ColorLabel.BLUE


class TagUpdate(RequestModel):
    name: str | None = Field(default=None, min_length=1, max_length=40)
    color: ColorLabel | None = None
