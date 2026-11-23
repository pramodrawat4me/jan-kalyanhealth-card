from __future__ import annotations

from tests.conftest import create_customer_via_api


def test_partner_can_no_longer_print_their_own_card(client, partner_auth_headers, location):
    """Printing is admin-only — the old partner-facing route is gone."""

    created = create_customer_via_api(client, partner_auth_headers, city_id=location["city"].id)
    customer_id = created.json()["data"]["id"]

    response = client.get(f"/api/v1/cards/print/{customer_id}", headers=partner_auth_headers)
    assert response.status_code == 404


def test_public_card_status_mirrors_the_printed_card_but_never_exposes_aadhaar(
    client, partner_auth_headers, location
):
    """The QR scan page shows exactly what's already printed on the physical
    card (name, father/husband, mobile, DOB, gender, address, photo,
    partner, validity) — scanning the QR requires holding that same card,
    so this isn't a new disclosure. Aadhaar is never printed on the card
    and must stay excluded here too."""

    created = create_customer_via_api(client, partner_auth_headers, city_id=location["city"].id)
    card_id = created.json()["data"]["card_id"]

    response = client.get(f"/api/v1/cards/public/{card_id}")

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["card_id"] == card_id
    assert data["is_valid"] is True
    assert data["name"] == created.json()["data"]["name"]
    assert data["father_husband"] == created.json()["data"]["father_husband"]
    assert data["mobile"] == created.json()["data"]["mobile"]
    assert data["address"] == created.json()["data"]["address"]
    assert data["gender"] == created.json()["data"]["gender"]
    assert data["partner_name"]
    assert "aadhaar_last4" not in data
    assert "aadhaar_no" not in data


def test_admin_batch_print_returns_one_pdf_and_logs_each_customer(
    client, admin_auth_headers, partner_auth_headers, location
):
    """"Print selected": one combined A4 PDF (four customers per page),
    with a print-log entry for every customer in the batch — the Printed
    badges and per-partner print counts must move exactly as if each card
    had been printed individually."""

    ids = []
    for i in range(3):
        created = create_customer_via_api(
            client, partner_auth_headers, city_id=location["city"].id, mobile=f"917000000{i}"
        )
        ids.append(created.json()["data"]["id"])

    response = client.post(
        "/api/v1/admin/customers/print-batch",
        headers=admin_auth_headers,
        json={"customer_ids": ids},
    )

    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert response.content.startswith(b"%PDF")

    for customer_id in ids:
        detail = client.get(f"/api/v1/admin/customers/{customer_id}", headers=admin_auth_headers)
        assert detail.json()["data"]["last_printed_at"] is not None


def test_admin_batch_print_rejects_unknown_ids_and_oversized_batches(client, admin_auth_headers):
    unknown = client.post(
        "/api/v1/admin/customers/print-batch",
        headers=admin_auth_headers,
        json={"customer_ids": [999999]},
    )
    assert unknown.status_code == 404

    oversized = client.post(
        "/api/v1/admin/customers/print-batch",
        headers=admin_auth_headers,
        json={"customer_ids": list(range(1, 23))},
    )
    assert oversized.status_code == 400


def test_public_card_status_requires_no_authentication(client, partner_auth_headers, location):
    created = create_customer_via_api(client, partner_auth_headers, city_id=location["city"].id)
    card_id = created.json()["data"]["card_id"]

    response = client.get(f"/api/v1/cards/public/{card_id}")
    assert response.status_code == 200


def test_public_card_status_unknown_card_returns_404(client):
    response = client.get("/api/v1/cards/public/00000000000000")
    assert response.status_code == 404


def test_brand_config_is_public_and_reflects_admin_settings(client, admin_auth_headers):
    """The live card preview and the printed PDF must read the exact same
    admin-edited values — this is the one endpoint that proves it, without
    a partner session, since the reference tool's settings tab is
    unauthenticated too on the client side."""

    updated = client.put(
        "/api/v1/admin/card-settings",
        headers=admin_auth_headers,
        json={
            "back_helpline": "+91-8000011112",
            "registration_fee": "75",
            "facilities": ["सुविधा एक", "सुविधा दो"],
            "disclaimer_note": "नोट: ब्रांड कॉन्फ़िग परीक्षण।",
        },
    )
    assert updated.status_code == 200

    response = client.get("/api/v1/cards/brand-config")
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["back_helpline"] == "+91-8000011112"
    assert data["registration_fee"] == "75"
    assert data["facilities"] == ["सुविधा एक", "सुविधा दो"]
    assert data["disclaimer_note"] == "नोट: ब्रांड कॉन्फ़िग परीक्षण।"


def test_admin_can_print_card_and_it_logs_against_the_owning_partner(client, admin_auth_headers, partner_auth_headers, location):
    created = create_customer_via_api(client, partner_auth_headers, city_id=location["city"].id)
    customer_id = created.json()["data"]["id"]

    response = client.get(f"/api/v1/admin/customers/{customer_id}/print", headers=admin_auth_headers)

    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert response.content.startswith(b"%PDF")

    today = client.get("/api/v1/cards/today", headers=partner_auth_headers).json()
    assert len(today["data"]) == 1
    assert today["data"][0]["card_id"] == created.json()["data"]["card_id"]

    activity = client.get(f"/api/v1/admin/customers/{customer_id}/activity", headers=admin_auth_headers).json()
    assert len(activity["data"]) == 1
    assert activity["data"][0]["printed_by"] == "Super Admin"


