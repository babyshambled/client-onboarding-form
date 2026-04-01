"use client";

interface DropdownProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}

export default function Dropdown({ label, value, onChange, options }: DropdownProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-brand-white mb-1.5">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-3 bg-brand-black border border-brand-green/40 rounded-lg text-brand-white hover:border-brand-green transition-colors duration-200 cursor-pointer appearance-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23a0a0a0' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 16px center",
        }}
      >
        <option value="" className="bg-brand-black">
          Select an option...
        </option>
        {options.map((opt) => (
          <option key={opt} value={opt} className="bg-brand-black">
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}
