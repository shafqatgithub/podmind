"""Application configuration — single typed source of truth.

Loaded once at startup from environment variables (or a local ``.env`` in
development). Anything secret lives ONLY here and is injected via
Railway/Vercel env vars in production. Missing required settings fail fast
at boot with a clear pydantic error rather than at first use.
"""

from functools import lru_cache

from pydantic import Field, PostgresDsn, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # --- Runtime -----------------------------------------------------------
    env: str = Field(default="development", pattern="^(development|staging|production)$")
    log_level: str = "INFO"
    api_v1_prefix: str = "/api/v1"
    cors_origins: list[str] = ["http://localhost:3000"]

    # --- Supabase ----------------------------------------------------------
    supabase_url: str = Field(description="https://<project-ref>.supabase.co")
    supabase_anon_key: SecretStr = Field(description="Publishable/anon key (JWT verification aud)")
    supabase_service_role_key: SecretStr = Field(description="Service role key — server only")
    supabase_jwt_aud: str = "authenticated"

    # --- Database (direct Postgres, session pooler recommended on Railway) --
    database_url: PostgresDsn = Field(
        description="postgresql://postgres.<ref>:<password>@<pooler-host>:5432/postgres"
    )
    db_pool_min_size: int = Field(default=2, ge=1)
    db_pool_max_size: int = Field(default=10, ge=1)

    # --- Secrets -----------------------------------------------------------
    # Fernet key for encrypting user BYOK provider keys at rest.
    # Generate: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
    encryption_key: SecretStr

    # --- Platform AI provider keys (users without BYOK spend credits) ------
    openai_api_key: SecretStr | None = None
    gemini_api_key: SecretStr | None = None
    anthropic_api_key: SecretStr | None = None

    @property
    def jwks_url(self) -> str:
        """Supabase publishes signing keys per-project at this well-known URL."""
        return f"{self.supabase_url}/auth/v1/.well-known/jwks.json"

    @property
    def is_production(self) -> bool:
        return self.env == "production"


@lru_cache
def get_settings() -> Settings:
    """Cached accessor — import this, never instantiate Settings directly."""
    return Settings()  # type: ignore[call-arg]  # values come from the environment
