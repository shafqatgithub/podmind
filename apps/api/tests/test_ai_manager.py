"""AI Provider Manager test suite.

Uses httpx.MockTransport so every adapter's real request construction,
response parsing, retry, and error mapping runs — with zero network.
"""

from __future__ import annotations

import json

import httpx
import pytest

from app.core.crypto import decrypt_secret, encrypt_secret
from app.core.exceptions import ProviderError
from app.models.enums import AIProvider
from app.services.ai import (
    AIMessage,
    AIProviderManager,
    CreditAction,
    ResolvedProvider,
    cost_of,
    extract_json,
)
from app.services.ai.providers.claude import ClaudeProvider
from app.services.ai.providers.gemini import GeminiProvider
from app.services.ai.providers.openai import OpenAIProvider

MESSAGES = [
    AIMessage(role="system", content="You are a research assistant."),
    AIMessage(role="user", content="Summarize polyphasic sleep."),
]


def _transport(handler) -> httpx.MockTransport:
    return httpx.MockTransport(handler)


# ---------------------------------------------------------------------------
# Adapter request/response contracts
# ---------------------------------------------------------------------------
class TestOpenAIAdapter:
    @pytest.mark.asyncio
    async def test_request_shape_and_parse(self):
        captured = {}

        def handler(request: httpx.Request) -> httpx.Response:
            captured["headers"] = request.headers
            captured["body"] = json.loads(request.content)
            return httpx.Response(200, json={
                "model": "gpt-4o-mini",
                "choices": [{"message": {"content": "answer"}}],
                "usage": {"prompt_tokens": 11, "completion_tokens": 7},
            })

        provider = OpenAIProvider("sk-test", transport=_transport(handler))
        result = await provider.complete(MESSAGES, json_mode=True)

        assert captured["headers"]["authorization"] == "Bearer sk-test"
        assert captured["body"]["response_format"] == {"type": "json_object"}
        assert captured["body"]["messages"][0]["role"] == "system"
        assert (result.text, result.input_tokens, result.output_tokens) == ("answer", 11, 7)
        assert result.provider is AIProvider.OPENAI


class TestGeminiAdapter:
    @pytest.mark.asyncio
    async def test_system_split_role_mapping_and_key_in_header(self):
        captured = {}

        def handler(request: httpx.Request) -> httpx.Response:
            captured["url"] = str(request.url)
            captured["headers"] = request.headers
            captured["body"] = json.loads(request.content)
            return httpx.Response(200, json={
                "candidates": [{"content": {"parts": [{"text": "answer"}]}}],
                "usageMetadata": {"promptTokenCount": 9, "candidatesTokenCount": 4},
            })

        msgs = [*MESSAGES, AIMessage(role="assistant", content="Earlier reply")]
        provider = GeminiProvider("g-key", transport=_transport(handler))
        result = await provider.complete(msgs, json_mode=True)

        assert captured["headers"]["x-goog-api-key"] == "g-key"
        assert "key=" not in captured["url"], "API key must never appear in the URL"
        assert captured["body"]["systemInstruction"]["parts"][0]["text"].startswith("You are")
        roles = [c["role"] for c in captured["body"]["contents"]]
        assert roles == ["user", "model"]
        assert captured["body"]["generationConfig"]["responseMimeType"] == "application/json"
        assert result.output_tokens == 4


class TestClaudeAdapter:
    @pytest.mark.asyncio
    async def test_system_field_json_instruction_and_parse(self):
        captured = {}

        def handler(request: httpx.Request) -> httpx.Response:
            captured["headers"] = request.headers
            captured["body"] = json.loads(request.content)
            return httpx.Response(200, json={
                "model": "claude-sonnet-4-6",
                "content": [{"type": "text", "text": '{"summary": "ok"}'}],
                "usage": {"input_tokens": 20, "output_tokens": 6},
            })

        provider = ClaudeProvider("a-key", transport=_transport(handler))
        result = await provider.complete(MESSAGES, json_mode=True)

        assert captured["headers"]["x-api-key"] == "a-key"
        assert "anthropic-version" in captured["headers"]
        assert "valid JSON object" in captured["body"]["system"]
        assert all(t["role"] != "system" for t in captured["body"]["messages"])
        assert result.text == '{"summary": "ok"}'


# ---------------------------------------------------------------------------
# Retry & error mapping (base class behavior, one adapter suffices)
# ---------------------------------------------------------------------------
class TestRetryAndErrors:
    @pytest.mark.asyncio
    async def test_retries_on_429_then_succeeds(self, monkeypatch):
        import app.services.ai.base as base

        async def no_sleep(_):  # keep the test instant
            return None

        monkeypatch.setattr(base.asyncio, "sleep", no_sleep)

        calls = {"n": 0}

        def handler(request: httpx.Request) -> httpx.Response:
            calls["n"] += 1
            if calls["n"] < 3:
                return httpx.Response(429, json={"error": {"message": "rate limited"}})
            return httpx.Response(200, json={
                "choices": [{"message": {"content": "recovered"}}],
                "usage": {"prompt_tokens": 1, "completion_tokens": 1},
            })

        provider = OpenAIProvider("sk", transport=_transport(handler))
        result = await provider.complete(MESSAGES)
        assert calls["n"] == 3 and result.text == "recovered"

    @pytest.mark.asyncio
    async def test_auth_error_fails_immediately_without_retry(self):
        calls = {"n": 0}

        def handler(request: httpx.Request) -> httpx.Response:
            calls["n"] += 1
            return httpx.Response(401, json={"error": {"message": "bad key"}})

        provider = OpenAIProvider("sk", transport=_transport(handler))
        with pytest.raises(ProviderError) as exc:
            await provider.complete(MESSAGES)
        assert calls["n"] == 1
        assert "API key" in exc.value.message
        assert exc.value.status_code == 502

    @pytest.mark.asyncio
    async def test_exhausted_retries_raise_provider_error(self, monkeypatch):
        import app.services.ai.base as base

        async def no_sleep(_):
            return None

        monkeypatch.setattr(base.asyncio, "sleep", no_sleep)

        provider = OpenAIProvider(
            "sk", transport=_transport(lambda r: httpx.Response(503))
        )
        with pytest.raises(ProviderError):
            await provider.complete(MESSAGES)

    def test_empty_api_key_rejected_at_construction(self):
        with pytest.raises(ProviderError):
            OpenAIProvider("")


