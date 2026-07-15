"""OpenAI adapter — Chat Completions API."""

from __future__ import annotations

from typing import Any, ClassVar

from app.models.enums import AIProvider
from app.services.ai.base import AIMessage, BaseAIProvider, ProviderResponse

API_URL = "https://api.openai.com/v1/chat/completions"


class OpenAIProvider(BaseAIProvider):
    provider: ClassVar[AIProvider] = AIProvider.OPENAI
    default_model: ClassVar[str] = "gpt-4o-mini"

    def _build_request(
        self,
        messages: list[AIMessage],
        *,
        json_mode: bool,
        max_tokens: int,
        temperature: float,
    ) -> tuple[str, dict[str, str], dict[str, Any]]:
        payload: dict[str, Any] = {
            "model": self.model,
            "messages": [m.model_dump() for m in messages],
            "max_tokens": max_tokens,
            "temperature": temperature,
        }
        if json_mode:
            # Native JSON mode; the prompt must still mention JSON (OpenAI
            # requirement) — our prompt builders always do.
            payload["response_format"] = {"type": "json_object"}

        headers = {
            "Authorization": f"Bearer {self._api_key}",
            "Content-Type": "application/json",
        }
        return API_URL, headers, payload

    def _parse_response(self, data: dict[str, Any]) -> ProviderResponse:
        usage = data.get("usage") or {}
        return ProviderResponse(
            text=data["choices"][0]["message"]["content"],
            input_tokens=int(usage.get("prompt_tokens", 0)),
            output_tokens=int(usage.get("completion_tokens", 0)),
            provider=self.provider,
            model=data.get("model", self.model),
        )
