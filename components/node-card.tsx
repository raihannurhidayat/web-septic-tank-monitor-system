import { statusConfig } from "@/constants/mockdata";
import { NodeData } from "@/lib/type";
import { Card, CardContent, CardHeader } from "./ui/card";
import {
  Clock,
  Droplets,
  Eye,
  FlaskConical,
  MapPin,
  Thermometer,
  Wifi,
  WifiOff,
} from "lucide-react";
import { Badge } from "./ui/badge";
import { TankGauge } from "./tank-gauge";
import { Separator } from "./ui/separator";
import { formatTimeAgo } from "@/lib/utils";

export function NodeCard({
  node,
  onAck,
  selected,
  onSelect,
}: {
  node: NodeData;
  onAck: (nodeId: string, alertId: string) => void;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const cfg = statusConfig[node.status];
  const unacked = node.alerts.filter((a) => !a.acknowledged);

  return (
    <Card
      className={`relative cursor-pointer transition-all duration-200 border bg-slate-900/80 backdrop-blur-sm
        ${selected ? "border-cyan-500/60 shadow-lg shadow-cyan-500/10" : cfg.border}
        hover:border-slate-500/60 hover:shadow-md`}
      onClick={() => onSelect(node.node_id)}
    >
      {/* Pulse indicator for critical */}
      {(node.status === "Kritis" || node.status === "Penuh") && (
        <span className="absolute top-3 right-3 flex h-2.5 w-2.5">
          <span
            className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
            style={{ backgroundColor: cfg.ring }}
          />
          <span
            className="relative inline-flex rounded-full h-2.5 w-2.5"
            style={{ backgroundColor: cfg.ring }}
          />
        </span>
      )}

      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-100 font-mono text-sm">
                {node.node_id}
              </span>
              {node.online ? (
                <span className="flex items-center gap-1 text-[11px] text-emerald-400">
                  <Wifi className="w-3 h-3" /> Online
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[11px] text-slate-500">
                  <WifiOff className="w-3 h-3" /> Offline
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3 text-slate-500" />
              <span className="text-xs text-slate-500">{node.location}</span>
            </div>
          </div>
          <Badge
            className={`text-xs font-bold border px-2 py-0.5 ${cfg.badge}`}
          >
            {node.status}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="px-4 pb-4">
        <div className="flex gap-4 items-start">
          <TankGauge pct={node.level_pct} status={node.status} />
          <div className="flex-1 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">Level</span>
              <span className={`text-lg font-bold font-mono ${cfg.color}`}>
                {node.level_cm} cm
              </span>
            </div>
            <Separator className="bg-slate-800" />
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
              <div className="flex items-center gap-1.5">
                <Thermometer className="w-3 h-3 text-orange-400" />
                <span className="text-[11px] text-slate-400">
                  {node.temp_c}°C
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Droplets className="w-3 h-3 text-blue-400" />
                <span className="text-[11px] text-slate-400">
                  {node.humidity_pct}% RH
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <FlaskConical className="w-3 h-3 text-violet-400" />
                <span className="text-[11px] text-slate-400">pH {node.ph}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Eye className="w-3 h-3 text-slate-400" />
                <span className="text-[11px] text-slate-400">
                  {node.turbidity_ntu} NTU
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-1 text-[11px] text-slate-600">
                <Clock className="w-3 h-3" />
                {formatTimeAgo(node.timestamp)}
              </div>
              {unacked.length > 0 && (
                <Badge className="bg-rose-500/20 text-rose-300 border-rose-500/40 text-[10px] px-1.5 py-0">
                  {unacked.length} alert
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
