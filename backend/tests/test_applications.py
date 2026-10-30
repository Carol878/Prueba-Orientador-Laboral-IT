"""Tests de decisiones, consentimiento, candidaturas, anonimización y transiciones de estado."""

import pytest
from fastapi.testclient import TestClient

from app.data import DECLINE_REASONS
from app.services import notifications
from tests.conftest import COMPANY, OTHER_YOUNG, TECH_OFFER, YOUNG, candidate_profile, express_interest


def applicants(client: TestClient, headers: dict[str, str]) -> list[dict]:
    response = client.get(f"/offers/{TECH_OFFER}/applications", headers=headers)
    assert response.status_code == 200, response.text
    return response.json()


def test_interest_requires_prior_consent(client: TestClient, young: dict[str, str]) -> None:
    body = {"decision": "interested", "candidate": candidate_profile(), "wantsFadSupport": False}
    response = client.put(f"/candidates/{YOUNG}/decisions/{TECH_OFFER}", headers=young, json=body)
    assert response.status_code == 409
    assert client.get(f"/candidates/{YOUNG}/applications", headers=young).json() == []
    assert client.get(f"/candidates/{YOUNG}/decisions", headers=young).json() == {}

    assert client.get(f"/candidates/{YOUNG}/consent", headers=young).json() == {"consentedAt": None}
    given = client.put(f"/candidates/{YOUNG}/consent", headers=young).json()
    assert given["consentedAt"].endswith("Z")


def test_skip_and_save_do_not_need_consent_nor_create_applications(client: TestClient, young: dict[str, str]) -> None:
    for offer_id, decision in ((TECH_OFFER, "skipped"), ("demo-techsolutions-qa", "saved")):
        response = client.put(f"/candidates/{YOUNG}/decisions/{offer_id}", headers=young, json={"decision": decision})
        assert response.status_code == 204
    assert client.get(f"/candidates/{YOUNG}/decisions", headers=young).json() == {
        TECH_OFFER: "skipped",
        "demo-techsolutions-qa": "saved",
    }
    assert client.get(f"/candidates/{YOUNG}/applications", headers=young).json() == []


def test_full_flow_interest_contact_interview_hired(
    client: TestClient, young: dict[str, str], company: dict[str, str], monkeypatch: pytest.MonkeyPatch
) -> None:
    sent: list[tuple[str, str]] = []
    monkeypatch.setattr(notifications, "notify", lambda event, to, **_: sent.append((event, to)))

    express_interest(client, young)
    assert sent == [("application_created", COMPANY)]

    # La empresa ve la candidatura nueva, anónima.
    [app] = applicants(client, company)
    assert app["status"] == "pending"
    assert app["unseenByCompany"] is True
    assert app["candidateEmail"] == ""
    assert app["candidate"]["name"] == "" and app["candidate"]["email"] == ""
    assert app["candidate"]["workExperience"][0]["role"] == "Dependienta"
    assert "declineReason" not in app

    # El joven aún no ve el email de la empresa.
    [mine] = client.get(f"/candidates/{YOUNG}/applications", headers=young).json()
    assert "companyContactEmail" not in mine
    assert mine["candidate"]["name"] == "Ana Martínez"

    # Abrir contacto revela nombre y email.
    opened = client.patch(f"/applications/{app['id']}", headers=company, json={"status": "contact_open"})
    assert opened.status_code == 200
    assert opened.json()["candidateEmail"] == YOUNG
    assert opened.json()["candidate"]["name"] == "Ana Martínez"
    assert applicants(client, company)[0]["candidate"]["email"] == YOUNG

    [mine] = client.get(f"/candidates/{YOUNG}/applications", headers=young).json()
    assert mine["companyContactEmail"] == COMPANY
    assert mine["unseenByCandidate"] is True

    for status in ("interview", "hired"):
        response = client.patch(f"/applications/{app['id']}", headers=company, json={"status": status})
        assert response.status_code == 200
        assert response.json()["status"] == status

    assert sent[1:] == [("application_status_changed", YOUNG)] * 3

    # Contratada es un estado final.
    final = client.patch(f"/applications/{app['id']}", headers=company, json={"status": "declined", "declineReason": DECLINE_REASONS[1]})
    assert final.status_code == 409


def test_interest_twice_does_not_duplicate(client: TestClient, young: dict[str, str], company: dict[str, str]) -> None:
    express_interest(client, young)
    express_interest(client, young)
    assert len(applicants(client, company)) == 1


def test_young_cannot_read_other_people_data(client: TestClient, young: dict[str, str], other_young: dict[str, str]) -> None:
    express_interest(client, young)
    assert client.get(f"/candidates/{YOUNG}/applications", headers=other_young).status_code == 403
    assert client.get(f"/candidates/{YOUNG}/decisions", headers=other_young).status_code == 403
    assert client.get(f"/candidates/{YOUNG}/consent", headers=other_young).status_code == 403
    assert client.put(f"/candidates/{YOUNG}/decisions/{TECH_OFFER}", headers=other_young, json={"decision": "skipped"}).status_code == 403
    # Un joven tampoco puede ver las candidaturas de una oferta.
    assert client.get(f"/offers/{TECH_OFFER}/applications", headers=young).status_code == 403


