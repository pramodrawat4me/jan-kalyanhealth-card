from __future__ import annotations

from sqlalchemy.orm import Session

from app.core.file_storage import FileStorage
from app.models.admin import Admin


def resolve_photo_url(storage: FileStorage, admin: Admin) -> str | None:
    if not admin.photo_path:
        return None
    return storage.resolve_url(admin.photo_path)


def update_admin_photo(db: Session, storage: FileStorage, admin: Admin, photo_bytes: bytes, max_size_mb: int) -> Admin:
    """Replaces the admin's own profile photo — same crop/compress/store
    pipeline as customer and partner photos (`FileStorage.save_photo`), just
    scoped to the admin's own account via `/admin/auth/me/photo`."""

    admin.photo_path = storage.save_photo(photo_bytes, max_size_mb)
    db.flush()
    return admin
