"use client";

interface TextAreaProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  helper?: string;
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
  placeholder,
  maxLength = 2000,
  required,
  error,
  fieldId,
}: TextAreaProps) {
  return (
    <div data-field-id={fieldId}>
      <label className="block text-base font-medium text-brand-white mb-2">
        {label}
        {required && <span className="text-brand-yellow ml-1">*</span>}
      </label>
      {helper && (
        <p className="text-sm text-brand-muted mb-2.5 leading-relaxed">{helper}</p>
      )}
      <textarea
        id={fieldId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        rows={4}
        className={`w-full px-4 py-4 text-base bg-brand-black border rounded-lg text-brand-white placeholder:text-brand-muted/50 resize-y min-h-[120px] leading-relaxed transition-colors duration-200 ${
          error ? "border-red-500" : "border-brand-green/40 hover:border-brand-green"
        }`}
      />
      <div className="flex justify-between items-center mt-1.5">
        {error ? (
          <p className="text-sm text-red-400">{error}</p>
        ) : (
          <span />
        )}
        <span className="text-xs text-brand-muted/50">
          {value.length}/{maxLength}
        </span>
      </div>
    </div>
  );
}
