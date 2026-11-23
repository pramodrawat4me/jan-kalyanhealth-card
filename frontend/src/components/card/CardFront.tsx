import logoFull from "../../assets/logo-full.png";
import { formatDisplayDate } from "../../lib/date";
import { FOOTER_H, PHOTO_H, PHOTO_W } from "./cardDesign";
import { CardHeaderCurve } from "./CardHeaderCurve";
import { CardShell } from "./CardShell";
import { FamilyChip } from "./FamilyChip";
import { QrCode } from "./QrCode";

interface CardFrontProps {
  cardId: string;
  name: string;
  fatherHusband: string;
  dob: string;
  genderLabel: string;
  address: string;
  validityDate: string;
  showValidity: boolean;
  mobile: string;
  photoUrl: string | null;
  qrValue: string;
  registrationFee: string;
  tagline: string;
}

/** Heart-and-heartbeat watermark, centred on the front body — mirrors the
 * reference "heart with medical cross, ECG line running through it" logo
 * motif. Geometry is shared verbatim with `_draw_ecg_watermark` in
 * `card_pdf_service.py` (600x378 design px, rise = upward offset from the
 * baseline), so the preview and the printed PDF render the exact same
 * artwork. Low-opacity brand green; the cross is knocked out in card
 * white. */
const ECG_LEFT: ReadonlyArray<readonly [number, number]> = [
  [0, 0], [70, 0],
  [84, 11], [98, 0],
  [112, 0], [122, -9], [134, 48], [148, -27], [158, 0],
  [178, 0], [196, 13], [214, 0],
  [252, 0],
];
const ECG_RIGHT: ReadonlyArray<readonly [number, number]> = [
  [348, 0], [368, 0],
  [378, -8], [388, 34], [400, -20], [410, 0],
  [430, 0], [448, 11], [464, 0],
  [600, 0],
];
const ECG_BASELINE_Y = 240;
// Upward shift so the artwork sits in the upper-centre of the body rather
// than the vertical middle. Mirrored by `_ECG_SHIFT_Y` in the PDF.
const ECG_SHIFT_Y = 35;
// Heart centred at (300, 238): lobes top ~196, tip at 288, spans x 250-350.
const HEART_PATH =
  "M 300 213 C 288 190 250 190 250 222 C 250 244 272 262 300 288 " +
  "C 328 262 350 244 350 222 C 350 190 312 190 300 213 Z";

function EcgWatermark() {
  const toPoints = (trace: ReadonlyArray<readonly [number, number]>) =>
    trace.map(([x, rise]) => `${x},${ECG_BASELINE_Y - rise}`).join(" ");

  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 600 378"
      aria-hidden="true"
    >
      <g transform={`translate(0, ${-ECG_SHIFT_Y})`}>
        <polyline
          points={toPoints(ECG_LEFT)}
          fill="none"
          stroke="#59a633"
          strokeOpacity={0.12}
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <polyline
          points={toPoints(ECG_RIGHT)}
          fill="none"
          stroke="#59a633"
          strokeOpacity={0.12}
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <path d={HEART_PATH} fill="#59a633" fillOpacity={0.12} />
        {/* Medical cross knocked out of the heart in card white. */}
        <rect x={292} y={212} width={16} height={40} rx={2} fill="#ffffff" />
        <rect x={280} y={224} width={40} height={16} rx={2} fill="#ffffff" />
      </g>
    </svg>
  );
}

function Row({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <p className="flex gap-2 font-devanagari text-[14px] leading-[1.4]">
      <strong className="w-[111px] flex-shrink-0 font-semibold text-teal">{label}</strong>
      <span className="text-ink/60">:</span>
      <span className="min-w-0 flex-1 truncate font-semibold text-ink" title={value}>
        {value}
      </span>
    </p>
  );
}

/**
 * Front face of the printed card — fixed 600×378 design canvas (via
 * `CardShell`) that mirrors `card_pdf_service._draw_front_page`
 * section-for-section: curved navy header, customer mobile top-left, ID
 * chip, centred logo, passport photo + Hindi fields, QR + fee tag, and a
 * navy footer with the white family chip + tagline. No responsive font
 * breakpoints — preview and PDF share the same sizes.
 *
 * Geometry sync with card_pdf_service.py (scale: 600px / 170mm = 3.529px/mm):
 *   - Header zone:  40mm × 3.529 ≈ 141px  (HEADER_ZONE)
 *   - Footer:       14mm × 3.529 ≈  49px  (FOOTER_H)
 *   - Chips:        4mm below card top ≈ 14px (chip_y = top − 11mm, 7mm tall)
 *   - Logo:         10mm from top ≈ 35px, 20mm tall ≈ 71px
 *   - Body top:     42mm from top ≈ 148px (_BODY_TOP_FROM_CARD_TOP)
 *   - Photo:        28.5mm × 35.5mm → 101×125px, left-inset 7.5mm ≈ 27px
 *   - QR:           20.5mm QR in a 23.5mm ≈ 83px green box, right-inset 9.5mm ≈ 33px
 */
