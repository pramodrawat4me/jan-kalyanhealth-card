import { type PointerEvent as ReactPointerEvent, useRef, useState } from "react";
import Cropper, { type Area, type Point } from "react-easy-crop";
import { createPortal } from "react-dom";

import { PHOTO_CROP_ASPECT } from "../../lib/photoConstants";
import { RotateLeftIcon, RotateRightIcon } from "../icons";
import { Button } from "./Button";

interface PhotoCropModalProps {
  imageSrc: string;
  onCancel: () => void;
  onConfirm: (cropArea: Area, rotation: number) => void;
  isProcessing?: boolean;
}

const DIAL_PX_PER_DEG = 3;
const DIAL_RANGE = 180; // degrees either side of zero
const MAX_ZOOM = 8; // was 3 — let users zoom right in on a face/detail.

/** Wraps a degree value back into (-180, 180] so the dial and the
 * quick-rotate buttons never drift outside their displayed range no
 * matter how many times either is used. */
function normalizeRotation(degrees: number): number {
  const wrapped = ((degrees + 180) % 360 + 360) % 360 - 180;
  return wrapped === -180 ? 180 : wrapped;
}

/**
 * iPhone-style "straighten" ruler: a horizontal strip of tick marks the
 * user drags left/right under a fixed centre indicator, with the current
 * angle read out above it. The strip itself is two layered
 * repeating-linear-gradients (minor tick every 2°, taller major tick every
 * 10°) on a fixed-width track that slides via `translateX`, so no tick DOM
 * nodes are needed and the drag stays perfectly smooth.
 */
