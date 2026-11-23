from __future__ import annotations

from datetime import date

from app.core.security import hash_password
from app.models.partner import Partner
from tests.conftest import create_customer_via_api


def test_add_customer_generates_card_id_and_validity(client, partner_auth_headers, location):
    response = create_customer_via_api(client, partner_auth_headers, city_id=location["city"].id)

    assert response.status_code == 201
    data = response.json()["data"]
    assert data["card_id"].startswith(date.today().strftime("%Y%m%d"))
    assert data["validity_date"] == date(date.today().year + 3, date.today().month, date.today().day).isoformat()
    # Aadhaar must never be echoed back in full.
    assert "aadhaar_last4" in data
    assert data["aadhaar_last4"] == "9012"
    assert "aadhaar_no" not in data
    assert "aadhaar_encrypted" not in data


def test_customer_list_only_shows_own_partner_data(client, db_session, location, partner):
    other_partner = Partner(
        name="Other Partner",
        mobile="9222222222",
        password_hash=hash_password("Partner@123"),
        state_id=location["state"].id,
        city_id=location["city"].id,
        tahsil_id=location["tahsil"].id,
        is_active=True,
    )
    db_session.add(other_partner)
    db_session.commit()

    login_a = client.post("/api/v1/auth/login", json={"mobile": partner.mobile, "password": "Partner@123"})
    headers_a = {"Authorization": f"Bearer {login_a.json()['data']['access_token']}"}
    login_b = client.post("/api/v1/auth/login", json={"mobile": other_partner.mobile, "password": "Partner@123"})
    headers_b = {"Authorization": f"Bearer {login_b.json()['data']['access_token']}"}

    create_customer_via_api(client, headers_a, city_id=location["city"].id, mobile="6266607840", name="Partner A Customer")
    create_customer_via_api(client, headers_b, city_id=location["city"].id, mobile="6266607841", name="Partner B Customer")

    list_a = client.get("/api/v1/customers", headers=headers_a).json()
    list_b = client.get("/api/v1/customers", headers=headers_b).json()

    assert len(list_a["data"]) == 1
    assert list_a["data"][0]["name"] == "Partner A Customer"
    assert len(list_b["data"]) == 1
    assert list_b["data"][0]["name"] == "Partner B Customer"


def test_partner_cannot_fetch_another_partners_customer_by_id(client, db_session, location, partner):
    other_partner = Partner(
        name="Other Partner",
        mobile="9222222222",
        password_hash=hash_password("Partner@123"),
        state_id=location["state"].id,
        city_id=location["city"].id,
        tahsil_id=location["tahsil"].id,
        is_active=True,
    )
    db_session.add(other_partner)
    db_session.commit()

    login_a = client.post("/api/v1/auth/login", json={"mobile": partner.mobile, "password": "Partner@123"})
    headers_a = {"Authorization": f"Bearer {login_a.json()['data']['access_token']}"}
    created = create_customer_via_api(client, headers_a, city_id=location["city"].id)
    customer_id = created.json()["data"]["id"]

    login_b = client.post("/api/v1/auth/login", json={"mobile": other_partner.mobile, "password": "Partner@123"})
    headers_b = {"Authorization": f"Bearer {login_b.json()['data']['access_token']}"}

    response = client.get(f"/api/v1/customers/{customer_id}", headers=headers_b)
    assert response.status_code == 404


def test_soft_deleted_customer_disappears_from_list_but_is_not_destroyed(
    client, db_session, partner_auth_headers, location
):
    created = create_customer_via_api(client, partner_auth_headers, city_id=location["city"].id)
    customer_id = created.json()["data"]["id"]

    delete_response = client.delete(f"/api/v1/customers/{customer_id}", headers=partner_auth_headers)
    assert delete_response.status_code == 200

    list_response = client.get("/api/v1/customers", headers=partner_auth_headers)
    assert list_response.json()["data"] == []

    from app.models.customer import Customer

    row = db_session.get(Customer, customer_id)
    assert row is not None
    assert row.is_deleted is True


def test_find_customer_requires_mobile_or_card_id(client, partner_auth_headers):
    response = client.get("/api/v1/customers/find", headers=partner_auth_headers)
    assert response.status_code == 400


