export interface ApiMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string | null;
  meta: ApiMeta | null;
}

export interface ApiErrorBody {
  success: false;
  error: string;
  message: string;
  fields?: Record<string, string> | null;
}

export type Gender = "male" | "female";

export interface PartnerSummary {
  id: number;
  name: string;
  mobile: string;
  is_active: boolean;
  state_id: number | null;
  city_id: number | null;
  tahsil_id: number | null;
  /** Null until the partner finishes/dismisses the first-login welcome
   * tour — server-side so it survives across devices (see OnboardingTour). */
  onboarding_completed_at: string | null;
}

export interface AdminSummary {
  id: number;
  name: string;
  mobile: string;
}

/** `GET /auth/me` — everything the partner's own Profile page shows, a
 * superset of `PartnerSummary` (location names instead of bare IDs, photo,
 * account creation date). */
export interface PartnerProfile extends PartnerSummary {
  state_name: string | null;
  city_name: string | null;
  tahsil_name: string | null;
  photo_url: string | null;
  created_at: string;
}

/** `GET /admin/auth/me` — the admin's own Profile page. */
export interface AdminProfile extends AdminSummary {
  created_at: string;
  photo_url: string | null;
}

export interface StateOption {
  id: number;
  name: string;
}

export interface CityOption {
  id: number;
  name: string;
  state_id: number;
}

export interface TahsilOption {
  id: number;
  name: string;
  city_id: number;
  state_id: number;
}

export interface Customer {
  id: number;
  card_id: string;
  partner_id: number;
  name: string;
  father_husband: string;
  mobile: string;
  aadhaar_last4: string;
  dob: string;
  gender: Gender;
  address: string;
  city_id: number;
  /** Resolved city name, so the card preview composes "address, city"
   * exactly like the printed PDF does. */
  city_name: string | null;
  photo_url: string | null;
  entry_date: string;
  validity_date: string;
  age: number;
  /** Null until an admin prints this card for the first time; otherwise the
   * most recent print timestamp. Drives the Printed/Not Printed badge shown
   * on both the partner and admin sides. */
  last_printed_at: string | null;
}

export interface AdminCustomer extends Customer {
  partner_name: string;
}

/** One row of the print audit trail on the admin Customer Detail page. */
export interface CardActivity {
  printed_at: string;
  printed_by: string;
}

export interface CustomerListItem {
  id: number;
  card_id: string;
  name: string;
  father_husband: string;
  mobile: string;
  dob: string;
  gender: Gender;
  photo_url: string | null;
  age: number;
  validity_date: string;
  last_printed_at: string | null;
}

export interface PrintLogItem {
  customer_id: number;
  card_id: string;
  name: string;
  father_husband: string;
  dob: string;
  gender: Gender;
  photo_url: string | null;
  printed_at: string;
  age: number;
}

export interface Hospital {
  id: number;
  name: string;
  address: string | null;
  city_id: number | null;
  state_id: number | null;
  phone: string | null;
  discount_details: string | null;
  is_active: boolean;
}

export interface PublicHospital {
  name: string;
  address: string | null;
  city_name: string | null;
  phone: string | null;
  discount_details: string | null;
}

/** `GET /cards/public/{card_id}` — the QR scan result. Mirrors exactly
 * what's already printed on the physical card (see backend
 * `PublicCardStatusOut` docstring): scanning the QR requires holding that
 * same card, so showing the same fields here isn't a new disclosure. */
export interface PublicCardStatus {
  card_id: string;
  name: string;
  father_husband: string;
  mobile: string;
  dob: string;
  gender: Gender;
  age: number;
  address: string;
  city_name: string | null;
  photo_url: string | null;
  entry_date: string;
  partner_name: string;
  is_valid: boolean;
  validity_date: string;
  hospitals: PublicHospital[];
}

export interface PartnerAdmin {
  id: number;
  name: string;
  mobile: string;
  is_active: boolean;
  state_id: number | null;
  city_id: number | null;
  tahsil_id: number | null;
  created_at: string;
  photo_url: string | null;
  customer_count: number;
  print_count: number;
}

export interface DashboardSummary {
  total_cards_issued: number;
  active_partners: number;
  total_partners: number;
  cards_printed_today: number;
  hospital_count: number;
}

/** Powers the Partner Dashboard's operational snapshot — one round trip
 * instead of composing totals from three separate list endpoints. */
export interface PartnerDashboardSummary {
  total_customers: number;
  customers_registered_today: number;
  cards_printed_today: number;
  total_prints: number;
}

export interface PartnerPrintingReportRow {
  partner_id: number;
  partner_name: string;
  partner_mobile: string;
  print_count: number;
}

/** Organisation-level card content — the back side's facilities list,
 * disclaimer note, fee label, and helpline. Fetched from the backend
 * (`GET /cards/brand-config`) so the live preview always matches exactly
 * what `card_pdf_service` bakes into the printed PDF. `back_helpline`,
 * `registration_fee`, `facilities`, and `disclaimer_note` are
 * admin-editable via Card Settings (`/admin/card-settings`). */
export interface CardBrandConfig {
  organization_name: string;
  tagline: string;
  back_helpline: string;
  registration_fee: string;
  facilities: string[];
  disclaimer_note: string;
  /** Whether the वैधता (validity date) row prints on the card front. */
  show_validity: boolean;
}

/** Admin-editable subset of `CardBrandConfig` — see `CardBrandConfig` doc. */
export interface CardSettings {
  back_helpline: string;
  registration_fee: string;
  facilities: string[];
  disclaimer_note: string;
  show_validity: boolean;
}
