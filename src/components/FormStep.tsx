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
        <h2 className="text-2xl sm:text-3xl font-bold text-brand-white mb-2">
          {title}
        </h2>
        {subtitle && (
          <p className="text-brand-muted text-sm sm:text-base">{subtitle}</p>
        )}
      </div>
      <div className="space-y-6">
        {children}
      </div>
    </div>
  );
}
