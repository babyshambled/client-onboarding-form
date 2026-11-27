"use client";

interface NumberInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  helper?: string;
  required?: boolean;
  error?: string;
  fieldId?: string;
  min?: number;
  max?: number;
  step?: number;
  compact?: boolean;
}

/** A number box. Keeps the raw string so an empty box stays empty rather than becoming 0. */
export default function NumberInput({
  label,
  value,
  onChange,
  helper,
  required,
  error,
  fieldId,
  min = 0,
  max = 1000,
  step = 1,
  compact,
}: NumberInputProps) {
  return (
    <div data-field-id={fieldId} className={compact ? "flex items-center justify-between gap-3" : ""}>
      <label
        htmlFor={fieldId}
        className={`block text-base font-medium text-brand-white ${compact ? "flex-1" : "mb-2"}`}
      >
        {label}
        {required && <span className="text-brand-yellow ml-1">*</span>}
      </label>
      {helper && !compact && <p className="text-sm text-brand-muted mb-2.5 leading-relaxed">{helper}</p>}
      <input
        id={fieldId}
        type="number"
        inputMode="decimal"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${compact ? "w-24" : "w-40"} px-4 py-3 text-base bg-brand-black border rounded-lg text-brand-white transition-colors duration-200 ${
          error ? "border-red-500" : "border-brand-green/40 hover:border-brand-green"
        }`}
      />
      {error && <p className="mt-1.5 text-sm text-red-400">{error}</p>}
    </div>
  );
}
