"use client";

const DEFAULT_STEPS = [
  "Your Business",
  "Self Assessment",
  "Pain Points",
  "Your Prospects",
  "Your Goals",
];

interface ProgressBarProps {
  currentStep: number;
  steps?: string[];
}

export default function ProgressBar({ currentStep, steps }: ProgressBarProps) {
  const STEPS = steps ?? DEFAULT_STEPS;
  const current = Math.min(currentStep, STEPS.length - 1);
  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div className="w-full max-w-2xl mx-auto px-5 sm:px-6 pt-8 sm:pt-10 pb-8 sm:pb-10">
      <div className="flex items-baseline justify-between gap-4 mb-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-green">
          {STEPS[current]}
        </p>
        <p className="font-serif text-sm text-ink-soft tabular-nums" aria-hidden="true">
          <span className="text-base text-ink">{pad(current + 1)}</span>
          <span className="mx-1 text-line-strong">/</span>
          {pad(STEPS.length)}
        </p>
      </div>

      {/* One fine segment per step: finished steps in green, the current one in gold, the rest a pale rule. */}
      <div
        className="flex gap-1.5"
        role="progressbar"
        aria-label="Form progress"
        aria-valuemin={1}
        aria-valuemax={STEPS.length}
        aria-valuenow={current + 1}
        aria-valuetext={`Step ${current + 1} of ${STEPS.length}: ${STEPS[current]}`}
      >
        {STEPS.map((label, i) => (
          <div
            key={label}
            className={`h-[3px] flex-1 rounded-full transition-colors duration-500 ${
              i < current ? "bg-green" : i === current ? "bg-gold" : "bg-line"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
