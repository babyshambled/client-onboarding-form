"use client";

interface SliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}

export default function Slider({
  label,
  value,
  onChange,
  min = 1,
  max = 5,
}: SliderProps) {
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className="py-3">
      <div className="flex items-start justify-between mb-3 gap-3">
        <span className="text-base text-brand-white leading-relaxed flex-1">{label}</span>
        <span className="text-2xl font-bold text-brand-yellow tabular-nums min-w-[2ch] text-right">
          {value}
        </span>
      </div>
      <div className="relative">
        <input
          type="range"
          min={min}
          max={max}
          step={1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full"
          style={{
            background: `linear-gradient(to right, #F9EC00 0%, #F9EC00 ${percentage}%, #0B6443 ${percentage}%, #0B6443 100%)`,
          }}
        />
      </div>
      <div className="flex justify-between mt-1.5">
        <span className="text-sm text-brand-muted/70">Struggling</span>
        <span className="text-sm text-brand-muted/70">Confident</span>
      </div>
    </div>
  );
}
