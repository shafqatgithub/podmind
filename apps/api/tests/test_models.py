"""Model-layer test suite.

Covers the four contracts the models own:
1. Python enums == PostgreSQL enums (parsed from migration 0001) — exact parity.
2. ResearchContent accepts valid provider output and rejects malformed shapes.
3. Note validation mirrors DB CHECK constraints.
4. Cursor pagination tokens round-trip and reject tampering.
Plus a smoke test that the FastAPI app factory builds with all routes.
"""

from __future__ import annotations

import re
from datetime import UTC, datetime
from pathlib import Path
from uuid import uuid4

import pytest
from pydantic import ValidationError

from app.core.exceptions import ValidationFailedError
from app.models import (
    AIProvider,
    ChatRole,
    ColorLabel,
    CreditTransactionType,
    NoteCreate,
    NoteType,
    ProjectCreate,
    ProjectStatus,
    ResearchContent,
    ResearchStatus,
    TopicScores,
)
from app.repositories.base import decode_cursor, encode_cursor

MIGRATION_0001 = (
    Path(__file__).resolve().parents[3]
    / "supabase/migrations/20260714000001_extensions_and_types.sql"
)

PY_ENUMS = {
    "project_status": ProjectStatus,
    "research_status": ResearchStatus,
    "ai_provider": AIProvider,
    "note_type": NoteType,
    "color_label": ColorLabel,
    "credit_transaction_type": CreditTransactionType,
    "chat_role": ChatRole,
}


def _sql_enums() -> dict[str, set[str]]:
    sql = MIGRATION_0001.read_text()
    pattern = re.compile(
        r"create type public\.(\w+) as enum\s*\((.*?)\);", re.DOTALL | re.IGNORECASE
    )
    return {
        name: {v.strip().strip("'") for v in body.split(",")}
        for name, body in pattern.findall(sql)
    }


class TestEnumParity:
    def test_every_db_enum_has_a_python_twin_with_identical_values(self):
        sql_enums = _sql_enums()
        assert sql_enums, "migration 0001 not found or contains no enums"
        assert set(sql_enums) == set(PY_ENUMS), "enum sets diverged between SQL and Python"
        for name, sql_values in sql_enums.items():
            py_values = {m.value for m in PY_ENUMS[name]}
            assert py_values == sql_values, f"values diverged for enum '{name}'"


class TestResearchContent:
    VALID = {
        "summary": "A grounded look at polyphasic sleep research.",
        "key_points": ["REM debt accumulates under most schedules"],
        "statistics": [
            {"claim": "Adults sleeping under 6h", "value": "~35%", "source": "CDC"}
        ],
        "facts": ["Sleep pressure is driven by adenosine buildup"],
        "pros": ["More waking hours"],
        "cons": ["Cognitive impairment risk"],
        "timeline": [{"date": "1943", "event": "First fragmented-sleep experiments"}],
        "latest_news": [
            {"headline": "New meta-analysis published", "summary": "Reviews 40 studies"}
        ],
        "common_myths": [
            {"myth": "Everyone can adapt", "reality": "Adaptation evidence is weak"}
        ],
        "expert_opinions": [
            {"expert": "Dr. A. Khan", "credential": "Sleep researcher", "opinion": "Risks outweigh benefits"}
        ],
        "discussion_ideas": ["Interview a shift worker"],
        "references": [{"title": "Sleep and Human Performance", "publisher": "OUP"}],
        "audience_questions": ["Is napping enough?"],
        "podcast_angles": [{"title": "The 4-Hour Night", "hook": "What if sleep were optional?"}],
    }

    def test_valid_provider_output_parses(self):
        content = ResearchContent.model_validate(self.VALID)
        assert content.statistics[0].source == "CDC"
        assert len(content.podcast_angles) == 1

    def test_extra_provider_keys_are_ignored_not_fatal(self):
        payload = {**self.VALID, "hallucinated_section": ["x"]}
        content = ResearchContent.model_validate(payload)
        assert not hasattr(content, "hallucinated_section")

    def test_missing_summary_is_rejected(self):
        payload = {k: v for k, v in self.VALID.items() if k != "summary"}
        with pytest.raises(ValidationError):
            ResearchContent.model_validate(payload)

    def test_malformed_section_shape_is_rejected(self):
        payload = {**self.VALID, "timeline": [{"date": "1943"}]}  # missing event
        with pytest.raises(ValidationError):
            ResearchContent.model_validate(payload)

    def test_empty_optional_sections_are_fine(self):
        content = ResearchContent.model_validate({"summary": "Niche topic."})
        assert content.timeline == [] and content.references == []


class TestTopicScores:
    def test_scores_outside_0_100_are_rejected(self):
        base = dict(
            topic_score=50, virality_score=50, competition_score=50,
            evergreen_score=50, difficulty_score=50, audience_size=10_000,
        )
        assert TopicScores.model_validate(base).topic_score == 50
        with pytest.raises(ValidationError):
            TopicScores.model_validate({**base, "virality_score": 101})
        with pytest.raises(ValidationError):
            TopicScores.model_validate({**base, "audience_size": -1})


class TestNoteRules:
    def test_comment_without_body_rejected_mirroring_db_check(self):
        with pytest.raises(ValidationError):
            NoteCreate(type=NoteType.COMMENT)

    def test_bare_highlight_is_allowed(self):
        note = NoteCreate(
            type=NoteType.HIGHLIGHT,
            anchor={"section": "key_points", "index": 0, "start": 0, "end": 12, "quote": "REM debt"},
        )
        assert note.body is None and note.anchor.section == "key_points"

    def test_inverted_anchor_range_rejected(self):
        with pytest.raises(ValidationError):
            NoteCreate(
                type=NoteType.NOTE, body="x",
                anchor={"section": "summary", "start": 10, "end": 3},
            )


class TestRequestStrictness:
    def test_unknown_fields_are_rejected_loudly(self):
        with pytest.raises(ValidationError):
            ProjectCreate(name="My Show", is_admin=True)  # type: ignore[call-arg]

    def test_whitespace_is_normalized(self):
        assert ProjectCreate(name="  My Show  ").name == "My Show"


class TestCursor:
    def test_round_trip(self):
        now, rid = datetime.now(UTC), uuid4()
        at, got_id = decode_cursor(encode_cursor(now, rid))
        assert at == now and got_id == rid

    def test_tampered_cursor_raises_422_error(self):
        with pytest.raises(ValidationFailedError):
            decode_cursor("bm90LWEtY3Vyc29y")


class TestAppFactory:
    def test_app_builds_with_health_routes(self):
        from app.main import create_app

        app = create_app()
        paths = {r.path for r in app.routes}
        assert {"/health", "/health/ready"} <= paths