def test_find_customer_by_mobile(client, partner_auth_headers, location):
    create_customer_via_api(client, partner_auth_headers, city_id=location["city"].id, mobile="6266607840")

    response = client.get("/api/v1/customers/find", params={"mobile": "6266607840"}, headers=partner_auth_headers)
    assert response.status_code == 200
    assert len(response.json()["data"]) == 1


def test_add_customer_with_malformed_dob_returns_standard_error_envelope(client, partner_auth_headers, location):
    """Regression test: an unparsable `dob` triggers FastAPI's own automatic
    Form-parameter validation (RequestValidationError), not our manually
    raised ValidationError — both must map to the same response envelope,
    or the frontend is left with an unhelpful generic error message."""

    response = client.post(
        "/api/v1/customers",
        headers=partner_auth_headers,
        data={
            "name": "Bad Dob",
            "father_husband": "Father",
            "mobile": "6266607840",
            "aadhaar_no": "123456789012",
            "address": "Address",
            "city_id": str(location["city"].id),
            "dob": "",
            "gender": "male",
        },
        files={"photo": ("photo.jpg", b"irrelevant-for-this-test", "image/jpeg")},
    )

    assert response.status_code == 400
    body = response.json()
    assert body["success"] is False
    assert body["error"] == "VALIDATION_ERROR"
    assert "dob" in body["fields"]


def test_customer_rejects_invalid_aadhaar(client, partner_auth_headers, location):
    response = client.post(
        "/api/v1/customers",
        headers=partner_auth_headers,
        data={
            "name": "Bad Aadhaar",
            "father_husband": "Father",
            "mobile": "6266607840",
            "aadhaar_no": "123",
            "address": "Address",
            "city_id": str(location["city"].id),
            "dob": date(1995, 5, 20).isoformat(),
            "gender": "male",
        },
        files={"photo": ("photo.jpg", b"not-a-real-image", "image/jpeg")},
    )
    assert response.status_code == 400


def test_partner_can_update_own_customer_profile(client, partner_auth_headers, location):
    created = create_customer_via_api(
        client, partner_auth_headers, city_id=location["city"].id, name="Before Edit"
    )
    customer_id = created.json()["data"]["id"]
    card_id = created.json()["data"]["card_id"]
    validity = created.json()["data"]["validity_date"]

    response = client.put(
        f"/api/v1/customers/{customer_id}",
        headers=partner_auth_headers,
        data={
            "name": "After Edit",
            "father_husband": "Updated Father",
            "mobile": "9876543210",
            "address": "New address line",
            "city_id": str(location["city"].id),
            "dob": date(1990, 1, 15).isoformat(),
            "gender": "female",
        },
    )

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["name"] == "After Edit"
    assert data["father_husband"] == "Updated Father"
    assert data["mobile"] == "9876543210"
    assert data["gender"] == "female"
    assert data["aadhaar_last4"] == "9012"
    assert data["card_id"] == card_id
    assert data["validity_date"] == validity


def test_partner_cannot_update_another_partners_customer(client, db_session, location, partner):
    other_partner = Partner(
        name="Other Partner",
        mobile="9222222222",
        password_hash=hash_password("Partner@123"),
        state_id=location["state"].id,
        city_id=location["city"].id,
        tahsil_id=location["tahsil"].id,
        is_active=True,
    )
    db_session.add(other_partner)
    db_session.commit()

    login_a = client.post("/api/v1/auth/login", json={"mobile": partner.mobile, "password": "Partner@123"})
    headers_a = {"Authorization": f"Bearer {login_a.json()['data']['access_token']}"}
    created = create_customer_via_api(client, headers_a, city_id=location["city"].id)
    customer_id = created.json()["data"]["id"]

    login_b = client.post("/api/v1/auth/login", json={"mobile": other_partner.mobile, "password": "Partner@123"})
    headers_b = {"Authorization": f"Bearer {login_b.json()['data']['access_token']}"}

    response = client.put(
        f"/api/v1/customers/{customer_id}",
        headers=headers_b,
        data={
            "name": "Hijacked",
            "father_husband": "Father",
            "mobile": "9876543210",
            "address": "Address",
            "city_id": str(location["city"].id),
            "dob": date(1990, 1, 15).isoformat(),
            "gender": "male",
        },
    )
    assert response.status_code == 404
