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
      <legend className="block text-base font-medium text-brand-white mb-2">
        {label}
        {required && <span className="text-brand-yellow ml-1">*</span>}
      </legend>
      {helper && <p className="text-sm text-brand-muted mb-2.5 leading-relaxed">{helper}</p>}
      {example && <p className="text-sm text-brand-muted/80 italic mb-2.5 leading-relaxed">{example}</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {options.map((opt) => {
          const checked = values.includes(opt);
          return (
            <label
              key={opt}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-colors ${
                checked ? "border-brand-yellow bg-brand-green/20" : "border-brand-green/40 hover:border-brand-green"
              }`}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggle(opt)}
                className="w-5 h-5 accent-brand-yellow shrink-0"
              />
              <span className="text-brand-white text-base">{opt}</span>
            </label>
          );
        })}
      </div>
      {error && <p className="mt-1.5 text-sm text-red-400">{error}</p>}
    </fieldset>
  );
}
