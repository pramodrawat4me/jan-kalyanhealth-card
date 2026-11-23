import type { Area } from "react-easy-crop";

import { MAX_COMPRESSED_PHOTO_SIZE_BYTES, PHOTO_TARGET_HEIGHT, PHOTO_TARGET_WIDTH } from "./photoConstants";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not load the selected image."));
    image.src = src;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), "image/jpeg", quality));
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/** Size of the smallest axis-aligned box that fully contains a
 * `width`x`height` rectangle once rotated by `rotationDeg` — needed so
 * the intermediate rotated canvas below doesn't clip any corners. */
function rotatedBoundingBox(width: number, height: number, rotationDeg: number): { width: number; height: number } {
  const rad = toRadians(rotationDeg);
  return {
    width: Math.abs(Math.cos(rad) * width) + Math.abs(Math.sin(rad) * height),
    height: Math.abs(Math.sin(rad) * width) + Math.abs(Math.cos(rad) * height),
  };
}

/** Rotates the source image onto its own canvas, sized to its rotated
 * bounding box — mirrors exactly what `react-easy-crop`'s preview does
 * internally, so the `cropArea` pixel rect it hands back via
 * `onCropComplete` (which is relative to this same rotated bounding box
 * whenever rotation is non-zero) lines up with what gets cropped here. */
function rotateImageToCanvas(image: HTMLImageElement, rotationDeg: number): HTMLCanvasElement {
  const { width, height } = rotatedBoundingBox(image.naturalWidth, image.naturalHeight, rotationDeg);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas is not supported in this browser.");
  }
  ctx.translate(width / 2, height / 2);
  ctx.rotate(toRadians(rotationDeg));
  ctx.translate(-image.naturalWidth / 2, -image.naturalHeight / 2);
  ctx.drawImage(image, 0, 0);
  return canvas;
}

/**
 * Crops `imageSrc` to `cropArea` (pixel rect from `react-easy-crop`,
 * relative to the rotated bounding box whenever `rotationDeg !== 0`),
 * draws it onto a fixed-size canvas matching the card's photo frame, then
 * re-encodes as JPEG — stepping quality down until the file lands under
 * the compressed size budget. This is the single mandatory compression
 * step every photo upload (customer, partner, or admin) goes through
 * before it ever reaches the network.
 */
export async function cropAndCompressImage(
  imageSrc: string,
  cropArea: Area,
  fileName: string,
  rotationDeg = 0,
): Promise<File> {
  const image = await loadImage(imageSrc);
  // No rotation → crop the image directly; any non-zero angle needs the
  // intermediate rotated canvas so the pixels actually move, not just the
  // crop rectangle's coordinates.
  const source: CanvasImageSource = rotationDeg % 360 === 0 ? image : rotateImageToCanvas(image, rotationDeg);

  const canvas = document.createElement("canvas");
  canvas.width = PHOTO_TARGET_WIDTH;
  canvas.height = PHOTO_TARGET_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas is not supported in this browser.");
  }
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(
    source,
    cropArea.x,
    cropArea.y,
    cropArea.width,
    cropArea.height,
    0,
    0,
    PHOTO_TARGET_WIDTH,
    PHOTO_TARGET_HEIGHT,
  );

  let quality = 0.9;
  let blob = await canvasToBlob(canvas, quality);
  while (blob && blob.size > MAX_COMPRESSED_PHOTO_SIZE_BYTES && quality > 0.4) {
    quality -= 0.1;
    blob = await canvasToBlob(canvas, quality);
  }

  if (!blob) {
    throw new Error("Could not process the selected image.");
  }

  const baseName = fileName.replace(/\.[^./]+$/, "") || "photo";
  return new File([blob], `${baseName}.jpg`, { type: "image/jpeg" });
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Could not read the selected file."));
    reader.readAsDataURL(file);
  });
}
