"""Tests de registro, inicio de sesión y protección de rutas."""

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.user import User
from tests.conftest import YOUNG, login


def test_register_login_and_me(client: TestClient) -> None:
    body = {"email": "Nueva@Ejemplo.org", "password": "secreta1", "name": "Lucía", "role": "young"}
    response = client.post("/auth/register", json=body)
    assert response.status_code == 201
    data = response.json()
    assert data["tokenType"] == "bearer"
    assert data["user"]["email"] == "nueva@ejemplo.org"
    assert "passwordHash" not in data["user"]

    headers = login(client, "nueva@ejemplo.org", "secreta1")
    me = client.get("/auth/me", headers=headers)
    assert me.status_code == 200
    assert me.json()["role"] == "young"


def test_password_is_never_stored_in_plain_text(client: TestClient, db: Session) -> None:
    client.post("/auth/register", json={"email": "a@b.es", "password": "secreta1", "name": "A", "role": "company"})
    user = db.scalar(select(User).where(User.email == "a@b.es"))
    assert user is not None
    assert user.password_hash != "secreta1"
    assert user.password_hash.startswith("$2")  # bcrypt


def test_duplicate_email_is_rejected(client: TestClient) -> None:
    body = {"email": YOUNG, "password": "secreta1", "name": "Otra Ana", "role": "young"}
    response = client.post("/auth/register", json=body)
    assert response.status_code == 409
    assert "detail" in response.json()


def test_wrong_password_returns_401_without_leaking(client: TestClient) -> None:
    response = client.post("/auth/login", json={"email": YOUNG, "password": "malamala"})
    assert response.status_code == 401
    unknown = client.post("/auth/login", json={"email": "nadie@demo.fad", "password": "malamala"})
    assert unknown.status_code == 401
    assert response.json() == unknown.json()


def test_validation_error_does_not_echo_password(client: TestClient) -> None:
    response = client.post("/auth/register", json={"email": "no-es-email", "password": "superclave", "name": "X", "role": "young"})
    assert response.status_code == 422
    assert isinstance(response.json()["detail"], str)
    assert "superclave" not in response.text


def test_routes_require_token(client: TestClient) -> None:
    assert client.get("/offers").status_code == 401
    assert client.get("/auth/me", headers={"Authorization": "Bearer token-falso"}).status_code == 401