def test_admin_reprinting_increments_total_printing_count(client, admin_auth_headers, partner_auth_headers, location):
    created = create_customer_via_api(client, partner_auth_headers, city_id=location["city"].id)
    customer_id = created.json()["data"]["id"]

    client.get(f"/api/v1/admin/customers/{customer_id}/print", headers=admin_auth_headers)
    client.get(f"/api/v1/admin/customers/{customer_id}/print", headers=admin_auth_headers)

    # The raw activity log still has one row per print event...
    printings = client.get("/api/v1/cards/printings", headers=partner_auth_headers).json()
    assert printings["meta"]["total"] == 2


def test_reprinting_the_same_card_counts_once_per_customer_in_aggregates(
    client, admin_auth_headers, partner_auth_headers, location
):
    """`total_prints` / partner `print_count` must reflect distinct
    customers ever printed, not raw print events — reprinting the same card
    five times must not inflate the count past one."""

    created = create_customer_via_api(client, partner_auth_headers, city_id=location["city"].id)
    customer_id = created.json()["data"]["id"]

    for _ in range(3):
        client.get(f"/api/v1/admin/customers/{customer_id}/print", headers=admin_auth_headers)

    summary = client.get("/api/v1/cards/dashboard-summary", headers=partner_auth_headers).json()["data"]
    assert summary["total_prints"] == 1
    assert summary["cards_printed_today"] == 1

    partners = client.get("/api/v1/admin/partners", headers=admin_auth_headers).json()["data"]
    matching = next(p for p in partners if p["print_count"] > 0 or p["customer_count"] > 0)
    assert matching["print_count"] == 1


def test_last_printed_at_visible_on_partner_and_admin_sides(
    client, admin_auth_headers, partner_auth_headers, location
):
    """A card that's never been printed reports `last_printed_at: null`
    everywhere it's surfaced; once an admin prints it, both the partner's
    own customer list/detail *and* the admin's customer list/detail must
    show the same non-null timestamp — this is what makes "has this card
    been printed" visible on both sides, not just buried in the admin-only
    activity log."""

    created = create_customer_via_api(client, partner_auth_headers, city_id=location["city"].id)
    customer_id = created.json()["data"]["id"]
    assert created.json()["data"]["last_printed_at"] is None

    partner_detail_before = client.get(f"/api/v1/customers/{customer_id}", headers=partner_auth_headers).json()
    assert partner_detail_before["data"]["last_printed_at"] is None

    partner_list_before = client.get("/api/v1/customers", headers=partner_auth_headers).json()
    row_before = next(c for c in partner_list_before["data"] if c["id"] == customer_id)
    assert row_before["last_printed_at"] is None

    print_response = client.get(f"/api/v1/admin/customers/{customer_id}/print", headers=admin_auth_headers)
    assert print_response.status_code == 200

    partner_detail_after = client.get(f"/api/v1/customers/{customer_id}", headers=partner_auth_headers).json()
    assert partner_detail_after["data"]["last_printed_at"] is not None

    partner_list_after = client.get("/api/v1/customers", headers=partner_auth_headers).json()
    row_after = next(c for c in partner_list_after["data"] if c["id"] == customer_id)
    assert row_after["last_printed_at"] is not None

    admin_detail = client.get(f"/api/v1/admin/customers/{customer_id}", headers=admin_auth_headers).json()
    assert admin_detail["data"]["last_printed_at"] is not None

    admin_list = client.get("/api/v1/admin/customers", headers=admin_auth_headers).json()
    admin_row = next(c for c in admin_list["data"] if c["id"] == customer_id)
    assert admin_row["last_printed_at"] is not None


def test_partner_cannot_print_via_admin_route(client, partner_auth_headers, location):
    created = create_customer_via_api(client, partner_auth_headers, city_id=location["city"].id)
    customer_id = created.json()["data"]["id"]

    response = client.get(f"/api/v1/admin/customers/{customer_id}/print", headers=partner_auth_headers)
    assert response.status_code == 401


def test_admin_customer_detail_returns_full_profile(client, admin_auth_headers, partner_auth_headers, location):
    created = create_customer_via_api(client, partner_auth_headers, city_id=location["city"].id)
    customer_id = created.json()["data"]["id"]

    response = client.get(f"/api/v1/admin/customers/{customer_id}", headers=admin_auth_headers)
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["id"] == customer_id
    assert data["partner_name"]


def test_admin_customer_detail_unknown_id_returns_404(client, admin_auth_headers):
    response = client.get("/api/v1/admin/customers/999999", headers=admin_auth_headers)
    assert response.status_code == 404


def test_admin_can_delete_any_customer(client, admin_auth_headers, partner_auth_headers, location):
    """Admin delete is not scoped to a single partner — unlike the
    partner-facing delete route, an admin can remove any customer."""

    created = create_customer_via_api(client, partner_auth_headers, city_id=location["city"].id)
    customer_id = created.json()["data"]["id"]

    response = client.delete(f"/api/v1/admin/customers/{customer_id}", headers=admin_auth_headers)
    assert response.status_code == 200

    # Soft-deleted — no longer visible via either the admin or partner view.
    assert client.get(f"/api/v1/admin/customers/{customer_id}", headers=admin_auth_headers).status_code == 404
    assert client.get(f"/api/v1/customers/{customer_id}", headers=partner_auth_headers).status_code == 404


def test_admin_delete_unknown_customer_returns_404(client, admin_auth_headers):
    response = client.delete("/api/v1/admin/customers/999999", headers=admin_auth_headers)
    assert response.status_code == 404


def test_partner_cannot_delete_customer_via_admin_route(client, partner_auth_headers, location):
    created = create_customer_via_api(client, partner_auth_headers, city_id=location["city"].id)
    customer_id = created.json()["data"]["id"]

    response = client.delete(f"/api/v1/admin/customers/{customer_id}", headers=partner_auth_headers)
    assert response.status_code == 401
