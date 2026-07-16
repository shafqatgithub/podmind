"""AI Topic Finder models — Feature 4.

Scores are 0–100 smallints in the database; the same bounds are enforced
here so out-of-range provider output is rejected before persistence.
"""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models.common import DomainModel, RequestModel
from app.models.enums import AIProvider

Score = Field(ge=0, le=100)


class RelatedTopic(BaseModel):
    model_config = ConfigDict(extra="ignore", str_strip_whitespace=True)

    topic: str = Field(min_length=1)
    reason: str = Field(min_length=1)


class TrendingTopic(BaseModel):
    model_config = ConfigDict(extra="ignore", str_strip_whitespace=True)

    topic: str = Field(min_length=1)
    momentum: str = Field(min_length=1, description="Why it's trending right now")


class TopicScores(BaseModel):
    """The six-score block — reused by provider adapters and responses."""

    model_config = ConfigDict(extra="ignore")

    topic_score: int = Score
    virality_score: int = Score
    competition_score: int = Score
    evergreen_score: int = Score
    difficulty_score: int = Score
    audience_size: int = Field(ge=0, description="Estimated reachable audience")


class TopicAnalysis(DomainModel):
    id: UUID
    user_id: UUID
    query: str
    topic: str
    topic_score: int = Score
    virality_score: int = Score
    competition_score: int = Score
    evergreen_score: int = Score
    difficulty_score: int = Score
    audience_size: int = Field(ge=0)
    related_topics: list[RelatedTopic] = Field(default_factory=list)
    trending_topics: list[TrendingTopic] = Field(default_factory=list)
    provider: AIProvider
    model: str
    credits_spent: int = Field(ge=0, default=0)
    created_at: datetime


class TopicSearchRequest(RequestModel):
    """POST /topics/analyze"""

    query: str = Field(min_length=1, max_length=300)
    provider: AIProvider | None = None
    # Cache window: a matching analysis newer than this is returned for free.
    max_age_hours: int = Field(default=24, ge=0, le=24 * 30)
