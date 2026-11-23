from __future__ import annotations


def test_partner_login_success(client, partner):
    response = client.post("/api/v1/auth/login", json={"mobile": partner.mobile, "password": "Partner@123"})

    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["data"]["access_token"]
    assert body["data"]["partner"]["mobile"] == partner.mobile
    # A refresh token must never appear in the JSON body — only as a cookie.
    assert "refresh_token" not in body["data"]
    assert "partner_refresh_token" in response.cookies


def test_partner_login_wrong_password(client, partner):
    response = client.post("/api/v1/auth/login", json={"mobile": partner.mobile, "password": "WrongPass1"})

    assert response.status_code == 401
    assert response.json()["error"] == "INVALID_CREDENTIALS"


def test_deactivated_partner_cannot_login(client, inactive_partner):
    response = client.post(
        "/api/v1/auth/login", json={"mobile": inactive_partner.mobile, "password": "Partner@123"}
    )

    assert response.status_code == 403
    assert response.json()["error"] == "ACCOUNT_DEACTIVATED"


def test_deactivation_takes_effect_immediately_on_token_refresh(client, db_session, partner):
    login = client.post("/api/v1/auth/login", json={"mobile": partner.mobile, "password": "Partner@123"})
    refresh_cookie = login.cookies["partner_refresh_token"]

    partner.is_active = False
    db_session.commit()

    client.cookies.set("partner_refresh_token", refresh_cookie)
    response = client.post("/api/v1/auth/refresh")

    assert response.status_code == 403
    assert response.json()["error"] == "ACCOUNT_DEACTIVATED"


def test_change_password_requires_authentication(client):
    response = client.post(
        "/api/v1/auth/change-password", json={"new_password": "NewPass123", "confirm_password": "NewPass123"}
    )
    assert response.status_code == 401


def test_change_password_updates_credentials(client, partner_auth_headers, partner):
    response = client.post(
        "/api/v1/auth/change-password",
        json={"new_password": "NewPass123", "confirm_password": "NewPass123"},
        headers=partner_auth_headers,
    )
    assert response.status_code == 200

    login = client.post("/api/v1/auth/login", json={"mobile": partner.mobile, "password": "NewPass123"})
    assert login.status_code == 200


def test_admin_login_uses_separate_token_scope_from_partner(client, admin, partner):
    admin_login = client.post("/api/v1/admin/auth/login", json={"mobile": admin.mobile, "password": "Admin@123"})
    admin_token = admin_login.json()["data"]["access_token"]

    # An admin access token must be rejected by partner-only endpoints.
    response = client.get("/api/v1/customers", headers={"Authorization": f"Bearer {admin_token}"})
    assert response.status_code == 401


def test_partner_me_returns_full_profile_for_the_profile_page(client, partner_auth_headers, partner):
    response = client.get("/api/v1/auth/me", headers=partner_auth_headers)

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["id"] == partner.id
    assert data["name"] == partner.name
    assert data["mobile"] == partner.mobile
    assert data["state_name"]
    assert data["city_name"]
    assert data["tahsil_name"]
    assert data["created_at"]


def test_admin_me_returns_full_profile_for_the_profile_page(client, admin_auth_headers, admin):
    response = client.get("/api/v1/admin/auth/me", headers=admin_auth_headers)

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["id"] == admin.id
    assert data["name"] == admin.name
    assert data["mobile"] == admin.mobile
    assert data["created_at"]


def test_admin_change_password_requires_authentication(client):
    response = client.post(
        "/api/v1/admin/auth/change-password",
        json={"new_password": "NewPass123", "confirm_password": "NewPass123"},
    )
    assert response.status_code == 401


def test_admin_change_password_updates_credentials(client, admin_auth_headers, admin):
    response = client.post(
        "/api/v1/admin/auth/change-password",
        json={"new_password": "NewPass123", "confirm_password": "NewPass123"},
        headers=admin_auth_headers,
    )
    assert response.status_code == 200

    login = client.post("/api/v1/admin/auth/login", json={"mobile": admin.mobile, "password": "NewPass123"})
    assert login.status_code == 200


def test_admin_can_upload_and_replace_their_own_profile_photo(client, admin_auth_headers):
    from io import BytesIO

    from PIL import Image

    assert client.get("/api/v1/admin/auth/me", headers=admin_auth_headers).json()["data"]["photo_url"] is None

    buffer = BytesIO()
    Image.new("RGB", (200, 200), color="green").save(buffer, format="JPEG")
    buffer.seek(0)

    response = client.post(
        "/api/v1/admin/auth/me/photo",
        headers=admin_auth_headers,
        files={"photo": ("admin.jpg", buffer, "image/jpeg")},
    )

    assert response.status_code == 200
    first_photo_url = response.json()["data"]["photo_url"]
    assert first_photo_url is not None

    me = client.get("/api/v1/admin/auth/me", headers=admin_auth_headers)
    assert me.json()["data"]["photo_url"] == first_photo_url

    # Uploading again replaces it with a new photo rather than erroring.
    buffer2 = BytesIO()
    Image.new("RGB", (200, 200), color="red").save(buffer2, format="JPEG")
    buffer2.seek(0)
    replaced = client.post(
        "/api/v1/admin/auth/me/photo",
        headers=admin_auth_headers,
        files={"photo": ("admin2.jpg", buffer2, "image/jpeg")},
    )
    assert replaced.status_code == 200
    assert replaced.json()["data"]["photo_url"] != first_photo_url


def test_admin_photo_upload_requires_authentication(client):
    from io import BytesIO

    response = client.post(
        "/api/v1/admin/auth/me/photo",
        files={"photo": ("admin.jpg", BytesIO(b"not-a-real-file"), "image/jpeg")},
    )
    assert response.status_code == 401
