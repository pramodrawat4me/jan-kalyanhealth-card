import logoIcon from "../../assets/logo-icon.png";
import logoMark from "../../assets/logo-mark.png";

import { cn } from "../../lib/cn";

type LogoVariant = "icon" | "mark";

interface LogoProps {
  /** `icon` = emblem only (compact chrome). `mark` = emblem + JAN KALYAN HEALTH
   *  + Hindi tagline — everything from the official lockup except the word CARD. */
  variant?: LogoVariant;
  /** Pixel height. Width follows the asset's natural aspect ratio. */
  size?: number;
  className?: string;
}

/**
 * Site brand mark. Printed cards use the full lockup (`logo-full.png` on the
 * backend) which still includes the word CARD; the web UI never shows CARD
 * inside the logo image itself.
 */
export function Logo({ variant = "icon", size = 40, className }: LogoProps) {
  if (variant === "mark") {
    const height = size;
    return (
      <img
        src={logoMark}
        alt="Jan Kalyan Health"
        height={height}
        className={cn("object-contain", className)}
        style={{ height, width: "auto" }}
      />
    );
  }

  return (
    <img
      src={logoIcon}
      alt="Jan Kalyan Health"
      width={size}
      height={size}
      className={cn("object-contain", className)}
      style={{ width: size, height: size }}
    />
  );
}
