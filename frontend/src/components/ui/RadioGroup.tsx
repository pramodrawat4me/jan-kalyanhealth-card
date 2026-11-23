import { cn } from "../../lib/cn";

export interface RadioOption {
  value: string;
  label: string;
  hindiLabel?: string;
}

interface RadioGroupProps {
  name: string;
  value: string;
  options: RadioOption[];
  onChange: (value: string) => void;
}

export function RadioGroup({ name, value, options, onChange }: RadioGroupProps) {
  return (
    <div className="flex items-center gap-6">
      {options.map((option) => {
        const checked = value === option.value;
        return (
          <label key={option.value} className="flex cursor-pointer items-center gap-2 text-sm text-navy">
            <span
              className={cn(
                "flex h-[18px] w-[18px] items-center justify-center rounded-full border-2 transition-colors",
                checked ? "border-teal" : "border-line",
              )}
            >
              {checked && <span className="h-[9px] w-[9px] rounded-full bg-teal" />}
            </span>
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={checked}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            {option.label}
            {option.hindiLabel && <span className="font-devanagari text-muted"> / {option.hindiLabel}</span>}
          </label>
        );
      })}
    </div>
  );
}
