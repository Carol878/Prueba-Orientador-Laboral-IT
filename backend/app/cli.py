"""Comandos de mantenimiento.

Uso (desde ``backend/``)::

    python -m app.cli seed    # cuentas demo y ofertas de ejemplo
    python -m app.cli purge   # borra candidaturas y decisiones de más de 12 meses
"""

import argparse
import logging

from app.core.database import SessionLocal, init_db
from app.services.retention import purge_expired
from app.services.seed import seed


def main(argv: list[str] | None = None) -> int:
    """Ejecuta el comando indicado y devuelve el código de salida."""
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
    parser = argparse.ArgumentParser(prog="python -m app.cli", description="Mantenimiento de la API")
    parser.add_argument("command", choices=["seed", "purge"], help="seed: datos demo · purge: conservación 12 meses")
    args = parser.parse_args(argv)

    init_db()
    with SessionLocal() as db:
        if args.command == "seed":
            users, offers = seed(db)
            print(f"Semilla completada: {users} cuentas y {offers} ofertas nuevas.")
        else:
            result = purge_expired(db)
            print(f"Conservación: borradas {result.applications} candidaturas y {result.decisions} decisiones.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
