"""Decisiones del joven, candidaturas y consentimiento.

Reglas principales (propuesta v2, secciones 0 y 3):

* "Me interesa" exige consentimiento previo y crea la candidatura con una copia del perfil,
  en la misma transacción que guarda la decisión.
* La empresa ve los perfiles anónimos (sin nombre ni email) hasta que abre el contacto.
  La anonimización se hace aquí, en el servidor; el frontend nunca recibe esos datos antes.
* El proceso solo avanza pending → contact_open → interview → hired; ``declined`` es posible
  desde cualquier estado no final y exige un motivo de la lista. Siempre decide una persona.
"""

from typing import Any

from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.errors import BusinessValidationError, ConflictError, NotFoundError, PermissionDeniedError
from app.data import DECLINE_REASONS
from app.models.application import Application, Consent, Decision
from app.models.common import new_id, utcnow
from app.models.user import User
from app.schemas.application import ApplicationOut, ApplicationUpdate, CandidateProfileSchema, DecisionRequest
from app.services import notifications
from app.services.offer_service import ensure_owner, get_offer, is_offer_active

#: Estados en los que la empresa ya puede ver nombre y email (y el joven, el email de la empresa).
CONTACT_REVEALED_STATUSES = frozenset({"contact_open", "interview", "hired"})

#: Estados finales: ya no admiten cambios.
FINAL_STATUSES = frozenset({"hired", "declined"})

#: Avance permitido del proceso. ``declined`` se añade aparte desde cualquier estado no final.
_NEXT_STATUS: dict[str, str] = {"pending": "contact_open", "contact_open": "interview", "interview": "hired"}


# ---------------------------------------------------------------------------
# Permisos y vistas
# ---------------------------------------------------------------------------

def ensure_self(user: User, candidate_email: str) -> None:
    """Una persona candidata solo puede tocar sus propios datos."""
    if candidate_email.lower() != user.email:
        raise PermissionDeniedError("Solo puedes acceder a tus propios datos.")


def to_candidate_view(application: Application) -> ApplicationOut:
    """Candidatura vista por la propia persona: todo su perfil y, con el contacto abierto,
    el email de la empresa para poder escribirle."""
    out = ApplicationOut.model_validate(application)
    if application.status in CONTACT_REVEALED_STATUSES:
        out.company_contact_email = application.offer.company_email
    return out


def to_company_view(application: Application) -> ApplicationOut:
    """Candidatura vista por la empresa: sin nombre ni email hasta abrir el contacto."""
    out = ApplicationOut.model_validate(application)
    if application.status not in CONTACT_REVEALED_STATUSES:
        out.candidate_email = ""
        out.candidate = out.candidate.model_copy(update={"email": "", "name": ""})
    return out


# ---------------------------------------------------------------------------
# Consentimiento
# ---------------------------------------------------------------------------

def get_consent(db: Session, user: User, candidate_email: str) -> Consent | None:
    """Consentimiento de la persona, o ``None`` si aún no lo ha dado."""
    ensure_self(user, candidate_email)
    return db.get(Consent, user.email)


def give_consent(db: Session, user: User, candidate_email: str) -> Consent:
    """Registra el consentimiento. Si ya existía, se conserva la fecha original."""
    ensure_self(user, candidate_email)
    consent = db.get(Consent, user.email)
    if consent is None:
        consent = Consent(candidate_email=user.email, consented_at=utcnow())
        db.add(consent)
        db.commit()
    return consent


# ---------------------------------------------------------------------------
# Decisiones
# ---------------------------------------------------------------------------

def get_decisions(db: Session, user: User, candidate_email: str) -> dict[str, str]:
    """Decisiones de la persona como diccionario ``id de oferta → decisión``."""
    ensure_self(user, candidate_email)
    rows = db.scalars(select(Decision).where(Decision.candidate_email == user.email))
    return {row.offer_id: row.decision for row in rows}


def _profile_snapshot(profile: CandidateProfileSchema | None, user: User) -> dict[str, Any]:
    """Copia del perfil que se guarda en la candidatura.

    El email y, si falta, el nombre salen de la cuenta autenticada: nadie puede presentar
    una candidatura con los datos de otra persona.
    """
    snapshot = profile or CandidateProfileSchema()
    snapshot = snapshot.model_copy(update={"email": user.email, "name": snapshot.name or user.name})
    return snapshot.model_dump(by_alias=True)


