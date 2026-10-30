"""Seguridad: hash de contraseñas (bcrypt vía passlib) y tokens de acceso (PyJWT).

Las contraseñas nunca se guardan ni se registran en claro: solo su hash bcrypt.
"""

from datetime import datetime, timedelta, timezone
from typing import Any

import jwt
from passlib.context import CryptContext

from app.core.config import settings

# bcrypt con el coste por defecto de passlib (12 rondas). ``deprecated="auto"`` permite
# migrar a otro esquema en el futuro rehaciendo el hash al iniciar sesión.
_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def get_password_hash(password: str) -> str:
    """Genera el hash bcrypt de una contraseña en texto plano."""
    return _pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Comprueba una contraseña contra su hash. Nunca lanza: si el hash no es válido devuelve ``False``."""
    try:
        return _pwd_context.verify(plain_password, hashed_password)
    except (ValueError, TypeError):
        return False


def create_access_token(subject: str, role: str, expires_minutes: int | None = None) -> str:
    """Crea un JWT firmado para un usuario.

    Args:
        subject: Identificador del usuario (claim ``sub``).
        role: Rol del usuario (``young`` o ``company``); se incluye por comodidad, pero
            los permisos se comprueban siempre contra la base de datos.
        expires_minutes: Validez del token; por defecto, la de la configuración.

    Returns:
        El token codificado.
    """
    now = datetime.now(timezone.utc)
    minutes = expires_minutes if expires_minutes is not None else settings.access_token_expire_minutes
    payload: dict[str, Any] = {"sub": subject, "role": role, "iat": now, "exp": now + timedelta(minutes=minutes)}
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> dict[str, Any]:
    """Valida la firma y la caducidad de un JWT y devuelve su contenido.

    Raises:
        jwt.PyJWTError: Si el token no es válido o ha caducado.
    """
    return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm], options={"require": ["sub", "exp"]})
