"""Modelos de la relación joven ↔ oferta: decisiones, candidaturas y consentimiento."""

from datetime import datetime
from typing import Any

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.common import new_id, utcnow
from app.models.offer import JobOffer


class Decision(Base):
    """Lo que decidió la persona candidata sobre una oferta: ``interested``, ``skipped`` o ``saved``.

    Una sola decisión por persona y oferta (restricción única). Se borra a los 12 meses de
    la última modificación (ver ``services/retention.py``).
    """

    __tablename__ = "decisions"
    __table_args__ = (UniqueConstraint("candidate_email", "offer_id", name="uq_decision_candidate_offer"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    candidate_email: Mapped[str] = mapped_column(String(254), index=True)
    offer_id: Mapped[str] = mapped_column(ForeignKey("job_offers.id", ondelete="CASCADE"), index=True)
    decision: Mapped[str] = mapped_column(String(16))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)


class Application(Base):
    """Candidatura: se crea al pulsar "Me interesa" con una copia del perfil en ese momento.

    La restricción única ``(offer_id, candidate_email)`` impide duplicados aunque lleguen dos
    peticiones a la vez. El perfil guardado incluye nombre y email, pero la API solo los
    entrega a la empresa cuando el estado es ``contact_open``, ``interview`` o ``hired``.
    """

    __tablename__ = "applications"
    __table_args__ = (UniqueConstraint("offer_id", "candidate_email", name="uq_application_offer_candidate"),)

    id: Mapped[str] = mapped_column(String(80), primary_key=True, default=lambda: new_id("app"))
    offer_id: Mapped[str] = mapped_column(ForeignKey("job_offers.id", ondelete="CASCADE"), index=True)
    candidate_email: Mapped[str] = mapped_column(String(254), index=True)
    candidate: Mapped[dict[str, Any]] = mapped_column(JSON)
    status: Mapped[str] = mapped_column(String(16), default="pending")
    decline_reason: Mapped[str | None] = mapped_column(String(240), nullable=True)
    wants_fad_support: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    unseen_by_candidate: Mapped[bool] = mapped_column(Boolean, default=False)
    unseen_by_company: Mapped[bool] = mapped_column(Boolean, default=True)

    # ``innerjoin`` porque la oferta es obligatoria; además permite ``SELECT … FOR UPDATE`` en PostgreSQL.
    offer: Mapped[JobOffer] = relationship(lazy="joined", innerjoin=True)


class Consent(Base):
    """Fecha en la que la persona aceptó compartir su perfil anónimo con las empresas."""

    __tablename__ = "consents"

    candidate_email: Mapped[str] = mapped_column(String(254), primary_key=True)
    consented_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
