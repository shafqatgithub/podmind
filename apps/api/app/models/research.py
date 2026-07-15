"""Research Agent models — Feature 5 output schema + Feature 6 library item.

``ResearchContent`` is the versioned contract (content_version = 1) between
the AI Provider Manager and the rest of the system:

* Every provider adapter must return JSON that validates against it.
* The exporter (PDF/DOCX/MD) renders exclusively from it.
* The database stores it in ``research_items.content`` (JSONB).

Validation is deliberately tolerant of *empty* sections (a niche topic may
have no timeline) but strict about *shape* — malformed provider output fails
here, is refunded, and never reaches the database.
"""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models.common import DomainModel, RequestModel
from app.models.enums import AIProvider, ResearchStatus

CONTENT_VERSION = 1


class _Section(BaseModel):
    """Sections tolerate provider quirks (extra keys ignored, whitespace
    stripped) but never invalid types."""

    model_config = ConfigDict(extra="ignore", str_strip_whitespace=True)


class Statistic(_Section):
    claim: str = Field(min_length=1)
    value: str = Field(min_length=1)
    source: str | None = None


class TimelineEvent(_Section):
    date: str = Field(min_length=1, description="Human-readable date, e.g. '2019' or 'March 2024'")
    event: str = Field(min_length=1)


class NewsItem(_Section):
    headline: str = Field(min_length=1)
    summary: str = Field(min_length=1)
    source: str | None = None
    date: str | None = None


class Myth(_Section):
    myth: str = Field(min_length=1)
    reality: str = Field(min_length=1)


class ExpertOpinion(_Section):
    expert: str = Field(min_length=1)
    credential: str | None = None
    opinion: str = Field(min_length=1)


class Reference(_Section):
    title: str = Field(min_length=1)
    url: str | None = None
    publisher: str | None = None


class PodcastAngle(_Section):
    title: str = Field(min_length=1)
    hook: str = Field(min_length=1, description="One-sentence pitch for the angle")


class ResearchContent(_Section):
    """The full research document — all 14 sections of Feature 5."""

    summary: str = Field(min_length=1)
    key_points: list[str] = Field(default_factory=list)
    statistics: list[Statistic] = Field(default_factory=list)
    facts: list[str] = Field(default_factory=list)
    pros: list[str] = Field(default_factory=list)
    cons: list[str] = Field(default_factory=list)
    timeline: list[TimelineEvent] = Field(default_factory=list)
    latest_news: list[NewsItem] = Field(default_factory=list)
    common_myths: list[Myth] = Field(default_factory=list)
    expert_opinions: list[ExpertOpinion] = Field(default_factory=list)
    discussion_ideas: list[str] = Field(default_factory=list)
    references: list[Reference] = Field(default_factory=list)
    audience_questions: list[str] = Field(default_factory=list)
    podcast_angles: list[PodcastAngle] = Field(default_factory=list)


class ResearchItem(DomainModel):
    """A library row. ``content`` is None until status == completed."""

    id: UUID
    user_id: UUID
    project_id: UUID
    folder_id: UUID | None = None
    topic: str
    status: ResearchStatus
    provider: AIProvider | None = None
    model: str | None = None
    content: ResearchContent | None = None
    content_version: int = CONTENT_VERSION
    error_message: str | None = None
    is_favorite: bool = False
    is_archived: bool = False
    credits_spent: int = Field(ge=0, default=0)
    completed_at: datetime | None = None
    created_at: datetime
    updated_at: datetime
    tag_ids: list[UUID] = Field(default_factory=list)


class ResearchItemSummary(DomainModel):
    """Lightweight projection for library lists — no content payload."""

    id: UUID
    project_id: UUID
    folder_id: UUID | None = None
    topic: str
    status: ResearchStatus
    is_favorite: bool
    is_archived: bool
    created_at: datetime
    tag_ids: list[UUID] = Field(default_factory=list)


class ResearchCreate(RequestModel):
    """POST /projects/{id}/research — starts an async research job."""

    topic: str = Field(min_length=1, max_length=300)
    provider: AIProvider | None = Field(
        default=None, description="Overrides the user's default provider for this run"
    )


class ResearchUpdate(RequestModel):
    """PATCH — library organization actions (Feature 6)."""

    folder_id: UUID | None = None
    is_favorite: bool | None = None
    is_archived: bool | None = None
    tag_ids: list[UUID] | None = Field(default=None, max_length=20)


class ResearchListParams(RequestModel):
    """Query params for GET /research (library search & filters)."""

    search: str | None = Field(default=None, min_length=1, max_length=200)
    project_id: UUID | None = None
    folder_id: UUID | None = None
    tag_id: UUID | None = None
    status: ResearchStatus | None = None
    favorites_only: bool = False
    include_archived: bool = False
    cursor: str | None = None
    limit: int = Field(default=20, ge=1, le=100)
