from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.admin import Admin


class AdminRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_by_mobile(self, mobile: str) -> Admin | None:
        stmt = select(Admin).where(Admin.mobile == mobile)
        return self.db.execute(stmt).scalar_one_or_none()

    def get_by_id(self, admin_id: int) -> Admin | None:
        return self.db.get(Admin, admin_id)
