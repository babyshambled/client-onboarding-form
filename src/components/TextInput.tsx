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
      <label htmlFor={fieldId} className="block text-base font-medium text-brand-white mb-2">
        {label}
        {required && <span className="text-brand-yellow ml-1">*</span>}
      </label>
      {helper && (
        <p className="text-sm text-brand-muted mb-2.5 leading-relaxed">{helper}</p>
      )}
      {example && (
        <p className="text-sm text-brand-muted/80 italic mb-2.5 leading-relaxed">{example}</p>
      )}
      <input
        id={fieldId}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        aria-invalid={error ? true : undefined}
        className={`w-full px-4 py-4 text-base bg-brand-black border rounded-lg text-brand-white placeholder:text-brand-muted/50 transition-colors duration-200 ${
          error ? "border-red-500" : "border-brand-green/40 hover:border-brand-green"
        }`}
      />
      {error && <p className="mt-1.5 text-sm text-red-400">{error}</p>}
    </div>
  );
}
