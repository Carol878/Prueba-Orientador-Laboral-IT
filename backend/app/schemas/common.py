"""Piezas comunes de los esquemas: modelo base en camelCase y fechas en UTC."""

from datetime import datetime, timezone
from typing import Annotated

from pydantic import BaseModel, ConfigDict, PlainSerializer
from pydantic.alias_generators import to_camel


class CamelModel(BaseModel):
    """Modelo base: lee y escribe JSON en camelCase y acepta también snake_case.

    ``extra="ignore"`` descarta campos desconocidos en lugar de guardarlos, de modo que el
    cliente no puede colar columnas que no esperamos (p. ej. ``createdAt`` al editar una oferta).
    """

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
        extra="ignore",
        str_strip_whitespace=True,
    )


def _to_utc_iso(value: datetime) -> str:
    """Serializa una fecha en ISO 8601 con ``Z`` (en la base de datos se guarda en UTC sin zona)."""
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


#: Fecha y hora que sale de la API como ``2026-10-30T12:00:00Z`` (igual que ``toISOString``).
UtcDatetime = Annotated[datetime, PlainSerializer(_to_utc_iso, return_type=str)]
