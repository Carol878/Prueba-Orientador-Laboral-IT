"""Esquemas de decisiones, candidaturas y consentimiento (``src/types.ts``)."""

from typing import Any, Literal

from pydantic import Field, SerializerFunctionWrapHandler, model_serializer

from app.schemas.common import CamelModel, UtcDatetime

OfferDecision = Literal["interested", "skipped", "saved"]
ApplicationStatus = Literal["pending", "contact_open", "interview", "hired", "declined"]


class WorkExperienceSchema(CamelModel):
    """Experiencia laboral previa, también de otros sectores."""

    role: str = Field(default="", max_length=120)
    sector: str = Field(default="", max_length=80)
    years: float = Field(default=0, ge=0, le=60)
    tasks: str = Field(default="", max_length=1000)


class CandidateProfileSchema(CamelModel):
    """Perfil que ve la empresa. Nombre y email solo se entregan con el contacto abierto.

    Casi todos los campos tienen valor por defecto para tolerar diagnósticos incompletos.
    """

    email: str = Field(default="", max_length=254)
    name: str = Field(default="", max_length=120)
    profile_type: Literal["junior", "reskill"] | None = None
    target_role: str = Field(default="", max_length=160)
    tech_stack: list[str] = Field(default_factory=list, max_length=60)
    learning_skills: list[str] = Field(default_factory=list, max_length=60)
    english_level: str = Field(default="", max_length=40)
    experience_months: str = Field(default="", max_length=40)
    work_experience: list[WorkExperienceSchema] = Field(default_factory=list, max_length=20)
    portfolio_url: str = Field(default="", max_length=500)
    main_project: str = Field(default="", max_length=1000)
    practiced_interview: bool = False


class DecisionRequest(CamelModel):
    """Cuerpo de ``PUT /candidates/{email}/decisions/{offerId}``."""

    decision: OfferDecision
    candidate: CandidateProfileSchema | None = None
    wants_fad_support: bool = False


class ApplicationOut(CamelModel):
    """Candidatura tal y como la devuelve la API.

    ``companyContactEmail`` es una ampliación del contrato: solo aparece para la persona
    candidata y solo cuando la empresa ha abierto el contacto. Los campos opcionales que
    valen ``None`` no se envían, igual que las propiedades ``?`` de TypeScript.
    """

    id: str
    offer_id: str
    candidate_email: str
    candidate: CandidateProfileSchema
    status: ApplicationStatus
    decline_reason: str | None = None
    wants_fad_support: bool
    created_at: UtcDatetime
    updated_at: UtcDatetime
    unseen_by_candidate: bool
    unseen_by_company: bool
    company_contact_email: str | None = None

    @model_serializer(mode="wrap")
    def _drop_empty_optionals(self, handler: SerializerFunctionWrapHandler) -> dict[str, Any]:
        """Quita ``declineReason`` y ``companyContactEmail`` cuando no tienen valor."""
        data: dict[str, Any] = handler(self)
        for key in ("declineReason", "decline_reason", "companyContactEmail", "company_contact_email"):
            if key in data and data[key] is None:
                del data[key]
        return data


class ApplicationUpdate(CamelModel):
    """Cuerpo de ``PATCH /applications/{id}``: la empresa cambia el estado."""

    status: ApplicationStatus | None = None
    decline_reason: str | None = Field(default=None, max_length=240)


class SeenRequest(CamelModel):
    """Cuerpo de ``POST /applications/{id}/seen``."""

    by: Literal["candidate", "company"]


class ConsentOut(CamelModel):
    """Respuesta de ``/candidates/{email}/consent``."""

    consented_at: UtcDatetime | None = None
