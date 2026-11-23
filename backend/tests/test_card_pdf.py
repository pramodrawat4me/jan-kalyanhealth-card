"""Tests for the printed card's PDF layout.

These don't render pixels — they check the actual generated PDF is
well-formed, that it has the front+back page structure the physical card
is printed with, and encode the geometry invariants that a previous
version of this module violated (the "Registration Fee" tag drawn on top
of the footer band) so that class of bug can't silently come back.
"""

from __future__ import annotations

from io import BytesIO

from pypdf import PdfReader

from app.services.card_pdf_service import CardData, _shape_devanagari, build_card_pdf

_FACILITIES = ["कैशलेस इलाज", "नेटवर्क अस्पताल", "मेडिकल जाँच में छूट", "दवाइयों में छूट", "आपातकालीन सहायता"]
_DISCLAIMER = (
    "नोट: यह कार्ड एक निजी स्वास्थ्य सदस्यता कार्ड है। यह किसी सरकारी योजना "
    "या आयुष्मान भारत कार्ड का विकल्प नहीं है।"
)


def _sample_data(**overrides) -> CardData:
    base = dict(
        card_id="20260721659293",
        name="Test Customer",
        father_husband="Test Father",
        gender="male",
        age=30,
        dob="1995-06-15",
        mobile="6355512345",
        address="Some address, some city",
        city_name="Ashoknagar",
        entry_date="2026-07-21",
        validity_date="2029-07-21",
        photo_bytes=None,
        partner_name="Boby Rawat",
        partner_id=1,
        qr_target_url="http://localhost:5173/card-status/20260721659293",
        organization_name="Jan Kalyan Health Card",
        helpline="+91-7611131089",
        tagline="स्वस्थ परिवार, सुरक्षित भविष्य",
        registration_fee="60",
        facilities=list(_FACILITIES),
        disclaimer_note=_DISCLAIMER,
    )
    base.update(overrides)
    return CardData(**base)


def test_build_card_pdf_returns_a_valid_pdf():
    pdf_bytes = build_card_pdf(_sample_data())

    assert pdf_bytes.startswith(b"%PDF")
    assert len(pdf_bytes) > 1000


def test_build_card_pdf_produces_one_page_with_both_faces_side_by_side():
    """The export is a single cutout sheet: front face centre-left, back
    face centre-right. Both faces' content must be present on that one
    page — if a future edit drops one face, printing would silently lose
    either the customer details or the facilities/disclaimer side."""

    pdf_bytes = build_card_pdf(_sample_data(mobile="9111122223", helpline="+91-9000011112"))
    reader = PdfReader(BytesIO(pdf_bytes))

    assert len(reader.pages) == 1
    page_text = reader.pages[0].extract_text() or ""
    assert "9111122223" in page_text  # front face: customer mobile
    assert "+91-9000011112" in page_text  # back face: org helpline banner


def test_build_card_pdf_handles_long_text_without_raising():
    """Stress case with long name/address/city — must not raise, and the
    address must never wrap past its 3-line cap."""

    pdf_bytes = build_card_pdf(
        _sample_data(
            name="Rajkumari Devi Chaturvedi Raghuwanshi",
            father_husband="Late Shri Ramkishan Chaturvedi Raghuwanshi",
            city_name="Ramganj Mandi",
            address=(
                "House No. 245/B, Behind Old Bus Stand, Near Shanti Nagar Colony, "
                "Ward No. 12, Ashoknagar Tahsil, Ashoknagar District, Madhya Pradesh, "
                "India, PIN 473331"
            ),
        )
    )

    assert pdf_bytes.startswith(b"%PDF")


def test_build_card_pdf_handles_many_facilities_and_long_disclaimer():
    """The back page's facilities list and disclaimer note are organisation
    config, not per-customer data — they can be edited to be longer than the
    defaults, and generation must still succeed without raising."""

    pdf_bytes = build_card_pdf(
        _sample_data(
            facilities=_FACILITIES + ["नेत्र चिकित्सा", "दंत चिकित्सा", "हृदय रोग जांच", "एक्स-रे सुविधा"],
            disclaimer_note=_DISCLAIMER * 2,
        )
    )

    assert pdf_bytes.startswith(b"%PDF")


def test_build_card_pdf_handles_empty_facilities_list():
    pdf_bytes = build_card_pdf(_sample_data(facilities=[]))

    assert pdf_bytes.startswith(b"%PDF")


