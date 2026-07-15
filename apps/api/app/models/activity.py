"""Read models for the credit ledger and activity feed (dashboard widgets).

Both tables are append-only and written exclusively by the API/database
layer, so there are no Create/Update request models here by design.
"""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import Field

from app.models.common import DomainModel
from app.models.enums import CreditTransactionType


class CreditTransaction(DomainModel):
    id: UUID
    user_id: UUID
    type: CreditTransactionType
    amount: int
    description: str
    reference_id: UUID | None = None
    created_at: datetime


class CreditBalance(DomainModel):
    """GET /me/credits — balance + recent ledger for the dashboard card."""

    balance: int = Field(ge=0)
    recent_transactions: list[CreditTransaction] = Field(default_factory=list)


class ActivityEntry(DomainModel):
    id: UUID
    user_id: UUID
    action: str = Field(examples=["research.completed", "project.created"])
    entity_type: str
    entity_id: UUID | None = None
    metadata: dict = Field(default_factory=dict)
    created_at: datetime
