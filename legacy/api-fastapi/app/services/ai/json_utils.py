"""Defensive JSON extraction from LLM output.

Even with JSON modes enabled, models occasionally wrap output in markdown
fences or add a leading sentence. This module recovers the object or fails
with a ProviderError (which the calling service converts into a refund).
"""

from __future__ import annotations

import json
import re
from typing import Any

from app.core.exceptions import ProviderError

_FENCE_RE = re.compile(r"^```(?:json)?\s*|\s*```$", re.MULTILINE)


def extract_json(text: str, provider: str) -> dict[str, Any]:
    """Parse a JSON object out of model output.

    Strategy: try verbatim -> strip fences -> outermost {...} slice.
    Raises ProviderError if no valid object can be recovered.
    """
    candidates = [text.strip()]

    stripped = _FENCE_RE.sub("", text).strip()
    if stripped != candidates[0]:
        candidates.append(stripped)

    start, end = text.find("{"), text.rfind("}")
    if start != -1 and end > start:
        candidates.append(text[start : end + 1])

    for candidate in candidates:
        try:
            parsed = json.loads(candidate)
        except json.JSONDecodeError:
            continue
        if isinstance(parsed, dict):
            return parsed

    raise ProviderError(provider, "Model did not return valid JSON")
