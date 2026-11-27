"use client";

interface TextInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  helper?: string;
  example?: string;
  type?: "text" | "email";
  placeholder?: string;
  required?: boolean;
  error?: string;
  fieldId?: string;
  maxLength?: number;
}

export default function TextInput({
  label,
  value,
  onChange,
  helper,
  example,
  type = "text",
  placeholder,
  required,
  error,
  fieldId,
  maxLength = 300,
}: TextInputProps) {
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
      <input
        id={fieldId}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        aria-invalid={error ? true : undefined}
        className={`field ${error ? "field-error" : ""}`}
      />
      {error && <p className="q-error">{error}</p>}
    </div>
  );
}
