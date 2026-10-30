"""Dependencias de FastAPI compartidas por los routers: usuario autenticado y roles."""

from typing import Annotated

import jwt
from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.errors import AuthenticationError, PermissionDeniedError
from app.core.security import decode_access_token
from app.models.user import User, UserRole

# ``auto_error=False`` para devolver nuestro propio 401 en JSON en lugar del 403 de FastAPI.
_bearer = HTTPBearer(auto_error=False, description="Token JWT obtenido en /auth/login")

DbSession = Annotated[Session, Depends(get_db)]


def get_current_user(
    db: DbSession,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
) -> User:
    """Obtiene el usuario del token ``Authorization: Bearer``.

    Raises:
        AuthenticationError: Si falta el token, no es válido, ha caducado o el usuario ya no existe.
    """
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise AuthenticationError("Hace falta iniciar sesión.")
    try:
        payload = decode_access_token(credentials.credentials)
    except jwt.PyJWTError as exc:
        raise AuthenticationError("La sesión no es válida o ha caducado. Vuelve a iniciar sesión.") from exc

    user = db.get(User, str(payload["sub"]))
    if user is None:
        raise AuthenticationError("La sesión no es válida. Vuelve a iniciar sesión.")
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def require_young(user: CurrentUser) -> User:
    """Permite el paso solo a personas candidatas (rol ``young``)."""
    if user.role != UserRole.YOUNG:
        raise PermissionDeniedError("Esta acción es solo para personas candidatas.")
    return user


def require_company(user: CurrentUser) -> User:
    """Permite el paso solo a cuentas de empresa (rol ``company``)."""
    if user.role != UserRole.COMPANY:
        raise PermissionDeniedError("Esta acción es solo para empresas.")
    return user


YoungUser = Annotated[User, Depends(require_young)]
CompanyUser = Annotated[User, Depends(require_company)]
