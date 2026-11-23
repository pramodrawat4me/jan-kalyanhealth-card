from __future__ import annotations


def test_admin_can_create_partner(client, admin_auth_headers, location):
    response = client.post(
        "/api/v1/admin/partners",
        headers=admin_auth_headers,
        data={
            "name": "New Partner",
            "mobile": "9333333333",
            "password": "TempPass123",
            "state_id": location["state"].id,
            "city_id": location["city"].id,
            "tahsil_id": location["tahsil"].id,
        },
    )

    assert response.status_code == 201
    data = response.json()["data"]
    assert data["mobile"] == "9333333333"
    assert data["is_active"] is True
    assert data["customer_count"] == 0
    assert data["photo_url"] is None

    login = client.post("/api/v1/auth/login", json={"mobile": "9333333333", "password": "TempPass123"})
    assert login.status_code == 200


def test_admin_can_create_partner_with_photo(client, admin_auth_headers, location):
    from io import BytesIO

    from PIL import Image

    buffer = BytesIO()
    Image.new("RGB", (200, 200), color="blue").save(buffer, format="JPEG")
    buffer.seek(0)

    response = client.post(
        "/api/v1/admin/partners",
        headers=admin_auth_headers,
        data={
            "name": "Photo Partner",
            "mobile": "9333333334",
            "password": "TempPass123",
            "state_id": location["state"].id,
            "city_id": location["city"].id,
            "tahsil_id": location["tahsil"].id,
        },
        files={"photo": ("partner.jpg", buffer, "image/jpeg")},
    )

    assert response.status_code == 201
    data = response.json()["data"]
    assert data["photo_url"] is not None


def test_admin_cannot_create_duplicate_mobile(client, admin_auth_headers, location, partner):
    response = client.post(
        "/api/v1/admin/partners",
        headers=admin_auth_headers,
        data={
            "name": "Duplicate",
            "mobile": partner.mobile,
            "password": "TempPass123",
            "state_id": location["state"].id,
            "city_id": location["city"].id,
            "tahsil_id": location["tahsil"].id,
        },
    )
    assert response.status_code == 409


def test_partner_token_cannot_access_admin_routes(client, partner_auth_headers):
    response = client.get("/api/v1/admin/partners", headers=partner_auth_headers)
    assert response.status_code == 401


def test_admin_deactivate_then_activate_partner(client, admin_auth_headers, partner):
    deactivate = client.patch(f"/api/v1/admin/partners/{partner.id}/deactivate", headers=admin_auth_headers)
    assert deactivate.status_code == 200
    assert deactivate.json()["data"]["is_active"] is False

    login_attempt = client.post("/api/v1/auth/login", json={"mobile": partner.mobile, "password": "Partner@123"})
    assert login_attempt.status_code == 403

    activate = client.patch(f"/api/v1/admin/partners/{partner.id}/activate", headers=admin_auth_headers)
    assert activate.status_code == 200
    assert activate.json()["data"]["is_active"] is True

    login_again = client.post("/api/v1/auth/login", json={"mobile": partner.mobile, "password": "Partner@123"})
    assert login_again.status_code == 200


def test_admin_can_delete_a_partner_with_no_customers(client, admin_auth_headers, location):
    created = client.post(
        "/api/v1/admin/partners",
        headers=admin_auth_headers,
        data={
            "name": "Disposable Partner",
            "mobile": "9444455556",
            "password": "TempPass123",
            "state_id": location["state"].id,
            "city_id": location["city"].id,
            "tahsil_id": location["tahsil"].id,
        },
    )
    partner_id = created.json()["data"]["id"]

    deleted = client.delete(f"/api/v1/admin/partners/{partner_id}", headers=admin_auth_headers)
    assert deleted.status_code == 200

    # Gone from the list, and its mobile is free to reuse.
    listing = client.get("/api/v1/admin/partners?page=1&limit=100", headers=admin_auth_headers)
    assert all(p["id"] != partner_id for p in listing.json()["data"])
    reuse = client.post(
        "/api/v1/admin/partners",
        headers=admin_auth_headers,
        data={
            "name": "Reused Number",
            "mobile": "9444455556",
            "password": "TempPass123",
            "state_id": location["state"].id,
            "city_id": location["city"].id,
            "tahsil_id": location["tahsil"].id,
        },
    )
    assert reuse.status_code == 201


def test_admin_cannot_delete_a_partner_that_has_customers(client, admin_auth_headers, partner_auth_headers, location):
    from tests.conftest import create_customer_via_api

    create_customer_via_api(client, partner_auth_headers, city_id=location["city"].id)

    response = client.get("/api/v1/admin/partners?page=1&limit=100", headers=admin_auth_headers)
    partner_with_customer = next(p for p in response.json()["data"] if p["customer_count"] > 0)

    blocked = client.delete(f"/api/v1/admin/partners/{partner_with_customer['id']}", headers=admin_auth_headers)
    assert blocked.status_code == 409


