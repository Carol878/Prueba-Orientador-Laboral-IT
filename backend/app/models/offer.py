"""Modelo de oferta de empleo publicada por una empresa."""

from datetime import date, datetime
from typing import Any

from sqlalchemy import JSON, Boolean, Date, DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.common import new_id, utcnow


class JobOffer(Base):
    """Oferta de empleo (equivale a ``JobOffer`` en ``src/types.ts``).

    La propiedad se comprueba por ``company_email``: las ofertas de ejemplo de empresas sin
    cuenta (Nexo Retail, Cíber ES…) existen igual, pero nadie puede editarlas hasta que se
    registre una cuenta de empresa con ese email.

    Los requisitos se guardan como JSON (lista de ``OfferRequirement`` ya validada por Pydantic):
    se leen siempre junto con la oferta y no se consultan por separado.
    """

    __tablename__ = "job_offers"

    id: Mapped[str] = mapped_column(String(80), primary_key=True, default=lambda: new_id("offer"))
    company_email: Mapped[str] = mapped_column(String(254), index=True)
    company_name: Mapped[str] = mapped_column(String(160))
    title: Mapped[str] = mapped_column(String(160))
    sector: Mapped[str] = mapped_column(String(80))
    city: Mapped[str] = mapped_column(String(80))
    commute: Mapped[str] = mapped_column(String(240), default="")
    modality: Mapped[str] = mapped_column(String(16))
    workday: Mapped[str] = mapped_column(String(16))
    contract: Mapped[str] = mapped_column(String(160))
    salary_min: Mapped[int] = mapped_column(Integer)
    salary_max: Mapped[int] = mapped_column(Integer)
    description: Mapped[str] = mapped_column(Text, default="")
    requirements: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list)
    open_to_newcomers: Mapped[bool] = mapped_column(Boolean, default=False)
    closes_at: Mapped[date] = mapped_column(Date, index=True)
    response_days: Mapped[int] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(16), default="open", index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
