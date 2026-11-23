import { type ReactElement, useState } from "react";
import { createPortal } from "react-dom";

import { completeOnboarding } from "../../api/auth";
import {
  CloseIcon,
  HospitalIcon,
  IdCardIcon,
  PrinterIcon,
  SearchIcon,
  UserPlusIcon,
} from "../icons";
import { cn } from "../../lib/cn";
import { useAuthStore } from "../../store/authStore";
import { Button } from "../ui/Button";

interface Slide {
  icon: (props: Readonly<{ className?: string }>) => ReactElement;
  title: string;
  body: string;
}

const SLIDES: Slide[] = [
  {
    icon: IdCardIcon,
    title: "Welcome to Jan Kalyan Health Card",
    body: "This is your workspace for registering customers, issuing QR-verified discount cards, and looking up existing cardholders, everything you do day to day, in one place.",
  },
  {
    icon: UserPlusIcon,
    title: "Registering a customer is fast",
    body: "Fill in their details and photo on Add Customer. The Card ID and validity date are generated automatically, so you never need to enter or track them yourself.",
  },
  {
    icon: PrinterIcon,
    title: "Print, then keep track",
    body: "Print a card straight from a customer's record. Printing shows a Today tab for what you've just printed, and a History tab for everything you've ever printed.",
  },
  {
    icon: SearchIcon,
    title: "Find a card in seconds",
    body: "Use Find Card, or the search box at the top of the app, with a mobile number or Card ID to jump straight to a customer's record.",
  },
  {
    icon: HospitalIcon,
    title: "Hospitals, and getting help",
    body: "The Hospital directory is shared across all partners and kept current by the organisation. If you ever need this tour again, find it under Profile → Help.",
  },
];

/** Concise, dismissible first-login welcome — 5 short slides, not a
 * tooltip-per-element tour. Completion is persisted server-side
 * (`onboarding_completed_at` on Partner) so it never reappears after a
 * browser storage clear, but can be intentionally replayed from Profile. */
export function OnboardingTour({ onClose }: Readonly<{ onClose: () => void }>) {
  const [index, setIndex] = useState(0);
  const updatePartner = useAuthStore((state) => state.updatePartner);
  const [isFinishing, setIsFinishing] = useState(false);

  const slide = SLIDES[index];
  const isLast = index === SLIDES.length - 1;

  async function finish() {
    setIsFinishing(true);
    try {
      const updated = await completeOnboarding();
      updatePartner(updated);
    } catch {
      // Non-critical — worst case the tour reappears next login; don't
      // block the operator from continuing their work over this.
    } finally {
      setIsFinishing(false);
      onClose();
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-navy/50 px-4">
      <div className="animate-fade-scale-in relative w-full max-w-md rounded-2xl bg-white p-6 shadow-elevated sm:p-7">
        <button
          type="button"
          onClick={finish}
          aria-label="Skip tour"
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors duration-150 hover:bg-surface"
        >
          <CloseIcon className="h-4 w-4" />
        </button>

        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-light text-teal">
          <slide.icon className="h-6 w-6" />
        </span>

        <h2 className="mt-4 text-lg font-semibold text-navy">{slide.title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">{slide.body}</p>

        <div className="mt-6 flex items-center justify-between">
          <div className="flex gap-1.5">
            {SLIDES.map((_, dotIndex) => (
              <span
                key={dotIndex}
                className={cn(
                  "h-1.5 w-1.5 rounded-full transition-colors duration-150",
                  dotIndex === index ? "bg-teal" : "bg-line",
                )}
              />
            ))}
          </div>

          <div className="flex gap-2">
            {index > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setIndex((current) => current - 1)}>
                Back
              </Button>
            )}
            <Button
              size="sm"
              isLoading={isLast && isFinishing}
              onClick={() => (isLast ? finish() : setIndex((current) => current + 1))}
            >
              {isLast ? "Get started" : "Next"}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
