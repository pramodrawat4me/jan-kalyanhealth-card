import type { Area } from "react-easy-crop";
import { useRef, useState } from "react";

import { cropAndCompressImage, readFileAsDataUrl } from "../../lib/imageCrop";
import { MAX_SOURCE_PHOTO_SIZE_BYTES } from "../../lib/photoConstants";
import { PencilIcon } from "../icons";
import { Avatar } from "./Avatar";
import { PhotoCropModal } from "./PhotoCropModal";
import { Spinner } from "./Spinner";

/**
 * An `Avatar` a user can click to replace — the profile-page counterpart to
 * `PhotoUpload` (which defers the file to a surrounding form's submit).
 * This one uploads immediately on crop-confirm via `onSelect`, since a
 * profile photo isn't part of a larger form the user might still cancel.
 */
export function EditablePhoto({
  src,
  name,
  isUploading,
  onSelect,
}: Readonly<{
  src: string | null;
  name: string;
  isUploading?: boolean;
  onSelect: (file: File) => void;
}>) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pendingImageSrc, setPendingImageSrc] = useState<string | null>(null);
  const [pendingFileName, setPendingFileName] = useState("photo.jpg");
  const [isCropping, setIsCropping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Only JPEG, PNG, or WEBP photos are allowed.");
      return;
    }
    if (file.size > MAX_SOURCE_PHOTO_SIZE_BYTES) {
      setError("Photo is too large. Please choose a file under 15 MB.");
      return;
    }
    setError(null);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setPendingFileName(file.name);
      setPendingImageSrc(dataUrl);
    } catch {
      setError("Could not read the selected photo. Please try another file.");
    }
  }

  async function handleCropConfirm(cropArea: Area, rotation: number) {
    if (!pendingImageSrc) return;
    setIsCropping(true);
    try {
      const compressed = await cropAndCompressImage(pendingImageSrc, cropArea, pendingFileName, rotation);
      onSelect(compressed);
      setPendingImageSrc(null);
    } catch {
      setError("Could not process the selected photo. Please try another file.");
    } finally {
      setIsCropping(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={isUploading}
        className="group relative rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
        aria-label="Change profile photo"
      >
        <Avatar src={src} name={name} size="lg" />
        <span className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-teal text-white shadow-sm transition-colors duration-150 group-hover:bg-teal-hover">
          {isUploading ? <Spinner size={14} className="text-white" /> : <PencilIcon className="h-3.5 w-3.5" />}
        </span>
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
      {error && <p className="text-xs text-danger">{error}</p>}

      {pendingImageSrc && (
        <PhotoCropModal
          imageSrc={pendingImageSrc}
          isProcessing={isCropping}
          onCancel={() => setPendingImageSrc(null)}
          onConfirm={handleCropConfirm}
        />
      )}
    </div>
  );
}
