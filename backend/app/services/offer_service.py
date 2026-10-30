"""Ofertas de empleo: listar, publicar, editar y cambiar de estado."""

from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import ConflictError, NotFoundError, PermissionDeniedError
from app.models.common import new_id, utcnow
from app.models.offer import JobOffer
from app.models.user import User
from app.schemas.offer import JobOfferIn


def today() -> date:
    """Fecha de hoy en UTC (la misma referencia que ``isOfferActive`` en el frontend)."""
    return utcnow().date()


def is_offer_active(offer: JobOffer, reference: date | None = None) -> bool:
    """Una oferta está activa si está abierta y su fecha de cierre no ha pasado."""
    return offer.status == "open" and offer.closes_at >= (reference or today())


def get_offer(db: Session, offer_id: str) -> JobOffer:
    """Devuelve una oferta o lanza ``NotFoundError``."""
    offer = db.get(JobOffer, offer_id)
    if offer is None:
        raise NotFoundError("La oferta no existe.")
    return offer


def ensure_owner(offer: JobOffer, user: User) -> None:
    """Comprueba que la oferta pertenece a la empresa autenticada."""
    if offer.company_email != user.email:
        raise PermissionDeniedError("Esta oferta pertenece a otra empresa.")


def list_open_offers(db: Session) -> list[JobOffer]:
    """Ofertas abiertas y sin caducar, las más recientes primero."""
    stmt = (
        select(JobOffer)
        .where(JobOffer.status == "open", JobOffer.closes_at >= today())
        .order_by(JobOffer.created_at.desc())
    )
    return list(db.scalars(stmt))


def list_company_offers(db: Session, company_email: str, user: User) -> list[JobOffer]:
    """Todas las ofertas de una empresa, también pausadas o cerradas. Solo para la propia empresa."""
    if company_email.lower() != user.email:
        raise PermissionDeniedError("Solo puedes ver las ofertas de tu propia empresa.")
    stmt = select(JobOffer).where(JobOffer.company_email == user.email).order_by(JobOffer.created_at.desc())
    return list(db.scalars(stmt))


def _apply(offer: JobOffer, data: JobOfferIn, user: User) -> None:
    """Copia los campos editables en la oferta. El email de la empresa sale siempre del token."""
    offer.company_email = user.email
    offer.company_name = data.company_name or user.name
    offer.title = data.title
    offer.sector = data.sector
    offer.city = data.city
    offer.commute = data.commute
    offer.modality = data.modality
    offer.workday = data.workday
    offer.contract = data.contract
    offer.salary_min = data.salary_min
    offer.salary_max = data.salary_max
    offer.description = data.description
    offer.requirements = [req.model_dump(by_alias=True) for req in data.requirements]
    offer.open_to_newcomers = data.open_to_newcomers
    offer.closes_at = data.closes_at
    offer.response_days = data.response_days
    offer.status = data.status


def create_offer(db: Session, data: JobOfferIn, user: User) -> JobOffer:
    """Publica una oferta nueva. El ``id`` lo genera siempre el servidor."""
    offer = JobOffer(id=new_id("offer"), created_at=utcnow())
    _apply(offer, data, user)
    db.add(offer)
    db.commit()
    db.refresh(offer)
    return offer


def update_offer(db: Session, offer_id: str, data: JobOfferIn, user: User) -> JobOffer:
    """Edita una oferta de la propia empresa.

    Raises:
        NotFoundError: Si la oferta no existe.
        PermissionDeniedError: Si es de otra empresa.
        ConflictError: Si el ``id`` del cuerpo no coincide con el de la ruta.
    """
    if data.id is not None and data.id != offer_id:
        raise ConflictError("El identificador de la oferta no coincide con el de la ruta.")
    offer = get_offer(db, offer_id)
    ensure_owner(offer, user)
    _apply(offer, data, user)
    db.commit()
    db.refresh(offer)
    return offer


def set_offer_status(db: Session, offer_id: str, status: str, user: User) -> JobOffer:
    """Abre, pausa o cierra una oferta de la propia empresa."""
    offer = get_offer(db, offer_id)
    ensure_owner(offer, user)
    offer.status = status
    db.commit()
    return offer
