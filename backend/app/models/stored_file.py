from sqlalchemy import LargeBinary, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin


class StoredFile(Base, TimestampMixin):
    """Binary blob storage for customer photos, keyed by the same
    `"photos/<uuid>.jpg"` string that lives in `Customer.photo_path`.

    Render's free-tier web service has no persistent disk — its local
    filesystem is wiped on every restart/redeploy and on the container
    that gets spun back up after the free instance idles down. A photo
    uploaded and immediately downloadable would silently vanish a few
    hours later once that happened. Storing the bytes in Postgres (which
    *is* persistent) instead of on disk means uploads survive restarts,
    redeploys, and idle spin-downs for free.
    """

    __tablename__ = "stored_files"

    id: Mapped[int] = mapped_column(primary_key=True)
    key: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    content_type: Mapped[str] = mapped_column(String(50), nullable=False, default="image/jpeg")
    content: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
