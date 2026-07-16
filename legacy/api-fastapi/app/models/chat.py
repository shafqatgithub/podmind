"""AI Research Chat models — Feature 7."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import Field

from app.models.common import DomainModel, RequestModel
from app.models.enums import AIProvider, ChatRole


class ChatSession(DomainModel):
    id: UUID
    user_id: UUID
    project_id: UUID
    title: str
    created_at: datetime
    updated_at: datetime


class ChatSessionCreate(RequestModel):
    """POST /projects/{id}/chats — title defaults server-side and is later
    auto-renamed from the first user message."""

    title: str = Field(default="New chat", min_length=1, max_length=120)


class ChatMessage(DomainModel):
    id: UUID
    session_id: UUID
    user_id: UUID
    role: ChatRole
    content: str
    provider: AIProvider | None = None
    model: str | None = None
    credits_spent: int = Field(ge=0, default=0)
    created_at: datetime


class ChatMessageCreate(RequestModel):
    """POST /chats/{id}/messages — the user turn. The assistant turn is
    generated with full project context and returned in the same response."""

    content: str = Field(min_length=1, max_length=32_000)
    provider: AIProvider | None = None


class ChatTurn(DomainModel):
    """Response envelope: the persisted user message + assistant reply."""

    user_message: ChatMessage
    assistant_message: ChatMessage
    credits_remaining: int = Field(ge=0)
