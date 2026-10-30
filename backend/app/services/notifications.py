"""Punto único de avisos a usuarios.

Hoy solo deja constancia en el log. En la siguiente fase aquí se enviarán los emails reales
(o se encolarán), sin tocar el resto del código: los servicios ya llaman a ``notify`` en los
momentos adecuados (candidatura nueva y cambio de estado).

Por privacidad, el log no incluye el perfil de la persona ni el motivo completo de descarte.
"""

import logging
from typing import Literal

logger = logging.getLogger("app.notifications")

NotificationEvent = Literal["application_created", "application_status_changed"]


def notify(event: NotificationEvent, recipient_email: str, *, application_id: str, offer_id: str, status: str | None = None) -> None:
    """Avisa a un usuario de un cambio en una candidatura.

    Args:
        event: Tipo de aviso (``application_created`` para la empresa, ``application_status_changed``
            para la persona candidata).
        recipient_email: Destinatario del aviso.
        application_id: Candidatura afectada.
        offer_id: Oferta a la que pertenece.
        status: Estado nuevo, cuando aplica.
    """
    logger.info(
        "Aviso %s para %s (candidatura %s, oferta %s%s)",
        event,
        recipient_email,
        application_id,
        offer_id,
        f", estado {status}" if status else "",
    )
