import { cn } from "../../lib/cn";

interface AvatarProps {
  src: string | null;
  name: string;
  size?: "sm" | "lg";
  className?: string;
}

export function Avatar({ src, name, size = "sm", className }: AvatarProps) {
  const sizeClasses = size === "lg" ? "h-28 w-28 text-2xl" : "h-14 w-14 text-base";

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={cn("flex-shrink-0 rounded-lg bg-surface object-cover", sizeClasses, className)}
      />
    );
  }

  const initial = name.trim().charAt(0).toUpperCase() || "?";

  return (
    <div
      className={cn(
        "flex flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-teal-light to-brand-green-light font-semibold text-teal",
        sizeClasses,
        className,
      )}
    >
      {initial}
    </div>
  );
}
