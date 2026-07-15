"""Test bootstrap: inject a complete dummy environment BEFORE any app import
so Settings() validates without real secrets. No test in this suite touches
the network or a live database."""

import os

os.environ.setdefault("ENV", "development")
os.environ.setdefault("SUPABASE_URL", "https://test-project.supabase.co")
os.environ.setdefault("SUPABASE_ANON_KEY", "test-anon-key")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key")
os.environ.setdefault(
    "DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/podmind_test"
)
# Any valid Fernet key works for tests; generated once, holds no secrets.
os.environ.setdefault("ENCRYPTION_KEY", "8Zz2h3H6n0Q1w9X4c7V5b8N1m4K7j0F3d6S9a2L5p8Q=")
