"""Tests de ofertas: listado, publicación, validación de salario y permisos."""

from datetime import date, timedelta
from typing import Any

from fastapi.testclient import TestClient

from tests.conftest import COMPANY, OTHER_COMPANY, TECH_OFFER


def offer_body(**overrides: Any) -> dict[str, Any]:
    """Oferta válida en camelCase, como la envía el panel de empresa."""
    body: dict[str, Any] = {
        "companyEmail": COMPANY,
        "companyName": "Tech Solutions S.L.",
        "title": "Auxiliar administrativo/a con Excel",
        "sector": "Tecnología",
        "city": "Sevilla",
        "commute": "Centro · Metro L1",
        "modality": "Presencial",
        "workday": "Parcial",
        "contract": "Temporal 6 meses",
        "salaryMin": 15000,
        "salaryMax": 17000,
        "description": "Gestión de facturas y hojas de cálculo.",
        "requirements": [
            {"id": "r1", "label": "Excel", "kind": "knowledge", "essential": True, "trainable": True, "skills": ["Excel"]}
        ],
        "openToNewcomers": True,
        "closesAt": (date.today() + timedelta(days=20)).isoformat(),
        "responseDays": 5,
        "status": "open",
    }
    body.update(overrides)
    return body


def test_open_offers_excludes_paused_and_expired(client: TestClient, young: dict[str, str], company: dict[str, str]) -> None:
    ids = {o["id"] for o in client.get("/offers", headers=young).json()}
    assert TECH_OFFER in ids and len(ids) == 10

    assert client.patch(f"/offers/{TECH_OFFER}/status", headers=company, json={"status": "paused"}).status_code == 204
    expired = client.post("/offers", headers=company, json=offer_body(closesAt="2020-01-01")).json()

    ids = {o["id"] for o in client.get("/offers", headers=young).json()}
    assert TECH_OFFER not in ids
    assert expired["id"] not in ids


def test_offer_json_uses_camel_case(client: TestClient, young: dict[str, str]) -> None:
    offer = client.get("/offers", headers=young).json()[0]
    for key in ("companyEmail", "salaryMin", "salaryMax", "openToNewcomers", "closesAt", "responseDays", "createdAt"):
        assert key in offer
    assert len(offer["closesAt"]) == 10  # AAAA-MM-DD


def test_company_creates_and_edits_offer(client: TestClient, company: dict[str, str]) -> None:
    created = client.post("/offers", headers=company, json=offer_body(companyEmail="suplantada@otra.es"))
    assert created.status_code == 201
    offer = created.json()
    assert offer["id"].startswith("offer-")
    assert offer["companyEmail"] == COMPANY  # El email sale del token, no del cuerpo.

    edited = client.put(f"/offers/{offer['id']}", headers=company, json={**offer, "salaryMax": 18000})
    assert edited.status_code == 200
    assert edited.json()["salaryMax"] == 18000
    assert edited.json()["createdAt"] == offer["createdAt"]

    mine = client.get(f"/companies/{COMPANY}/offers", headers=company).json()
    assert offer["id"] in {o["id"] for o in mine}


def test_offer_without_salary_is_rejected(client: TestClient, company: dict[str, str]) -> None:
    body = offer_body()
    del body["salaryMin"]
    assert client.post("/offers", headers=company, json=body).status_code == 422


def test_salary_min_cannot_exceed_max(client: TestClient, company: dict[str, str]) -> None:
    response = client.post("/offers", headers=company, json=offer_body(salaryMin=30000, salaryMax=20000))
    assert response.status_code == 422
    assert "salario" in response.json()["detail"].lower()


def test_other_company_cannot_touch_foreign_offers(client: TestClient, other_company: dict[str, str]) -> None:
    assert client.put(f"/offers/{TECH_OFFER}", headers=other_company, json=offer_body()).status_code == 403
    assert client.patch(f"/offers/{TECH_OFFER}/status", headers=other_company, json={"status": "closed"}).status_code == 403
    assert client.get(f"/companies/{COMPANY}/offers", headers=other_company).status_code == 403
    assert client.get(f"/companies/{OTHER_COMPANY}/offers", headers=other_company).status_code == 200


def test_young_cannot_publish_offers(client: TestClient, young: dict[str, str]) -> None:
    assert client.post("/offers", headers=young, json=offer_body()).status_code == 403


def test_unknown_offer_returns_404(client: TestClient, company: dict[str, str]) -> None:
    assert client.patch("/offers/no-existe/status", headers=company, json={"status": "closed"}).status_code == 404
