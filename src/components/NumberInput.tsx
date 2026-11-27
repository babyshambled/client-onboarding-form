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
    <div data-field-id={fieldId} className={compact ? "flex items-center justify-between gap-4" : ""}>
      <label
        htmlFor={fieldId}
        className={compact ? "flex-1 text-base leading-snug text-ink" : "q-label"}
      >
        {label}
        {required && <span className="q-req">*</span>}
      </label>
      {helper && !compact && <p className="q-helper">{helper}</p>}
      <input
        id={fieldId}
        type="number"
        inputMode="decimal"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`field tabular-nums ${compact ? "!w-24 shrink-0 text-center !px-2" : "!w-40"} ${error ? "field-error" : ""}`}
      />
      {error && <p className="q-error">{error}</p>}
    </div>
  );
}
