from functools import lru_cache
from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Central application configuration, loaded from environment / .env file.

    Every runtime-sensitive value (secrets, expiry windows, storage roots) is
    defined here so the rest of the codebase never reads os.environ directly.
    """

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    environment: str = "development"

    database_url: str = "postgresql+psycopg2://janarogya:janarogya@localhost:5433/janarogya"

    @field_validator("database_url")
    @classmethod
    def _normalize_database_url(cls, value: str) -> str:
        """Managed Postgres providers (Render, Railway, Heroku, ...) hand out
        `postgres://` or plain `postgresql://` connection strings — psycopg2
        needs the `+psycopg2` driver marker, so rewrite the scheme instead of
        requiring every deploy target to hand-edit the URL."""

        if value.startswith("postgres://"):
            return "postgresql+psycopg2://" + value[len("postgres://") :]
        if value.startswith("postgresql://"):
            return "postgresql+psycopg2://" + value[len("postgresql://") :]
        return value

    jwt_access_secret: str
    jwt_refresh_secret: str
    jwt_access_expires_minutes: int = 480
    jwt_refresh_expires_days: int = 30
    jwt_algorithm: str = "HS256"

    aadhaar_encryption_key: str

    backend_base_url: str = "http://localhost:8000"
    frontend_public_url: str = "http://localhost:5173"
    cors_origins: str = "http://localhost:5173"

    storage_root: str = "./storage"
    max_photo_size_mb: int = 2

    login_rate_limit: str = "5/15minutes"
    public_card_rate_limit: str = "200/minute"

    organization_name: str = "Jan Kalyan Health Card"

    # Card brand config that ISN'T admin-editable at runtime — helpline,
    # fee, facilities, disclaimer note, and validity toggle live in the
    # database (see `CardSettings` / `card_settings_service`). Tagline
    # remains static here; `card_disclaimer_note` is only the seed default
    # for a freshly created CardSettings row / migration.
    card_tagline: str = "स्वस्थ परिवार, सुरक्षित भविष्य"
    card_disclaimer_note: str = (
        "नोट: यह कार्ड एक निजी स्वास्थ्य सदस्यता कार्ड है। यह किसी सरकारी योजना "
        "या आयुष्मान भारत कार्ड का विकल्प नहीं है।"
    )

    @property
    def cors_origin_list(self) -> list[str]:
        """Origins the browser is allowed to call this API from.

        Always unions `CORS_ORIGINS` with `FRONTEND_PUBLIC_URL` so a deploy
        that sets the public site URL (needed for QR deep-links) but forgets
        to mirror it into CORS — or mistypes it — doesn't silently break
        every login/request from the real frontend. This is exactly what
        was happening in production: the API returned 200 but the browser
        discarded it because `Access-Control-Allow-Origin` was empty for
        `https://jankalyanhealthcard.com`.
        """

        origins = [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]
        frontend = self.frontend_public_url.strip().rstrip("/")
        if frontend and frontend not in origins:
            origins.append(frontend)
        return origins

    @property
    def storage_path(self) -> Path:
        path = Path(self.storage_root)
        path.mkdir(parents=True, exist_ok=True)
        return path

    @property
    def is_production(self) -> bool:
        return self.environment.lower() == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()