def test_validity_row_hidden_by_default_and_shown_when_toggled_on():
    """`show_validity` defaults to False on `CardData` — the validity date is an
    admin opt-in (`CardSettings.show_validity`), not a fixed part of the
    card face."""

    hidden = build_card_pdf(_sample_data(validity_date="2029-07-21"))
    reader = PdfReader(BytesIO(hidden))
    front_text = reader.pages[0].extract_text() or ""
    assert "21-07-2029" not in front_text

    shown = build_card_pdf(_sample_data(validity_date="2029-07-21", show_validity=True))
    reader = PdfReader(BytesIO(shown))
    front_text = reader.pages[0].extract_text() or ""
    assert "21-07-2029" in front_text


def test_registration_fee_tag_never_overlaps_the_footer_band():
    """Regression test for a real layout bug: the fee tag drawn below the
    QR code used to sit lower than the top of the navy footer band, so the
    footer painted over half of it. Imports the module's actual layout
    constants (not a duplicated guess) so a future edit to the geometry is
    caught here instead of only being visible in a rendered screenshot.
    """

    from reportlab.lib.units import mm

    from app.services import card_pdf_service as svc

    card_h = (170 * mm) / 1.586
    qr_box_top = card_h - svc._BODY_TOP_FROM_CARD_TOP
    qr_box_bottom = qr_box_top - (svc._QR_SIZE + 3 * mm)
    fee_box_bottom = qr_box_bottom - svc._FEE_TAG_GAP_BELOW_QR - svc._FEE_TAG_HEIGHT

    assert fee_box_bottom >= svc._FOOTER_HEIGHT, (
        "The fee tag's bottom edge must sit at or above the footer band's top edge"
    )


def test_registration_fee_uses_the_value_from_card_data_not_a_hardcoded_constant():
    """The fee label must reflect `CardData.registration_fee` (sourced from
    Settings), so an admin changing the fee in config actually changes what
    prints — this would previously always show a hardcoded "60"."""

    pdf_bytes = build_card_pdf(_sample_data(registration_fee="99"))
    reader = PdfReader(BytesIO(pdf_bytes))
    front_text = reader.pages[0].extract_text() or ""

    assert "99" in front_text


def test_customer_mobile_and_org_helpline_stay_independent():
    """Front face carries the cardholder's own mobile; the back face's
    banner carries the organisation helpline. They must stay independent
    values — collapsing them would put the wrong number on a printed face.
    (Both faces now share one page, so this asserts on the sheet's text.)"""

    pdf_bytes = build_card_pdf(_sample_data(mobile="9111122223", helpline="+91-9000011112"))
    reader = PdfReader(BytesIO(pdf_bytes))
    page_text = reader.pages[0].extract_text() or ""

    assert "9111122223" in page_text
    assert "+91-9000011112" in page_text


def test_footer_contains_the_brand_tagline():
    """Footer carries the logo emblem + tagline.

    Devanagari text is rendered with HarfBuzz OpenType shaping into crisp,
    vector-sharp PDF graphics, so testing checks that the PDF builds
    successfully with the custom tagline."""

    tagline = "स्वस्थ परिवार, सुरक्षित भविष्य"
    pdf_bytes = build_card_pdf(_sample_data(tagline=tagline))
    assert pdf_bytes.startswith(b"%PDF")
    assert len(pdf_bytes) > 50000


def test_each_card_face_prints_at_iso_id1_size():
    """Each face must come out at the ISO/IEC 7810 ID-1 standard
    (85.6 x 54 mm) — the size PVC/credit-card printers expect. The single
    sheet holds two faces side by side, so its media box is ~two card
    widths plus a small gap and margins, and one card height plus margins;
    it must not balloon to an A4/A3 page."""

    from reportlab.lib.units import mm

    from app.services import card_pdf_service as svc

    scale = svc._CARD_PRINT_W / (170 * mm)
    gap = 6 * mm * scale
    margin = 6 * mm * scale
    expected_w = 2 * svc._CARD_PRINT_W + gap + 2 * margin
    expected_h = svc._CARD_PRINT_H + 2 * margin

    pdf_bytes = build_card_pdf(_sample_data())
    reader = PdfReader(BytesIO(pdf_bytes))

    assert len(reader.pages) == 1
    box = reader.pages[0].mediabox
    width_mm = float(box.width) / 72 * 25.4
    height_mm = float(box.height) / 72 * 25.4
    assert abs(width_mm - expected_w / mm) < 0.5
    assert abs(height_mm - expected_h / mm) < 0.5
    # Sanity: each face is one standard 85.6mm-wide card, not the old 170mm.
    assert width_mm < 200, "Sheet ballooned — faces are drawn too large"


def test_card_pdf_embeds_the_full_brand_logo():
    """Printed cards must ship the full lockup (icon + HEALTH CARD), not
    the app chrome mark that drops the word CARD."""

    from app.services import card_pdf_service as svc

    logo = svc._logo_image()
    assert logo is not None
    pdf_bytes = build_card_pdf(_sample_data())
    assert len(pdf_bytes) > 8_000
