"""Credit pricing — the single source of truth for what actions cost.

Flat per-action pricing (not per-token) so users can predict spend. Values
are integers because the ledger is integer credits. Changing a price is a
one-line change here; the ledger records what was actually charged.
"""

from enum import Enum


class CreditAction(str, Enum):
    TOPIC_ANALYSIS = "topic_analysis"
    RESEARCH = "research"
    CHAT_MESSAGE = "chat_message"


CREDIT_COSTS: dict[CreditAction, int] = {
    CreditAction.TOPIC_ANALYSIS: 2,
    CreditAction.RESEARCH: 10,
    CreditAction.CHAT_MESSAGE: 1,
}


def cost_of(action: CreditAction) -> int:
    return CREDIT_COSTS[action]
