"""Application-side encryption for user BYOK provider API keys.

The database only ever stores ciphertext (ai_provider_configs.api_key_ciphertext).
Fernet = AES-128-CBC + HMAC-SHA256, authenticated: tampered ciphertext fails
loudly instead of decrypting to garbage. Key lives in ENCRYPTION_KEY (Railway).
"""

from cryptography.fernet import Fernet, InvalidToken

from app.core.config import get_settings
from app.core.exceptions import AppError


class DecryptionError(AppError):
    status_code = 500
    code = "decryption_failed"

    def __init__(self) -> None:
        super().__init__("Stored credential could not be decrypted")


def _fernet() -> Fernet:
    return Fernet(get_settings().encryption_key.get_secret_value().encode())


def encrypt_secret(plaintext: str) -> str:
    """Encrypt a user-supplied secret for storage. Returns str ciphertext."""
    return _fernet().encrypt(plaintext.encode()).decode()


def decrypt_secret(ciphertext: str) -> str:
    """Decrypt stored ciphertext. Raises DecryptionError on tamper/rotation."""
    try:
        return _fernet().decrypt(ciphertext.encode()).decode()
    except InvalidToken as exc:
        raise DecryptionError() from exc
