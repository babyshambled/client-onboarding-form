"use client";

interface TextInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "email";
  placeholder?: string;
  required?: boolean;
  error?: string;
}

export default function TextInput({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required,
  error,
}: TextInputProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-brand-white mb-1.5">
        {label}
        {required && <span className="text-brand-yellow ml-1">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full px-4 py-3 bg-brand-black border rounded-lg text-brand-white placeholder:text-brand-muted/50 transition-colors duration-200 ${
          error ? "border-red-500" : "border-brand-green/40 hover:border-brand-green"
        }`}
      />
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}