export function CardFront({
  cardId,
  name,
  fatherHusband,
  dob,
  genderLabel,
  address,
  validityDate,
  showValidity,
  mobile,
  photoUrl,
  qrValue,
  registrationFee,
  tagline,
}: Readonly<CardFrontProps>) {
  return (
    <CardShell>
      {/* First in paint order so every real element sits above it. */}
      <EcgWatermark />
      <CardHeaderCurve className="text-teal" heightPercent={37} />

      {/* Mobile chip — top-left, 4mm from top ≈ 14px, matching chip_y in PDF */}
      <span className="absolute left-4 top-[14px] rounded border border-red-200 bg-white px-2.5 py-1 text-[12px] font-bold text-card-id">
        मो. {mobile}
      </span>
      {/* ID chip — top-right, same vertical position */}
      <span className="absolute right-4 top-[14px] rounded border border-blue-200 bg-teal-light px-2.5 py-1 text-[12px] font-bold text-teal">
        ID : {cardId}
      </span>

      {/* Logo — centred in the white curve dome, 10mm ≈ 35px from top, 20mm ≈ 71px tall */}
      <div className="absolute left-0 right-0 top-[35px] flex justify-center">
        <img src={logoFull} alt="Jan Kalyan Health Card" className="h-[71px] object-contain" />
      </div>

      {/* Body: photo + detail rows + QR block — top at 148px = 42mm from card top (PDF _BODY_TOP_FROM_CARD_TOP) */}
      <div
        className="absolute left-0 right-0 flex flex-col"
        style={{ top: 148, bottom: FOOTER_H }}
      >
        <div className="flex items-start pl-[27px] pr-[33px]">
          {/* Passport photo — light slate border, matching the reference render */}
          <div
            className="flex-shrink-0 overflow-hidden rounded-md border border-slate-300 bg-slate-50 shadow-sm"
            style={{ width: PHOTO_W, height: PHOTO_H }}
          >
            {photoUrl ? (
              <img src={photoUrl} alt={name} className="h-full w-full object-cover object-top" />
            ) : (
              <div className="flex h-full items-center justify-center text-center text-[11px] text-muted">
                No Photo
              </div>
            )}
          </div>

          {/* Detail rows — 25px gap after photo, ~28px row pitch */}
          <div className="ml-[25px] flex min-w-0 flex-1 flex-col gap-[9px]">
            <Row label="नाम" value={name} />
            <Row label="पिता/पति" value={fatherHusband} />
            <Row label="जन्मतिथि" value={formatDisplayDate(dob)} />
            <Row label="लिंग" value={genderLabel} />
            <Row label="पता" value={address} />
            {showValidity && <Row label="वैधता" value={formatDisplayDate(validityDate)} />}
          </div>

          {/* QR + fee tag — 20.5mm QR ≈ 71px inside a 23.5mm ≈ 83px green box (PDF _QR_SIZE) */}
          <div className="ml-[10px] flex w-[83px] flex-shrink-0 flex-col items-center gap-[9px]">
            <div className="rounded-md border-2 border-brand-green bg-white p-1">
              <QrCode value={qrValue} size={71} className="h-[71px] w-[71px]" />
            </div>
            <div className="w-full rounded-md border border-brand-green bg-brand-green-light py-[7px] text-center leading-tight">
              <p className="font-devanagari text-[10px] text-brand-green">पंजीयन शुल्क</p>
              <p className="text-[13px] font-bold text-teal">₹{registrationFee}/-</p>
            </div>
          </div>
        </div>
      </div>

      {/* Navy footer */}
      <div
        className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-2.5 bg-teal px-3"
        style={{ height: FOOTER_H }}
      >
        <FamilyChip className="h-7 w-7" />
        <p className="font-devanagari text-[17px] font-semibold text-white">{tagline}</p>
      </div>
    </CardShell>
  );
}
