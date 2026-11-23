"""Regenerate brand logo assets from the official source PNG.

Outputs:
  - backend/app/assets/logo-full.png     — full lockup (includes CARD) for print
  - frontend/src/assets/logo-full.png    — same, for local previews
  - frontend/src/assets/logo-mark.png    — emblem + JAN KALYAN HEALTH + tagline
  - frontend/src/assets/logo-icon.png    — emblem only

Usage (from repo root, with Pillow + numpy available in the backend venv):

  backend\\.venv\\Scripts\\python.exe scripts\\process_brand_logos.py
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "WhatsApp Unknown 2026-07-21 at 11.22.56 AM" / "jan-Kalyan-health-card.png"
OUT_FULL = ROOT / "backend" / "app" / "assets" / "logo-full.png"
OUT_FULL_FE = ROOT / "frontend" / "src" / "assets" / "logo-full.png"
OUT_MARK = ROOT / "frontend" / "src" / "assets" / "logo-mark.png"
OUT_ICON = ROOT / "frontend" / "src" / "assets" / "logo-icon.png"

# Measured against the original 1834×704 artwork.
HY0, HY1 = 368, 426
HEALTH = (952, 1320)
CARD_ERASE = (1349, 1834)
LEFT_RULE = (747, 913)
TITLE_CX = (795 + 1833) // 2
VALLEY_X = 685


def to_transparent(im: Image.Image, threshold: int = 18) -> Image.Image:
    arr = np.array(im.convert("RGBA"))
    rgb = arr[:, :, :3].astype(np.int16)
    arr[rgb.max(axis=2) < threshold, 3] = 0
    return Image.fromarray(arr, "RGBA")


def content_bbox(im: Image.Image, pad: int = 12) -> tuple[int, int, int, int]:
    arr = np.array(im)
    ys, xs = np.where(arr[:, :, 3] > 10)
    return (
        max(0, xs.min() - pad),
        max(0, ys.min() - pad),
        min(im.width, xs.max() + pad + 1),
        min(im.height, ys.max() + pad + 1),
    )


def save_resized(im: Image.Image, path: Path, max_w: int) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    out = im.copy()
    if out.width > max_w:
        ratio = max_w / out.width
        out = out.resize((max_w, int(out.height * ratio)), Image.Resampling.LANCZOS)
    out.save(path, "PNG", optimize=True)
    print(f"wrote {path} {out.size}")


def main() -> None:
    if not SRC.exists():
        raise SystemExit(f"Source logo not found: {SRC}")

    full_raw = to_transparent(Image.open(SRC))
    bbox = content_bbox(full_raw, pad=12)
    full = full_raw.crop(bbox)
    ox, oy = bbox[0], bbox[1]

    hy0, hy1 = HY0 - oy, HY1 - oy
    hx0, hx1 = HEALTH[0] - ox, HEALTH[1] - ox
    erase0, erase1 = CARD_ERASE[0] - ox, CARD_ERASE[1] - ox
    lx0, lx1 = LEFT_RULE[0] - ox, LEFT_RULE[1] - ox
    title_cx = TITLE_CX - ox

    mark_arr = np.array(full)
    mark_arr[hy0:hy1, erase0:erase1, 3] = 0
    mark_arr[hy0:hy1, lx0 : lx1 + 4, 3] = 0

    health = mark_arr[hy0:hy1, hx0:hx1].copy()
    mark_arr[hy0:hy1, hx0:hx1, 3] = 0

    hw = hx1 - hx0
    paste_x = int(max(0, min(title_cx - hw / 2, mark_arr.shape[1] - hw)))
    dest = mark_arr[hy0:hy1, paste_x : paste_x + hw]
    ha = health[:, :, 3] > 10
    dest[ha] = health[ha]
    mark_arr[hy0:hy1, paste_x : paste_x + hw] = dest

    mark_img = Image.fromarray(mark_arr, "RGBA")
    sample = health[health[:, :, 3] > 200]
    navy = tuple(int(v) for v in sample.mean(axis=0)) if len(sample) else (9, 60, 113, 255)
    draw = ImageDraw.Draw(mark_img)
    rule_y = hy0 + (hy1 - hy0) // 2
    gap, rule_len = 22, 78
    draw.rectangle([paste_x - gap - rule_len, rule_y - 1, paste_x - gap, rule_y + 3], fill=navy)
    draw.rectangle([paste_x + hw + gap, rule_y - 1, paste_x + hw + gap + rule_len, rule_y + 3], fill=navy)
    mark_img = mark_img.crop(content_bbox(mark_img, pad=10))

    valley = VALLEY_X - ox
    emblem = full.crop((0, 0, max(10, valley - 8), full.height))
    emblem = emblem.crop(content_bbox(emblem, pad=4))
    side = max(emblem.width, emblem.height) + 16
    icon = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    icon.paste(emblem, ((side - emblem.width) // 2, (side - emblem.height) // 2), emblem)

    save_resized(full, OUT_FULL, 1200)
    save_resized(full, OUT_FULL_FE, 1200)
    save_resized(mark_img, OUT_MARK, 1000)
    save_resized(icon, OUT_ICON, 320)


if __name__ == "__main__":
    main()
