"""Application exception hierarchy → consistent HTTP error envelope.

Repositories and services raise these; a single FastAPI exception handler
(registered in ``app.main``) converts them to
``{"error": {"code", "message", "details"}}`` with the right status code.
Nothing else in the codebase constructs HTTP errors by hand.
"""

from __future__ import annotations

from typing import Any


class AppError(Exception):
    """Base application error. Subclasses set status/code."""

    status_code: int = 500
    code: str = "internal_error"

    def __init__(self, message: str = "Internal server error", details: dict[str, Any] | None = None):
        super().__init__(message)
        self.message = message
        self.details = details


class NotFoundError(AppError):
    status_code = 404
    code = "not_found"

    def __init__(self, resource: str, resource_id: Any = None):
        super().__init__(
            f"{resource} not found",
            details={"resource": resource, "id": str(resource_id) if resource_id else None},
        )


class ValidationFailedError(AppError):
    status_code = 422
    code = "validation_failed"


class UnauthorizedError(AppError):
    status_code = 401
    code = "unauthorized"

    def __init__(self, message: str = "Invalid or expired credentials"):
        super().__init__(message)


class ForbiddenError(AppError):
    status_code = 403
    code = "forbidden"

    def __init__(self, message: str = "You do not have access to this resource"):
        super().__init__(message)


class ConflictError(AppError):
    status_code = 409
    code = "conflict"


class InsufficientCreditsError(AppError):
    """Raised when consume_credits() reports INSUFFICIENT_CREDITS.
    402 so the frontend can render the upgrade/top-up flow."""

    status_code = 402
    code = "insufficient_credits"

    def __init__(self, required: int | None = None, balance: int | None = None):
        super().__init__(
            "Not enough AI credits for this action",
            details={"required": required, "balance": balance},
        )


class ProviderError(AppError):
    """An upstream AI provider failed after retries. The spend is refunded
    by the calling service before this propagates."""

    status_code = 502
    code = "ai_provider_error"

    def __init__(self, provider: str, message: str = "AI provider request failed"):
        super().__init__(message, details={"provider": provider})


class RateLimitedError(AppError):
    status_code = 429
    code = "rate_limited"

    def __init__(self, retry_after_seconds: int = 30):
        super().__init__(
            "Too many requests — slow down",
            details={"retry_after_seconds": retry_after_seconds},
        )