function RotationDial({
  value,
  onChange,
}: Readonly<{ value: number; onChange: (deg: number) => void }>) {
  const drag = useRef<{ startX: number; startValue: number } | null>(null);

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture is a nice-to-have (keeps the drag alive when the
      // pointer briefly leaves the strip) — never a reason to break the
      // drag entirely if the browser rejects the pointer id.
    }
    drag.current = { startX: event.clientX, startValue: value };
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!drag.current) return;
    // Dragging the ruler left moves the strip left → angle increases,
    // matching the iOS straighten dial's direction.
    const deltaDeg = (drag.current.startX - event.clientX) / DIAL_PX_PER_DEG;
    const next = Math.round(drag.current.startValue + deltaDeg);
    onChange(Math.max(-DIAL_RANGE, Math.min(DIAL_RANGE, next)));
  }

  function handlePointerEnd() {
    drag.current = null;
  }

  // Strip is wide enough for the full ±range plus half a viewport each
  // side so the pattern never runs out under the indicator.
  const stripWidth = DIAL_RANGE * 2 * DIAL_PX_PER_DEG;

  return (
    <div
      role="slider"
      aria-label="Rotation"
      aria-valuemin={-DIAL_RANGE}
      aria-valuemax={DIAL_RANGE}
      aria-valuenow={value}
      tabIndex={0}
      className="relative h-12 w-full cursor-ew-resize touch-none select-none overflow-hidden"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") onChange(Math.max(-DIAL_RANGE, value - 1));
        if (event.key === "ArrowRight") onChange(Math.min(DIAL_RANGE, value + 1));
      }}
      onDoubleClick={() => onChange(0)}
    >
      {/* Degree readout, centred above the ticks. */}
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 text-center text-[11px] font-semibold tabular-nums ${
          value === 0 ? "text-muted" : "text-teal"
        }`}
      >
        {value}°
      </div>

      {/* Minor ticks: every 2° (6px). Major ticks: every 10° (30px). */}
      <div
        className="absolute top-[22px] h-2.5"
        style={{
          width: stripWidth + DIAL_PX_PER_DEG * 2,
          left: "50%",
          transform: `translateX(calc(-50% - ${value * DIAL_PX_PER_DEG}px))`,
          backgroundImage:
            "repeating-linear-gradient(to right, #cbd5e1 0px, #cbd5e1 1.5px, transparent 1.5px, transparent 6px)",
        }}
        aria-hidden="true"
      />
      <div
        className="absolute top-[20px] h-[14px]"
        style={{
          width: stripWidth + DIAL_PX_PER_DEG * 2,
          left: "50%",
          transform: `translateX(calc(-50% - ${value * DIAL_PX_PER_DEG}px))`,
          backgroundImage:
            "repeating-linear-gradient(to right, #94a3b8 0px, #94a3b8 1.5px, transparent 1.5px, transparent 30px)",
        }}
        aria-hidden="true"
      />

      {/* Fixed centre indicator. */}
      <div
        className="pointer-events-none absolute left-1/2 top-[17px] h-5 w-[2px] -translate-x-1/2 rounded-full bg-teal"
        aria-hidden="true"
      />

      {/* Soft fade at both edges so the ruler reads as endless. */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(to right, white 0%, transparent 18%, transparent 82%, white 100%)",
        }}
        aria-hidden="true"
      />
    </div>
  );
}

/**
 * Interactive pan/zoom/rotate cropper shown right after a photo is
 * selected, for every photo upload in the app (customer, partner, admin
 * profile). Locked to the card's passport-photo aspect ratio (see
 * `photoConstants.ts`) so whatever the user frames here is exactly what
 * gets printed — no server-side re-cropping surprises. Rotation is plain
 * degrees, fed straight to `react-easy-crop`'s own `rotation` prop; the
 * actual pixel-level rotation happens later in `cropAndCompressImage`,
 * which needs the same angle to reproduce exactly what's previewed here.
 */
export function PhotoCropModal({ imageSrc, onCancel, onConfirm, isProcessing }: PhotoCropModalProps) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [cropArea, setCropArea] = useState<Area | null>(null);

  function rotateBy(delta: number) {
    setRotation((current) => normalizeRotation(current + delta));
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/50 px-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
        <h2 className="text-base font-semibold text-navy">Adjust Photo</h2>
        <p className="mt-1 text-xs text-muted">
          Drag to reposition, pinch or slide to zoom, drag the ruler to straighten.
        </p>

        <div className="relative mt-4 h-80 w-full overflow-hidden rounded-lg bg-navy/90">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            maxZoom={MAX_ZOOM}
            rotation={rotation}
            aspect={PHOTO_CROP_ASPECT}
            cropShape="rect"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onRotationChange={setRotation}
            onCropComplete={(_, areaPixels) => setCropArea(areaPixels)}
          />
        </div>

        {/* Zoom — slim modern slider flanked by small/large glyphs. */}
        <div className="mt-4 flex items-center gap-3">
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 flex-shrink-0 text-muted" fill="none" aria-hidden="true">
            <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="2" />
            <path d="M16 16l4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input
            type="range"
            min={1}
            max={MAX_ZOOM}
            step={0.05}
            value={zoom}
            aria-label="Zoom"
            onChange={(event) => setZoom(Number(event.target.value))}
            className="h-1 flex-1 accent-teal"
          />
          <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] flex-shrink-0 text-muted" fill="none" aria-hidden="true">
            <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="2" />
            <path d="M16 16l4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M8.5 11h5M11 8.5v5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </div>

        {/* Rotate — iOS-style circular quarter-turn buttons around the
            draggable straighten ruler. */}
        <div className="mt-2 flex items-center gap-2">
          <button
            type="button"
            onClick={() => rotateBy(-90)}
            aria-label="Rotate left 90 degrees"
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-surface text-ink transition-colors duration-150 hover:bg-teal-light hover:text-teal"
          >
            <RotateLeftIcon className="h-[18px] w-[18px]" />
          </button>
          <RotationDial value={rotation} onChange={setRotation} />
          <button
            type="button"
            onClick={() => rotateBy(90)}
            aria-label="Rotate right 90 degrees"
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-surface text-ink transition-colors duration-150 hover:bg-teal-light hover:text-teal"
          >
            <RotateRightIcon className="h-[18px] w-[18px]" />
          </button>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel} disabled={isProcessing}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            isLoading={isProcessing}
            disabled={!cropArea}
            onClick={() => cropArea && onConfirm(cropArea, rotation)}
          >
            Use Photo
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
