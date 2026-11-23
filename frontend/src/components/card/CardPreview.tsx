import { useCardBrandConfig } from "../../hooks/useCardBrandConfig";
import { Spinner } from "../ui/Spinner";
import { CardBack } from "./CardBack";
import { CardFront } from "./CardFront";

interface CardPreviewProps {
  cardId: string;
  name: string;
  fatherHusband: string;
  dob: string;
  gender: string;
  address: string;
  cityName?: string | null;
  validityDate: string;
  /** Customer's phone — shown top-left on the front face (not the org helpline). */
  mobile: string;
  photoUrl: string | null;
  /**
   * Optional overrides for the admin Card Settings live preview — when set,
   * form state is reflected immediately without waiting for a save.
   * Customer-detail previews leave these unset and read brand config.
   */
  showValidity?: boolean;
  disclaimerNote?: string;
  facilities?: string[];
  backHelpline?: string;
}

const GENDER_HI: Record<string, string> = { male: "पुरुष", female: "महिला", other: "अन्य" };

/** Front-of-card mobile tag prefers bare digits over +91- formatting —
 * matches `card_pdf_service._helpline_short`. */
function shortMobile(value: string): string {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 10 ? digits.slice(-10) : value;
}

/**
 * Live front+back preview of exactly what the admin-only
 * `GET /admin/customers/:id/print` route will generate as a PDF — same
 * fields, same organisation config (facilities, disclaimer, fee, helpline,
 * tagline) fetched from the same backend source of truth via
 * `useCardBrandConfig`. Used on the admin Customer Detail page; partners
 * see a card-free profile view instead (see `CustomerDetail.tsx`).
 */
export function CardPreview({
  cardId,
  name,
  fatherHusband,
  dob,
  gender,
  address,
  cityName,
  validityDate,
  mobile,
  photoUrl,
  showValidity,
  disclaimerNote,
  facilities,
  backHelpline,
}: Readonly<CardPreviewProps>) {
  const { data: brand, isLoading } = useCardBrandConfig();

  const qrValue = `${window.location.origin}/card-status/${cardId}`;
  const fullAddress =
    cityName && !address.toLowerCase().includes(cityName.toLowerCase()) ? `${address}, ${cityName}` : address;

  if (isLoading || !brand) {
    return (
      <div
        className="mx-auto flex w-full max-w-xl items-center justify-center rounded-xl border border-line/70 bg-white"
        style={{ aspectRatio: "600 / 378" }}
      >
        <Spinner size={24} />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-5">
      <CardFront
        cardId={cardId}
        name={name}
        fatherHusband={fatherHusband}
        dob={dob}
        genderLabel={GENDER_HI[gender.toLowerCase()] ?? gender}
        address={fullAddress}
        validityDate={validityDate}
        showValidity={showValidity ?? brand.show_validity}
        mobile={shortMobile(mobile)}
        photoUrl={photoUrl}
        qrValue={qrValue}
        registrationFee={brand.registration_fee}
        tagline={brand.tagline}
      />
      <CardBack
        helpline={backHelpline ?? brand.back_helpline}
        facilities={facilities ?? brand.facilities}
        disclaimerNote={disclaimerNote ?? brand.disclaimer_note}
        tagline={brand.tagline}
      />
    </div>
  );
}
