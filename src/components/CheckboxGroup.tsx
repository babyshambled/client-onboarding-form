"use client";

interface CheckboxGroupProps {
  label: string;
  options: readonly string[];
  values: string[];
  onChange: (values: string[]) => void;
  helper?: string;
  example?: string;
  required?: boolean;
  error?: string;
  fieldId?: string;
}

export default function CheckboxGroup({
  label,
  options,
  values,
  onChange,
  helper,
  example,
  required,
  error,
  fieldId,
}: CheckboxGroupProps) {
  const toggle = (opt: string) => {
    onChange(values.includes(opt) ? values.filter((v) => v !== opt) : [...values, opt]);
  };
  return (
    <fieldset data-field-id={fieldId}>
      <legend className="q-label">
        {label}
        {required && <span className="q-req">*</span>}
      </legend>
      {helper && <p className="q-helper">{helper}</p>}
      {example && <p className="q-example">{example}</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {options.map((opt) => {
          const checked = values.includes(opt);
          return (
            <label
              key={opt}
              className={`flex items-center gap-3 px-4 py-3.5 rounded-[10px] border cursor-pointer transition-colors ${
                checked ? "border-green bg-green-tint" : "border-line-strong bg-surface hover:border-ink-soft"
              }`}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggle(opt)}
                className="w-5 h-5 shrink-0"
              />
              <span className="text-ink text-base leading-snug">{opt}</span>
            </label>
          );
        })}
      </div>
      {error && <p className="q-error">{error}</p>}
    </fieldset>
  );
}
