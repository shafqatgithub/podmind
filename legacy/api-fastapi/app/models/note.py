"""Smart Notes models — Feature 8 (highlight, bookmark, note, comment)."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.common import DomainModel, RequestModel
from app.models.enums import ColorLabel, NoteType


class NoteAnchor(BaseModel):
    """Pins a note to a location inside research content.

    ``section`` is a ResearchContent field name ('key_points', 'timeline'…),
    ``index`` the list position within it, ``start``/``end`` character
    offsets inside that element, ``quote`` the anchored text (used to
    re-locate the anchor if content is ever re-generated).
    """

    model_config = ConfigDict(extra="forbid")

    section: str = Field(min_length=1, max_length=40)
    index: int = Field(default=0, ge=0)
    start: int | None = Field(default=None, ge=0)
    end: int | None = Field(default=None, ge=0)
    quote: str | None = Field(default=None, max_length=2000)

    @model_validator(mode="after")
    def _range_is_ordered(self) -> "NoteAnchor":
        if self.start is not None and self.end is not None and self.end < self.start:
            raise ValueError("anchor end must be >= start")
        return self


class Note(DomainModel):
    id: UUID
    user_id: UUID
    research_item_id: UUID
    type: NoteType
    body: str | None = None
    color: ColorLabel
    anchor: NoteAnchor | None = None
    created_at: datetime
    updated_at: datetime


class NoteCreate(RequestModel):
    type: NoteType
    body: str | None = Field(default=None, max_length=8000)
    color: ColorLabel = ColorLabel.AMBER
    anchor: NoteAnchor | None = None

    @model_validator(mode="after")
    def _body_required_for_text_types(self) -> "NoteCreate":
        # Mirrors the DB CHECK: notes/comments need a body; highlights and
        # bookmarks may be bare (their meaning is the anchor itself).
        if self.type in (NoteType.NOTE, NoteType.COMMENT) and not self.body:
            raise ValueError(f"body is required for type '{self.type}'")
        return self


class NoteUpdate(RequestModel):
    body: str | None = Field(default=None, max_length=8000)
    color: ColorLabel | None = None
    anchor: NoteAnchor | None = None
