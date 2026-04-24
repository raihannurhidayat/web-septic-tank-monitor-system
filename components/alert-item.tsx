import { SensorAlert } from "@/lib/type";
import { formatTimeAgo } from "@/lib/utils";
import {
  AlertTriangle,
  CheckCheck,
  CheckCircle2,
  User,
  XCircle,
} from "lucide-react";
import { Button } from "./ui/button";

export function AlertItem({
  alert,
  onAck,
}: {
  alert: SensorAlert;
  onAck: (id: string) => void;
}) {
  const isCritical = alert.severity === "critical";
  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-lg border transition-all
      ${
        alert.acknowledged
          ? "bg-slate-800/30 border-slate-700/30 opacity-60"
          : isCritical
            ? "bg-rose-500/5 border-rose-500/20"
            : "bg-amber-500/5 border-amber-500/20"
      }`}
    >
      <div className="mt-0.5">
        {alert.acknowledged ? (
          <CheckCircle2 className="w-4 h-4 text-slate-500" />
        ) : isCritical ? (
          <XCircle className="w-4 h-4 text-rose-400 animate-pulse" />
        ) : (
          <AlertTriangle className="w-4 h-4 text-amber-400" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`text-xs font-bold ${isCritical ? "text-rose-300" : "text-amber-300"}`}
          >
            {alert.type}
          </span>
          <span className="text-[10px] text-slate-500">
            {formatTimeAgo(alert.timestamp)}
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
          {alert.message}
        </p>
        <span className="text-xs font-mono text-slate-500">
          Nilai: {alert.value} {alert.unit}
        </span>
        {alert.acknowledged && alert.ackBy && (
          <div className="flex items-center gap-1 mt-1">
            <User className="w-3 h-3 text-slate-600" />
            <span className="text-[10px] text-slate-600">
              Diakui oleh {alert.ackBy} · {formatTimeAgo(alert.ackAt!)}
            </span>
          </div>
        )}
      </div>
      {!alert.acknowledged && (
        <Button
          size="sm"
          variant="outline"
          className="text-[10px] h-6 px-2 border-slate-600 text-slate-400 hover:text-slate-200 hover:border-slate-400 shrink-0"
          onClick={() => onAck(alert.id)}
        >
          <CheckCheck className="w-3 h-3 mr-1" />
          Ack
        </Button>
      )}
    </div>
  );
}
