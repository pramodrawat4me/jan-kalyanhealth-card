import { useToastStore } from "../../store/toastStore";
import { cn } from "../../lib/cn";

const toneClasses = {
  success: "border-teal/30 bg-white text-navy before:bg-teal",
  error: "border-danger/30 bg-white text-navy before:bg-danger",
  info: "border-line bg-white text-navy before:bg-navy",
};

export function Toaster() {
  const toasts = useToastStore((state) => state.toasts);
  const dismiss = useToastStore((state) => state.dismiss);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 left-1/2 z-[100] flex w-full max-w-sm -translate-x-1/2 flex-col gap-2 px-4">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          className={cn(
            "relative overflow-hidden rounded-lg border px-4 py-3 pl-5 text-sm shadow-lg before:absolute before:inset-y-0 before:left-0 before:w-1",
            toneClasses[toast.tone],
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <span>{toast.message}</span>
            <button
              onClick={() => dismiss(toast.id)}
              className="text-muted transition-colors hover:text-navy"
              aria-label="Dismiss"
            >
              &times;
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