# ---------------------------------------------------------------------------
# JSON extraction
# ---------------------------------------------------------------------------
class TestExtractJson:
    def test_clean_json(self):
        assert extract_json('{"a": 1}', "claude") == {"a": 1}

    def test_fenced_json(self):
        assert extract_json('```json\n{"a": 1}\n```', "claude") == {"a": 1}

    def test_prose_wrapped_json(self):
        text = 'Here is the result:\n{"a": {"b": 2}}\nHope that helps!'
        assert extract_json(text, "gemini") == {"a": {"b": 2}}

    def test_garbage_raises(self):
        with pytest.raises(ProviderError):
            extract_json("no json here", "openai")

    def test_top_level_array_rejected(self):
        with pytest.raises(ProviderError):
            extract_json("[1, 2, 3]", "openai")


# ---------------------------------------------------------------------------
# BYOK crypto
# ---------------------------------------------------------------------------
class TestCrypto:
    def test_round_trip(self):
        secret = "sk-user-provided-key-123"
        ciphertext = encrypt_secret(secret)
        assert ciphertext != secret
        assert decrypt_secret(ciphertext) == secret

    def test_tampered_ciphertext_fails_loudly(self):
        from app.core.crypto import DecryptionError

        ciphertext = encrypt_secret("secret")
        with pytest.raises(DecryptionError):
            decrypt_secret(ciphertext[:-4] + "AAAA")


# ---------------------------------------------------------------------------
# Manager resolution (DB faked with a stub connection)
# ---------------------------------------------------------------------------
class _StubConn:
    """Mimics the two asyncpg queries resolve() performs."""

    def __init__(self, default_provider: str, config_row: dict | None):
        self._default = default_provider
        self._config = config_row

    async def fetchrow(self, query: str, *args):
        if "profiles" in query:
            return {"default_provider": self._default}
        return self._config


class TestManagerResolution:
    @pytest.mark.asyncio
    async def test_uses_profile_default_and_platform_key(self):
        from uuid import uuid4

        import os
        os.environ["ANTHROPIC_API_KEY"] = "platform-anthropic-key"
        from app.core.config import get_settings
        get_settings.cache_clear()

        manager = AIProviderManager()
        resolved = await manager.resolve(_StubConn("claude", None), uuid4())

        assert resolved.provider is AIProvider.CLAUDE
        assert resolved.model == ClaudeProvider.default_model
        assert resolved.api_key == "platform-anthropic-key"
        assert resolved.is_byok is False

    @pytest.mark.asyncio
    async def test_override_beats_default_and_byok_beats_platform(self):
        from uuid import uuid4

        ciphertext = encrypt_secret("user-own-gemini-key")
        conn = _StubConn(
            "claude",
            {"model": "gemini-2.5-pro", "api_key_ciphertext": ciphertext},
        )
        manager = AIProviderManager()
        resolved = await manager.resolve(conn, uuid4(), override=AIProvider.GEMINI)

        assert resolved.provider is AIProvider.GEMINI
        assert resolved.model == "gemini-2.5-pro"
        assert resolved.api_key == "user-own-gemini-key"
        assert resolved.is_byok is True

    @pytest.mark.asyncio
    async def test_unconfigured_provider_raises_actionable_error(self, monkeypatch):
        from uuid import uuid4

        monkeypatch.delenv("OPENAI_API_KEY", raising=False)
        from app.core.config import get_settings
        get_settings.cache_clear()

        manager = AIProviderManager()
        with pytest.raises(ProviderError) as exc:
            await manager.resolve(_StubConn("openai", None), uuid4())
        assert "add your own api key" in exc.value.message.lower()

    @pytest.mark.asyncio
    async def test_complete_json_end_to_end_via_manager(self):
        def handler(request: httpx.Request) -> httpx.Response:
            return httpx.Response(200, json={
                "content": [{"type": "text", "text": '```json\n{"topic_score": 88}\n```'}],
                "usage": {"input_tokens": 5, "output_tokens": 5},
            })

        manager = AIProviderManager(transport=_transport(handler))
        resolved = ResolvedProvider(
            provider=AIProvider.CLAUDE, model="claude-sonnet-4-6",
            api_key="k", is_byok=False,
        )
        data, response = await manager.complete_json(resolved, MESSAGES)
        assert data == {"topic_score": 88}
        assert response.input_tokens == 5


# ---------------------------------------------------------------------------
# Credit pricing
# ---------------------------------------------------------------------------
class TestCosts:
    def test_every_action_has_a_positive_integer_price(self):
        for action in CreditAction:
            assert isinstance(cost_of(action), int) and cost_of(action) > 0
