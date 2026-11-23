import { useEffect, useState } from "react";

import { Select } from "./Select";

interface DobSelectProps {
  value: string;
  onChange: (isoDate: string) => void;
  invalid?: boolean;
}

interface DobParts {
  day: string;
  month: string;
  year: string;
}

const currentYear = new Date().getFullYear();
const days = Array.from({ length: 31 }, (_, i) => i + 1);
// Numeric 1–12 rather than month names — every date entry field in the app
// (DOB here, the printed card, CSV exports) uses the numeric DD-MM-YYYY
// convention end to end, so the picker shouldn't be the one place that
// breaks from that with spelled-out month names.
const months = Array.from({ length: 12 }, (_, i) => i + 1);
const years = Array.from({ length: 100 }, (_, i) => currentYear - i);

function parseIso(value: string): DobParts {
  if (!value) return { day: "", month: "", year: "" };
  const [year, month, day] = value.split("-");
  return { day, month, year };
}

/**
 * Deliberately keeps its own day/month/year state instead of deriving it
 * purely from `value`. The parent only receives a composed ISO date once
 * all three parts are picked, so if this component were fully controlled
 * by `value` alone, every partial selection (e.g. picking "Day" before
 * "Month") would immediately render back to blank on the next render —
 * the parent's `dob` never changed, so there'd be nothing to reflect.
 * Local state is what makes each pick visually stick as the user works
 * through all three dropdowns.
 */
export function DobSelect({ value, onChange, invalid }: DobSelectProps) {
  const [parts, setParts] = useState<DobParts>(() => parseIso(value));

  // Stay in sync if the parent resets the field externally (e.g. form reset).
  useEffect(() => {
    if (!value) setParts({ day: "", month: "", year: "" });
  }, [value]);

  function update(next: DobParts) {
    setParts(next);
    if (next.day && next.month && next.year) {
      onChange(`${next.year}-${next.month}-${next.day}`);
    } else {
      onChange("");
    }
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      <Select
        aria-label="Day of birth"
        value={parts.day}
        invalid={invalid}
        onChange={(e) => update({ ...parts, day: e.target.value })}
      >
        <option value="">Day</option>
        {days.map((day) => (
          <option key={day} value={String(day).padStart(2, "0")}>
            {day}
          </option>
        ))}
      </Select>
      <Select
        aria-label="Month of birth"
        value={parts.month}
        invalid={invalid}
        onChange={(e) => update({ ...parts, month: e.target.value })}
      >
        <option value="">Month</option>
        {months.map((month) => (
          <option key={month} value={String(month).padStart(2, "0")}>
            {month}
          </option>
        ))}
      </Select>
      <Select
        aria-label="Year of birth"
        value={parts.year}
        invalid={invalid}
        onChange={(e) => update({ ...parts, year: e.target.value })}
      >
        <option value="">Year</option>
        {years.map((year) => (
          <option key={year} value={String(year)}>
            {year}
          </option>
        ))}
      </Select>
    </div>
  );
}
