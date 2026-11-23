import { type FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";

import { addCustomer } from "../api/customers";
import { extractErrorMessage, extractFieldErrors } from "../api/client";
import { Button } from "../components/ui/Button";
import { DobSelect } from "../components/ui/DobSelect";
import { FormField } from "../components/ui/FormField";
import { Input } from "../components/ui/Input";
import { PageHeader } from "../components/ui/PageHeader";
import { PhotoUpload } from "../components/ui/PhotoUpload";
import { RadioGroup } from "../components/ui/RadioGroup";
import { Select } from "../components/ui/Select";
import { Textarea } from "../components/ui/Textarea";
import { useCities } from "../hooks/useLocations";
import { useAuthStore } from "../store/authStore";
import { toast } from "../store/toastStore";

export function AddCustomerPage() {
  const navigate = useNavigate();
  const partner = useAuthStore((state) => state.partner);
  const { data: cities, isLoading: citiesLoading } = useCities(partner?.state_id);

  const [photo, setPhoto] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [fatherHusband, setFatherHusband] = useState("");
  const [mobile, setMobile] = useState("");
  const [aadhaar, setAadhaar] = useState("");
  const [address, setAddress] = useState("");
  const [cityId, setCityId] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState<"male" | "female">("male");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    setErrors({});

    if (!photo) {
      setErrors({ photo: "A customer photo is required" });
      return;
    }
    if (!cityId) {
      setErrors({ city_id: "Please select a city" });
      return;
    }
    if (!dob) {
      setErrors({ dob: "Please select a complete date of birth" });
      return;
    }

    setIsSubmitting(true);
    try {
      const customer = await addCustomer({
        name,
        father_husband: fatherHusband,
        mobile,
        aadhaar_no: aadhaar,
        address,
        city_id: Number(cityId),
        dob,
        gender,
        photo,
      });
      toast("success", `Card ${customer.card_id} created successfully.`);
      navigate(`/app/customers/${customer.id}`, { replace: true });
    } catch (error) {
      setFormError(extractErrorMessage(error, "Could not add customer. Please check the form."));
      setErrors(extractFieldErrors(error) ?? {});
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div>
      <PageHeader title="Add New Customer" description="Card ID and validity date are generated automatically." />

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <PhotoUpload value={photo} onChange={setPhoto} error={errors.photo} />

        <FormField label="Name" hindiLabel="नाम" required error={errors.name}>
          <Input value={name} onChange={(e) => setName(e.target.value)} invalid={Boolean(errors.name)} required />
        </FormField>

        <FormField label="Father or Husband" hindiLabel="पिता या पति" required error={errors.father_husband}>
          <Input
            value={fatherHusband}
            onChange={(e) => setFatherHusband(e.target.value)}
            invalid={Boolean(errors.father_husband)}
            required
          />
        </FormField>

        <FormField label="Mobile No." hindiLabel="मोबाइल नंबर" required error={errors.mobile}>
          <Input
            type="tel"
            inputMode="numeric"
            maxLength={10}
            value={mobile}
            onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))}
            invalid={Boolean(errors.mobile)}
            required
          />
        </FormField>

        <FormField label="Aadhaar No." hindiLabel="आधार नंबर" required error={errors.aadhaar_no}>
          <Input
            type="text"
            inputMode="numeric"
            maxLength={12}
            value={aadhaar}
            onChange={(e) => setAadhaar(e.target.value.replace(/\D/g, ""))}
            invalid={Boolean(errors.aadhaar_no)}
            required
          />
        </FormField>

        <FormField label="Address" hindiLabel="पता" required error={errors.address}>
          <Textarea value={address} onChange={(e) => setAddress(e.target.value)} invalid={Boolean(errors.address)} required />
        </FormField>

        <FormField label="Select City" hindiLabel="शहर" required error={errors.city_id}>
          <Select
            value={cityId}
            onChange={(e) => setCityId(e.target.value)}
            invalid={Boolean(errors.city_id)}
            disabled={citiesLoading}
            required
          >
            <option value="">{citiesLoading ? "Loading cities..." : "City"}</option>
            {cities?.map((city) => (
              <option key={city.id} value={city.id}>
                {city.name}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField label="Date of Birth" hindiLabel="जन्म तिथि" required error={errors.dob}>
          <DobSelect value={dob} onChange={setDob} invalid={Boolean(errors.dob)} />
        </FormField>

        <FormField label="Gender" hindiLabel="लिंग" required error={errors.gender}>
          <RadioGroup
            name="gender"
            value={gender}
            onChange={(value) => setGender(value as "male" | "female")}
            options={[
              { value: "male", label: "Male", hindiLabel: "पुरुष" },
              { value: "female", label: "Female", hindiLabel: "महिला" },
            ]}
          />
        </FormField>

        {formError && <p className="text-sm text-danger">{formError}</p>}

        <Button type="submit" fullWidth size="lg" isLoading={isSubmitting}>
          Continue / आगे बढ़ें
        </Button>
      </form>
    </div>
  );
}
