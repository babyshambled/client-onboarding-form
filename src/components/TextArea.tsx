"use client";

interface TextAreaProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  helper?: string;
  example?: string;
  placeholder?: string;
  maxLength?: number;
  required?: boolean;
  error?: string;
  fieldId?: string;
}

export default function TextArea({
  label,
  value,
  onChange,
  helper,
  example,
  placeholder,
  maxLength = 5000,
  required,
  error,
  fieldId,
}: TextAreaProps) {
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
      <textarea
        id={fieldId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        aria-invalid={error ? true : undefined}
        rows={4}
        className={`field block resize-y min-h-[132px] !leading-relaxed ${error ? "field-error" : ""}`}
      />
      <div className="flex justify-between items-start gap-4 mt-2">
        {error ? (
          <p className="q-error !mt-0">{error}</p>
        ) : (
          <span />
        )}
        <span className="text-xs text-hint tabular-nums shrink-0">
          {value.length}/{maxLength}
        </span>
      </div>
    </div>
  );
}
