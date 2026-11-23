import { useQuery, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useEffect, useState } from "react";

import { fetchAdminCardSettings, updateAdminCardSettings } from "../../api/adminCardSettings";
import { extractErrorMessage, extractFieldErrors } from "../../api/client";
import { CardPreview } from "../../components/card/CardPreview";
import { Button } from "../../components/ui/Button";
import { FormField } from "../../components/ui/FormField";
import { Input } from "../../components/ui/Input";
import { PageHeader } from "../../components/ui/PageHeader";
import { Spinner } from "../../components/ui/Spinner";
import { Textarea } from "../../components/ui/Textarea";
import { toast } from "../../store/toastStore";

/** Sample data for the live preview on this page — an admin editing
 * organisation settings has no "current customer" in context, so this
 * mirrors the reference tool's own placeholder cardholder. */
const PREVIEW_CUSTOMER = {
  cardId: "20260721659293",
  name: "Saroj Bai Jatav",
  fatherHusband: "Kanhaiyaram",
  dob: "1983-01-01",
  gender: "female",
  address: "Jolan",
  cityName: "Ashoknagar",
  validityDate: "2029-06-16",
  mobile: "9876543210",
  photoUrl: null,
};

export function AdminCardSettingsPage() {
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useQuery({
    queryKey: ["admin", "card-settings"],
    queryFn: fetchAdminCardSettings,
  });

  const [backHelpline, setBackHelpline] = useState("");
  const [registrationFee, setRegistrationFee] = useState("");
  const [facilitiesText, setFacilitiesText] = useState("");
  const [disclaimerNote, setDisclaimerNote] = useState("");
  const [showValidity, setShowValidity] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!settings) return;
    setBackHelpline(settings.back_helpline);
    setRegistrationFee(settings.registration_fee);
    setFacilitiesText(settings.facilities.join("\n"));
    setDisclaimerNote(settings.disclaimer_note);
    setShowValidity(settings.show_validity);
  }, [settings]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    setErrors({});
    setIsSaving(true);
    try {
      await updateAdminCardSettings({
        back_helpline: backHelpline.trim(),
        registration_fee: registrationFee.trim(),
        facilities: facilitiesText.split("\n").map((line) => line.trim()).filter(Boolean),
        disclaimer_note: disclaimerNote.trim(),
        show_validity: showValidity,
      });
      toast("success", "Card settings updated. This applies to every card, front and back.");
      await queryClient.invalidateQueries({ queryKey: ["admin", "card-settings"] });
      await queryClient.invalidateQueries({ queryKey: ["cards", "brand-config"] });
    } catch (error) {
      setFormError(extractErrorMessage(error, "Could not save card settings."));
      setErrors(extractFieldErrors(error) ?? {});
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Card Settings"
        description="Organisation-level content applied to every printed card: back helpline, registration fee, facilities, disclaimer note, and whether the validity date prints on the front."
      />

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner size={28} />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[380px_1fr] lg:items-start">
          <form onSubmit={handleSubmit} className="rounded-xl border border-line/70 bg-white p-5">
            <FormField
              label="Helpline Number"
              hindiLabel="हेल्पलाइन (कार्ड के पीछे)"
              hint="Shown on the back of every card"
              error={errors.back_helpline}
            >
              <Input value={backHelpline} onChange={(e) => setBackHelpline(e.target.value)} required />
            </FormField>

            <FormField
              label="Registration Fee (₹)"
              hindiLabel="पंजीयन शुल्क"
              error={errors.registration_fee}
            >
              <Input value={registrationFee} onChange={(e) => setRegistrationFee(e.target.value)} required />
            </FormField>

            <FormField
              label="Facilities"
              hindiLabel="विशेष सुविधाएं (एक प्रति पंक्ति)"
              hint="One per line, shown as a bulleted list on the back of the card"
              error={errors.facilities}
            >
              <Textarea
                value={facilitiesText}
                onChange={(e) => setFacilitiesText(e.target.value)}
                rows={6}
                className="font-devanagari"
              />
            </FormField>

            <FormField
              label="Disclaimer Note"
              hindiLabel="नोट (कार्ड के पीछे)"
              hint="Shown at the bottom of the card back. Keep it short so it fits in about 3 lines."
              error={errors.disclaimer_note}
            >
              <Textarea
                value={disclaimerNote}
                onChange={(e) => setDisclaimerNote(e.target.value)}
                rows={4}
                maxLength={400}
                className="font-devanagari"
                required
              />
            </FormField>

            <label className="mb-4 flex items-start gap-2.5 rounded-lg border border-line/70 bg-surface px-3.5 py-3">
              <input
                type="checkbox"
                aria-label="Show validity date on card"
                checked={showValidity}
                onChange={(e) => setShowValidity(e.target.checked)}
                className="mt-0.5 h-4 w-4 flex-shrink-0 rounded border-line text-teal focus:ring-teal"
              />
              <span>
                <span className="block text-sm font-medium text-ink">Show validity date on card</span>
                <span className="block text-xs text-muted">
                  Adds a वैधता row to the front of every printed card. Off by default.
                </span>
              </span>
            </label>

            {formError && <p className="mb-3 text-sm text-danger">{formError}</p>}

            <Button type="submit" fullWidth isLoading={isSaving}>
              Save Card Settings
            </Button>
          </form>

          <div>
            <p className="mb-3 text-sm font-semibold text-ink">Live Preview</p>
            <CardPreview
              cardId={PREVIEW_CUSTOMER.cardId}
              name={PREVIEW_CUSTOMER.name}
              fatherHusband={PREVIEW_CUSTOMER.fatherHusband}
              dob={PREVIEW_CUSTOMER.dob}
              gender={PREVIEW_CUSTOMER.gender}
              address={PREVIEW_CUSTOMER.address}
              cityName={PREVIEW_CUSTOMER.cityName}
              validityDate={PREVIEW_CUSTOMER.validityDate}
              mobile={PREVIEW_CUSTOMER.mobile}
              photoUrl={PREVIEW_CUSTOMER.photoUrl}
              showValidity={showValidity}
              disclaimerNote={disclaimerNote}
              facilities={facilitiesText.split("\n").map((line) => line.trim()).filter(Boolean)}
              backHelpline={backHelpline}
            />
          </div>
        </div>
      )}
    </div>
  );
}
