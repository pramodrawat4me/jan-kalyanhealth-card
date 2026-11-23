import { useEffect, useRef, useState, type ReactNode } from "react";

import { CARD_DESIGN_H, CARD_DESIGN_W } from "./cardDesign";

/**
 * Scales a fixed 600×378 design canvas to the available width so every
 * child can use absolute px sizes that match the PDF's cutout proportions.
 * Without this, responsive Tailwind breakpoints make the preview drift
 * from what `card_pdf_service` prints.
 */
export function CardShell({
  children,
  className = "",
  borderClassName = "border-teal",
}: Readonly<{ children: ReactNode; className?: string; borderClassName?: string }>) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const update = () => {
      setScale(host.clientWidth / CARD_DESIGN_W);
    };
    update();

    const observer = new ResizeObserver(update);
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={hostRef}
      className={`relative w-full overflow-hidden rounded-xl border-2 bg-white shadow-md ${borderClassName} ${className}`}
      style={{ aspectRatio: `${CARD_DESIGN_W} / ${CARD_DESIGN_H}` }}
    >
      <div
        className="absolute left-0 top-0 origin-top-left"
        style={{
          width: CARD_DESIGN_W,
          height: CARD_DESIGN_H,
          transform: `scale(${scale})`,
        }}
      >
        {children}
      </div>
    </div>
  );
}
