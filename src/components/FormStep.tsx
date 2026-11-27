"use client";

interface FormStepProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  direction: "left" | "right";
  stepKey: number;
}

export default function FormStep({ title, subtitle, children, direction, stepKey }: FormStepProps) {
  return (
    <div
      key={stepKey}
      className={direction === "right" ? "slide-enter-right" : "slide-enter-left"}
    >
      <div className="mb-10 sm:mb-12">
        <h2 className="font-serif text-[2rem] sm:text-[2.75rem] font-medium tracking-[-0.015em] text-ink mb-4 leading-[1.1]">
          {title}
        </h2>
        {subtitle && (
          <p className="text-ink-soft text-base sm:text-lg leading-relaxed max-w-[58ch]">{subtitle}</p>
        )}
      </div>
      <div className="space-y-10">
        {children}
      </div>
    </div>
  );
}
