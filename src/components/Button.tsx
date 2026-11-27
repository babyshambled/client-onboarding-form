"use client";

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  variant?: "primary" | "secondary" | "ghost";
  disabled?: boolean;
  loading?: boolean;
}

export default function Button({
  children,
  onClick,
  type = "button",
  variant = "primary",
  disabled = false,
  loading = false,
}: ButtonProps) {
  const base =
    "min-h-12 px-7 py-3 rounded-full font-semibold text-base tracking-[0.01em] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer";

  const variants = {
    primary:
      "bg-green text-surface shadow-[0_1px_2px_rgba(2,66,40,0.25)] hover:bg-green-deep active:scale-[0.98]",
    secondary:
      "bg-transparent border border-line-strong text-ink hover:border-ink hover:bg-surface active:scale-[0.98]",
    ghost:
      "bg-transparent text-ink-soft hover:text-ink",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${base} ${variants[variant]}`}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
      {children}
    </button>
  );
}
