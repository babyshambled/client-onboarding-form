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
      <div className="mb-8">
        <h2 className="text-3xl sm:text-4xl font-bold text-brand-white mb-3 leading-tight">
          {title}
        </h2>
        {subtitle && (
          <p className="text-brand-muted text-base sm:text-lg leading-relaxed">{subtitle}</p>
        )}
      </div>
      <div className="space-y-7">
        {children}
      </div>
    </div>
  );
}
