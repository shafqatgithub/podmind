"""Anthropic Claude adapter — Messages API."""

from __future__ import annotations

from typing import Any, ClassVar

from app.models.enums import AIProvider
from app.services.ai.base import AIMessage, BaseAIProvider, ProviderResponse

API_URL = "https://api.anthropic.com/v1/messages"
API_VERSION = "2023-06-01"

_JSON_SUFFIX = (
    "\n\nRespond with a single valid JSON object only — no prose, no markdown fences."
)


class ClaudeProvider(BaseAIProvider):
    provider: ClassVar[AIProvider] = AIProvider.CLAUDE
    default_model: ClassVar[str] = "claude-sonnet-4-6"

    def _build_request(
        self,
        messages: list[AIMessage],
        *,
        json_mode: bool,
        max_tokens: int,
        temperature: float,
    ) -> tuple[str, dict[str, str], dict[str, Any]]:
        # Anthropic takes the system prompt as a top-level field; the turn
        # list contains only user/assistant messages.
        system = "\n\n".join(m.content for m in messages if m.role == "system")
        turns = [
            {"role": m.role, "content": m.content} for m in messages if m.role != "system"
        ]
        if json_mode:
            # No native JSON switch — enforce via instruction; extract_json()
            # in json_utils handles residual fencing defensively.
            system = (system + _JSON_SUFFIX) if system else _JSON_SUFFIX.strip()

        payload: dict[str, Any] = {
            "model": self.model,
            "max_tokens": max_tokens,
            "temperature": temperature,
            "messages": turns,
        }
        if system:
            payload["system"] = system

        headers = {
            "x-api-key": self._api_key,
            "anthropic-version": API_VERSION,
            "Content-Type": "application/json",
        }
        return API_URL, headers, payload

    def _parse_response(self, data: dict[str, Any]) -> ProviderResponse:
        usage = data.get("usage") or {}
        return ProviderResponse(
            text="".join(
                block.get("text", "") for block in data["content"] if block.get("type") == "text"
            ),
            input_tokens=int(usage.get("input_tokens", 0)),
            output_tokens=int(usage.get("output_tokens", 0)),
            provider=self.provider,
            model=data.get("model", self.model),
        )
