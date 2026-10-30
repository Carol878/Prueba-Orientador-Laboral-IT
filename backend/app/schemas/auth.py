"""Esquemas de registro, inicio de sesión y usuario."""

from typing import Literal

from pydantic import EmailStr, Field, field_validator

from app.schemas.common import CamelModel, UtcDatetime


class RegisterRequest(CamelModel):
    """Datos para crear una cuenta."""

    email: EmailStr
    password: str = Field(min_length=6, max_length=72, description="Entre 6 y 72 caracteres (límite de bcrypt).")
    name: str = Field(min_length=1, max_length=120)
    role: Literal["young", "company"]

    @field_validator("email")
    @classmethod
    def _lowercase_email(cls, value: str) -> str:
        """Guarda los emails en minúsculas para que no haya dos cuentas que solo difieran en mayúsculas."""
        return value.lower()


class LoginRequest(CamelModel):
    """Credenciales de inicio de sesión."""

    email: EmailStr
    password: str = Field(min_length=1, max_length=72)

    @field_validator("email")
    @classmethod
    def _lowercase_email(cls, value: str) -> str:
        """Normaliza el email igual que en el registro."""
        return value.lower()


class UserOut(CamelModel):
    """Usuario visible en la API (nunca incluye el hash de la contraseña)."""

    id: str
    email: str
    name: str
    role: Literal["young", "company"]
    created_at: UtcDatetime


class TokenResponse(CamelModel):
    """Respuesta de ``/auth/login`` y ``/auth/register``."""

    access_token: str
    token_type: Literal["bearer"] = "bearer"
    user: UserOut
