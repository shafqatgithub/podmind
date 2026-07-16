"""Google Gemini adapter — generateContent API."""

from __future__ import annotations

from typing import Any, ClassVar

from app.models.enums import AIProvider
from app.services.ai.base import AIMessage, BaseAIProvider, ProviderResponse

API_BASE = "https://generativelanguage.googleapis.com/v1beta/models"


class GeminiProvider(BaseAIProvider):
    provider: ClassVar[AIProvider] = AIProvider.GEMINI
    default_model: ClassVar[str] = "gemini-2.5-flash"

    def _build_request(
        self,
        messages: list[AIMessage],
        *,
        json_mode: bool,
        max_tokens: int,
        temperature: float,
    ) -> tuple[str, dict[str, str], dict[str, Any]]:
        # Gemini separates the system instruction from the turn list and
        # names the assistant role "model".
        system_parts = [m.content for m in messages if m.role == "system"]
        contents = [
            {
                "role": "model" if m.role == "assistant" else "user",
                "parts": [{"text": m.content}],
            }
            for m in messages
            if m.role != "system"
        ]

        payload: dict[str, Any] = {
            "contents": contents,
            "generationConfig": {
                "temperature": temperature,
                "maxOutputTokens": max_tokens,
            },
        }
        if system_parts:
            payload["systemInstruction"] = {"parts": [{"text": "\n\n".join(system_parts)}]}
        if json_mode:
            payload["generationConfig"]["responseMimeType"] = "application/json"

        url = f"{API_BASE}/{self.model}:generateContent"
        headers = {
            "x-goog-api-key": self._api_key,   # header, never query string: keys must not land in logs
            "Content-Type": "application/json",
        }
        return url, headers, payload

    def _parse_response(self, data: dict[str, Any]) -> ProviderResponse:
        parts = data["candidates"][0]["content"]["parts"]
        usage = data.get("usageMetadata") or {}
        return ProviderResponse(
            text="".join(p.get("text", "") for p in parts),
            input_tokens=int(usage.get("promptTokenCount", 0)),
            output_tokens=int(usage.get("candidatesTokenCount", 0)),
            provider=self.provider,
            model=data.get("modelVersion", self.model),
        )
