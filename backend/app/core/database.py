"""Conexión a la base de datos con SQLAlchemy 2.x.

Define el motor, la fábrica de sesiones, la clase base de los modelos y la dependencia
``get_db`` que FastAPI inyecta en cada petición. La misma configuración sirve para SQLite
(desarrollo y tests) y PostgreSQL (producción): solo cambia ``DATABASE_URL``.
"""

from collections.abc import Iterator

from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import settings


class Base(DeclarativeBase):
    """Clase base de todos los modelos ORM."""


def build_engine(url: str) -> Engine:
    """Crea un motor de SQLAlchemy adaptado al tipo de base de datos.

    Args:
        url: URL de conexión (``sqlite:///...`` o ``postgresql+psycopg://...``).

    Returns:
        El motor configurado. En SQLite se activan las claves foráneas, que vienen
        desactivadas por defecto, para que los borrados en cascada funcionen igual que en PostgreSQL.
    """
    is_sqlite = url.startswith("sqlite")
    connect_args = {"check_same_thread": False} if is_sqlite else {}
    engine = create_engine(url, connect_args=connect_args, pool_pre_ping=not is_sqlite)

    if is_sqlite:
        @event.listens_for(engine, "connect")
        def _enable_foreign_keys(dbapi_connection, _record) -> None:  # type: ignore[no-untyped-def]
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.close()

    return engine


engine = build_engine(settings.database_url)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def init_db(bind: Engine | None = None) -> None:
    """Crea las tablas que falten.

    Para un MVP basta con ``create_all``; cuando el esquema evolucione en producción
    conviene pasar a migraciones con Alembic.
    """
    # Importa los modelos para que queden registrados en ``Base.metadata``.
    from app import models  # noqa: F401

    Base.metadata.create_all(bind=bind or engine)


def get_db() -> Iterator[Session]:
    """Dependencia de FastAPI: abre una sesión por petición y la cierra al terminar.

    Yields:
        Una sesión de SQLAlchemy. Los servicios hacen ``commit`` explícito; si algo falla
        antes, el cierre de la sesión descarta los cambios pendientes.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
