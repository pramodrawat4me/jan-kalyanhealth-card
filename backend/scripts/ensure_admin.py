"""Guarantees exactly one bootstrap admin account exists.

Runs on every container start (see `Dockerfile`'s CMD) right after migrations
— idempotent, so it's a no-op once the admin already exists. This is how a
fresh production database (no shell/one-off-job access on Render's free
plan) gets its first login without exposing the DB connection string
anywhere outside the deploy itself.

Usage (from backend/):
    python -m scripts.ensure_admin
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parent.parent))

from app.core.security import hash_password  # noqa: E402
from app.db.session import SessionLocal  # noqa: E402
from app.models.admin import Admin  # noqa: E402

BOOTSTRAP_ADMIN_MOBILE = "9584028379"
BOOTSTRAP_ADMIN_PASSWORD = "Admin@123"


def ensure_admin() -> None:
    db = SessionLocal()
    try:
        admin = db.query(Admin).filter(Admin.mobile == BOOTSTRAP_ADMIN_MOBILE).one_or_none()
        if admin is None:
            db.add(
                Admin(
                    name="Super Admin",
                    mobile=BOOTSTRAP_ADMIN_MOBILE,
                    password_hash=hash_password(BOOTSTRAP_ADMIN_PASSWORD),
                )
            )
            db.commit()
            print(f"Created bootstrap admin ({BOOTSTRAP_ADMIN_MOBILE}).")
        else:
            print(f"Bootstrap admin already exists ({BOOTSTRAP_ADMIN_MOBILE}) — no-op.")
    finally:
        db.close()


if __name__ == "__main__":
    ensure_admin()
