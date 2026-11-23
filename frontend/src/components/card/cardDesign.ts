/**
 * Shared design tokens for the printed card. The preview renders inside a
 * fixed 600×378 canvas (see `CardShell`) that is then scaled to the
 * container width — the same aspect the PDF uses (`card_w = 170mm`,
 * `card_h = card_w / 1.586`). Every font size / geometry value here is
 * intentionally fixed (no responsive `sm:` variants) so the on-screen
 * preview and the downloaded PDF stay pixel-aligned.
 *
 * Backend mirror: `card_pdf_service.py` geometry constants. Keep the two
 * in sync when changing layout.
 */
export const CARD_DESIGN_W = 600;
export const CARD_DESIGN_H = 378;

/**
 * Passport photo frame — 28.5×35.5mm in the PDF, scaled to the 600px canvas.
 * Scale factor: 600px / 170mm = 3.529 px/mm
 * 28.5mm × 3.529 ≈ 101px wide, 35.5mm × 3.529 ≈ 125px tall
 */
export const PHOTO_W = 101;
export const PHOTO_H = 125;
export const PHOTO_ASPECT = `${PHOTO_W} / ${PHOTO_H}`;

/**
 * Footer height: 14mm × 3.529 ≈ 49px
 * Header zone: 40mm × 3.529 ≈ 141px
 */
export const FOOTER_H = 49;
export const HEADER_ZONE = 141;
