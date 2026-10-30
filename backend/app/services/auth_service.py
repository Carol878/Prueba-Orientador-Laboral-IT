"""Registro e inicio de sesión."""

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.errors import AuthenticationError, ConflictError
from app.core.security import create_access_token, get_password_hash, verify_password
from app.models.user import User
from app.schemas.auth import LoginRequest, RegisterRequest

# Hash fijo para comparar cuando el email no existe: así el tiempo de respuesta es parecido
# exista o no la cuenta y no se puede averiguar qué emails están registrados.
_DUMMY_HASH = get_password_hash("contraseña-inexistente")


def get_user_by_email(db: Session, email: str) -> User | None:
    """Busca un usuario por email (sin distinguir mayúsculas)."""
    return db.scalar(select(User).where(User.email == email.lower()))


def register_user(db: Session, data: RegisterRequest) -> User:
    """Crea una cuenta con la contraseña cifrada con bcrypt.

    Raises:
        ConflictError: Si ya existe una cuenta con ese email.
    """
    if get_user_by_email(db, data.email) is not None:
        raise ConflictError("Ya existe una cuenta con ese email.")
    user = User(email=data.email.lower(), name=data.name, role=data.role, password_hash=get_password_hash(data.password))
    db.add(user)
    try:
        db.commit()
    except IntegrityError as exc:  # Dos registros simultáneos con el mismo email.
        db.rollback()
        raise ConflictError("Ya existe una cuenta con ese email.") from exc
    db.refresh(user)
    return user


def authenticate(db: Session, data: LoginRequest) -> User:
    """Comprueba las credenciales.

    Raises:
        AuthenticationError: Con el mismo mensaje tanto si el email no existe como si la
            contraseña es incorrecta.
    """
    user = get_user_by_email(db, data.email)
    if user is None:
        verify_password(data.password, _DUMMY_HASH)
        raise AuthenticationError("Email o contraseña incorrectos.")
    if not verify_password(data.password, user.password_hash):
        raise AuthenticationError("Email o contraseña incorrectos.")
    return user


def issue_token(user: User) -> str:
    """Genera el token de acceso de un usuario."""
    return create_access_token(subject=user.id, role=user.role)
