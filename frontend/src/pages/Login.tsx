import { type FormEvent, type ReactNode, useState } from "react";
import { useNavigate } from "react-router-dom";

import { loginAdmin, loginPartner } from "../api/auth";
import { extractErrorMessage, extractFieldErrors } from "../api/client";
import {
  CheckCircleIcon,
  HospitalIcon,
  type IconProps,
  IdCardIcon,
  LockIcon,
  ShieldCheckIcon,
  UsersIcon,
} from "../components/auth/icons";
import { Button } from "../components/ui/Button";
import { FormField } from "../components/ui/FormField";
import { Input } from "../components/ui/Input";
import { Logo } from "../components/ui/Logo";
import { PasswordInput } from "../components/ui/PasswordInput";
import { cn } from "../lib/cn";
import { useAuthStore } from "../store/authStore";

type Portal = "partner" | "admin";

interface Feature {
  icon: (props: Readonly<IconProps>) => ReactNode;
  title: string;
  description: string;
}

const FEATURES: readonly Feature[] = [
  {
    icon: IdCardIcon,
    title: "Card Issuance & Printing",
    description: "Register customers, generate QR-verified health cards, and print them on demand.",
  },
  {
    icon: HospitalIcon,
    title: "Hospital Network",
    description: "A live directory of empanelled hospitals, pathology centres, and medical stores.",
  },
  {
    icon: ShieldCheckIcon,
    title: "Administrative Oversight",
    description: "Role-based control over partners, locations, and organisation-wide print activity.",
  },
];

const TRUST_POINTS: readonly { icon: (props: Readonly<IconProps>) => ReactNode; label: string }[] = [
  { icon: LockIcon, label: "Encrypted credentials" },
  { icon: ShieldCheckIcon, label: "Role-based access control" },
  { icon: CheckCircleIcon, label: "Aadhaar data protected" },
];

const PORTAL_COPY: Record<Portal, { heading: string; subtitle: string; cta: string; redirect: string }> = {
  partner: {
    heading: "Partner Sign In",
    subtitle: "Manage your customers, issue health cards, and browse the hospital directory.",
    cta: "Sign In as Partner",
    redirect: "/login",
  },
  admin: {
    heading: "Administrator Sign In",
    subtitle: "Oversee partners, hospitals, locations, and organisation-wide printing reports.",
    cta: "Sign In as Admin",
    redirect: "/admin/login",
  },
};

interface LoginPageProps {
  initialPortal?: Portal;
}

