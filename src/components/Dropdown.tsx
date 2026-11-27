"use client";

interface DropdownProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  helper?: string;
  example?: string;
  options: string[];
  required?: boolean;
  error?: string;
  fieldId?: string;
}

export default function Dropdown({ label, value, onChange, helper, example, options, required, error, fieldId }: DropdownProps) {
  return (
    <div data-field-id={fieldId}>
      <label htmlFor={fieldId} className="q-label">
        {label}
        {required && <span className="q-req">*</span>}
      </label>
      {helper && (
        <p className="q-helper">{helper}</p>
      )}
      {example && (
        <p className="q-example">{example}</p>
      )}
      <select
        id={fieldId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`field !pr-11 cursor-pointer appearance-none ${error ? "field-error" : ""}`}
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 14 14'%3E%3Cpath fill='none' stroke='%234A524C' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round' d='M3 5.5l4 4 4-4'/%3E%3C/svg%3E")`,
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 16px center",
        }}
      >
        <option value="">
          Select an option...
        </option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
      {error && <p className="q-error">{error}</p>}
    </div>
  );
}
