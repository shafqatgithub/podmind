"""Project models — Feature 3 (create, edit, delete, archive, search)."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import Field

from app.models.common import DomainModel, RequestModel
from app.models.enums import ColorLabel, ProjectStatus


class Project(DomainModel):
    id: UUID
    user_id: UUID
    name: str
    description: str | None = None
    status: ProjectStatus
    color: ColorLabel
    research_count: int = Field(ge=0)
    last_activity_at: datetime
    created_at: datetime
    updated_at: datetime
    # deleted_at is intentionally not exposed: soft-deleted rows never leave
    # the repository layer.


class ProjectCreate(RequestModel):
    name: str = Field(min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=2000)
    color: ColorLabel = ColorLabel.VIOLET


class ProjectUpdate(RequestModel):
    """PATCH — partial update. ``status`` transitions handle archive/unarchive."""

    name: str | None = Field(default=None, min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=2000)
    color: ColorLabel | None = None
    status: ProjectStatus | None = None


class ProjectListParams(RequestModel):
    """Query params for GET /projects."""

    search: str | None = Field(default=None, min_length=1, max_length=120)
    status: ProjectStatus | None = None
    cursor: str | None = None
    limit: int = Field(default=20, ge=1, le=100)
