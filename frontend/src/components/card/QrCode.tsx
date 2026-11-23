import { useEffect, useRef } from "react";
import QRCode from "qrcode";

interface QrCodeProps {
  value: string;
  size?: number;
  className?: string;
}

/** Client-side QR render for the live card preview. Purely cosmetic — the
 * QR code that actually ships is baked into the PDF by `card_pdf_service`
 * from the same `qr_target_url` shape (`{origin}/card-status/{cardId}`),
 * so this preview and the print output point at the same page. */
export function QrCode({ value, size = 72, className }: QrCodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, value, {
      width: size,
      margin: 0,
      color: { dark: "#093c71", light: "#ffffff" },
    }).catch(() => {
      // Preview-only — a failed render just leaves a blank canvas.
    });
  }, [value, size]);

  return <canvas ref={canvasRef} width={size} height={size} className={className} />;
}
