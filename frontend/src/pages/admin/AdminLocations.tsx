import { useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";

import { createCity, createState, createTahsil, deleteCity, deleteState, deleteTahsil } from "../../api/admin";
import { extractErrorMessage } from "../../api/client";
import { TrashIcon } from "../../components/icons";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Dialog } from "../../components/ui/Dialog";
import { Input } from "../../components/ui/Input";
import { PageHeader } from "../../components/ui/PageHeader";
import { Select } from "../../components/ui/Select";
import { useCities, useStates, useTahsils } from "../../hooks/useLocations";
import { toast } from "../../store/toastStore";

interface LocationItemsProps {
  readonly items: readonly { id: number; name: string }[] | undefined;
  readonly entityLabel: "state" | "city" | "tahsil";
  readonly confirmDescription: (name: string) => string;
  readonly onDelete: (id: number) => Promise<void>;
}

/** Shared list body for the three panels: each entry gets a trash button,
 * deletion is confirmed in a dialog, and a 409 from the backend (location
 * still used by partners/customers/hospitals) surfaces its exact message
 * as the error toast. */
function LocationItems({ items, entityLabel, confirmDescription, onDelete }: LocationItemsProps) {
  const queryClient = useQueryClient();
  const [pending, setPending] = useState<{ id: number; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  async function confirmDelete() {
    if (!pending) return;
    setIsDeleting(true);
    try {
      await onDelete(pending.id);
      toast("success", `${entityLabel.charAt(0).toUpperCase()}${entityLabel.slice(1)} deleted.`);
      setPending(null);
      // Deleting a state or city also removes its children, so refresh the
      // whole location tree rather than one level.
      await queryClient.invalidateQueries({ queryKey: ["locations"] });
    } catch (error) {
      toast("error", extractErrorMessage(error, `Could not delete this ${entityLabel}.`));
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <ul className="flex flex-col gap-1 text-sm text-navy">
        {items?.map((item) => (
          <li
            key={item.id}
            className="flex items-center justify-between rounded-lg px-2 py-1 hover:bg-surface"
          >
            <span className="min-w-0 truncate">{item.name}</span>
            <button
              type="button"
              onClick={() => setPending(item)}
              aria-label={`Delete ${item.name}`}
              className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-muted transition-colors duration-150 hover:bg-danger/10 hover:text-danger"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>
      <Dialog
        open={pending !== null}
        title={`Delete this ${entityLabel}?`}
        description={pending ? confirmDescription(pending.name) : undefined}
        confirmLabel="Delete"
        confirmVariant="danger"
        isConfirming={isDeleting}
        onConfirm={confirmDelete}
        onClose={() => setPending(null)}
      />
    </>
  );
}

function StatesPanel() {
  const { data: states } = useStates();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      await createState(name);
      toast("success", "State added.");
      setName("");
      await queryClient.invalidateQueries({ queryKey: ["locations", "states"] });
    } catch (error) {
      toast("error", extractErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card>
      <h2 className="mb-3 text-sm font-semibold text-navy">States</h2>
      <form onSubmit={handleSubmit} className="mb-4 flex gap-2">
        <Input placeholder="New state name" value={name} onChange={(e) => setName(e.target.value)} required />
        <Button type="submit" isLoading={isSubmitting}>
          Add
        </Button>
      </form>
      <LocationItems
        items={states}
        entityLabel="state"
        confirmDescription={(name) =>
          `"${name}" and all of its cities and tahsils will be permanently removed. A state that partners, customers, or hospitals use can't be deleted.`
        }
        onDelete={deleteState}
      />
    </Card>
  );
}

function CitiesPanel() {
  const { data: states } = useStates();
  const queryClient = useQueryClient();
  const [stateId, setStateId] = useState("");
  const { data: cities } = useCities(stateId ? Number(stateId) : null);
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!stateId) return;
    setIsSubmitting(true);
    try {
      await createCity(name, Number(stateId));
      toast("success", "City added.");
      setName("");
      await queryClient.invalidateQueries({ queryKey: ["locations", "cities", Number(stateId)] });
    } catch (error) {
      toast("error", extractErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card>
      <h2 className="mb-3 text-sm font-semibold text-navy">Cities</h2>
      <Select value={stateId} onChange={(e) => setStateId(e.target.value)} className="mb-3">
        <option value="">Select a state</option>
        {states?.map((state) => (
          <option key={state.id} value={state.id}>
            {state.name}
          </option>
        ))}
      </Select>
      <form onSubmit={handleSubmit} className="mb-4 flex gap-2">
        <Input
          placeholder="New city name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={!stateId}
          required
        />
        <Button type="submit" isLoading={isSubmitting} disabled={!stateId}>
          Add
        </Button>
      </form>
      <LocationItems
        items={cities}
        entityLabel="city"
        confirmDescription={(name) =>
          `"${name}" and its tahsils will be permanently removed. A city that partners, customers, or hospitals use can't be deleted.`
        }
        onDelete={deleteCity}
      />
    </Card>
  );
}

function TahsilsPanel() {
  const { data: states } = useStates();
  const queryClient = useQueryClient();
  const [stateId, setStateId] = useState("");
  const [cityId, setCityId] = useState("");
  const { data: cities } = useCities(stateId ? Number(stateId) : null);
  const { data: tahsils } = useTahsils(cityId ? Number(cityId) : null);
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!cityId) return;
    setIsSubmitting(true);
    try {
      await createTahsil(name, Number(cityId));
      toast("success", "Tahsil added.");
      setName("");
      await queryClient.invalidateQueries({ queryKey: ["locations", "tahsils", Number(cityId)] });
    } catch (error) {
      toast("error", extractErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card>
      <h2 className="mb-3 text-sm font-semibold text-navy">Tahsils</h2>
      <div className="mb-3 grid grid-cols-2 gap-2">
        <Select
          value={stateId}
          onChange={(e) => {
            setStateId(e.target.value);
            setCityId("");
          }}
        >
          <option value="">State</option>
          {states?.map((state) => (
            <option key={state.id} value={state.id}>
              {state.name}
            </option>
          ))}
        </Select>
        <Select value={cityId} onChange={(e) => setCityId(e.target.value)} disabled={!stateId}>
          <option value="">City</option>
          {cities?.map((city) => (
            <option key={city.id} value={city.id}>
              {city.name}
            </option>
          ))}
        </Select>
      </div>
      <form onSubmit={handleSubmit} className="mb-4 flex gap-2">
        <Input
          placeholder="New tahsil name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={!cityId}
          required
        />
        <Button type="submit" isLoading={isSubmitting} disabled={!cityId}>
          Add
        </Button>
      </form>
      <LocationItems
        items={tahsils}
        entityLabel="tahsil"
        confirmDescription={(name) =>
          `"${name}" will be permanently removed. A tahsil that partners use can't be deleted.`
        }
        onDelete={deleteTahsil}
      />
    </Card>
  );
}

export function AdminLocationsPage() {
  return (
    <div>
      <PageHeader title="Location Master" description="Manage the State → City → Tahsil hierarchy." />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <StatesPanel />
        <CitiesPanel />
        <TahsilsPanel />
      </div>
    </div>
  );
}
