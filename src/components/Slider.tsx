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
    <div className="py-2">
      <div className="flex items-start justify-between mb-2 gap-3">
        <span className="text-sm text-brand-white leading-snug flex-1">{label}</span>
        <span className="text-lg font-bold text-brand-yellow tabular-nums min-w-[2ch] text-right">
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
      <div className="flex justify-between mt-1">
        <span className="text-xs text-brand-muted/60">Struggling</span>
        <span className="text-xs text-brand-muted/60">Confident</span>
      </div>
    </div>
  );
}
