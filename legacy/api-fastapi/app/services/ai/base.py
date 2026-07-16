"""Provider abstraction — the contract every AI adapter implements.

Design:
* One method (``complete``) covers everything MVP 1 needs; JSON mode is a
  flag, not a separate code path per feature.
* The base class owns the retrying HTTP client and error mapping, so each
  adapter is only "build payload" + "parse response" (~40 lines each).
* Adapters accept an injectable ``httpx.AsyncBaseTransport`` so the test
  suite exercises real request/response handling without the network.
"""

from __future__ import annotations

import asyncio
import random
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any, ClassVar, Literal

import httpx
from pydantic import BaseModel, Field

from app.core.exceptions import ProviderError
from app.core.logging import get_logger
from app.models.enums import AIProvider

log = get_logger(__name__)

RETRYABLE_STATUS = {408, 409, 429, 500, 502, 503, 504}
MAX_ATTEMPTS = 3


class AIMessage(BaseModel):
    """Provider-agnostic chat message."""

    role: Literal["system", "user", "assistant"]
    content: str = Field(min_length=1)


@dataclass(frozen=True)
class ProviderResponse:
    """Normalized completion result across all providers."""

    text: str
    input_tokens: int
    output_tokens: int
    provider: AIProvider
    model: str


class BaseAIProvider(ABC):
    """Base adapter: retry loop, timeout, uniform error mapping."""

    provider: ClassVar[AIProvider]
    default_model: ClassVar[str]

    def __init__(
        self,
        api_key: str,
        model: str | None = None,
        *,
        timeout_seconds: float = 120.0,
        transport: httpx.AsyncBaseTransport | None = None,
    ) -> None:
        if not api_key:
            raise ProviderError(self.provider.value, "No API key configured for provider")
        self._api_key = api_key
        self.model = model or self.default_model
        self._timeout = timeout_seconds
        self._transport = transport

    # ------------------------------------------------------------ interface
    @abstractmethod
    def _build_request(
        self,
        messages: list[AIMessage],
        *,
        json_mode: bool,
        max_tokens: int,
        temperature: float,
    ) -> tuple[str, dict[str, str], dict[str, Any]]:
        """Return (url, headers, json_payload) for this provider's API."""

    @abstractmethod
    def _parse_response(self, data: dict[str, Any]) -> ProviderResponse:
        """Extract text + token usage from the provider's response body."""

    # ------------------------------------------------------------ execution
    async def complete(
        self,
        messages: list[AIMessage],
        *,
        json_mode: bool = False,
        max_tokens: int = 4096,
        temperature: float = 0.7,
    ) -> ProviderResponse:
        url, headers, payload = self._build_request(
            messages, json_mode=json_mode, max_tokens=max_tokens, temperature=temperature
        )
        data = await self._post_with_retry(url, headers, payload)
        try:
            return self._parse_response(data)
        except (KeyError, IndexError, TypeError) as exc:
            log.error("ai.malformed_response", provider=self.provider.value, error=str(exc))
            raise ProviderError(
                self.provider.value, "Provider returned an unexpected response shape"
            ) from exc

    async def _post_with_retry(
        self, url: str, headers: dict[str, str], payload: dict[str, Any]
    ) -> dict[str, Any]:
        last_error: str = "unknown error"
        async with httpx.AsyncClient(
            timeout=self._timeout, transport=self._transport
        ) as client:
            for attempt in range(1, MAX_ATTEMPTS + 1):
                try:
                    response = await client.post(url, headers=headers, json=payload)
                except httpx.TimeoutException:
                    last_error = "request timed out"
                except httpx.HTTPError as exc:
                    last_error = f"network error: {exc.__class__.__name__}"
                else:
                    if response.status_code == 200:
                        return response.json()

                    last_error = f"HTTP {response.status_code}"
                    # Auth/config errors will not heal with retries.
                    if response.status_code in (400, 401, 403, 404, 422):
                        log.warning(
                            "ai.request_rejected",
                            provider=self.provider.value,
                            status=response.status_code,
                        )
                        raise ProviderError(
                            self.provider.value,
                            self._safe_error_message(response),
                        )
                    if response.status_code not in RETRYABLE_STATUS:
                        break

                if attempt < MAX_ATTEMPTS:
                    # Exponential backoff with jitter: ~1s, ~2s.
                    delay = (2 ** (attempt - 1)) + random.uniform(0, 0.5)
                    log.info(
                        "ai.retrying",
                        provider=self.provider.value,
                        attempt=attempt,
                        delay=round(delay, 2),
                        reason=last_error,
                    )
                    await asyncio.sleep(delay)

        log.error("ai.request_failed", provider=self.provider.value, reason=last_error)
        raise ProviderError(self.provider.value, f"Provider request failed ({last_error})")

    def _safe_error_message(self, response: httpx.Response) -> str:
        """Surface the provider's error text without leaking headers/keys."""
        try:
            body = response.json()
            message = (
                body.get("error", {}).get("message")
                if isinstance(body.get("error"), dict)
                else None
            )
        except ValueError:
            message = None
        if response.status_code in (401, 403):
            return "Provider rejected the API key — check your provider settings"
        return message or f"Provider returned HTTP {response.status_code}"
