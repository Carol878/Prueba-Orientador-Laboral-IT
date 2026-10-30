"""Errores de dominio y su traducción a respuestas HTTP en JSON.

Los servicios lanzan estas excepciones sin saber nada de HTTP; los manejadores registrados
en ``main`` las convierten en ``{"detail": "..."}`` con el código adecuado. Nunca se envían
trazas de Python al cliente: los errores inesperados se registran en el log y se responde 500.
"""

import logging

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger("app.errors")


class DomainError(Exception):
    """Error de negocio con un código HTTP asociado."""

    status_code: int = status.HTTP_400_BAD_REQUEST

    def __init__(self, detail: str) -> None:
        super().__init__(detail)
        self.detail = detail


class NotFoundError(DomainError):
    """El recurso no existe (404)."""

    status_code = status.HTTP_404_NOT_FOUND


class PermissionDeniedError(DomainError):
    """El usuario está identificado pero no puede hacer esto (403)."""

    status_code = status.HTTP_403_FORBIDDEN


class ConflictError(DomainError):
    """La operación choca con el estado actual (409): falta consentimiento, transición no válida…"""

    status_code = status.HTTP_409_CONFLICT


class BusinessValidationError(DomainError):
    """Datos con el formato correcto pero que incumplen una regla de negocio (422)."""

    status_code = status.HTTP_422_UNPROCESSABLE_ENTITY


class AuthenticationError(DomainError):
    """Credenciales o token no válidos (401)."""

    status_code = status.HTTP_401_UNAUTHORIZED


def _readable_validation_message(exc: RequestValidationError) -> tuple[str, list[dict[str, object]]]:
    """Resume los errores de Pydantic en una frase y una lista sin los valores enviados.

    Se omite ``input`` a propósito: podría contener la contraseña u otros datos personales.
    """
    errors: list[dict[str, object]] = []
    for error in exc.errors():
        location = ".".join(str(part) for part in error.get("loc", ()) if part != "body")
        errors.append({"field": location, "message": error.get("msg", "")})
    first = errors[0] if errors else {"field": "", "message": "Datos no válidos"}
    summary = f"{first['field']}: {first['message']}" if first["field"] else str(first["message"])
    return summary, errors


def register_exception_handlers(app: FastAPI) -> None:
    """Registra los manejadores que garantizan respuestas de error en JSON limpio."""

    @app.exception_handler(DomainError)
    async def _domain_error(_request: Request, exc: DomainError) -> JSONResponse:
        headers = {"WWW-Authenticate": "Bearer"} if isinstance(exc, AuthenticationError) else None
        return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail}, headers=headers)

    @app.exception_handler(RequestValidationError)
    async def _validation_error(_request: Request, exc: RequestValidationError) -> JSONResponse:
        summary, errors = _readable_validation_message(exc)
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={"detail": f"Datos no válidos. {summary}", "errors": errors},
        )

    @app.exception_handler(StarletteHTTPException)
    async def _http_error(_request: Request, exc: StarletteHTTPException) -> JSONResponse:
        return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail}, headers=exc.headers)

    @app.exception_handler(Exception)
    async def _unexpected_error(request: Request, exc: Exception) -> JSONResponse:
        # La traza completa va al log del servidor, nunca al cliente.
        logger.exception("Error no controlado en %s %s", request.method, request.url.path, exc_info=exc)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": "Error interno del servidor. Inténtalo de nuevo más tarde."},
        )
