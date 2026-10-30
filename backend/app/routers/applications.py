"""Rutas sobre una candidatura concreta: cambio de estado y "visto"."""

from fastapi import APIRouter, Response, status

from app.core.deps import CompanyUser, CurrentUser, DbSession
from app.schemas.application import ApplicationOut, ApplicationUpdate, SeenRequest
from app.services import application_service

router = APIRouter(prefix="/applications", tags=["candidaturas"])


@router.patch("/{application_id}", response_model=ApplicationOut)
def update_application(application_id: str, data: ApplicationUpdate, db: DbSession, user: CompanyUser) -> ApplicationOut:
    """La empresa dueña avanza o descarta la candidatura. Descartar exige un motivo de la lista."""
    return application_service.update_application(db, user, application_id, data)


@router.post("/{application_id}/seen", status_code=status.HTTP_204_NO_CONTENT)
def mark_seen(application_id: str, data: SeenRequest, db: DbSession, user: CurrentUser) -> Response:
    """Marca la candidatura como vista por la persona candidata o por la empresa."""
    application_service.mark_seen(db, user, application_id, data.by)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