def test_candidate_cannot_apply_with_someone_else_identity(client: TestClient, other_young: dict[str, str], company: dict[str, str]) -> None:
    client.put(f"/candidates/{OTHER_YOUNG}/consent", headers=other_young)
    body = {"decision": "interested", "candidate": candidate_profile(email=YOUNG, name="Ana Martínez")}
    assert client.put(f"/candidates/{OTHER_YOUNG}/decisions/{TECH_OFFER}", headers=other_young, json=body).status_code == 204
    [app] = applicants(client, company)
    opened = client.patch(f"/applications/{app['id']}", headers=company, json={"status": "contact_open"}).json()
    assert opened["candidateEmail"] == OTHER_YOUNG
    assert opened["candidate"]["email"] == OTHER_YOUNG


def test_other_company_cannot_see_or_change_applications(
    client: TestClient, young: dict[str, str], other_company: dict[str, str], company: dict[str, str]
) -> None:
    express_interest(client, young)
    [app] = applicants(client, company)
    assert client.get(f"/offers/{TECH_OFFER}/applications", headers=other_company).status_code == 403
    assert client.patch(f"/applications/{app['id']}", headers=other_company, json={"status": "contact_open"}).status_code == 403
    assert client.post(f"/applications/{app['id']}/seen", headers=other_company, json={"by": "company"}).status_code == 403


def test_decline_requires_reason_from_the_list(client: TestClient, young: dict[str, str], company: dict[str, str]) -> None:
    express_interest(client, young)
    [app] = applicants(client, company)
    url = f"/applications/{app['id']}"

    assert client.patch(url, headers=company, json={"status": "declined"}).status_code == 422
    assert client.patch(url, headers=company, json={"status": "declined", "declineReason": "No me gusta"}).status_code == 422

    declined = client.patch(url, headers=company, json={"status": "declined", "declineReason": DECLINE_REASONS[0]})
    assert declined.status_code == 200
    assert declined.json()["declineReason"] == DECLINE_REASONS[0]
    # Descartada antes de abrir contacto: sigue siendo anónima.
    assert declined.json()["candidate"]["name"] == ""

    [mine] = client.get(f"/candidates/{YOUNG}/applications", headers=young).json()
    assert mine["status"] == "declined" and mine["declineReason"] == DECLINE_REASONS[0]
    assert "companyContactEmail" not in mine


def test_invalid_transitions_are_rejected(client: TestClient, young: dict[str, str], company: dict[str, str]) -> None:
    express_interest(client, young)
    [app] = applicants(client, company)
    url = f"/applications/{app['id']}"
    assert client.patch(url, headers=company, json={"status": "hired"}).status_code == 409
    assert client.patch(url, headers=company, json={"status": "interview"}).status_code == 409
    assert client.patch(url, headers=company, json={"status": "pending"}).status_code == 409
    assert client.patch(url, headers=company, json={}).status_code == 422
    assert client.patch(url, headers=company, json={"status": "estado-raro"}).status_code == 422


def test_undo_withdraws_pending_application_only(client: TestClient, young: dict[str, str], company: dict[str, str]) -> None:
    express_interest(client, young)
    assert client.delete(f"/candidates/{YOUNG}/decisions/{TECH_OFFER}", headers=young).status_code == 204
    assert applicants(client, company) == []
    assert client.get(f"/candidates/{YOUNG}/decisions", headers=young).json() == {}

    # Si la empresa ya ha respondido, deshacer no borra la candidatura.
    express_interest(client, young)
    [app] = applicants(client, company)
    client.patch(f"/applications/{app['id']}", headers=company, json={"status": "contact_open"})
    client.delete(f"/candidates/{YOUNG}/decisions/{TECH_OFFER}", headers=young)
    assert len(applicants(client, company)) == 1


def test_mark_seen(client: TestClient, young: dict[str, str], company: dict[str, str], other_young: dict[str, str]) -> None:
    express_interest(client, young)
    [app] = applicants(client, company)
    assert client.post(f"/applications/{app['id']}/seen", headers=company, json={"by": "company"}).status_code == 204
    assert applicants(client, company)[0]["unseenByCompany"] is False

    client.patch(f"/applications/{app['id']}", headers=company, json={"status": "contact_open"})
    assert client.post(f"/applications/{app['id']}/seen", headers=other_young, json={"by": "candidate"}).status_code == 403
    assert client.post(f"/applications/{app['id']}/seen", headers=young, json={"by": "candidate"}).status_code == 204
    [mine] = client.get(f"/candidates/{YOUNG}/applications", headers=young).json()
    assert mine["unseenByCandidate"] is False


def test_cannot_apply_to_closed_offer(client: TestClient, young: dict[str, str], company: dict[str, str]) -> None:
    client.patch(f"/offers/{TECH_OFFER}/status", headers=company, json={"status": "closed"})
    client.put(f"/candidates/{YOUNG}/consent", headers=young)
    response = client.put(f"/candidates/{YOUNG}/decisions/{TECH_OFFER}", headers=young, json={"decision": "interested", "candidate": candidate_profile()})
    assert response.status_code == 409