export function LoginPage({ initialPortal = "partner" }: Readonly<LoginPageProps>) {
  const navigate = useNavigate();
  const setPartnerSession = useAuthStore((state) => state.setPartnerSession);
  const setAdminSession = useAuthStore((state) => state.setAdminSession);

  const [portal, setPortal] = useState<Portal>(initialPortal);
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function switchPortal(next: Portal) {
    if (next === portal) return;
    setPortal(next);
    setErrors({});
    setFormError(null);
    navigate(PORTAL_COPY[next].redirect, { replace: true });
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    setErrors({});
    setIsSubmitting(true);

    try {
      if (portal === "admin") {
        const result = await loginAdmin(mobile, password);
        if (result?.admin) {
          setAdminSession(result.access_token, result.admin);
          navigate("/admin", { replace: true });
        }
      } else {
        const result = await loginPartner(mobile, password);
        if (result?.partner) {
          setPartnerSession(result.access_token, result.partner);
          navigate("/app", { replace: true });
        }
      }
    } catch (error) {
      setFormError(extractErrorMessage(error, "Unable to log in. Please try again."));
      setErrors(extractFieldErrors(error) ?? {});
    } finally {
      setIsSubmitting(false);
    }
  }

  const copy = PORTAL_COPY[portal];

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#04162c]">
      {/* Decorative backdrop — kept subtle and institutional, not flashy. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#0b4a8a_0%,_#062b50_45%,_#041c33_100%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-32 top-0 h-96 w-96 rounded-full bg-brand-green/15 blur-[100px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 bottom-0 h-[28rem] w-[28rem] rounded-full bg-teal-light/10 blur-[110px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
          backgroundSize: "42px 42px",
        }}
      />

      {/* Persistent brand header — always first, on every screen size, so
          identity/trust is established before the operator even looks for
          the sign-in form (mobile) or alongside it (desktop). */}
      <div className="relative mx-auto max-w-6xl px-6 pt-8 lg:px-10 lg:pt-10">
        <div className="animate-fade-up flex items-center gap-3.5">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white p-2 shadow-lg shadow-black/25">
            <Logo variant="icon" size={38} />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/50">
              Partner &amp; Admin Portal
            </p>
            <p className="mt-0.5 text-sm font-medium text-white/75">Hospital Discount Card Platform</p>
          </div>
        </div>
      </div>

      <div className="relative mx-auto flex max-w-6xl flex-col gap-10 px-6 py-8 lg:flex-row lg:items-center lg:gap-16 lg:px-10 lg:py-14">
        {/* Hero / product introduction — reordered below the auth card on
            small screens (order-2) so operators reach the sign-in form
            immediately; sits beside it as the left column on desktop
            (lg:order-1), where there's room to read both at once. */}
        <div className="animate-fade-up order-2 flex-1 lg:order-1 lg:max-w-xl">
          <h1 className="text-3xl font-semibold leading-tight text-white sm:text-4xl lg:text-[2.6rem]">
            One platform for every <span className="text-brand-green">Jan Kalyan Health Card</span> operation
          </h1>

          <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-white/70">
            Jan Kalyan Health Card connects registration partners, empanelled hospitals, and program
            administrators on a single secure system, covering customer enrollment, instant card printing,
            discount lookups, and organisation-wide oversight.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-sm transition-colors duration-200 hover:border-white/20 hover:bg-white/[0.09]"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-green/20 text-brand-green">
                  <feature.icon className="h-5 w-5" />
                </div>
                <p className="mt-3 text-sm font-semibold text-white">{feature.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-white/60">{feature.description}</p>
              </div>
            ))}
          </div>

          <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-2.5 border-t border-white/10 pt-6">
            {TRUST_POINTS.map((point) => (
              <span key={point.label} className="flex items-center gap-1.5 text-xs text-white/55">
                <point.icon className="h-3.5 w-3.5 text-brand-green" />
                {point.label}
              </span>
            ))}
          </div>
        </div>

        {/* Authentication — see note above on the ordering swap. */}
        <div className="animate-fade-up order-1 w-full shrink-0 lg:order-2 lg:w-[400px]" style={{ animationDelay: "90ms" }}>
          <div className="rounded-2xl bg-white p-6 shadow-2xl shadow-black/30 sm:p-7">
            <div className="mb-6 grid grid-cols-2 gap-1 rounded-xl bg-surface p-1" role="tablist" aria-label="Choose sign-in portal">
              <button
                type="button"
                role="tab"
                aria-selected={portal === "partner"}
                onClick={() => switchPortal("partner")}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-lg px-2 py-2.5 text-[13px] font-semibold transition-all duration-150",
                  portal === "partner" ? "bg-white text-teal shadow-sm" : "text-muted hover:text-navy",
                )}
              >
                <UsersIcon className="h-4 w-4" />
                Partner
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={portal === "admin"}
                onClick={() => switchPortal("admin")}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-lg px-2 py-2.5 text-[13px] font-semibold transition-all duration-150",
                  portal === "admin" ? "bg-white text-teal shadow-sm" : "text-muted hover:text-navy",
                )}
              >
                <ShieldCheckIcon className="h-4 w-4" />
                Admin
              </button>
            </div>

            <h2 className="text-lg font-semibold text-ink">{copy.heading}</h2>
            <p className="mt-1 text-sm text-muted">{copy.subtitle}</p>

            <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
              <FormField label="Mobile Number" required error={errors.mobile}>
                <Input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="10-digit mobile number"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))}
                  invalid={Boolean(errors.mobile)}
                  autoFocus
                  required
                />
              </FormField>

              <FormField label="Password" required error={errors.password}>
                <PasswordInput
                  placeholder="Your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  invalid={Boolean(errors.password)}
                  required
                />
              </FormField>

              {formError && <p className="text-sm text-danger">{formError}</p>}

              <Button type="submit" fullWidth isLoading={isSubmitting} className="mt-2">
                {copy.cta}
              </Button>
            </form>

            <p className="mt-5 flex items-center justify-center gap-1.5 text-[11px] text-muted">
              <LockIcon className="h-3.5 w-3.5" />
              Your session is encrypted and access-scoped by role.
            </p>
          </div>

          <p className="mt-5 text-center text-xs text-white/45">
            © {new Date().getFullYear()} Jan Kalyan Health Card. Internal partner &amp; admin access only.
          </p>
        </div>
      </div>
    </div>
  );
}
