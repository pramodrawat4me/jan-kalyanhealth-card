"""Stored-file persistence (the `stored_files` table holds photo bytes —
see `app.core.file_storage.DatabaseFileStorage` for why the database and
not a disk). Reads and writes happen through `DatabaseFileStorage`; this
repository only exists for bulk cleanup, currently the partner-delete
purge."""

from __future__ import annotations

from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.models.stored_file import StoredFile


class StoredFileRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def delete_by_keys(self, keys: list[str]) -> int:
        if not keys:
            return 0
        result = self.db.execute(delete(StoredFile).where(StoredFile.key.in_(keys)))
        self.db.flush()
        return result.rowcount
