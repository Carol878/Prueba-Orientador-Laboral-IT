"""Tests de conservación de datos (12 meses)."""

from datetime import timedelta

from fastapi.testclient import TestClient
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.models.application import Application, Decision
from app.models.common import utcnow
from app.services.retention import purge_expired
from tests.conftest import YOUNG, express_interest


def test_purge_removes_only_data_older_than_12_months(client: TestClient, young: dict[str, str], db: Session) -> None:
    express_interest(client, young)
    client.put(f"/candidates/{YOUNG}/decisions/demo-techsolutions-qa", headers=young, json={"decision": "saved"})

    # Envejece la candidatura y la decisión de la oferta de frontend 13 meses.
    old = utcnow() - timedelta(days=400)
    db.execute(update(Application).values(updated_at=old, created_at=old))
    db.execute(update(Decision).where(Decision.offer_id == "demo-techsolutions-frontend").values(updated_at=old))
    db.commit()

    result = purge_expired(db)
    assert (result.applications, result.decisions) == (1, 1)
    assert db.scalars(select(Application)).all() == []
    assert [d.offer_id for d in db.scalars(select(Decision))] == ["demo-techsolutions-qa"]

    # Una segunda pasada no borra nada más.
    assert purge_expired(db).applications == 0
