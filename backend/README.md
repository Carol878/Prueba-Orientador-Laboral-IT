# API · Orientador Laboral (Fad Juventud)

FastAPI + SQLAlchemy 2 + SQLite (desarrollo) / PostgreSQL (producción). Sigue la guía `backend.md`
del equipo: capas `routers → services → models`, esquemas Pydantic, bcrypt y JWT.

```
backend/
├── app/
│   ├── core/       configuración, base de datos, seguridad (bcrypt, JWT), dependencias, errores JSON
│   ├── models/     User, JobOffer, Decision, Application, Consent
│   ├── schemas/    Pydantic en camelCase (alias de src/types.ts)
│   ├── services/   auth, ofertas, candidaturas, conservación, avisos, semilla
│   ├── routers/    /auth, /offers, /companies, /candidates, /applications
│   ├── data/       seed_data.json (ofertas de ejemplo y motivos de descarte de src/data/jobOffers.ts)
│   ├── cli.py      python -m app.cli seed | purge
│   └── main.py     aplicación FastAPI
├── tests/          pytest + TestClient (SQLite temporal)
└── main.py         atajo: uvicorn main:app
```

## Arrancar

```bash
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
cp .env.example .env
.venv/bin/python -m app.cli seed
.venv/bin/uvicorn app.main:app --reload      # documentación en http://localhost:8000/docs
.venv/bin/python -m pytest
```

> En Debian/Ubuntu sin el paquete `python3-venv`: `python3 -m venv --without-pip .venv` y
> `python3 -m pip --python .venv/bin/python install pip`.

## Reglas que aplica el servidor

- **Auth**: `POST /auth/register`, `POST /auth/login` → `{accessToken, tokenType, user}`, `GET /auth/me`.
  Contraseñas con bcrypt; el resto de rutas exige `Authorization: Bearer`.
- **Ofertas**: `GET /offers` solo abiertas y sin caducar. Crear, editar y cambiar estado solo la empresa dueña
  (el `companyEmail` sale del token). Salario obligatorio y mínimo ≤ máximo (422).
- **Consentimiento** antes del primer "Me interesa" (409 si falta). La candidatura se crea con copia del perfil en la
  misma transacción que la decisión; restricción única oferta + persona.
- **Anonimización en el servidor**: la empresa no recibe nombre ni email hasta `contact_open`, `interview` o `hired`.
  Con el contacto abierto, la persona candidata recibe `companyContactEmail`.
- **Proceso**: `pending → contact_open → interview → hired`; `declined` desde cualquier estado no final, con motivo
  obligatorio de la lista (422). Transición no válida: 409.
- **Conservación**: `python -m app.cli purge` borra candidaturas y decisiones sin actividad (`updatedAt`) desde hace más
  de `RETENTION_DAYS` (365). Pensado para un cron diario.
- **Avisos**: `app/services/notifications.py::notify` se llama con cada candidatura nueva y cada cambio de estado.
  Hoy solo escribe en el log; los emails reales son la siguiente fase.
- **Errores** siempre en JSON `{"detail": "..."}` sin trazas; los 422 añaden `errors` sin repetir los valores enviados.

## Notas

- `passlib 1.7.4` no funciona con `bcrypt >= 4.1`, por eso `bcrypt` está fijado en `4.0.1`.
  Si se migra a Python 3.13+ o se quiere quitar passlib, basta con cambiar `core/security.py` a `bcrypt` directo.
- Las tablas se crean al arrancar (`create_all`). Cuando el esquema cambie en producción, conviene usar Alembic.
- Para PostgreSQL: `pip install "psycopg[binary]"` y `DATABASE_URL=postgresql+psycopg://…`.
