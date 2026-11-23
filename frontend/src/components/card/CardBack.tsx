import { useLayoutEffect, useRef, useState } from "react";

import logoEmblem from "../../assets/logo-emblem.png";
import logoFull from "../../assets/logo-full.png";
import { CardShell } from "./CardShell";
import { CheckBulletIcon, HeadsetIcon, ShieldCheckIcon } from "./CardIcons";

interface CardBackProps {
  helpline: string;
  facilities: string[];
  disclaimerNote: string;
  tagline: string;
}

/**
 * Fit-to-space facilities list, mirroring `_draw_facilities_list` in
 * `card_pdf_service.py`: entries are admin-edited free text, so long lines
 * wrap inside the left column (they used to run straight across the divider
 * into the emblem), and however many entries the admin saves, the list
 * steps its font size down — spacing and bullets in step — until everything
 * fits above the note box. Measured against real browser layout via a
 * `useLayoutEffect` shrink loop rather than an estimate, so wrapping is
 * always accounted for exactly.
 */
function FacilitiesList({ facilities }: Readonly<{ facilities: string[] }>) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  // New content restarts the fit from full size.
  useLayoutEffect(() => {
    setScale(1);
  }, [facilities]);

  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    if (host.scrollHeight > host.clientHeight + 1 && scale > 0.55) {
      setScale((current) => Math.max(0.55, Math.round((current - 0.05) * 100) / 100));
    }
  }, [scale, facilities]);

  return (
    <div ref={hostRef} className="flex h-full w-full flex-col justify-center overflow-hidden">
      <div className="mb-2.5 inline-flex flex-shrink-0 self-start rounded-md bg-teal px-4 py-1.5 font-devanagari text-[16px] font-semibold text-white">
        विशेष सुविधाएं:
      </div>
      <ul
        className="flex flex-col font-devanagari font-medium leading-snug text-ink"
        style={{ fontSize: 16 * scale, gap: 10 * scale }}
      >
        {facilities.map((facility, index) => (
          <li key={`${index}-${facility}`} className="flex items-start" style={{ gap: 10 * scale }}>
            {/* The last entry gets no tick and starts flush at the bullet
                column (no hanging indent) — it usually reads as a closing/
                continuation sentence rather than a bullet point, per the
                approved design. Mirrored by `_draw_facilities_list` in
                the PDF. */}
            {index < facilities.length - 1 && (
              <span
                className="flex-shrink-0"
                style={{ width: 18 * scale, height: 18 * scale, marginTop: 1.5 * scale }}
              >
                <CheckBulletIcon className="h-full w-full" />
              </span>
            )}
            <span className="min-w-0">{facility}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Back face of the printed card — fixed 600×378 design canvas mirroring
 * `card_pdf_service._draw_back_page` and the annotated client reference:
 *
 *  - green outer border (front stays navy)
 *  - top row: left-aligned full logo + right-flush green parallelogram
 *    helpline banner with a white headset icon
 *  - left: navy "विशेष सुविधाएं" pill heading + green-check facilities list
 *    (no light-blue panel)
 *  - right: large circular brand emblem (logo graphic) + tagline
 *  - bottom: inset light-green rounded note box with shield icon + disclaimer,
 *    sitting above a thin green accent bar
 */
export function CardBack({
  helpline,
  facilities,
  disclaimerNote,
  tagline,
}: Readonly<CardBackProps>) {
  const taglineLines = tagline.split(",").map((line) => line.trim());

  return (
    <CardShell borderClassName="border-brand-green">
      {/* Top row: logo (left) + helpline parallelogram (right) — logo shares
          the 8mm ≈ 28px left indent with the facilities column below */}
      <div className="absolute inset-x-0 top-0 flex h-[80px] items-center justify-between gap-3 pl-[28px]">
        <img
          src={logoFull}
          alt="Jan Kalyan Health Card"
          className="h-[56px] flex-shrink-0 object-contain"
        />
        <div
          className="flex h-[40px] min-w-0 items-center gap-2 bg-brand-green py-0 pl-6 pr-5 text-[14px] font-bold text-white"
          style={{ clipPath: "polygon(16px 0, 100% 0, 100% 100%, 0 100%)" }}
        >
          <HeadsetIcon className="h-4 w-4 flex-shrink-0 text-white" />
          <span className="truncate whitespace-nowrap">Helpline No. : {helpline}</span>
        </div>
      </div>

      {/* Mid body: facilities (left) + heart/hands brand (right), split by a
          grey divider positioned near the true horizontal centre (~45%) —
          the left block sits with a comfortable margin (not hugging the
          card edge) and the right block is centred within its own half
          (not hugging the right edge either). */}
      <div className="absolute bottom-[84px] left-0 right-0 top-[80px] flex items-stretch">
        <div className="py-2 pl-[28px] pr-3" style={{ width: "45%" }}>
          <FacilitiesList facilities={facilities} />
        </div>

        <div className="w-px flex-shrink-0 self-stretch bg-slate-300" />

        {/* Biased toward the divider (pr) rather than dead-centred in the
            right zone, so it doesn't leave a large empty gap at the card's
            right edge. */}
        <div className="flex flex-1 items-center justify-center pr-6">
          <div className="flex w-max flex-shrink-0 flex-col items-center gap-2.5 text-center">
            <img
              src={logoEmblem}
              alt=""
              className="h-[108px] w-[108px] object-contain"
            />
            <p className="font-devanagari text-[16px] font-semibold leading-snug text-teal">
              {taglineLines.map((line, i) => (
                <span key={line}>
                  {line}
                  {i < taglineLines.length - 1 ? "," : ""}
                  <br />
                </span>
              ))}
            </p>
          </div>
        </div>
      </div>

      {/* Disclaimer note box (inset, light green, shield icon) */}
      <div className="absolute inset-x-3 bottom-[13px] flex items-start gap-2.5 rounded-lg bg-brand-green-light px-4 py-2.5 font-devanagari text-[12.5px] font-medium leading-snug text-ink">
        <ShieldCheckIcon className="mt-0.5 h-[18px] w-[18px]" />
        <span>{disclaimerNote}</span>
      </div>

      {/* Thin green accent bar along the bottom edge */}
      <div className="absolute inset-x-0 bottom-0 h-[12px] bg-brand-green" />
    </CardShell>
  );
}
