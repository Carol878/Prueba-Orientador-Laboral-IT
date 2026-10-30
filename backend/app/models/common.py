"""Utilidades comunes a los modelos: identificadores y fechas."""

import uuid
from datetime import datetime, timezone


def utcnow() -> datetime:
    """Fecha y hora actual en UTC, sin zona (así se guarda en la base de datos)."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def new_id(prefix: str) -> str:
    """Identificador legible con prefijo, igual que en el frontend (``offer-…``, ``app-…``)."""
    return f"{prefix}-{uuid.uuid4()}"
