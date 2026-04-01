"use client";

interface TextAreaProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  helper?: string;
  placeholder?: string;
  maxLength?: number;
}

export default function TextArea({
  label,
  value,
  onChange,
  helper,
  placeholder,
  maxLength = 2000,
}: TextAreaProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-brand-white mb-1.5">
        {label}
      </label>
      {helper && (
        <p className="text-xs text-brand-muted mb-2 leading-relaxed">{helper}</p>
      )}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        rows={4}
        className="w-full px-4 py-3 bg-brand-black border border-brand-green/40 rounded-lg text-brand-white placeholder:text-brand-muted/50 resize-y min-h-[100px] hover:border-brand-green transition-colors duration-200"
      />
      <div className="flex justify-end mt-1">
        <span className="text-xs text-brand-muted/50">
          {value.length}/{maxLength}
        </span>
      </div>
    </div>
  );
}
