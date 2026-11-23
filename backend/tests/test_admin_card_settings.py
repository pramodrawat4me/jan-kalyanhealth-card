"""Admin-editable card settings — the equivalent of the reference tool's
"Card Settings" tab. Unlike the tool, these persist server-side and are
admin-authenticated, not just held in browser form state."""

from __future__ import annotations


def test_get_card_settings_returns_seeded_defaults_on_first_read(client, admin_auth_headers):
    response = client.get("/api/v1/admin/card-settings", headers=admin_auth_headers)

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["back_helpline"]
    assert data["registration_fee"]
    assert isinstance(data["facilities"], list) and len(data["facilities"]) > 0


def test_update_card_settings_persists_across_requests(client, admin_auth_headers):
    payload = {
        "back_helpline": "+91-7000000002",
        "registration_fee": "99",
        "facilities": ["निशुल्क जांच", "एक्स-रे सुविधा", "आपातकालीन सेवा"],
        "disclaimer_note": "नोट: परीक्षण नोट पाठ।",
        "show_validity": True,
    }

    update_response = client.put("/api/v1/admin/card-settings", headers=admin_auth_headers, json=payload)
    assert update_response.status_code == 200
    assert update_response.json()["data"] == payload

    refetched = client.get("/api/v1/admin/card-settings", headers=admin_auth_headers)
    assert refetched.json()["data"] == payload


def test_show_validity_defaults_to_off(client, admin_auth_headers):
    response = client.get("/api/v1/admin/card-settings", headers=admin_auth_headers)

    assert response.status_code == 200
    assert response.json()["data"]["show_validity"] is False


def test_disclaimer_note_defaults_to_seeded_text(client, admin_auth_headers):
    response = client.get("/api/v1/admin/card-settings", headers=admin_auth_headers)

    assert response.status_code == 200
    note = response.json()["data"]["disclaimer_note"]
    assert "नोट:" in note
    assert "आयुष्मान" in note


def test_update_card_settings_strips_blank_facility_lines(client, admin_auth_headers):
    response = client.put(
        "/api/v1/admin/card-settings",
        headers=admin_auth_headers,
        json={
            "back_helpline": "+91-7000000002",
            "registration_fee": "60",
            "facilities": ["  ", "प्राईवेट अस्पताल", "", "मेडिकल स्टोर्स"],
            "disclaimer_note": "नोट: अपडेटेड नोट।",
        },
    )

    assert response.status_code == 200
    assert response.json()["data"]["facilities"] == ["प्राईवेट अस्पताल", "मेडिकल स्टोर्स"]
    assert response.json()["data"]["disclaimer_note"] == "नोट: अपडेटेड नोट।"


def test_card_settings_requires_admin_authentication(client):
    response = client.get("/api/v1/admin/card-settings")
    assert response.status_code == 401


def test_card_settings_rejects_partner_session(client, partner_auth_headers):
    response = client.get("/api/v1/admin/card-settings", headers=partner_auth_headers)
    assert response.status_code == 401
