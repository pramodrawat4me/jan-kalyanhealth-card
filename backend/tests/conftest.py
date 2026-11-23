"""Shared pytest fixtures.

Tests run against an isolated SQLite database (not the dev Postgres
instance) so the suite has zero external dependencies and can run in CI
with nothing more than `pip install -r requirements.txt`. Environment
variables required by `Settings` are set before `app.main` is imported,
since several modules read settings at import time.
"""

from __future__ import annotations

import os

os.environ.setdefault("JWT_ACCESS_SECRET", "test-access-secret")
os.environ.setdefault("JWT_REFRESH_SECRET", "test-refresh-secret")
os.environ.setdefault("AADHAAR_ENCRYPTION_KEY", "G+QGmQ3Ltlwn2JVVrmeNbxbuCRRbSAjIepcVB7LNNtk=")
os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")

import io  # noqa: E402
from datetime import date  # noqa: E402

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from PIL import Image  # noqa: E402
from sqlalchemy import create_engine  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402

from app.core.rate_limit import limiter  # noqa: E402
from app.core.security import hash_password  # noqa: E402
from app.db.base import Base  # noqa: E402
from app.db.session import get_db  # noqa: E402
from app.main import app  # noqa: E402
from app.models.admin import Admin  # noqa: E402
from app.models.location import City, State, Tahsil  # noqa: E402
from app.models.partner import Partner  # noqa: E402


@pytest.fixture(autouse=True)
def _reset_rate_limits():
    """The limiter's storage is a process-wide singleton, so without a reset
    the 5-attempts-per-15-minutes login limit would bleed across unrelated
    tests that all originate from the same TestClient "IP"."""

    limiter.reset()
    yield


@pytest.fixture()
def db_engine():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    yield engine
    Base.metadata.drop_all(engine)


@pytest.fixture()
def db_session(db_engine):
    session_local = sessionmaker(bind=db_engine, autoflush=False, autocommit=False)
    session = session_local()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture()
def client(db_engine):
    session_local = sessionmaker(bind=db_engine, autoflush=False, autocommit=False)

    def override_get_db():
        session = session_local()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture()
def location(db_session):
    state = State(name="Madhya Pradesh")
    db_session.add(state)
    db_session.flush()
    city = City(name="Ashoknagar", state_id=state.id)
    db_session.add(city)
    db_session.flush()
    tahsil = Tahsil(name="Ashoknagar", city_id=city.id, state_id=state.id)
    db_session.add(tahsil)
    db_session.commit()
    return {"state": state, "city": city, "tahsil": tahsil}


@pytest.fixture()
def partner(db_session, location):
    partner = Partner(
        name="Boby Rawat",
        mobile="9098475371",
        password_hash=hash_password("Partner@123"),
        state_id=location["state"].id,
        city_id=location["city"].id,
        tahsil_id=location["tahsil"].id,
        is_active=True,
    )
    db_session.add(partner)
    db_session.commit()
    return partner


@pytest.fixture()
def inactive_partner(db_session, location):
    partner = Partner(
        name="Deactivated Partner",
        mobile="9111111111",
        password_hash=hash_password("Partner@123"),
        state_id=location["state"].id,
        city_id=location["city"].id,
        tahsil_id=location["tahsil"].id,
        is_active=False,
    )
    db_session.add(partner)
    db_session.commit()
    return partner


@pytest.fixture()
def admin(db_session):
    admin = Admin(name="Super Admin", mobile="9999999999", password_hash=hash_password("Admin@123"))
    db_session.add(admin)
    db_session.commit()
    return admin


@pytest.fixture()
def partner_token(client, partner):
    response = client.post("/api/v1/auth/login", json={"mobile": partner.mobile, "password": "Partner@123"})
    assert response.status_code == 200
    return response.json()["data"]["access_token"]


@pytest.fixture()
def partner_auth_headers(partner_token):
    return {"Authorization": f"Bearer {partner_token}"}


@pytest.fixture()
def admin_token(client, admin):
    response = client.post("/api/v1/admin/auth/login", json={"mobile": admin.mobile, "password": "Admin@123"})
    assert response.status_code == 200
    return response.json()["data"]["access_token"]


@pytest.fixture()
def admin_auth_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


def make_test_photo() -> io.BytesIO:
    buffer = io.BytesIO()
    Image.new("RGB", (200, 200), color="blue").save(buffer, format="JPEG")
    buffer.seek(0)
    return buffer


def create_customer_via_api(client, headers, *, city_id: int, mobile: str = "6266607840", name: str = "Test Customer"):
    return client.post(
        "/api/v1/customers",
        headers=headers,
        data={
            "name": name,
            "father_husband": "Test Father",
            "mobile": mobile,
            "aadhaar_no": "123456789012",
            "address": "Some address",
            "city_id": str(city_id),
            "dob": date(1995, 5, 20).isoformat(),
            "gender": "male",
        },
        files={"photo": ("photo.jpg", make_test_photo(), "image/jpeg")},
    )
