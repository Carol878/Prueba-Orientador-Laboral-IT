"""Fixtures de pytest: base de datos SQLite temporal, cliente HTTP y sesiones demo.

``DATABASE_URL`` se fija ANTES de importar la aplicación para que nunca toque la base de
datos de desarrollo. Cada test empieza con las tablas vacías y la semilla demo cargada.
"""

import os
import tempfile
from collections.abc import Iterator
from pathlib import Path
from typing import Any

_TMP_DIR = tempfile.mkdtemp(prefix="orientador-tests-")
os.environ["DATABASE_URL"] = f"sqlite:///{Path(_TMP_DIR) / 'test.db'}"
os.environ.setdefault("JWT_SECRET", "clave-solo-para-tests-" + "x" * 32)

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy.orm import Session  # noqa: E402

from app.core.database import Base, SessionLocal, engine, init_db  # noqa: E402
from app.main import app  # noqa: E402
from app.services.seed import seed  # noqa: E402

YOUNG = "ana.martinez@demo.fad"
OTHER_YOUNG = "carlos.ruiz@demo.fad"
COMPANY = "rrhh@techsolutions.demo"
OTHER_COMPANY = "talento@innovadata.demo"
TECH_OFFER = "demo-techsolutions-frontend"
PASSWORD = "123456"


@pytest.fixture(autouse=True)
def fresh_db() -> Iterator[None]:
    """Recrea las tablas y carga la semilla antes de cada test."""
    Base.metadata.drop_all(bind=engine)
    init_db()
    with SessionLocal() as db:
        seed(db)
    yield


@pytest.fixture
def db() -> Iterator[Session]:
    """Sesión directa a la base de datos de tests."""
    with SessionLocal() as session:
        yield session


@pytest.fixture
def client() -> TestClient:
    """Cliente HTTP contra la aplicación (sin servidor real)."""
    return TestClient(app)


def login(client: TestClient, email: str, password: str = PASSWORD) -> dict[str, str]:
    """Inicia sesión y devuelve la cabecera ``Authorization`` lista para usar."""
    response = client.post("/auth/login", json={"email": email, "password": password})
    assert response.status_code == 200, response.text
    return {"Authorization": f"Bearer {response.json()['accessToken']}"}


@pytest.fixture
def young(client: TestClient) -> dict[str, str]:
    """Cabeceras de Ana (joven demo)."""
    return login(client, YOUNG)


@pytest.fixture
def other_young(client: TestClient) -> dict[str, str]:
    """Cabeceras de Carlos (otro joven demo)."""
    return login(client, OTHER_YOUNG)


@pytest.fixture
def company(client: TestClient) -> dict[str, str]:
    """Cabeceras de Tech Solutions (dueña de ``TECH_OFFER``)."""
    return login(client, COMPANY)


@pytest.fixture
def other_company(client: TestClient) -> dict[str, str]:
    """Cabeceras de InnovaData (otra empresa)."""
    return login(client, OTHER_COMPANY)


def candidate_profile(email: str = YOUNG, name: str = "Ana Martínez") -> dict[str, Any]:
    """Perfil de ejemplo tal y como lo envía el frontend."""
    return {
        "email": email,
        "name": name,
        "profileType": "reskill",
        "targetRole": "Desarrollador/a frontend",
        "techStack": ["JavaScript", "HTML/CSS"],
        "learningSkills": ["React"],
        "englishLevel": "B1",
        "experienceMonths": "0-6",
        "workExperience": [{"role": "Dependienta", "sector": "Comercio", "years": 4, "tasks": "Caja e inventario"}],
        "portfolioUrl": "https://github.com/ana-demo",
        "mainProject": "Web de una asociación de vecinos",
        "practicedInterview": True,
    }


def express_interest(client: TestClient, headers: dict[str, str], email: str = YOUNG, offer_id: str = TECH_OFFER) -> None:
    """Da el consentimiento y marca "Me interesa" en una oferta."""
    assert client.put(f"/candidates/{email}/consent", headers=headers).status_code == 200
    response = client.put(
        f"/candidates/{email}/decisions/{offer_id}",
        headers=headers,
        json={"decision": "interested", "candidate": candidate_profile(email), "wantsFadSupport": True},
    )
    assert response.status_code == 204, response.text
