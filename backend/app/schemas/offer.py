"""Esquemas de ofertas de empleo (``JobOffer`` y ``OfferRequirement`` en ``src/types.ts``)."""

import uuid
from datetime import date
from typing import Literal

from pydantic import Field, model_validator

from app.schemas.common import CamelModel, UtcDatetime

WorkModality = Literal["Presencial", "Híbrido", "Remoto"]
Workday = Literal["Completa", "Parcial", "Por turnos"]
OfferStatus = Literal["open", "paused", "closed"]
RequirementKind = Literal["knowledge", "condition"]


class OfferRequirementSchema(CamelModel):
    """Requisito de una oferta: conocimiento (se calcula) o condición (la confirma la persona)."""

    id: str = Field(default_factory=lambda: f"req-{uuid.uuid4()}", max_length=120)
    label: str = Field(min_length=1, max_length=160)
    kind: RequirementKind
    essential: bool = True
    trainable: bool = False
    skills: list[str] = Field(default_factory=list, max_length=20)


class JobOfferIn(CamelModel):
    """Oferta enviada por la empresa al crear (``POST``) o editar (``PUT``).

    ``companyEmail`` puede venir en el cuerpo (el frontend lo envía), pero el servidor lo
    sustituye siempre por el email de la cuenta autenticada.
    El salario es obligatorio: sin salario no se publica (propuesta v2).
    """

    id: str | None = Field(default=None, max_length=80)
    company_email: str | None = Field(default=None, max_length=254)
    company_name: str | None = Field(default=None, max_length=160)
    title: str = Field(min_length=1, max_length=160)
    sector: str = Field(min_length=1, max_length=80)
    city: str = Field(min_length=1, max_length=80)
    commute: str = Field(default="", max_length=240)
    modality: WorkModality
    workday: Workday
    contract: str = Field(min_length=1, max_length=160)
    salary_min: int = Field(gt=0, le=1_000_000, description="Salario bruto anual mínimo en euros.")
    salary_max: int = Field(gt=0, le=1_000_000, description="Salario bruto anual máximo en euros.")
    description: str = Field(default="", max_length=5000)
    requirements: list[OfferRequirementSchema] = Field(default_factory=list, max_length=30)
    open_to_newcomers: bool = False
    closes_at: date
    response_days: int = Field(ge=1, le=90)
    status: OfferStatus = "open"

    @model_validator(mode="after")
    def _salary_range(self) -> "JobOfferIn":
        """El salario mínimo no puede ser mayor que el máximo."""
        if self.salary_min > self.salary_max:
            raise ValueError("El salario mínimo no puede ser mayor que el máximo.")
        return self


class JobOfferOut(CamelModel):
    """Oferta tal y como la devuelve la API."""

    id: str
    company_email: str
    company_name: str
    title: str
    sector: str
    city: str
    commute: str
    modality: WorkModality
    workday: Workday
    contract: str
    salary_min: int
    salary_max: int
    description: str
    requirements: list[OfferRequirementSchema]
    open_to_newcomers: bool
    closes_at: date
    response_days: int
    status: OfferStatus
    created_at: UtcDatetime


class OfferStatusUpdate(CamelModel):
    """Cuerpo de ``PATCH /offers/{id}/status``."""

    status: OfferStatus
