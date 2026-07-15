"""AI Provider Manager — the single gateway for every model call.

Responsibilities:
1. **Resolution** — decide which provider+model+key serves a request:
   per-request override > user's saved config > user's default provider,
   BYOK key (decrypted) > platform key from settings.
2. **Uniform interface** — ``complete_text`` / ``complete_json`` regardless
   of provider; JSON responses are extracted and returned as dicts.
3. **Isolation** — features (research, topics, chat) never import a concrete
   adapter; switching providers is a data change, not a code change.

Credit spend/refund intentionally does NOT live here: services own the
transaction boundary (spend -> call manager -> persist, refund on failure)
so this class stays side-effect free and trivially testable.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any
from uuid import UUID

import asyncpg
import httpx

from app.core.config import Settings, get_settings
from app.core.crypto import decrypt_secret
from app.core.exceptions import ProviderError
from app.core.logging import get_logger
from app.models.enums import AIProvider
from app.services.ai.base import AIMessage, BaseAIProvider, ProviderResponse
from app.services.ai.json_utils import extract_json
from app.services.ai.providers.claude import ClaudeProvider
from app.services.ai.providers.gemini import GeminiProvider
from app.services.ai.providers.openai import OpenAIProvider

log = get_logger(__name__)

PROVIDER_REGISTRY: dict[AIProvider, type[BaseAIProvider]] = {
    AIProvider.OPENAI: OpenAIProvider,
    AIProvider.GEMINI: GeminiProvider,
    AIProvider.CLAUDE: ClaudeProvider,
}


@dataclass(frozen=True)
class ResolvedProvider:
    """Outcome of resolution — everything needed to construct an adapter."""

    provider: AIProvider
    model: str
    api_key: str
    is_byok: bool


class AIProviderManager:
    def __init__(
        self,
        settings: Settings | None = None,
        *,
        transport: httpx.AsyncBaseTransport | None = None,
    ) -> None:
        self._settings = settings or get_settings()
        self._transport = transport  # injected by tests only

    # ------------------------------------------------------------ resolution
    async def resolve(
        self,
        conn: asyncpg.Connection,
        user_id: UUID,
        override: AIProvider | None = None,
    ) -> ResolvedProvider:
        """Pick provider/model/key for this user & request."""
        if override is not None:
            provider = override
        else:
            row = await conn.fetchrow(
                "select default_provider from public.profiles where id = $1", user_id
            )
            if row is None:
                raise ProviderError("none", "Profile not found for provider resolution")
            provider = AIProvider(row["default_provider"])

        config = await conn.fetchrow(
            """
            select model, api_key_ciphertext
              from public.ai_provider_configs
             where user_id = $1 and provider = $2 and is_enabled = true
            """,
            user_id,
            provider.value,
        )

        model = config["model"] if config else PROVIDER_REGISTRY[provider].default_model

        if config and config["api_key_ciphertext"]:
            return ResolvedProvider(
                provider=provider,
                model=model,
                api_key=decrypt_secret(config["api_key_ciphertext"]),
                is_byok=True,
            )

        platform_key = self._platform_key(provider)
        if not platform_key:
            raise ProviderError(
                provider.value,
                f"{provider.value} is not configured — add your own API key in "
                "Settings or choose another provider",
            )
        return ResolvedProvider(
            provider=provider, model=model, api_key=platform_key, is_byok=False
        )

    def _platform_key(self, provider: AIProvider) -> str | None:
        secret = {
            AIProvider.OPENAI: self._settings.openai_api_key,
            AIProvider.GEMINI: self._settings.gemini_api_key,
            AIProvider.CLAUDE: self._settings.anthropic_api_key,
        }[provider]
        return secret.get_secret_value() if secret else None

    def build_adapter(self, resolved: ResolvedProvider) -> BaseAIProvider:
        adapter_cls = PROVIDER_REGISTRY[resolved.provider]
        return adapter_cls(
            api_key=resolved.api_key, model=resolved.model, transport=self._transport
        )

    # ------------------------------------------------------------ completion
    async def complete_text(
        self,
        resolved: ResolvedProvider,
        messages: list[AIMessage],
        *,
        max_tokens: int = 4096,
        temperature: float = 0.7,
    ) -> ProviderResponse:
        adapter = self.build_adapter(resolved)
        response = await adapter.complete(
            messages, json_mode=False, max_tokens=max_tokens, temperature=temperature
        )
        self._log_usage(response, resolved)
        return response

    async def complete_json(
        self,
        resolved: ResolvedProvider,
        messages: list[AIMessage],
        *,
        max_tokens: int = 8192,
        temperature: float = 0.4,
    ) -> tuple[dict[str, Any], ProviderResponse]:
        adapter = self.build_adapter(resolved)
        response = await adapter.complete(
            messages, json_mode=True, max_tokens=max_tokens, temperature=temperature
        )
        self._log_usage(response, resolved)
        return extract_json(response.text, resolved.provider.value), response

    @staticmethod
    def _log_usage(response: ProviderResponse, resolved: ResolvedProvider) -> None:
        log.info(
            "ai.completion",
            provider=response.provider.value,
            model=response.model,
            byok=resolved.is_byok,
            input_tokens=response.input_tokens,
            output_tokens=response.output_tokens,
        )
