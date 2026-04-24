export function GasBar({
  label,
  value,
  max,
  threshold,
  unit,
  icon: Icon,
}: {
  label: string;
  value: number;
  max: number;
  threshold: number;
  unit: string;
  icon: React.ElementType;
}) {
  const pct = Math.min((value / max) * 100, 100);
  const isOver = value > threshold;
  const color = isOver
    ? "#f43f5e"
    : value > threshold * 0.7
      ? "#f59e0b"
      : "#10b981";

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Icon className="w-3 h-3 text-slate-400" />
          <span className="text-xs text-slate-400 font-medium">{label}</span>
          {isOver && (
            <span className="text-[10px] text-rose-400 font-bold animate-pulse">
              ▲ KRITIS
            </span>
          )}
        </div>
        <span className="text-xs font-mono font-bold" style={{ color }}>
          {value} {unit}
        </span>
      </div>
      <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${pct}%`,
            background: color,
            boxShadow: `0 0 6px ${color}88`,
          }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-slate-600">
        <span>0</span>
        <span className="text-slate-500">limit: {threshold}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}
