"""Punto de entrada de la API de Orientador Laboral (Fad Juventud).

Crea la aplicación FastAPI, configura CORS, los manejadores de errores y los routers.
Arranque en desarrollo (desde ``backend/``)::

    uvicorn app.main:app --reload
"""

import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import DEFAULT_JWT_SECRET, settings
from app.core.database import init_db
from app.core.errors import register_exception_handlers
from app.routers import applications, auth, candidates, offers

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("app")


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    """Al arrancar crea las tablas que falten y avisa si la clave JWT es la de ejemplo."""
    if settings.jwt_secret == DEFAULT_JWT_SECRET:
        logger.warning("JWT_SECRET es la clave de ejemplo: cámbiala antes de desplegar.")
    init_db()
    yield


def create_app() -> FastAPI:
    """Construye la aplicación FastAPI con todos sus componentes."""
    application = FastAPI(
        title="Orientador Laboral · Fad Juventud",
        description="API de ofertas, candidaturas y conexión ética entre jóvenes y empresas.",
        version="0.1.0",
        lifespan=lifespan,
    )
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=False,  # Se usa token Bearer, no cookies.
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type"],
    )
    register_exception_handlers(application)
    for router in (auth.router, offers.router, candidates.router, applications.router):
        application.include_router(router)

    @application.get("/health", tags=["sistema"])
    def health() -> dict[str, str]:
        """Comprobación de que la API está viva."""
        return {"status": "ok"}

    return application


app = create_app()
