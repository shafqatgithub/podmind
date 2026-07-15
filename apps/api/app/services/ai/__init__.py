"""AI Provider Manager package — import surface for feature services."""

from app.services.ai.base import AIMessage, BaseAIProvider, ProviderResponse
from app.services.ai.costs import CREDIT_COSTS, CreditAction, cost_of
from app.services.ai.json_utils import extract_json
from app.services.ai.manager import PROVIDER_REGISTRY, AIProviderManager, ResolvedProvider

__all__ = [
    "AIMessage", "BaseAIProvider", "ProviderResponse",
    "CREDIT_COSTS", "CreditAction", "cost_of",
    "extract_json",
    "PROVIDER_REGISTRY", "AIProviderManager", "ResolvedProvider",
]
