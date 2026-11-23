import { useQuery } from "@tanstack/react-query";

import { listHospitals } from "../api/hospitals";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { PageHeader } from "../components/ui/PageHeader";
import { Spinner } from "../components/ui/Spinner";

export function HospitalsPage() {
  const { data, isLoading } = useQuery({ queryKey: ["hospitals"], queryFn: listHospitals });

  return (
    <div>
      <PageHeader title="Hospitals" description="Empanelled hospitals offering discounted treatment." />

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner size={28} />
        </div>
      ) : !data || data.length === 0 ? (
        <EmptyState title="Data not found" description="No hospitals are listed yet." />
      ) : (
        <div className="flex flex-col gap-3">
          {data.map((hospital) => (
            <Card key={hospital.id}>
              <p className="text-sm font-semibold text-navy">{hospital.name}</p>
              {hospital.address && <p className="mt-1 text-sm text-muted">{hospital.address}</p>}
              {hospital.phone && <p className="mt-2 text-sm text-navy">Phone: {hospital.phone}</p>}
              {hospital.discount_details && (
                <p className="mt-2 rounded-lg bg-teal-light px-3 py-2 text-sm text-teal">
                  {hospital.discount_details}
                </p>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