def decide(db: Session, user: User, candidate_email: str, offer_id: str, data: DecisionRequest) -> None:
    """Guarda la decisión y, si es "Me interesa", crea la candidatura en la misma transacción.

    Raises:
        PermissionDeniedError: Si el email no es el de la cuenta autenticada.
        NotFoundError: Si la oferta no existe.
        ConflictError: Si falta el consentimiento o la oferta ya no admite candidaturas.
    """
    ensure_self(user, candidate_email)
    offer = get_offer(db, offer_id)

    existing_application = db.scalar(
        select(Application).where(Application.offer_id == offer_id, Application.candidate_email == user.email)
    )
    create_application = data.decision == "interested" and existing_application is None
    if create_application:
        if db.get(Consent, user.email) is None:
            raise ConflictError("Antes de mostrar interés tienes que aceptar compartir tu perfil anónimo con las empresas.")
        if not is_offer_active(offer):
            raise ConflictError("Esta oferta ya no admite candidaturas.")

    # Upsert de la decisión.
    decision = db.scalar(select(Decision).where(Decision.candidate_email == user.email, Decision.offer_id == offer_id))
    if decision is None:
        db.add(Decision(candidate_email=user.email, offer_id=offer_id, decision=data.decision))
    else:
        decision.decision = data.decision
        decision.updated_at = utcnow()

    application: Application | None = None
    if create_application:
        now = utcnow()
        application = Application(
            id=new_id("app"),
            offer_id=offer_id,
            candidate_email=user.email,
            candidate=_profile_snapshot(data.candidate, user),
            status="pending",
            wants_fad_support=data.wants_fad_support,
            created_at=now,
            updated_at=now,
            unseen_by_candidate=False,
            unseen_by_company=True,
        )
        db.add(application)

    # Un único commit: o se guardan decisión y candidatura, o ninguna.
    try:
        db.commit()
    except IntegrityError as exc:
        # Otra petición simultánea creó la misma decisión o candidatura (restricción única).
        db.rollback()
        raise ConflictError("Ya se estaba guardando esta decisión. Recarga la página.") from exc

    if application is not None:
        notifications.notify("application_created", offer.company_email, application_id=application.id, offer_id=offer_id)


def undo_decision(db: Session, user: User, candidate_email: str, offer_id: str) -> None:
    """Deshace la decisión y retira la candidatura si la empresa aún no la ha contestado."""
    ensure_self(user, candidate_email)
    db.execute(delete(Decision).where(Decision.candidate_email == user.email, Decision.offer_id == offer_id))
    db.execute(
        delete(Application).where(
            Application.candidate_email == user.email,
            Application.offer_id == offer_id,
            Application.status == "pending",
        )
    )
    db.commit()


# ---------------------------------------------------------------------------
# Candidaturas
# ---------------------------------------------------------------------------

def list_my_applications(db: Session, user: User, candidate_email: str) -> list[ApplicationOut]:
    """Candidaturas de la persona, las más recientes primero."""
    ensure_self(user, candidate_email)
    rows = db.scalars(
        select(Application).where(Application.candidate_email == user.email).order_by(Application.created_at.desc())
    )
    return [to_candidate_view(row) for row in rows]


def list_applicants(db: Session, user: User, offer_id: str) -> list[ApplicationOut]:
    """Candidaturas de una oferta para la empresa dueña, por fecha (sin ordenar por encaje)."""
    offer = get_offer(db, offer_id)
    ensure_owner(offer, user)
    rows = db.scalars(select(Application).where(Application.offer_id == offer_id).order_by(Application.created_at.desc()))
    return [to_company_view(row) for row in rows]


def _get_application(db: Session, application_id: str, *, lock: bool = False) -> Application:
    """Carga una candidatura (bloqueando la fila si se va a modificar) o lanza ``NotFoundError``."""
    stmt = select(Application).where(Application.id == application_id)
    if lock:
        # En PostgreSQL bloquea la fila hasta el commit; en SQLite no tiene efecto (escrituras serializadas).
        stmt = stmt.with_for_update(of=Application)
    application = db.scalar(stmt)
    if application is None:
        raise NotFoundError("La candidatura no existe.")
    return application


def _validate_transition(current: str, update: ApplicationUpdate) -> None:
    """Comprueba que el cambio de estado pedido es válido.

    Raises:
        BusinessValidationError: Falta el estado, o se descarta sin un motivo de la lista.
        ConflictError: La transición no está permitida desde el estado actual.
    """
    if update.status is None:
        raise BusinessValidationError("Indica el nuevo estado de la candidatura.")
    if update.status == "declined":
        if not update.decline_reason:
            raise BusinessValidationError("Para descartar una candidatura hay que indicar el motivo.")
        if update.decline_reason not in DECLINE_REASONS:
            raise BusinessValidationError("El motivo de descarte debe ser uno de la lista.")
    elif update.decline_reason:
        raise BusinessValidationError("El motivo solo se indica al descartar una candidatura.")

    if current in FINAL_STATUSES:
        raise ConflictError("Esta candidatura ya está cerrada y no admite cambios.")
    allowed = {_NEXT_STATUS[current], "declined"}
    if update.status not in allowed:
        raise ConflictError(f"No se puede pasar de '{current}' a '{update.status}'.")


def update_application(db: Session, user: User, application_id: str, update: ApplicationUpdate) -> ApplicationOut:
    """La empresa dueña de la oferta cambia el estado de una candidatura (operación atómica)."""
    application = _get_application(db, application_id, lock=True)
    ensure_owner(application.offer, user)
    _validate_transition(application.status, update)

    application.status = update.status  # type: ignore[assignment]  # validado arriba
    application.decline_reason = update.decline_reason if update.status == "declined" else None
    application.updated_at = utcnow()
    application.unseen_by_candidate = True
    db.commit()

    notifications.notify(
        "application_status_changed",
        application.candidate_email,
        application_id=application.id,
        offer_id=application.offer_id,
        status=application.status,
    )
    return to_company_view(application)


def mark_seen(db: Session, user: User, application_id: str, by: str) -> None:
    """Marca una candidatura como vista por la persona candidata o por la empresa."""
    application = _get_application(db, application_id)
    if by == "candidate":
        ensure_self(user, application.candidate_email)
        application.unseen_by_candidate = False
    else:
        ensure_owner(application.offer, user)
        application.unseen_by_company = False
    db.commit()
