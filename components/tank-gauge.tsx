import { statusConfig } from "@/constants/mockdata";
import { NodeStatus } from "@/lib/type";

export function TankGauge({
  pct,
  status,
}: {
  pct: number;
  status: NodeStatus;
}) {
  const cfg = statusConfig[status];
  const segments = 20;
  const filled = Math.round((pct / 100) * segments);

  return (
    <div className="relative flex flex-col items-center gap-2">
      <div className="relative w-14 h-28 rounded-t-sm rounded-b-lg border-2 border-slate-600 bg-slate-800/60 overflow-hidden flex flex-col-reverse">
        <div
          className="transition-all duration-1000 ease-out w-full"
          style={{
            height: `${pct}%`,
            background: `linear-gradient(to top, ${cfg.ring}99, ${cfg.ring}44)`,
            boxShadow: `0 0 12px ${cfg.ring}66 inset`,
          }}
        />
        {/* water ripple */}
        <div
          className="absolute w-full h-1.5 opacity-60"
          style={{
            bottom: `${pct}%`,
            background: cfg.ring,
            filter: "blur(1px)",
          }}
        />
      </div>
      <span className={`text-xs font-bold font-mono ${cfg.color}`}>
        {pct.toFixed(2)}%
      </span>
    </div>
  );
}
