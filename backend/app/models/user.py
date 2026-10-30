"""Modelo de usuario: personas candidatas (``young``) y empresas (``company``)."""

from datetime import datetime
from enum import StrEnum

from sqlalchemy import DateTime, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.common import new_id, utcnow


class UserRole(StrEnum):
    """Roles de la plataforma (mismos valores que ``UserRole`` en el frontend)."""

    YOUNG = "young"
    COMPANY = "company"


class User(Base):
    """Cuenta de acceso. La contraseña solo se guarda como hash bcrypt.

    Attributes:
        id: Identificador interno (``user-<uuid>``).
        email: Email en minúsculas; es el identificador que usan las rutas del contrato.
        name: Nombre de la persona o de la empresa.
        password_hash: Hash bcrypt de la contraseña. Nunca se expone en la API.
        role: ``young`` o ``company``.
    """

    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=lambda: new_id("user"))
    email: Mapped[str] = mapped_column(String(254), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(120))
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(16))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