def test_admin_can_delete_a_partner_after_its_customers_are_deleted(
    client, admin_auth_headers, partner_auth_headers, partner, db_session, location
):
    """Customer deletion is a soft delete, so the rows (plus print logs and
    photo bytes) stay behind — deleting the partner must purge them instead
    of being blocked by them forever."""

    from app.models.customer import Customer
    from app.models.print_log import CardPrintLog
    from app.models.stored_file import StoredFile
    from tests.conftest import create_customer_via_api

    partner_id = partner.id
    created = create_customer_via_api(client, partner_auth_headers, city_id=location["city"].id)
    customer_id = created.json()["data"]["id"]

    # Print the card so a print-log row exists for the purge to clean up.
    printed = client.get(f"/api/v1/admin/customers/{customer_id}/print", headers=admin_auth_headers)
    assert printed.status_code == 200

    # Soft-delete the customer, then delete the partner.
    assert client.delete(f"/api/v1/admin/customers/{customer_id}", headers=admin_auth_headers).status_code == 200
    deleted = client.delete(f"/api/v1/admin/partners/{partner_id}", headers=admin_auth_headers)
    assert deleted.status_code == 200

    # Nothing orphaned: the soft-deleted customer row, its print history,
    # and the stored photo bytes are all gone with the partner.
    db_session.expire_all()
    assert db_session.query(Customer).filter(Customer.partner_id == partner_id).count() == 0
    assert db_session.query(CardPrintLog).filter(CardPrintLog.partner_id == partner_id).count() == 0
    assert db_session.query(StoredFile).count() == 0


def test_admin_hospital_crud_and_toggle(client, admin_auth_headers, partner_auth_headers, location):
    create = client.post(
        "/api/v1/admin/hospitals",
        headers=admin_auth_headers,
        json={"name": "City Care Hospital", "city_id": location["city"].id, "phone": "0755-2222222"},
    )
    assert create.status_code == 201
    hospital_id = create.json()["data"]["id"]

    visible = client.get("/api/v1/hospitals", headers=partner_auth_headers)
    assert any(h["id"] == hospital_id for h in visible.json()["data"])

    toggle = client.patch(f"/api/v1/admin/hospitals/{hospital_id}/toggle", headers=admin_auth_headers)
    assert toggle.status_code == 200
    assert toggle.json()["data"]["is_active"] is False

    hidden = client.get("/api/v1/hospitals", headers=partner_auth_headers)
    assert all(h["id"] != hospital_id for h in hidden.json()["data"])


def test_admin_location_master_create_flow(client, admin_auth_headers):
    state = client.post("/api/v1/admin/locations/states", headers=admin_auth_headers, json={"name": "Rajasthan"})
    assert state.status_code == 201
    state_id = state.json()["data"]["id"]

    city = client.post(
        "/api/v1/admin/locations/cities", headers=admin_auth_headers, json={"name": "Kota", "state_id": state_id}
    )
    assert city.status_code == 201
    city_id = city.json()["data"]["id"]

    tahsil = client.post(
        "/api/v1/admin/locations/tahsils", headers=admin_auth_headers, json={"name": "Kota City", "city_id": city_id}
    )
    assert tahsil.status_code == 201
    assert tahsil.json()["data"]["state_id"] == state_id

    cities = client.get(f"/api/v1/locations/cities/{state_id}")
    assert any(c["id"] == city_id for c in cities.json()["data"])


def test_admin_can_delete_an_unused_location_hierarchy(client, admin_auth_headers):
    """Deleting a state cascades through its unused cities and tahsils —
    child locations are pure master data with no life of their own."""

    state_id = client.post(
        "/api/v1/admin/locations/states", headers=admin_auth_headers, json={"name": "Deleteland"}
    ).json()["data"]["id"]
    city_id = client.post(
        "/api/v1/admin/locations/cities", headers=admin_auth_headers, json={"name": "Gonetown", "state_id": state_id}
    ).json()["data"]["id"]
    client.post(
        "/api/v1/admin/locations/tahsils", headers=admin_auth_headers, json={"name": "Gonepur", "city_id": city_id}
    )

    deleted = client.delete(f"/api/v1/admin/locations/states/{state_id}", headers=admin_auth_headers)
    assert deleted.status_code == 200

    assert all(s["id"] != state_id for s in client.get("/api/v1/locations/states").json()["data"])
    assert client.get(f"/api/v1/locations/cities/{state_id}").json()["data"] == []
    assert client.get(f"/api/v1/locations/tahsils/{city_id}").json()["data"] == []


def test_admin_cannot_delete_locations_in_use(client, admin_auth_headers, partner, location):
    """The `partner` fixture registers under this exact state/city/tahsil,
    so all three levels must refuse deletion with a 409."""

    for path in (
        f"states/{location['state'].id}",
        f"cities/{location['city'].id}",
        f"tahsils/{location['tahsil'].id}",
    ):
        blocked = client.delete(f"/api/v1/admin/locations/{path}", headers=admin_auth_headers)
        assert blocked.status_code == 409
        assert "used by" in blocked.json()["message"]


def test_admin_can_delete_a_hospital(client, admin_auth_headers):
    created = client.post("/api/v1/admin/hospitals", headers=admin_auth_headers, json={"name": "Closing Hospital"})
    hospital_id = created.json()["data"]["id"]

    deleted = client.delete(f"/api/v1/admin/hospitals/{hospital_id}", headers=admin_auth_headers)
    assert deleted.status_code == 200

    listing = client.get("/api/v1/admin/hospitals?page=1&limit=100", headers=admin_auth_headers)
    assert all(h["id"] != hospital_id for h in listing.json()["data"])
