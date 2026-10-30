"""Atajo para arrancar desde ``backend/`` con ``uvicorn main:app`` (equivale a ``app.main:app``)."""

from app.main import app

__all__ = ["app"]
