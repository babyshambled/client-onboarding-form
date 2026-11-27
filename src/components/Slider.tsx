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
    <div className="py-5 border-b border-line last:border-b-0">
      <div className="flex items-start justify-between mb-4 gap-4">
        <span className="text-base text-ink leading-relaxed flex-1">{label}</span>
        <span className="font-serif text-3xl font-medium text-green leading-none tabular-nums min-w-[2ch] text-right">
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
          aria-label={label}
          style={{
            background: `linear-gradient(to right, #0B6443 0%, #0B6443 ${percentage}%, #E4DDCF ${percentage}%, #E4DDCF 100%)`,
          }}
        />
      </div>
      <div className="flex justify-between mt-2.5">
        <span className="text-xs uppercase tracking-[0.12em] text-hint">Struggling</span>
        <span className="text-xs uppercase tracking-[0.12em] text-hint">Confident</span>
      </div>
    </div>
  );
}
