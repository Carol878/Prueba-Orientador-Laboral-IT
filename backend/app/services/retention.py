"""Conservación de datos: candidaturas y decisiones se borran a los 12 meses.

Se toma como referencia la última actividad (``updated_at``): una candidatura que sigue
moviéndose no se borra a mitad de proceso. Se ejecuta con ``python -m app.cli purge``
(pensado para un cron diario).
"""

import logging
from dataclasses import dataclass
from datetime import datetime, timedelta

from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.application import Application, Decision
from app.models.common import utcnow

logger = logging.getLogger("app.retention")


@dataclass(frozen=True)
class PurgeResult:
    """Cuántas filas se han borrado."""

    applications: int
    decisions: int


def purge_expired(db: Session, *, now: datetime | None = None, retention_days: int | None = None) -> PurgeResult:
    """Borra candidaturas y decisiones sin actividad desde hace más del plazo de conservación.

    Args:
        db: Sesión de base de datos.
        now: Momento de referencia (útil en tests); por defecto, ahora en UTC.
        retention_days: Plazo en días; por defecto ``RETENTION_DAYS`` (365).

    Returns:
        El número de candidaturas y decisiones borradas.
    """
    days = retention_days if retention_days is not None else settings.retention_days
    cutoff = (now or utcnow()) - timedelta(days=days)

    # Las dos borradas van en la misma transacción.
    applications = db.execute(delete(Application).where(Application.updated_at < cutoff)).rowcount
    decisions = db.execute(delete(Decision).where(Decision.updated_at < cutoff)).rowcount
    db.commit()

    result = PurgeResult(applications=applications or 0, decisions=decisions or 0)
    logger.info("Conservación: borradas %s candidaturas y %s decisiones anteriores a %s", result.applications, result.decisions, cutoff)
    return result
