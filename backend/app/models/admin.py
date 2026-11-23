from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin


class Admin(TimestampMixin, Base):
    """Super admin account. Deliberately a separate table (not a Partner role
    flag) so the admin token scope is backed by an entirely distinct identity
    and query surface — a compromised partner row can never become an admin.
    """

    __tablename__ = "admins"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    mobile: Mapped[str] = mapped_column(String(15), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    photo_path: Mapped[str | None] = mapped_column(String(255))
