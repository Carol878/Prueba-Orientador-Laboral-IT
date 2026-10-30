"""Configuración de la API leída de variables de entorno (o de un archivo ``.env``).

Se usa ``pydantic-settings`` para que cada valor llegue tipado y validado. El resto de módulos
importa ``settings`` en lugar de leer ``os.environ`` directamente.
"""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict

#: Clave de ejemplo. Si se usa fuera de desarrollo, ``main`` muestra un aviso en el log.
DEFAULT_JWT_SECRET = "cambia-esta-clave-en-produccion"


class Settings(BaseSettings):
    """Valores de configuración de la API.

    Attributes:
        database_url: URL de SQLAlchemy. SQLite en desarrollo, PostgreSQL en producción.
        jwt_secret: Clave con la que se firman los tokens JWT.
        jwt_algorithm: Algoritmo de firma de los JWT.
        access_token_expire_minutes: Minutos de validez de un token de acceso.
        cors_origins: Orígenes permitidos, separados por comas.
        retention_days: Días que se conservan candidaturas y decisiones (12 meses).
    """

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    database_url: str = "sqlite:///./orientador.db"
    jwt_secret: str = DEFAULT_JWT_SECRET
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 120
    cors_origins: str = "http://localhost:5173,https://orientador.fad.es,https://carol878.github.io"
    retention_days: int = 365

    @property
    def cors_origin_list(self) -> list[str]:
        """Devuelve los orígenes CORS como lista, sin espacios ni entradas vacías."""
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    """Devuelve la configuración (se lee una sola vez por proceso)."""
    return Settings()


settings = get_settings()
