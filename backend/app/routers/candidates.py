"""Rutas de la persona candidata: decisiones, candidaturas y consentimiento.

Todas exigen que el email de la ruta sea el de la cuenta autenticada.
"""

from fastapi import APIRouter, Response, status

from app.core.deps import DbSession, YoungUser
from app.schemas.application import ApplicationOut, ConsentOut, DecisionRequest, OfferDecision
from app.services import application_service

router = APIRouter(prefix="/candidates/{candidate_email}", tags=["personas candidatas"])


@router.get("/decisions", response_model=dict[str, OfferDecision])
def get_decisions(candidate_email: str, db: DbSession, user: YoungUser) -> dict[str, str]:
    """Decisiones sobre ofertas (``id de oferta → decisión``)."""
    return application_service.get_decisions(db, user, candidate_email)


@router.put("/decisions/{offer_id}", status_code=status.HTTP_204_NO_CONTENT)
def decide(candidate_email: str, offer_id: str, data: DecisionRequest, db: DbSession, user: YoungUser) -> Response:
    """Guarda la decisión. "Me interesa" crea la candidatura (409 si falta el consentimiento)."""
    application_service.decide(db, user, candidate_email, offer_id, data)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.delete("/decisions/{offer_id}", status_code=status.HTTP_204_NO_CONTENT)
def undo_decision(candidate_email: str, offer_id: str, db: DbSession, user: YoungUser) -> Response:
    """Deshace la decisión y retira la candidatura si aún está pendiente."""
    application_service.undo_decision(db, user, candidate_email, offer_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/applications", response_model=list[ApplicationOut])
def list_my_applications(candidate_email: str, db: DbSession, user: YoungUser) -> list[ApplicationOut]:
    """Candidaturas propias. Con el contacto abierto incluyen ``companyContactEmail``."""
    return application_service.list_my_applications(db, user, candidate_email)


@router.get("/consent", response_model=ConsentOut)
def get_consent(candidate_email: str, db: DbSession, user: YoungUser) -> ConsentOut:
    """Fecha del consentimiento o ``null``."""
    consent = application_service.get_consent(db, user, candidate_email)
    return ConsentOut(consented_at=consent.consented_at if consent else None)


@router.put("/consent", response_model=ConsentOut)
def give_consent(candidate_email: str, db: DbSession, user: YoungUser) -> ConsentOut:
    """Registra el consentimiento para compartir el perfil anónimo."""
    consent = application_service.give_consent(db, user, candidate_email)
    return ConsentOut(consented_at=consent.consented_at)
