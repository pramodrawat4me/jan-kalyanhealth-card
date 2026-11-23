import type { ReactNode } from "react";
import { createPortal } from "react-dom";

import { Button } from "./Button";

interface DialogProps {
  open: boolean;
  title: string;
  description?: string;
  children?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: "primary" | "danger";
  isConfirming?: boolean;
  onConfirm?: () => void;
  onClose: () => void;
}

export function Dialog({
  open,
  title,
  description,
  children,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  confirmVariant = "primary",
  isConfirming,
  onConfirm,
  onClose,
}: DialogProps) {
  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/40 px-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-base font-semibold text-navy">{title}</h2>
        {description && <p className="mt-2 text-sm text-muted">{description}</p>}
        {children && <div className="mt-4">{children}</div>}
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            {cancelLabel}
          </Button>
          {onConfirm && (
            <Button variant={confirmVariant} size="sm" isLoading={isConfirming} onClick={onConfirm}>
              {confirmLabel}
            </Button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
