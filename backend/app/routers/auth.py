"""Rutas de autenticación: registro, inicio de sesión y usuario actual."""

from fastapi import APIRouter, status

from app.core.deps import CurrentUser, DbSession
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse, UserOut
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(data: RegisterRequest, db: DbSession) -> TokenResponse:
    """Crea una cuenta (``young`` o ``company``) y devuelve ya el token de acceso."""
    user = auth_service.register_user(db, data)
    return TokenResponse(access_token=auth_service.issue_token(user), user=UserOut.model_validate(user))


@router.post("/login", response_model=TokenResponse)
def login(data: LoginRequest, db: DbSession) -> TokenResponse:
    """Inicia sesión con email y contraseña. Devuelve ``{accessToken, tokenType, user}``."""
    user = auth_service.authenticate(db, data)
    return TokenResponse(access_token=auth_service.issue_token(user), user=UserOut.model_validate(user))


@router.get("/me", response_model=UserOut)
def me(user: CurrentUser) -> UserOut:
    """Usuario de la sesión actual."""
    return UserOut.model_validate(user)
