"""Datos de demostración: cuentas demo y ofertas de ejemplo.

Las cuentas son las mismas de ``src/auth/demoAccounts.ts`` (contraseña ``123456``) y las
ofertas, las de ``src/data/jobOffers.ts``. Es idempotente: no duplica nada si se ejecuta dos veces.
"""

from datetime import timedelta

from sqlalchemy.orm import Session

from app.core.security import get_password_hash
from app.data import demo_offers
from app.models.common import utcnow
from app.models.offer import JobOffer
from app.models.user import User
from app.services.auth_service import get_user_by_email

DEMO_PASSWORD = "123456"

DEMO_ACCOUNTS: tuple[tuple[str, str, str], ...] = (
    ("ana.martinez@demo.fad", "Ana Martínez", "young"),
    ("carlos.ruiz@demo.fad", "Carlos Ruiz", "young"),
    ("rrhh@techsolutions.demo", "Tech Solutions S.L.", "company"),
    ("talento@innovadata.demo", "InnovaData", "company"),
)


def seed(db: Session) -> tuple[int, int]:
    """Crea las cuentas demo y las ofertas de ejemplo que falten.

    Las fechas de cierre se calculan desde hoy (``closesInDays``), como en el frontend.

    Returns:
        Número de cuentas y de ofertas creadas.
    """
    users_created = 0
    password_hash = get_password_hash(DEMO_PASSWORD)
    for email, name, role in DEMO_ACCOUNTS:
        if get_user_by_email(db, email) is None:
            db.add(User(email=email, name=name, role=role, password_hash=password_hash))
            users_created += 1

    offers_created = 0
    now = utcnow()
    for raw in demo_offers():
        if db.get(JobOffer, raw["id"]) is not None:
            continue
        db.add(
            JobOffer(
                id=raw["id"],
                company_email=raw["companyEmail"],
                company_name=raw["companyName"],
                title=raw["title"],
                sector=raw["sector"],
                city=raw["city"],
                commute=raw["commute"],
                modality=raw["modality"],
                workday=raw["workday"],
                contract=raw["contract"],
                salary_min=raw["salaryMin"],
                salary_max=raw["salaryMax"],
                description=raw["description"],
                requirements=raw["requirements"],
                open_to_newcomers=raw["openToNewcomers"],
                closes_at=(now + timedelta(days=raw["closesInDays"])).date(),
                response_days=raw["responseDays"],
                status="open",
                created_at=now - timedelta(days=3),
            )
        )
        offers_created += 1

    db.commit()
    return users_created, offers_created
