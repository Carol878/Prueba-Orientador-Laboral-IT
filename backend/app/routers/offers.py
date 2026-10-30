"""Rutas de ofertas de empleo y de las candidaturas de cada oferta (lado empresa)."""

from fastapi import APIRouter, Response, status

from app.core.deps import CompanyUser, CurrentUser, DbSession
from app.schemas.application import ApplicationOut
from app.schemas.offer import JobOfferIn, JobOfferOut, OfferStatusUpdate
from app.services import application_service, offer_service

router = APIRouter(tags=["ofertas"])


@router.get("/offers", response_model=list[JobOfferOut])
def list_open_offers(db: DbSession, _user: CurrentUser) -> list[JobOfferOut]:
    """Ofertas abiertas y sin caducar."""
    return [JobOfferOut.model_validate(o) for o in offer_service.list_open_offers(db)]


@router.get("/offers/{offer_id}", response_model=JobOfferOut)
def get_offer(offer_id: str, db: DbSession, _user: CurrentUser) -> JobOfferOut:
    """Una oferta en cualquier estado (para ver candidaturas y guardadas de ofertas ya cerradas)."""
    return JobOfferOut.model_validate(offer_service.get_offer(db, offer_id))


@router.get("/companies/{company_email}/offers", response_model=list[JobOfferOut])
def list_company_offers(company_email: str, db: DbSession, user: CompanyUser) -> list[JobOfferOut]:
    """Todas las ofertas de la empresa autenticada (también pausadas y cerradas)."""
    return [JobOfferOut.model_validate(o) for o in offer_service.list_company_offers(db, company_email, user)]


@router.post("/offers", response_model=JobOfferOut, status_code=status.HTTP_201_CREATED)
def create_offer(data: JobOfferIn, db: DbSession, user: CompanyUser) -> JobOfferOut:
    """Publica una oferta. El salario es obligatorio y el mínimo no puede superar al máximo."""
    return JobOfferOut.model_validate(offer_service.create_offer(db, data, user))


@router.put("/offers/{offer_id}", response_model=JobOfferOut)
def update_offer(offer_id: str, data: JobOfferIn, db: DbSession, user: CompanyUser) -> JobOfferOut:
    """Edita una oferta de la propia empresa."""
    return JobOfferOut.model_validate(offer_service.update_offer(db, offer_id, data, user))


@router.patch("/offers/{offer_id}/status", status_code=status.HTTP_204_NO_CONTENT)
def set_offer_status(offer_id: str, data: OfferStatusUpdate, db: DbSession, user: CompanyUser) -> Response:
    """Abre, pausa o cierra una oferta de la propia empresa."""
    offer_service.set_offer_status(db, offer_id, data.status, user)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/offers/{offer_id}/applications", response_model=list[ApplicationOut])
def list_applicants(offer_id: str, db: DbSession, user: CompanyUser) -> list[ApplicationOut]:
    """Candidaturas de una oferta. Sin nombre ni email hasta abrir el contacto."""
    return application_service.list_applicants(db, user, offer_id)
