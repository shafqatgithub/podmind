"""Authentication: verifies Supabase-issued JWTs on every request.

Flow:
  1. Frontend signs in via Supabase Auth (email or Google) and holds a JWT.
  2. It calls this API with ``Authorization: Bearer <jwt>``.
  3. ``get_current_user_id`` verifies the signature against the project's
     JWKS (fetched once, cached, refreshed on unknown ``kid``), checks
     audience + expiry, and yields the user id (``sub`` claim).

Route usage::

    @router.get("/projects")
    async def list_projects(user_id: UUID = Depends(get_current_user_id)): ...
"""

from __future__ import annotations

import time
from uuid import UUID

import httpx
import jwt
from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import PyJWK

from app.core.config import get_settings
from app.core.exceptions import UnauthorizedError
from app.core.logging import get_logger

log = get_logger(__name__)

_bearer = HTTPBearer(auto_error=False)


class _JWKSCache:
    """Process-local JWKS cache with TTL + refresh-on-unknown-kid.

    Supabase rotates signing keys rarely; a 10-minute TTL keeps verification
    hot-path free of network calls while picking up rotations promptly.
    """

    def __init__(self, ttl_seconds: int = 600):
        self._keys: dict[str, PyJWK] = {}
        self._fetched_at: float = 0.0
        self._ttl = ttl_seconds

    async def get_key(self, kid: str) -> PyJWK:
        if kid not in self._keys or (time.monotonic() - self._fetched_at) > self._ttl:
            await self._refresh()
        try:
            return self._keys[kid]
        except KeyError as exc:  # token signed by a key we've never seen
            raise UnauthorizedError("Unknown signing key") from exc

    async def _refresh(self) -> None:
        settings = get_settings()
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(settings.jwks_url)
            resp.raise_for_status()
        self._keys = {k["kid"]: PyJWK(k) for k in resp.json().get("keys", []) if "kid" in k}
        self._fetched_at = time.monotonic()
        log.info("auth.jwks_refreshed", key_count=len(self._keys))


_jwks = _JWKSCache()


async def verify_token(token: str) -> dict:
    """Verify a Supabase JWT and return its claims. Raises UnauthorizedError."""
    settings = get_settings()
    try:
        header = jwt.get_unverified_header(token)
        alg = header.get("alg", "")

        if alg.startswith(("RS", "ES")):
            key = await _jwks.get_key(header["kid"])
            claims = jwt.decode(
                token, key, algorithms=[alg], audience=settings.supabase_jwt_aud
            )
        elif alg == "HS256":
            # Legacy projects sign with the shared JWT secret exposed as the
            # service key material; verified via the anon key's secret is NOT
            # possible — HS256 verification requires the project JWT secret.
            # We reject HS256 unless explicitly configured, to avoid a silent
            # verification bypass.
            raise UnauthorizedError(
                "HS256 tokens not supported — enable asymmetric JWT signing "
                "in Supabase Auth settings"
            )
        else:
            raise UnauthorizedError("Unsupported token algorithm")

    except UnauthorizedError:
        raise
    except jwt.ExpiredSignatureError as exc:
        raise UnauthorizedError("Token expired") from exc
    except (jwt.InvalidTokenError, KeyError, httpx.HTTPError) as exc:
        log.warning("auth.token_rejected", reason=str(exc))
        raise UnauthorizedError() from exc

    return claims


async def get_current_user_id(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> UUID:
    """FastAPI dependency: authenticated user id or 401."""
    if credentials is None:
        raise UnauthorizedError("Missing Authorization header")
    claims = await verify_token(credentials.credentials)
    try:
        return UUID(claims["sub"])
    except (KeyError, ValueError) as exc:
        raise UnauthorizedError("Token missing subject") from exc
