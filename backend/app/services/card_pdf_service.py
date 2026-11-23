"""Printable card generation: QR code + two-page (front/back) PDF layout.

Mirrors the Jan Kalyan Health Card physical design end to end — front side
(curved navy header with customer mobile + ID chip + centred logo, passport
photo + Hindi field labels + QR/fee, navy footer with white family chip + tagline)
and back side (green border, flat top row with left-aligned logo + right-flush
green parallelogram helpline banner with headset icon, navy "विशेष सुविधाएं"
pill + green-check facilities list, large heart/hands emblem + tagline, inset
light-green disclaimer box with shield icon, thin green accent bar). Colours
are taken from the official logo palette — navy blue, bright green, medical red.

Cards are canvas-drawn with ReportLab so the render path has no browser or
system-font dependency beyond the Devanagari TTF shipped under
`app/assets/fonts/`. Nothing is written to disk; PDF bytes stream straight
to the response, and only the print event is persisted.

Organisation-level content (facilities, disclaimer, fee, both helplines) is
not hardcoded here — it arrives on `CardData` from a mix of the
admin-editable `CardSettings` row (front mobile, back helpline, fee,
facilities) and static `Settings` config (tagline, disclaimer, org name).
Both are the same values the frontend's live card preview reads via
`GET /cards/brand-config`, so what gets printed and what a partner sees on
screen never drift apart.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from functools import lru_cache
from io import BytesIO
from pathlib import Path

import freetype
import qrcode
import uharfbuzz as hb
from PIL import Image as PilImage
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

# Official logo palette (matches the reference card + source artwork).
BRAND_BLUE = colors.HexColor("#093c71")
BRAND_GREEN = colors.HexColor("#59a633")
BRAND_LIGHT_BLUE = colors.HexColor("#e8f0fe")
BRAND_LIGHT_GREEN = colors.HexColor("#eef7eb")
BRAND_LIGHT_RED = colors.HexColor("#fdecea")
INK = colors.HexColor("#1c2b2a")
TEXT_MUTED = colors.HexColor("#64748b")
CARD_ID_RED = colors.HexColor("#d32f2f")

_ASSETS_DIR = Path(__file__).resolve().parent.parent / "assets"
_FONTS_DIR = _ASSETS_DIR / "fonts"

# Geometry invariants — shared across drawers + regression tests.
# All values reverse-measured from the approved reference render (600x378
# design canvas, 1 design px = 170mm/600 = 0.2833mm).
# Final printed size of each card face: ISO/IEC 7810 ID-1 (standard
# PVC/credit-card dimensions). The layout below is drawn in a 170mm-wide
# design space and uniformly scaled down to this in `build_card_pdf`.
_CARD_PRINT_W = 85.6 * mm
_CARD_PRINT_H = 54 * mm

# Header zone: the height of the navy curved region at the top of the front face.
_HEADER_ZONE = 40 * mm
_FOOTER_HEIGHT = 14 * mm

# Curved header background
_CURVE_EDGE_FRAC = 0.72
_CURVE_TROUGH_FRAC = 0.06
_CURVE_CTRL_OUTER_FRAC = 0.75
_CURVE_CTRL_INNER_FRAC = 430 / 600

# Front body block — photo top and QR-box top sit on the same line,
# 42mm below the card's top edge (148px on the design canvas).
_BODY_TOP_FROM_CARD_TOP = 42 * mm

# QR code & Passport photo frame
_QR_SIZE = 20.5 * mm  # inner QR image; green box adds 3mm -> 23.5mm (83px)
_PHOTO_W = 28.5 * mm
_PHOTO_H = 35.5 * mm
_DETAIL_LINE_H = 8.05 * mm  # ~28.4px row pitch on the design canvas
_DETAIL_ROW_COUNT = 5
_FEE_TAG_HEIGHT = 13 * mm
_FEE_TAG_GAP_BELOW_QR = 2.5 * mm
_FOOTER_ICON_SIZE = 7 * mm

# Back page geometry
# Shared left indent for the logo (top row) and the facilities column, so
# both start on the same vertical line.
_BACK_LEFT_INDENT = 8 * mm
_BACK_TOP_ROW_H = 22 * mm
_BACK_ACCENT_H = 3.2 * mm
_BACK_NOTE_HEIGHT = 23 * mm
_BACK_NOTE_INSET = 3.5 * mm
_BACK_HELPLINE_H = 11 * mm
_BACK_HELPLINE_SLANT = 4.5 * mm

_FONT_REG = "JKHC-Devanagari"
_FONT_BOLD = "JKHC-Devanagari-Bold"
_FONTS_READY = False

_FT_FACE = None
_HB_FONT = None
_HB_FACE = None


@dataclass
class CardData:
    card_id: str
    name: str
    father_husband: str
    gender: str
    age: int
    dob: str
    mobile: str
    address: str
    city_name: str
    entry_date: str
    validity_date: str
    photo_bytes: bytes | None
    partner_name: str
    partner_id: int
    qr_target_url: str
    organization_name: str
    helpline: str
    tagline: str = "स्वस्थ परिवार, सुरक्षित भविष्य"
    registration_fee: str = "60"
    facilities: list[str] = field(default_factory=list)
    disclaimer_note: str = ""
    show_validity: bool = False


def _ensure_fonts() -> None:
    global _FONTS_READY
    if _FONTS_READY:
        return
    regular = _FONTS_DIR / "NotoSansDevanagari-Regular.ttf"
    bold = _FONTS_DIR / "NotoSansDevanagari-Bold.ttf"
    if regular.exists() and bold.exists():
        pdfmetrics.registerFont(TTFont(_FONT_REG, str(regular)))
        pdfmetrics.registerFont(TTFont(_FONT_BOLD, str(bold)))
        _FONTS_READY = True
    else:
        _FONTS_READY = False


def _font_hi(bold: bool = False) -> str:
    _ensure_fonts()
    if _FONTS_READY:
        return _FONT_BOLD if bold else _FONT_REG
    return "Helvetica-Bold" if bold else "Helvetica"


def _font_en(bold: bool = False) -> str:
    return "Helvetica-Bold" if bold else "Helvetica"


def _init_harfbuzz() -> None:
    global _FT_FACE, _HB_FONT, _HB_FACE
    font_file = _FONTS_DIR / "NotoSansDevanagari-Bold.ttf"
    if _FT_FACE is None and font_file.exists():
        _FT_FACE = freetype.Face(str(font_file))
        hb_blob = hb.Blob.from_file_path(str(font_file))
        _HB_FACE = hb.Face(hb_blob)
        _HB_FONT = hb.Font(_HB_FACE)
        _HB_FONT.scale = (_HB_FACE.upem, _HB_FACE.upem)


def _color_to_hex(color: colors.Color | str) -> str:
    if isinstance(color, str):
        return color if color.startswith("#") else f"#{color}"
    if hasattr(color, "hexval"):
        h = color.hexval()
        if isinstance(h, str):
            clean = h.replace("0x", "").lstrip("#")
            return f"#{clean.zfill(6)}"
        return f"#{h:06x}"
    r = int(getattr(color, "red", 0) * 255)
    g = int(getattr(color, "green", 0) * 255)
    b = int(getattr(color, "blue", 0) * 255)
    return f"#{r:02x}{g:02x}{b:02x}"


@lru_cache(maxsize=256)
def _get_hi_text_image(text: str, font_size_pt: float, color_hex: str, dpi: int = 600) -> tuple[bytes | None, float, float, float]:
    _init_harfbuzz()
    if _FT_FACE is None or _HB_FONT is None or _HB_FACE is None:
        return None, 0.0, 0.0, 0.0

    hex_clean = color_hex.lstrip("#")
    r = int(hex_clean[0:2], 16)
    g = int(hex_clean[2:4], 16)
    b = int(hex_clean[4:6], 16)

    pixel_size = int(font_size_pt * dpi / 72.0)
    _FT_FACE.set_char_size(pixel_size * 64)
    scale = pixel_size / _HB_FACE.upem

    buf = hb.Buffer()
    buf.add_str(text)
    buf.guess_segment_properties()
    hb.shape(_HB_FONT, buf)

    infos = buf.glyph_infos
    positions = buf.glyph_positions

    total_w_px = sum(pos.x_advance for pos in positions) * scale
    ascender_px = _FT_FACE.size.ascender >> 6
    descender_px = abs(_FT_FACE.size.descender >> 6)
    height_px = ascender_px + descender_px + 8
    width_px = max(int(total_w_px) + 12, 1)

    img = PilImage.new("RGBA", (width_px, height_px), (255, 255, 255, 0))
    x_offset_px = 6
    y_baseline_px = ascender_px + 4

    x_curr = x_offset_px
    for info, pos in zip(infos, positions):
        gid = info.codepoint
        _FT_FACE.load_glyph(gid, freetype.FT_LOAD_RENDER)
        slot = _FT_FACE.glyph
        bitmap = slot.bitmap

        gx = int(x_curr + (pos.x_offset * scale) + slot.bitmap_left)
        gy = int(y_baseline_px - (pos.y_offset * scale) - slot.bitmap_top)

        if bitmap.width > 0 and bitmap.rows > 0:
            glyph_img = PilImage.frombytes("L", (bitmap.width, bitmap.rows), bytes(bitmap.buffer))
            color_img = PilImage.new("RGBA", (bitmap.width, bitmap.rows), (r, g, b, 255))
            img.paste(color_img, (gx, gy), glyph_img)

        x_curr += (pos.x_advance * scale)

    width_pt = total_w_px * 72.0 / dpi
    height_pt = height_px * 72.0 / dpi
    descender_pt = descender_px * 72.0 / dpi

    png_buffer = BytesIO()
    img.save(png_buffer, format="PNG")
    return png_buffer.getvalue(), width_pt, height_pt, descender_pt


def _get_hi_string_width(text: str, font_size_pt: float) -> float:
    """Accurate shaped Devanagari text width in points."""
    _, width_pt, _, _ = _get_hi_text_image(text, font_size_pt, "#000000")
    return width_pt


# Maximal runs of Latin letters (including internal spaces/hyphens/
# apostrophes between words). The Devanagari TTF shipped in assets has NO
# Latin letter glyphs at all — 'h'/'e'/'A' map to .notdef — so any English
# words inside admin-edited text (facility lines, the disclaimer note)
# rendered through the HarfBuzz path came out as tofu boxes on the printed
# card. Digits are deliberately NOT matched: the Devanagari font does ship
# digit glyphs, and dates/fees already render through the hi path today.
_LATIN_SEG = re.compile(r"[A-Za-z][A-Za-z'\-]*(?:\s+[A-Za-z][A-Za-z'\-]*)*")


def _split_script_runs(text: str) -> list[tuple[str, bool]]:
    """Splits into ``(run, is_latin)`` segments. Pure-Devanagari strings
    (with spaces/digits/danda) stay as a single run, so their shaping and
    measurement are byte-identical to before this helper existed."""

    runs: list[tuple[str, bool]] = []
    last = 0
    for match in _LATIN_SEG.finditer(text):
        if match.start() > last:
            runs.append((text[last : match.start()], False))
        runs.append((match.group(), True))
        last = match.end()
    if last < len(text):
        runs.append((text[last:], False))
    return runs


def _mixed_string_width(text: str, font_size: float) -> float:
    """Width of a string as `_draw_hi_string` will actually draw it —
    Latin runs measured with Helvetica-Bold, everything else with the
    shaped Devanagari font."""

    total = 0.0
    for run, is_latin in _split_script_runs(text):
        if is_latin:
            total += pdfmetrics.stringWidth(run, _font_en(bold=True), font_size)
        else:
            total += _get_hi_string_width(run, font_size)
    return total


def _draw_hi_string(
    page: canvas.Canvas,
    x: float,
    y: float,
    text: str,
    font_size: float,
    color: colors.Color | str = INK,
    align: str = "left",
) -> float:
    """Renders Devanagari text with HarfBuzz OpenType shaping and FreeType high-DPI rasterization.
    Guarantees 100% accurate matras, conjunct consonants, and positioning.

    Latin-letter runs inside the text are drawn with Helvetica-Bold vector
    text on the same baseline instead — the Devanagari TTF has no Latin
    glyphs, so passing them through the HarfBuzz path printed tofu boxes.
    """
    if not text:
        return 0.0

    runs = _split_script_runs(text)
    total_width = _mixed_string_width(text, font_size)
    if total_width <= 0:
        return 0.0

    draw_x = x
    if align == "center":
        draw_x = x - (total_width / 2.0)
    elif align == "right":
        draw_x = x - total_width

    color_hex = _color_to_hex(color)
    padding_pt = 6.0 * 72.0 / 600.0

    x_curr = draw_x
    for run, is_latin in runs:
        if is_latin:
            run_w = pdfmetrics.stringWidth(run, _font_en(bold=True), font_size)
            page.setFont(_font_en(bold=True), font_size)
            page.setFillColor(colors.HexColor(color_hex))
            page.drawString(x_curr, y, run)
            x_curr += run_w
            continue

        png_bytes, width_pt, height_pt, descender_pt = _get_hi_text_image(run, font_size, color_hex)
        if png_bytes is None or width_pt <= 0:
            continue

        draw_y = y - descender_pt - (4.0 * 72.0 / 600.0)
        reader = ImageReader(BytesIO(png_bytes))
        page.drawImage(
            reader,
            x_curr - padding_pt,
            draw_y,
            width=width_pt + (padding_pt * 2),
            height=height_pt,
            mask="auto",
            preserveAspectRatio=True,
        )
        x_curr += width_pt

    return total_width


def _shape_devanagari(text: str) -> str:
    """Legacy helper — returns text as-is since _draw_hi_string handles OpenType shaping."""
    return text


@lru_cache(maxsize=1)
def _logo_image() -> ImageReader | None:
    path = _ASSETS_DIR / "logo-full.png"
    if not path.exists():
        return None
    return ImageReader(str(path))


@lru_cache(maxsize=1)
def _emblem_image() -> ImageReader | None:
    """Circular brand emblem (logo graphic without the wordmark) — used on
    the back face in place of the old hand-drawn heart/hands icon."""
    path = _ASSETS_DIR / "logo-emblem.png"
    if not path.exists():
        return None
    return ImageReader(str(path))


def _make_qr_image(data: str) -> ImageReader:
    qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=8, border=1)
    qr.add_data(data)
    qr.make(fit=True)
    image = qr.make_image(fill_color="#093c71", back_color="white")
    buffer = BytesIO()
    image.save(buffer)
    buffer.seek(0)
    return ImageReader(buffer)


def _format_display_date(iso_date: str) -> str:
    parts = iso_date.split("-")
    if len(parts) == 3 and len(parts[0]) == 4:
        return f"{parts[2]}-{parts[1]}-{parts[0]}"
    return iso_date


def _gender_hi(gender: str) -> str:
    mapping = {"male": "पुरुष", "female": "महिला", "other": "अन्य"}
    return mapping.get(gender.lower(), gender.title())


def _helpline_short(helpline: str) -> str:
    digits = "".join(ch for ch in helpline if ch.isdigit())
    if len(digits) >= 10:
        return digits[-10:]
    return helpline


def build_card_pdf(data: CardData) -> bytes:
    """Single-page cutout sheet: front face centre-left, back face
    centre-right, side by side with a small cutting gap.

    Each face prints at the ISO/IEC 7810 ID-1 standard — 85.6 x 54 mm, the
    size PVC/credit-card printers and cutters expect. All the layout
    constants in this module are tuned to a fixed 170mm-wide "design
    space", so rather than re-tuning every one, the whole page is drawn in
    that space and then uniformly scaled down to the real card size. The
    design height is derived from the exact 85.6:54 ratio so the scaled
    face lands at precisely 85.6 x 54 mm with no distortion."""

    _ensure_fonts()

    design_w = 170 * mm
    scale = _CARD_PRINT_W / design_w
    design_h = _CARD_PRINT_H / scale  # scaled height is then exactly 54 mm
    gap = 6 * mm
    margin = 6 * mm

    page_w = (2 * design_w + gap + 2 * margin) * scale
    page_h = (design_h + 2 * margin) * scale

    buffer = BytesIO()
    page = canvas.Canvas(buffer, pagesize=(page_w, page_h))
    page.scale(scale, scale)

    _draw_front_page(page, margin, margin, design_w, design_h, data)
    _draw_back_page(page, margin + design_w + gap, margin, design_w, design_h, data)
    page.showPage()

    page.save()
    return buffer.getvalue()


def build_batch_card_pdf(cards: list[CardData]) -> bytes:
    """One combined print run for the admin's "print selected" flow:
    A4 portrait pages with four customers per page, each customer on its
    own row — front face left, back face right — at the same ID-1 print
    size as the single-card export (`build_card_pdf`), with cutting gaps
    between faces and rows. Overflows onto additional A4 pages in the same
    PDF when more than four customers are selected."""

    _ensure_fonts()

    design_w = 170 * mm
    scale = _CARD_PRINT_W / design_w
    design_h = _CARD_PRINT_H / scale

    page_w, page_h = A4
    face_gap = 4 * mm
    row_gap = 6 * mm
    per_page = 4

    pair_w = 2 * _CARD_PRINT_W + face_gap
    margin_x = (page_w - pair_w) / 2
    block_h = per_page * _CARD_PRINT_H + (per_page - 1) * row_gap
    margin_y = (page_h - block_h) / 2

    buffer = BytesIO()
    page = canvas.Canvas(buffer, pagesize=A4)

    for page_start in range(0, len(cards), per_page):
        # `showPage()` resets the transform, so re-apply the design-space
        # scale at the top of every page.
        page.scale(scale, scale)
        for row, data in enumerate(cards[page_start : page_start + per_page]):
            y_phys = page_h - margin_y - _CARD_PRINT_H - row * (_CARD_PRINT_H + row_gap)
            x_back_phys = margin_x + _CARD_PRINT_W + face_gap
            _draw_front_page(page, margin_x / scale, y_phys / scale, design_w, design_h, data)
            _draw_back_page(page, x_back_phys / scale, y_phys / scale, design_w, design_h, data)
        page.showPage()

    page.save()
    return buffer.getvalue()


# ---------------------------------------------------------------- front ---

# Heart-and-heartbeat watermark, centred on the front body — mirrors the
# reference "heart with medical cross, ECG line running through it" logo
# motif. Geometry is shared verbatim with `EcgWatermark` in the preview's
# `CardFront.tsx` (600x378 design px, rise = upward offset from the
# baseline), so the printed PDF and the on-screen preview render the exact
# same artwork. Low-opacity brand green; the cross is knocked out in card
# white.
_ECG_LEFT: list[tuple[float, float]] = [
    (0, 0), (70, 0),
    (84, 11), (98, 0),
    (112, 0), (122, -9), (134, 48), (148, -27), (158, 0),
    (178, 0), (196, 13), (214, 0),
    (252, 0),
]
_ECG_RIGHT: list[tuple[float, float]] = [
    (348, 0), (368, 0),
    (378, -8), (388, 34), (400, -20), (410, 0),
    (430, 0), (448, 11), (464, 0),
    (600, 0),
]
_ECG_BASELINE_Y = 240
# Upward shift so the artwork sits in the upper-centre of the body rather
# than the vertical middle. Mirrored by `ECG_SHIFT_Y` in the preview.
_ECG_SHIFT_Y = 35.0
# Heart centred at (300, 238): cubic segments matching `HEART_PATH` in the
# preview — lobes top ~196, tip at 288, spans x 250-350 (design px, y-down).
_HEART_BEZIERS: list[tuple[float, ...]] = [
    (300, 213, 288, 190, 250, 190, 250, 222),
    (250, 222, 250, 244, 272, 262, 300, 288),
    (300, 288, 328, 262, 350, 244, 350, 222),
    (350, 222, 350, 190, 312, 190, 300, 213),
]


def _draw_ecg_watermark(page: canvas.Canvas, x: float, y: float, w: float, h: float) -> None:
    sx = w / 600.0
    sy = h / 378.0

    def pt(px_x: float, px_y: float) -> tuple[float, float]:
        return x + px_x * sx, y + h - (px_y - _ECG_SHIFT_Y) * sy

    watermark_green = colors.Color(89 / 255, 166 / 255, 51 / 255, alpha=0.12)

    page.saveState()
    page.setStrokeColor(watermark_green)
    page.setLineWidth(2.5 * sx)
    page.setLineJoin(1)
    page.setLineCap(1)

    for trace in (_ECG_LEFT, _ECG_RIGHT):
        path = page.beginPath()
        for i, (px_x, rise) in enumerate(trace):
            tx, ty = pt(px_x, _ECG_BASELINE_Y - rise)
            if i == 0:
                path.moveTo(tx, ty)
            else:
                path.lineTo(tx, ty)
        page.drawPath(path, stroke=1, fill=0)

    heart = page.beginPath()
    start_x, start_y = pt(_HEART_BEZIERS[0][0], _HEART_BEZIERS[0][1])
    heart.moveTo(start_x, start_y)
    for _, _, c1x, c1y, c2x, c2y, ex, ey in _HEART_BEZIERS:
        heart.curveTo(*pt(c1x, c1y), *pt(c2x, c2y), *pt(ex, ey))
    heart.close()
    page.setFillColor(watermark_green)
    page.drawPath(heart, stroke=0, fill=1)

    # Medical cross knocked out of the heart in card white.
    page.setFillColor(colors.white)
    vx, vy = pt(292, 212 + 40)
    page.roundRect(vx, vy, 16 * sx, 40 * sy, radius=2 * sx, stroke=0, fill=1)
    hx, hy = pt(280, 224 + 16)
    page.roundRect(hx, hy, 40 * sx, 16 * sy, radius=2 * sx, stroke=0, fill=1)

    page.restoreState()


def _draw_front_page(
    page: canvas.Canvas, x: float, y: float, w: float, h: float, data: CardData
) -> None:
    _draw_card_frame(page, x, y, w, h)
    # Watermark goes on immediately after the white frame so every real
    # element (header, photo, rows, QR, footer) paints above it.
    _draw_ecg_watermark(page, x, y, w, h)
    _draw_header_curve(page, x, y, w, h, _HEADER_ZONE, BRAND_BLUE)
    _draw_front_header(page, x, y, w, h, data)
    _draw_body(page, x, y, w, h, data)
    _draw_footer(page, x, y, w, data)


def _draw_card_frame(page: canvas.Canvas, x: float, y: float, w: float, h: float) -> None:
    page.setFillColor(colors.white)
    page.roundRect(x, y, w, h, radius=5, stroke=0, fill=1)
    page.setStrokeColor(BRAND_BLUE)
    page.setLineWidth(1.8)
    page.roundRect(x, y, w, h, radius=5, stroke=1, fill=0)


def _draw_header_curve(
    page: canvas.Canvas, x: float, y: float, w: float, h: float, zone_height: float, fill_color: colors.Color
) -> None:
    top = y + h
    edge_h = zone_height * _CURVE_EDGE_FRAC
    trough_h = zone_height * _CURVE_TROUGH_FRAC
    centre = x + w / 2
    ctrl_outer_right = x + w * _CURVE_CTRL_OUTER_FRAC
    ctrl_inner_right = x + w * _CURVE_CTRL_INNER_FRAC
    ctrl_inner_left = x + w * (1 - _CURVE_CTRL_INNER_FRAC)
    ctrl_outer_left = x + w * (1 - _CURVE_CTRL_OUTER_FRAC)

    path = page.beginPath()
    path.moveTo(x, top)
    path.lineTo(x + w, top)
    path.lineTo(x + w, top - edge_h)
    path.curveTo(
        ctrl_outer_right, top - edge_h,
        ctrl_inner_right, top - trough_h,
        centre, top - trough_h,
    )
    path.curveTo(
        ctrl_inner_left, top - trough_h,
        ctrl_outer_left, top - edge_h,
        x, top - edge_h,
    )
    path.close()

    page.setFillColor(fill_color)
    page.drawPath(path, stroke=0, fill=1)


def _draw_front_header(
    page: canvas.Canvas, x: float, y: float, w: float, h: float, data: CardData
) -> None:
    top = y + h
    chip_y = top - 11 * mm
    chip_h = 7 * mm

    mobile_label = f"मो. {_helpline_short(data.mobile)}"
    page.setFont(_font_hi(bold=True), 10.5)
    mob_w = page.stringWidth(mobile_label, _font_hi(bold=True), 10.5) + 6 * mm
    mob_x = x + 4.5 * mm
    page.setFillColor(colors.white)
    page.setStrokeColor(BRAND_LIGHT_RED)
    page.setLineWidth(0.8)
    page.roundRect(mob_x, chip_y, mob_w, chip_h, radius=2, stroke=1, fill=1)
    page.setFillColor(CARD_ID_RED)
    page.drawString(mob_x + 3 * mm, chip_y + 2.1 * mm, mobile_label)

    id_label = f"ID : {data.card_id}"
    page.setFont(_font_en(bold=True), 10.5)
    id_w = page.stringWidth(id_label, _font_en(bold=True), 10.5) + 6 * mm
    id_x = x + w - 4.5 * mm - id_w
    page.setFillColor(BRAND_LIGHT_BLUE)
    page.setStrokeColor(colors.HexColor("#bfdbfe"))
    page.setLineWidth(0.8)
    page.roundRect(id_x, chip_y, id_w, chip_h, radius=2, stroke=1, fill=1)
    page.setFillColor(BRAND_BLUE)
    page.drawString(id_x + 3 * mm, chip_y + 2.1 * mm, id_label)

    logo = _logo_image()
    logo_h = 20 * mm
    # Logo sits inside the white curve dome, 10mm below the card's top edge.
    logo_y = top - 10 * mm - logo_h
    if logo is not None:
        logo_iw, logo_ih = logo.getSize()
        logo_w = logo_h * (logo_iw / logo_ih)
        logo_x = x + (w - logo_w) / 2
        page.drawImage(logo, logo_x, logo_y, logo_w, logo_h, mask="auto", preserveAspectRatio=True)


def _draw_body(
    page: canvas.Canvas, x: float, y: float, w: float, h: float, data: CardData
) -> None:
    # Photo top, QR-box top, and the details column all hang from the same
    # line, a fixed distance below the card's top edge (measured off the
    # approved reference render).
    row_top = y + h - _BODY_TOP_FROM_CARD_TOP

    photo_x = x + 7.5 * mm
    photo_y = row_top - _PHOTO_H
    _draw_photo(page, photo_x, photo_y, data.photo_bytes)

    # Green QR box (qr + 3mm frame) is right-inset 9.5mm; qr_x is the inner
    # image's left edge (box extends 1.5mm beyond it on each side).
    qr_x = x + w - 11 * mm - _QR_SIZE
    _draw_qr_block(page, qr_x, row_top, data)

    details_x = photo_x + _PHOTO_W + 7 * mm
    details_right = qr_x - 1.5 * mm - 3 * mm
    _draw_details(page, details_x, row_top, details_right - details_x, data)


def _cover_crop_photo(photo_bytes: bytes, target_w_px: int, target_h_px: int) -> ImageReader:
    image = PilImage.open(BytesIO(photo_bytes)).convert("RGB")
    src_w, src_h = image.size
    target_ratio = target_w_px / target_h_px
    src_ratio = src_w / src_h

    if src_ratio > target_ratio:
        new_w = int(src_h * target_ratio)
        left = (src_w - new_w) // 2
        cropped = image.crop((left, 0, left + new_w, src_h))
    else:
        new_h = int(src_w / target_ratio)
        top = max(0, (src_h - new_h) // 5)
        cropped = image.crop((0, top, src_w, top + new_h))

    resized = cropped.resize((target_w_px, target_h_px), PilImage.Resampling.LANCZOS)
    buffer = BytesIO()
    resized.save(buffer, format="JPEG", quality=90)
    buffer.seek(0)
    return ImageReader(buffer)


def _draw_photo(page: canvas.Canvas, photo_x: float, photo_y: float, photo_bytes: bytes | None) -> None:
    page.setFillColor(colors.HexColor("#f8fafc"))
    page.roundRect(photo_x, photo_y, _PHOTO_W, _PHOTO_H, radius=2.5, stroke=0, fill=1)
    # Light slate border, matching the reference render (not brand navy).
    page.setStrokeColor(colors.HexColor("#cbd5e1"))
    page.setLineWidth(1.0)
    page.roundRect(photo_x, photo_y, _PHOTO_W, _PHOTO_H, radius=2.5, stroke=1, fill=0)

    image = None
    if photo_bytes:
        try:
            image = _cover_crop_photo(photo_bytes, 285, 355)
        except (OSError, ValueError):
            image = None

    if image is not None:
        page.drawImage(
            image,
            photo_x + 1.2,
            photo_y + 1.2,
            _PHOTO_W - 2.4,
            _PHOTO_H - 2.4,
            preserveAspectRatio=False,
            mask="auto",
        )
    else:
        page.setFont(_font_en(), 8)
        page.setFillColor(TEXT_MUTED)
        page.drawCentredString(photo_x + _PHOTO_W / 2, photo_y + _PHOTO_H / 2 - 2, "Photo")




def _truncate_text(page: canvas.Canvas, text: str, font_name: str, font_size: float, max_width: float) -> str:
    """Truncates text to fit within max_width, appending '...' if necessary."""
    if page.stringWidth(text, font_name, font_size) <= max_width:
        return text
    while text and page.stringWidth(text + "...", font_name, font_size) > max_width:
        text = text[:-1]
    return text + "..."


def _truncate_text_hi(text: str, font_size: float, max_width: float) -> str:
    """Truncates Devanagari text (by characters) to fit within max_width with '...'."""
    if _get_hi_string_width(text, font_size) <= max_width:
        return text
    while text and _get_hi_string_width(text + "...", font_size) > max_width:
        text = text[:-1]
    return text + "..."


def _draw_details(
    page: canvas.Canvas, x: float, row_top: float, width: float, data: CardData
) -> None:
    address = data.address
    if (
        data.city_name
        and data.city_name != "-"
        and data.city_name.lower() not in data.address.lower()
    ):
        address = f"{data.address}, {data.city_name}"

    rows: list[tuple[str, str, bool]] = [
        ("नाम", data.name, False),
        ("पिता/पति", data.father_husband, False),
        ("जन्मतिथि", _format_display_date(data.dob), False),
        ("लिंग", _gender_hi(data.gender), True),
        ("पता", address, False),
    ]
    if data.show_validity:
        rows.append(("वैधता", _format_display_date(data.validity_date), False))

    label_w = 31.5 * mm
    label_size = 11
    value_size = 11

    line_h = _DETAIL_LINE_H
    cursor = row_top - 3.8 * mm

    for label, value, value_is_hi in rows:
        _draw_hi_string(page, x, cursor, label, label_size, BRAND_BLUE)
        page.setFont(_font_en(bold=True), label_size)
        page.setFillColor(INK)
        page.drawString(x + label_w, cursor, ":")
        text_x = x + label_w + 2.3 * mm
        max_width = width - label_w - 3 * mm

        if value_is_hi:
            line = _truncate_text_hi(value, value_size, max_width)
            _draw_hi_string(page, text_x, cursor, line, value_size, INK)
        else:
            value_font = _font_en(bold=True)
            page.setFont(value_font, value_size)
            page.setFillColor(INK)
            line = _truncate_text(page, value, value_font, value_size, max_width)
            page.drawString(text_x, cursor, line)
        cursor -= line_h


def _draw_qr_block(page: canvas.Canvas, qr_x: float, top_y: float, data: CardData) -> None:
    qr_size = _QR_SIZE
    qr_box_top = top_y
    qr_box_y = qr_box_top - (qr_size + 3 * mm)
    qr_y = qr_box_y + 1.5 * mm

    page.setStrokeColor(BRAND_GREEN)
    page.setLineWidth(1.4)
    page.setFillColor(colors.white)
    page.roundRect(
        qr_x - 1.5 * mm, qr_box_y, qr_size + 3 * mm, qr_size + 3 * mm, radius=2.5, stroke=1, fill=1
    )
    page.drawImage(_make_qr_image(data.qr_target_url), qr_x, qr_y, qr_size, qr_size)

    fee_w = qr_size + 3 * mm
    fee_x = qr_x - 1.5 * mm
    fee_bottom = qr_box_y - _FEE_TAG_GAP_BELOW_QR - _FEE_TAG_HEIGHT
    page.setFillColor(BRAND_LIGHT_GREEN)
    page.setStrokeColor(BRAND_GREEN)
    page.setLineWidth(0.9)
    page.roundRect(fee_x, fee_bottom, fee_w, _FEE_TAG_HEIGHT, radius=2, stroke=1, fill=1)

    _draw_hi_string(page, fee_x + fee_w / 2, fee_bottom + 7.4 * mm, "पंजीयन शुल्क", 8.5, BRAND_GREEN, align="center")

    page.setFont(_font_hi(bold=True), 13)
    page.setFillColor(BRAND_BLUE)
    page.drawCentredString(fee_x + fee_w / 2, fee_bottom + 2.2 * mm, f"₹{data.registration_fee}/-")


def _draw_family_chip(page: canvas.Canvas, x: float, y: float, size: float) -> None:
    page.setStrokeColor(colors.white)
    page.setLineWidth(1.1)
    page.setFillColor(colors.Color(0, 0, 0, alpha=0))
    page.roundRect(x, y, size, size, radius=size * 0.18, stroke=1, fill=0)

    def px(v: float) -> float:
        return x + (v / 28.0) * size

    def py(v: float) -> float:
        return y + size - (v / 28.0) * size

    def head(cx: float, cy: float, r: float) -> None:
        page.setFillColor(colors.white)
        page.circle(px(cx), py(cy), (r / 28.0) * size, stroke=0, fill=1)

    def shoulders(cx: float, top: float, half_w: float, thickness: float) -> None:
        page.setFillColor(colors.white)
        left = px(cx - half_w)
        right = px(cx + half_w)
        top_y = py(top)
        bot_y = py(top + thickness)
        page.roundRect(left, bot_y, right - left, top_y - bot_y, radius=(right - left) * 0.35, stroke=0, fill=1)

    head(9, 10.5, 2.4)
    shoulders(9, 14.5, 3.6, 4.2)
    head(19, 10.5, 2.4)
    shoulders(19, 14.5, 3.6, 4.2)
    head(14, 11.2, 2.9)
    shoulders(14, 15.2, 4.4, 5.0)


def _draw_heart_hands_icon(page: canvas.Canvas, x: float, y: float, size: float) -> None:
    def px(v: float) -> float:
        return x + (v / 100.0) * size

    def py(v: float) -> float:
        return y + size - (v / 100.0) * size

    heart = page.beginPath()
    heart.moveTo(px(50), py(34))
    heart.curveTo(px(40), py(18), px(16), py(22), px(16), py(40))
    heart.curveTo(px(16), py(58), px(50), py(74), px(50), py(74))
    heart.curveTo(px(50), py(74), px(84), py(58), px(84), py(40))
    heart.curveTo(px(84), py(22), px(60), py(18), px(50), py(34))
    heart.close()
    page.setFillColor(BRAND_GREEN)
    page.drawPath(heart, fill=1, stroke=0)

    page.setFillColor(colors.white)
    cross_w = (10 / 100.0) * size
    page.rect(px(45), py(52), cross_w, (26 / 100.0) * size, stroke=0, fill=1)
    page.rect(px(34), py(45), (32 / 100.0) * size, (10 / 100.0) * size, stroke=0, fill=1)

    page.setStrokeColor(BRAND_GREEN)
    page.setLineWidth((7 / 100.0) * size)
    page.setLineCap(1)

    left = page.beginPath()
    left.moveTo(px(46), py(95))
    left.curveTo(px(46), py(84), px(40), py(76), px(33), py(70))
    left.curveTo(px(27), py(65), px(22), py(57), px(21), py(49))
    left.curveTo(px(20), py(45), px(25), py(43), px(27), py(47))
    left.curveTo(px(31), py(55), px(36), py(61), px(42), py(65))
    page.drawPath(left, fill=0, stroke=1)

    right = page.beginPath()
    right.moveTo(px(54), py(95))
    right.curveTo(px(54), py(84), px(60), py(76), px(67), py(70))
    right.curveTo(px(73), py(65), px(78), py(57), px(79), py(49))
    right.curveTo(px(80), py(45), px(75), py(43), px(73), py(47))
    right.curveTo(px(69), py(55), px(64), py(61), px(58), py(65))
    page.drawPath(right, fill=0, stroke=1)


def _draw_check_bullet(page: canvas.Canvas, cx: float, cy: float, r: float) -> None:
    page.setFillColor(BRAND_GREEN)
    page.circle(cx, cy, r, stroke=0, fill=1)
    page.setStrokeColor(colors.white)
    page.setLineWidth(max(0.5, r * 0.32))
    page.setLineJoin(1)
    path = page.beginPath()
    path.moveTo(cx - r * 0.45, cy + r * 0.02)
    path.lineTo(cx - r * 0.08, cy - r * 0.38)
    path.lineTo(cx + r * 0.5, cy + r * 0.35)
    page.drawPath(path, stroke=1, fill=0)


def _draw_headset_icon(page: canvas.Canvas, cx: float, cy: float, size: float, color) -> None:
    page.setFillColor(color)
    page.setStrokeColor(color)
    page.setLineWidth(max(0.7, size * 0.14))
    page.setLineCap(1)

    band = page.beginPath()
    band.moveTo(cx - size * 0.40, cy + size * 0.02)
    band.curveTo(
        cx - size * 0.40, cy + size * 0.52,
        cx + size * 0.40, cy + size * 0.52,
        cx + size * 0.40, cy + size * 0.02,
    )
    page.drawPath(band, stroke=1, fill=0)

    cup_w = size * 0.24
    cup_h = size * 0.36
    page.roundRect(cx - size * 0.52, cy - cup_h * 0.45, cup_w, cup_h, radius=cup_w * 0.3, stroke=0, fill=1)
    page.roundRect(cx + size * 0.28, cy - cup_h * 0.45, cup_w, cup_h, radius=cup_w * 0.3, stroke=0, fill=1)


def _draw_shield_check_icon(page: canvas.Canvas, cx: float, cy: float, size: float) -> None:
    page.setStrokeColor(INK)
    page.setFillColor(colors.Color(0, 0, 0, alpha=0))
    page.setLineWidth(max(0.7, size * 0.08))
    page.setLineJoin(1)
    page.setLineCap(1)

    half = size / 2
    shield = page.beginPath()
    shield.moveTo(cx, cy + half * 0.95)
    shield.lineTo(cx + half * 0.78, cy + half * 0.55)
    shield.lineTo(cx + half * 0.78, cy - half * 0.05)
    shield.curveTo(
        cx + half * 0.78, cy - half * 0.55,
        cx + half * 0.25, cy - half * 0.9,
        cx, cy - half * 0.95,
    )
    shield.curveTo(
        cx - half * 0.25, cy - half * 0.9,
        cx - half * 0.78, cy - half * 0.55,
        cx - half * 0.78, cy - half * 0.05,
    )
    shield.lineTo(cx - half * 0.78, cy + half * 0.55)
    shield.close()
    page.drawPath(shield, stroke=1, fill=0)

    check = page.beginPath()
    check.moveTo(cx - half * 0.28, cy + half * 0.05)
    check.lineTo(cx - half * 0.05, cy - half * 0.22)
    check.lineTo(cx + half * 0.35, cy + half * 0.28)
    page.drawPath(check, stroke=1, fill=0)


def _draw_footer(page: canvas.Canvas, x: float, y: float, w: float, data: CardData) -> None:
    page.setFillColor(BRAND_BLUE)
    page.rect(x, y, w, _FOOTER_HEIGHT, stroke=0, fill=1)

    icon_size = _FOOTER_ICON_SIZE
    # 13.5pt ≈ 17px on the preview's 600px canvas — kept in sync with the
    # footer tagline size in `CardFront.tsx`.
    tagline_size = 13.5
    tagline_w = _get_hi_string_width(data.tagline, tagline_size)
    gap = 2.5 * mm
    group_w = icon_size + gap + tagline_w
    group_x = x + (w - group_w) / 2
    mid_y = y + _FOOTER_HEIGHT / 2

    _draw_family_chip(page, group_x, mid_y - icon_size / 2, icon_size)
    _draw_hi_string(
        page, group_x + icon_size + gap, mid_y - 3.2, data.tagline, tagline_size, colors.white
    )


# ----------------------------------------------------------------- back ---


def _draw_back_page(
    page: canvas.Canvas, x: float, y: float, w: float, h: float, data: CardData
) -> None:
    _draw_back_card_frame(page, x, y, w, h)

    top = y + h
    _draw_back_top_row(page, x, top, w, data)

    content_top = top - _BACK_TOP_ROW_H
    content_bottom = y + _BACK_ACCENT_H + _BACK_NOTE_HEIGHT + 1.5 * mm
    _draw_back_content(page, x, content_top, w, content_bottom, data)

    _draw_back_note(page, x, y + _BACK_ACCENT_H, w, data)
    _draw_back_accent_bar(page, x, y, w)


def _draw_back_card_frame(page: canvas.Canvas, x: float, y: float, w: float, h: float) -> None:
    page.setFillColor(colors.white)
    page.roundRect(x, y, w, h, radius=5, stroke=0, fill=1)
    page.setStrokeColor(BRAND_GREEN)
    page.setLineWidth(1.8)
    page.roundRect(x, y, w, h, radius=5, stroke=1, fill=0)


def _draw_back_top_row(page: canvas.Canvas, x: float, top: float, w: float, data: CardData) -> None:
    mid_y = top - _BACK_TOP_ROW_H / 2

    logo = _logo_image()
    logo_h = 14 * mm
    # Same left indent as the facilities block below (_BACK_LEFT_INDENT).
    logo_x = x + _BACK_LEFT_INDENT
    logo_right = logo_x
    if logo is not None:
        logo_iw, logo_ih = logo.getSize()
        draw_w = logo_h * (logo_iw / logo_ih)
        page.drawImage(
            logo, logo_x, mid_y - logo_h / 2, draw_w, logo_h, mask="auto", preserveAspectRatio=True
        )
        logo_right = logo_x + draw_w

    _draw_back_helpline_banner(page, logo_right + 3 * mm, x + w, mid_y, data)


def _draw_back_helpline_banner(
    page: canvas.Canvas, min_left_x: float, right_edge: float, mid_y: float, data: CardData
) -> None:
    font = _font_en(bold=True)
    size = 12
    text = f"Helpline No. : {data.helpline}"
    text_w = page.stringWidth(text, font, size)
    icon_size = 5 * mm
    gap = 2 * mm
    pad_l = 6.5 * mm
    pad_r = 5 * mm
    height = _BACK_HELPLINE_H
    slant = _BACK_HELPLINE_SLANT

    banner_w = pad_l + icon_size + gap + text_w + pad_r
    banner_left = max(min_left_x, right_edge - banner_w)
    banner_bottom = mid_y - height / 2
    banner_top = mid_y + height / 2

    path = page.beginPath()
    path.moveTo(banner_left + slant, banner_top)
    path.lineTo(right_edge, banner_top)
    path.lineTo(right_edge, banner_bottom)
    path.lineTo(banner_left, banner_bottom)
    path.close()
    page.setFillColor(BRAND_GREEN)
    page.drawPath(path, stroke=0, fill=1)

    icon_cx = banner_left + pad_l + icon_size / 2
    _draw_headset_icon(page, icon_cx, mid_y, icon_size, colors.white)

    page.setFont(font, size)
    page.setFillColor(colors.white)
    page.drawString(icon_cx + icon_size / 2 + gap, mid_y - 2.8, text)


def _draw_back_accent_bar(page: canvas.Canvas, x: float, y: float, w: float) -> None:
    page.setFillColor(BRAND_GREEN)
    page.rect(x, y, w, _BACK_ACCENT_H, stroke=0, fill=1)


def _draw_back_content(
    page: canvas.Canvas, x: float, top: float, w: float, bottom: float, data: CardData
) -> None:
    divider_x = x + w * 0.45
    left_x = x + _BACK_LEFT_INDENT
    left_content_w = divider_x - left_x

    right_x = divider_x
    right_content_w = x + w - divider_x

    _draw_facilities_list(page, left_x, top - 1.5 * mm, left_content_w, top - bottom, data.facilities)

    page.setStrokeColor(colors.HexColor("#cbd5e1"))
    page.setLineWidth(0.5)
    page.line(divider_x, bottom, divider_x, top)

    _draw_tagline_panel(page, right_x, bottom, right_content_w, top - bottom, data)


def _draw_facilities_list(
    page: canvas.Canvas, x: float, top: float, w: float, max_h: float, facilities: list[str]
) -> None:
    facility_font = _font_hi(bold=True)
    base_size = 13.5
    # Text starts 5mm in (after the bullet); keep a 3.5mm breathing gap
    # before the centre divider too — mirrors the preview column's `pr-3`
    # (12px ≈ 3.4mm). Without it, wrapped lines ran flush into the divider.
    max_width = w - 5 * mm - 3.5 * mm

    heading = "विशेष सुविधाएं:"
    heading_w = _get_hi_string_width(heading, 13.5) + 7.5 * mm
    heading_h = 8 * mm
    heading_y = top - heading_h

    page.setFillColor(BRAND_BLUE)
    page.roundRect(x, heading_y, heading_w, heading_h, radius=2.2, stroke=0, fill=1)
    _draw_hi_string(page, x + 3.5 * mm, heading_y + 2.4 * mm, heading, 13.5, colors.white)

    list_top = heading_y - 3 * mm
    list_bottom = top - max_h + 1.5 * mm
    available = list_top - list_bottom

    # Fit-to-space, mirrored by the preview's `FacilitiesList` in
    # `CardBack.tsx`: entries are admin-edited free text, so a long line
    # must wrap inside the left column (it used to run straight across
    # the divider into the emblem), and however many entries the admin
    # saves, the whole list steps its font size down — spacing, bullets
    # and wrap width in step — until everything fits above the note box.
    size = base_size
    min_size = 7.5
    while True:
        scale = size / base_size
        line_h = 8.6 * mm * scale
        cont_h = 5.0 * mm * scale
        wrapped_facilities = [_wrap_text(page, f, facility_font, size, max_width)[:3] for f in facilities]
        block_h = sum(line_h + (len(wrapped) - 1) * cont_h for wrapped in wrapped_facilities)
        if block_h <= available or size <= min_size:
            break
        size -= 0.5

    start_top = list_bottom + (available + block_h) / 2
    cursor = min(start_top, list_top) - line_h * 0.62
    bullet_r = 2.1 * mm * scale

    for entry_index, wrapped in enumerate(wrapped_facilities):
        # The last entry gets no tick and starts flush at the bullet
        # column (no hanging indent) — it usually reads as a closing/
        # continuation sentence rather than a bullet point, per the
        # approved design. Mirrored by `FacilitiesList` in the preview.
        is_last = entry_index == len(wrapped_facilities) - 1
        if not is_last:
            _draw_check_bullet(page, x + bullet_r, cursor + 1.3 * mm * scale, bullet_r)
        text_x = x if is_last else x + 5 * mm
        for i, line in enumerate(wrapped):
            _draw_hi_string(page, text_x, cursor - i * cont_h, line, size, INK)
        cursor -= line_h + (len(wrapped) - 1) * cont_h


def _draw_tagline_panel(
    page: canvas.Canvas, x: float, y: float, w: float, h: float, data: CardData
) -> None:
    icon_size = min(34 * mm, w - 4 * mm)
    left_bias = min(5 * mm, max(0, (w - icon_size) / 2))
    centre_x = x + (w - icon_size) / 2 - left_bias
    icon_x = max(x, centre_x)
    icon_y = y + h / 2 - icon_size / 2 + 5 * mm

    emblem = _emblem_image()
    if emblem is not None:
        page.drawImage(
            emblem, icon_x, icon_y, icon_size, icon_size, mask="auto", preserveAspectRatio=True
        )
    else:
        _draw_heart_hands_icon(page, icon_x, icon_y, icon_size)
    text_y = icon_y - 6 * mm
    text_cx = icon_x + icon_size / 2

    lines = data.tagline.split(",")
    tagline_size = 16.0
    for i, line in enumerate(lines):
        text = line.strip().rstrip(",") + ("," if i < len(lines) - 1 else "")
        _draw_hi_string(page, text_cx, text_y - i * 6.2 * mm, text, tagline_size, BRAND_BLUE, align="center")


def _draw_back_note(page: canvas.Canvas, x: float, y: float, w: float, data: CardData) -> None:
    inset = _BACK_NOTE_INSET
    box_x = x + inset
    box_w = w - 2 * inset
    box_h = _BACK_NOTE_HEIGHT - 1.5 * mm
    box_y = y + 1.2 * mm

    page.setFillColor(BRAND_LIGHT_GREEN)
    page.roundRect(box_x, box_y, box_w, box_h, radius=3, stroke=0, fill=1)

    note_font = _font_hi(bold=True)
    note_size = 9.5
    shield_size = 5.2 * mm
    shield_cx = box_x + 4 * mm + shield_size / 2
    text_x = box_x + 4 * mm + shield_size + 2.4 * mm
    max_width = box_x + box_w - 3.5 * mm - text_x
    lines = _wrap_text(page, data.disclaimer_note, note_font, note_size, max_width)[:3]
    line_h = 4.4 * mm

    # Centre the text block (and its shield icon) vertically inside the
    # box instead of anchoring a fixed 5.2mm from its top. That fixed
    # offset assumed a full 3 lines of text; the box itself is a fixed
    # height (`_BACK_NOTE_HEIGHT`, sized for the longest expected note),
    # but most real disclaimer notes wrap to only 1-2 lines — those sat
    # near the top of the box with a large empty gap below, unlike the
    # web preview's box, which always auto-sizes to hug its content.
    block_h = line_h * len(lines)
    text_top = box_y + (box_h + block_h) / 2 - line_h * 0.78

    _draw_shield_check_icon(page, shield_cx, text_top - 0.5 * mm, shield_size)

    page.setFillColor(INK)
    for i, line in enumerate(lines):
        _draw_hi_string(page, text_x, text_top - i * line_h, line, note_size, INK)


def _wrap_text(page: canvas.Canvas, text: str, font_name: str, font_size: float, max_width: float) -> list[str]:
    words = text.split()
    lines: list[str] = []
    current = ""
    for word in words:
        candidate = f"{current} {word}".strip()
        if font_name in (_FONT_REG, _FONT_BOLD):
            # Devanagari context — measure exactly as `_draw_hi_string`
            # draws it (Latin runs in Helvetica-Bold, the rest shaped),
            # so wrap points always match the rendered output.
            w = _mixed_string_width(candidate, font_size)
        else:
            w = page.stringWidth(candidate, font_name, font_size)

        if w > max_width and current:
            lines.append(current)
            current = word
        else:
            current = candidate
    if current:
        lines.append(current)
    return lines
