"use client";

const STEPS = [
  "Your Business",
  "Self Assessment",
  "Pain Points",
  "Your Prospects",
  "Your Goals",
];

interface ProgressBarProps {
  currentStep: number;
}

export default function ProgressBar({ currentStep }: ProgressBarProps) {
  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between relative">
        {/* Connecting line */}
        <div className="absolute top-3 left-0 right-0 h-[2px] bg-brand-green/30" />
        <div
          className="absolute top-3 left-0 h-[2px] bg-brand-yellow transition-all duration-500 ease-out"
          style={{
            width: `${((Math.min(currentStep, STEPS.length - 1)) / (STEPS.length - 1)) * 100}%`,
          }}
        />

        {STEPS.map((label, i) => {
          const isCompleted = i < currentStep;
          const isCurrent = i === currentStep;
          const isFuture = i > currentStep;

          return (
            <div key={label} className="flex flex-col items-center relative z-10">
              {/* Dot */}
              <div
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                  isCurrent
                    ? "bg-brand-yellow border-brand-yellow"
                    : isCompleted
                    ? "bg-brand-accent border-brand-accent"
                    : "bg-brand-black border-brand-muted/40"
                }`}
              >
                {isCompleted && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {isCurrent && (
                  <div className="w-2 h-2 rounded-full bg-brand-black" />
                )}
              </div>

              {/* Label */}
              <span
                className={`mt-2 text-xs font-medium whitespace-nowrap transition-colors duration-300 ${
                  isCurrent
                    ? "text-brand-yellow"
                    : isCompleted
                    ? "text-brand-accent"
                    : "text-brand-muted/60"
                }`}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
