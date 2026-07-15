"""Models for user profiles and per-provider AI configuration."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import EmailStr, Field, HttpUrl

from app.models.common import DomainModel, RequestModel
from app.models.enums import AIProvider


class Profile(DomainModel):
    """Application user profile (1:1 with auth.users)."""

    id: UUID
    email: EmailStr
    full_name: str | None = None
    avatar_url: str | None = None
    ai_credits: int = Field(ge=0)
    default_provider: AIProvider
    onboarded_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


class ProfileUpdate(RequestModel):
    """PATCH /me — every field optional; only provided fields change."""

    full_name: str | None = Field(default=None, min_length=1, max_length=120)
    avatar_url: HttpUrl | None = None
    default_provider: AIProvider | None = None


class ProviderConfig(DomainModel):
    """Per-user provider settings. The BYOK key is NEVER serialized out:
    only its presence is exposed via ``has_api_key``."""

    id: UUID
    user_id: UUID
    provider: AIProvider
    model: str
    has_api_key: bool = False
    is_enabled: bool = True
    created_at: datetime
    updated_at: datetime


class ProviderConfigUpsert(RequestModel):
    """PUT /providers/{provider} — create or update a provider config.

    ``api_key`` is plaintext in transit (TLS) and encrypted with Fernet
    before it touches the database; sending ``api_key=""`` clears the key.
    """

    model: str = Field(min_length=1, max_length=120)
    api_key: str | None = Field(default=None, max_length=512)
    is_enabled: bool = True
