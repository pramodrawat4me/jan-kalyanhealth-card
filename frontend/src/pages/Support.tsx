import { Card } from "../components/ui/Card";
import { PageHeader } from "../components/ui/PageHeader";

export function SupportPage() {
  return (
    <div>
      <PageHeader title="Support" description="Reach out if you need help with the platform." />

      <Card className="flex flex-col gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Helpline</p>
          <p className="mt-1 text-lg font-semibold text-teal">+91-7611131089</p>
        </div>
        <p className="text-sm text-muted">
          Call the helpline for issues with customer registration, card printing, or your account. Our team is
          available during business hours to assist partners.
        </p>
      </Card>
    </div>
  );
}
