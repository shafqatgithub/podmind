"""Enum types mirroring the PostgreSQL enums (migration 0001) one-to-one.

These are the single source of truth on the Python side. If a database enum
gains a value, add it here in the same change set — the round-trip tests in
tests/test_models.py compare both sides.
"""

from enum import StrEnum


class ProjectStatus(StrEnum):
    ACTIVE = "active"
    ARCHIVED = "archived"


class ResearchStatus(StrEnum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class AIProvider(StrEnum):
    OPENAI = "openai"
    GEMINI = "gemini"
    CLAUDE = "claude"


class NoteType(StrEnum):
    HIGHLIGHT = "highlight"
    BOOKMARK = "bookmark"
    NOTE = "note"
    COMMENT = "comment"


class ColorLabel(StrEnum):
    SLATE = "slate"
    RED = "red"
    ORANGE = "orange"
    AMBER = "amber"
    GREEN = "green"
    TEAL = "teal"
    BLUE = "blue"
    VIOLET = "violet"
    PINK = "pink"


class CreditTransactionType(StrEnum):
    SIGNUP_GRANT = "signup_grant"
    PLAN_GRANT = "plan_grant"
    BONUS = "bonus"
    CONSUME = "consume"
    REFUND = "refund"
    ADJUSTMENT = "adjustment"


class ChatRole(StrEnum):
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"
