import { type FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { extractErrorMessage } from "../api/client";
import { findCustomers } from "../api/customers";
import type { Customer } from "../api/types";
import { Avatar } from "../components/ui/Avatar";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { FormField } from "../components/ui/FormField";
import { Input } from "../components/ui/Input";
import { PageHeader } from "../components/ui/PageHeader";

export function FindCardPage() {
  const navigate = useNavigate();
  const [mobile, setMobile] = useState("");
  const [dob, setDob] = useState("");
  const [cardId, setCardId] = useState("");
  const [results, setResults] = useState<Customer[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  async function handleSearch(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setResults(null);

    if (!mobile && !cardId) {
      setError("Enter a mobile number or a card ID to search.");
      return;
    }

    setIsSearching(true);
    try {
      const found = await findCustomers({ mobile: mobile || undefined, dob: dob || undefined, card_id: cardId || undefined });
      if (found.length === 1) {
        navigate(`/app/customers/${found[0].id}`);
        return;
      }
      setResults(found);
    } catch (err) {
      setError(extractErrorMessage(err, "Search failed. Please try again."));
    } finally {
      setIsSearching(false);
    }
  }

  return (
    <div>
      <PageHeader title="Find Card" />

      <form onSubmit={handleSearch} className="flex flex-col gap-4">
        <FormField label="Mobile No." hindiLabel="मोबाइल नंबर" required>
          <Input
            type="tel"
            inputMode="numeric"
            maxLength={10}
            value={mobile}
            onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))}
          />
        </FormField>

        <FormField label="Date of Birth" hindiLabel="जन्म की तारीख" hint="Optional, narrows results if needed">
          <Input type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
        </FormField>

        <FormField label="ID" hindiLabel="आई डि" hint="Optional, direct lookup by card ID">
          <Input value={cardId} onChange={(e) => setCardId(e.target.value)} />
        </FormField>

        {error && <p className="text-sm text-danger">{error}</p>}

        <Button type="submit" fullWidth size="lg" isLoading={isSearching}>
          Search
        </Button>
      </form>

      {results && results.length === 0 && (
        <div className="mt-6">
          <EmptyState
            title="No results found"
            description="No card matches that mobile number or card ID. Check the details and try again."
          />
        </div>
      )}

      {results && results.length > 1 && (
        <ul className="mt-6 divide-y divide-line/60 rounded-xl border border-line/70 bg-white">
          {results.map((customer) => (
            <li key={customer.id} className="flex items-center gap-3 px-4 py-3">
              <Avatar src={customer.photo_url} name={customer.name} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-navy">
                  {customer.name}, {customer.age}
                </p>
                <p className="text-xs font-semibold text-card-id">आई.डि.: {customer.card_id}</p>
              </div>
              <Link to={`/app/customers/${customer.id}`} className="text-xs font-semibold text-teal hover:underline">
                View
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
