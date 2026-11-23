import type { Area } from "react-easy-crop";
import { useEffect, useRef, useState } from "react";

import { cropAndCompressImage, readFileAsDataUrl } from "../../lib/imageCrop";
import { MAX_SOURCE_PHOTO_SIZE_BYTES } from "../../lib/photoConstants";
import { PhotoCropModal } from "./PhotoCropModal";

interface PhotoUploadProps {
  value: File | null;
  onChange: (file: File | null) => void;
  /** Shown when no new file is selected (edit flow keeps the current photo). */
  existingUrl?: string | null;
  error?: string;
  hint?: string;
}

/**
 * Every photo upload in the app — customer registration and partner
 * creation alike — funnels through this component. Selecting a file always
 * opens the crop dialog and always re-encodes through
 * `cropAndCompressImage`, so a mandatory compress + passport-crop step can
 * never be bypassed regardless of the source image's size or shape.
 */
export function PhotoUpload({ value, onChange, existingUrl, error, hint }: PhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pendingImageSrc, setPendingImageSrc] = useState<string | null>(null);
  const [pendingFileName, setPendingFileName] = useState<string>("photo.jpg");
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!value) {
      setPreviewUrl(existingUrl ?? null);
      return;
    }
    const url = URL.createObjectURL(value);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [value, existingUrl]);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setLocalError("Only JPEG, PNG, or WEBP photos are allowed.");
      return;
    }
    if (file.size > MAX_SOURCE_PHOTO_SIZE_BYTES) {
      setLocalError("Photo is too large. Please choose a file under 15 MB.");
      return;
    }
    setLocalError(null);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setPendingFileName(file.name);
      setPendingImageSrc(dataUrl);
    } catch {
      setLocalError("Could not read the selected photo. Please try another file.");
    }
  }

  async function handleCropConfirm(cropArea: Area, rotation: number) {
    if (!pendingImageSrc) return;
    setIsProcessing(true);
    try {
      const compressed = await cropAndCompressImage(pendingImageSrc, cropArea, pendingFileName, rotation);
      onChange(compressed);
      setPendingImageSrc(null);
    } catch {
      setLocalError("Could not process the selected photo. Please try another file.");
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-teal/50 bg-teal-light text-teal transition-colors duration-150 hover:border-teal hover:shadow-md"
      >
        {previewUrl ? (
          <img src={previewUrl} alt="Customer" className="h-full w-full object-cover" />
        ) : (
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M5 19c1-3.5 4-5 7-5s6 1.5 7 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(event) => {
          handleFile(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      <p className="text-xs text-muted">{hint ?? "Upload Photo / फोटो अपलोड करें"}</p>
      {(error || localError) && <p className="text-xs text-danger">{error ?? localError}</p>}

      {pendingImageSrc && (
        <PhotoCropModal
          imageSrc={pendingImageSrc}
          isProcessing={isProcessing}
          onCancel={() => setPendingImageSrc(null)}
          onConfirm={handleCropConfirm}
        />
      )}
    </div>
  );
}
