"""Customer photo storage.

`FileStorage` is a small interface so the persistence backend is swappable
without touching any service or router. `DatabaseFileStorage` is the only
implementation used today — it validates, re-encodes, and resizes uploads
with Pillow, then stores the resulting bytes as a row in Postgres (the
`stored_files` table) rather than on local disk.

Why the database and not the filesystem: Render's free-tier web service has
no persistent disk. Its container filesystem is wiped on every redeploy and
on the fresh container that gets spun up after a free instance idles down
and later wakes up for a new request — a photo uploaded and immediately
visible could silently disappear a few hours later purely because the
service happened to restart in between. Postgres (a managed, persistent
service) doesn't have that problem, so storing the bytes there instead
makes uploads durable for free, in both local dev and production.
"""

from __future__ import annotations

import uuid
from abc import ABC, abstractmethod
from io import BytesIO

from PIL import Image
from sqlalchemy.orm import Session

from app.core.exceptions import PayloadTooLargeError, ValidationError
from app.models.stored_file import StoredFile

_ALLOWED_FORMATS = {"JPEG", "PNG"}
# Passport-style frame used on the printed card (matches
# `card_pdf_service` `_PHOTO_W`/`_PHOTO_H` = 28×34 mm → 14:17 ratio).
# Stored at 10× so the PDF and preview can crop/cover without upscaling.
_TARGET_SIZE = (280, 340)


class FileStorage(ABC):
    @abstractmethod
    def save_photo(self, raw_bytes: bytes, max_size_mb: int) -> str:
        """Validate, process, and persist a customer photo. Returns a
        storage-relative key suitable for `Customer.photo_path`."""

    @abstractmethod
    def read(self, relative_path: str) -> bytes:
        """Read back previously stored bytes, for embedding into PDFs.
        Raises `FileNotFoundError` if the key doesn't exist."""

    @abstractmethod
    def resolve_url(self, relative_path: str) -> str:
        """Public-ish URL the frontend can use to display the photo."""


class DatabaseFileStorage(FileStorage):
    """Stores processed photo bytes as a `StoredFile` row in the same
    request-scoped session used for the rest of the write — the photo row
    and the `Customer` row it's referenced from commit together."""

    def __init__(self, db: Session, base_url: str) -> None:
        self._db = db
        self._base_url = base_url.rstrip("/")

    def save_photo(self, raw_bytes: bytes, max_size_mb: int) -> str:
        max_bytes = max_size_mb * 1024 * 1024
        if len(raw_bytes) > max_bytes:
            raise PayloadTooLargeError(f"Photo exceeds the {max_size_mb} MB size limit.")

        try:
            image = Image.open(BytesIO(raw_bytes))
            image.verify()
            # verify() invalidates the file handle for further use — reopen.
            image = Image.open(BytesIO(raw_bytes))
        except OSError as exc:
            raise ValidationError("Uploaded file is not a valid image.") from exc

        if image.format not in _ALLOWED_FORMATS:
            raise ValidationError("Only JPEG and PNG photos are accepted.")

        # Re-encoding through Pillow (rather than storing raw bytes) strips
        # EXIF metadata and any non-image payload appended to the file.
        image = image.convert("RGB")
        image = _resize_and_crop(image, _TARGET_SIZE)

        buffer = BytesIO()
        image.save(buffer, format="JPEG", quality=85)

        key = f"photos/{uuid.uuid4().hex}.jpg"
        self._db.add(StoredFile(key=key, content_type="image/jpeg", content=buffer.getvalue()))
        self._db.flush()

        return key

    def read(self, relative_path: str) -> bytes:
        record = self._db.query(StoredFile).filter(StoredFile.key == relative_path).first()
        if record is None:
            raise FileNotFoundError(relative_path)
        return record.content

    def resolve_url(self, relative_path: str) -> str:
        return f"{self._base_url}/storage/{relative_path}"


def _resize_and_crop(image: Image.Image, target: tuple[int, int]) -> Image.Image:
    """Cover-crop then resize to `target` (passport ratio), so portraits and
    landscapes both fill the card photo frame without stretch or letterboxing.
    Mirrors CSS `object-cover` used by the frontend card preview.
    """

    target_w, target_h = target
    src_w, src_h = image.size
    target_ratio = target_w / target_h
    src_ratio = src_w / src_h

    if src_ratio > target_ratio:
        # Source is wider — crop left/right.
        new_w = int(src_h * target_ratio)
        left = (src_w - new_w) // 2
        cropped = image.crop((left, 0, left + new_w, src_h))
    else:
        # Source is taller — crop top/bottom, bias slightly toward the top
        # so faces stay in frame for typical portrait uploads.
        new_h = int(src_w / target_ratio)
        top = max(0, (src_h - new_h) // 5)
        cropped = image.crop((0, top, src_w, top + new_h))

    return cropped.resize(target, Image.LANCZOS)
