/**
 * Shared photo-crop geometry for customer and partner photo uploads.
 *
 * Mirrors the backend's `_TARGET_SIZE` in `app/core/file_storage.py`
 * (280×340px, the passport-style frame printed on the card). Keeping the
 * crop aspect ratio identical to the server's cover-crop target means the
 * square the user frames in the cropper is exactly what ends up on the
 * printed card — no surprise re-cropping happens server-side.
 */
export const PHOTO_TARGET_WIDTH = 280;
export const PHOTO_TARGET_HEIGHT = 340;
export const PHOTO_CROP_ASPECT = PHOTO_TARGET_WIDTH / PHOTO_TARGET_HEIGHT;

/** Uploads above this size are rejected before we even try to compress them. */
export const MAX_SOURCE_PHOTO_SIZE_BYTES = 15 * 1024 * 1024;

/** Target size (bytes) the client-side compressor aims to land under. */
export const MAX_COMPRESSED_PHOTO_SIZE_BYTES = 400 * 1024;
