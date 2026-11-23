import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";

import { publicCardStatus } from "../api/cards";
import { extractErrorMessage } from "../api/client";
import type { Gender } from "../api/types";
import { CalendarIcon, IdCardIcon, MapPinIcon, PhoneIcon, UserIcon } from "../components/icons";
import { AmbientBackdrop } from "../components/ui/AmbientBackdrop";
import { Avatar } from "../components/ui/Avatar";
import { Badge } from "../components/ui/Badge";
import { Card } from "../components/ui/Card";
import { DetailRow } from "../components/ui/DetailRow";
import { EmptyState } from "../components/ui/EmptyState";
import { Logo } from "../components/ui/Logo";
import { Spinner } from "../components/ui/Spinner";
import { formatDisplayDate } from "../lib/date";

function genderLabel(gender: Gender): string {
  return gender === "male" ? "Male" : "Female";
}

export function PublicCardStatusPage() {
  const { cardId } = useParams();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["public-card", cardId],
    queryFn: () => publicCardStatus(cardId as string),
    enabled: Boolean(cardId),
    retry: false,
  });

  return (
    <div className="min-h-screen px-4 py-8">
      <AmbientBackdrop />
      <div className="animate-fade-up mx-auto flex max-w-md flex-col gap-5">
        <div className="text-center">
          <div className="mx-auto mb-4 flex items-center justify-center rounded-2xl bg-white px-5 py-4 shadow-sm">
            <Logo variant="mark" size={56} />
          </div>
          <h1 className="text-lg font-semibold text-ink">Card Status</h1>
          <p className="mt-1 text-sm text-muted">Verify a Jan Kalyan Health Card</p>
        </div>

        {isLoading && (
          <div className="flex justify-center py-10">
            <Spinner size={28} />
          </div>
        )}

        {isError && (
          <EmptyState
            title="Card not found"
            description={extractErrorMessage(error, "This card ID could not be verified.")}
          />
        )}

        {data && (
          <>
            <Card className="text-center">
              <div className="mb-3 flex justify-center">
                <Avatar src={data.photo_url} name={data.name} size="lg" />
              </div>
              <p className="text-lg font-devanagari font-semibold text-navy">{data.name}</p>
              <p className="mt-1 font-semibold text-card-id">{data.card_id}</p>
              <div className="mt-3 flex justify-center">
                <Badge tone={data.is_valid ? "success" : "danger"}>
                  {data.is_valid ? `Valid until ${formatDisplayDate(data.validity_date)}` : "Expired"}
                </Badge>
              </div>
            </Card>

            <Card>
              <p className="mb-1 text-sm font-semibold text-navy">Cardholder Details</p>
              <DetailRow icon={UserIcon} label="Father / Husband" value={data.father_husband} />
              <DetailRow icon={PhoneIcon} label="Mobile number" value={`+91 ${data.mobile}`} />
              <DetailRow
                icon={CalendarIcon}
                label="Date of birth"
                value={`${formatDisplayDate(data.dob)} (${data.age} yrs)`}
              />
              <DetailRow icon={UserIcon} label="Gender" value={genderLabel(data.gender)} />
              <DetailRow
                icon={MapPinIcon}
                label="Address"
                value={data.city_name ? `${data.address}, ${data.city_name}` : data.address}
              />
              <DetailRow icon={IdCardIcon} label="Issued by" value={data.partner_name} />
              <DetailRow icon={CalendarIcon} label="Issued on" value={formatDisplayDate(data.entry_date)} />
            </Card>

            <div>
              <h2 className="mb-3 text-sm font-semibold text-navy">Empanelled Hospitals</h2>
              <div className="flex flex-col gap-3">
                {data.hospitals.length === 0 ? (
                  <EmptyState title="No hospitals listed" description="Please check back later." />
                ) : (
                  data.hospitals.map((hospital) => (
                    <Card key={hospital.name}>
                      <p className="text-sm font-semibold text-navy">{hospital.name}</p>
                      {hospital.address && (
                        <p className="mt-1 text-sm text-muted">
                          {hospital.address}
                          {hospital.city_name ? `, ${hospital.city_name}` : ""}
                        </p>
                      )}
                      {hospital.phone && <p className="mt-1 text-sm text-navy">Phone: {hospital.phone}</p>}
                      {hospital.discount_details && (
                        <p className="mt-2 rounded-lg bg-teal-light px-3 py-2 text-sm text-teal">
                          {hospital.discount_details}
                        </p>
                      )}
                    </Card>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
