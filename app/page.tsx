"use client";

import { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  LineChart,
  Line,
  Tooltip as RechartTooltip,
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
} from "recharts";
import {
  AlertTriangle,
  Wifi,
  WifiOff,
  CheckCircle2,
  XCircle,
  Thermometer,
  Droplets,
  Wind,
  FlaskConical,
  Eye,
  Bell,
  BellOff,
  RefreshCw,
  Activity,
  Clock,
  MapPin,
  CheckCheck,
  User,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type NodeStatus = "Aman" | "Waspada" | "Kritis" | "Penuh";

interface SensorAlert {
  id: string;
  severity: "warning" | "critical";
  type: string;
  message: string;
  value: number;
  unit: string;
  timestamp: Date;
  acknowledged: boolean;
  ackBy?: string;
  ackAt?: Date;
}

interface NodeData {
  node_id: string;
  location: string;
  timestamp: Date;
  online: boolean;
  level_cm: number;
  level_pct: number;
  h2s_ppm: number;
  ch4_ppm: number;
  nh3_ppm: number;
  temp_c: number;
  humidity_pct: number;
  ph: number;
  turbidity_ntu: number;
  status: NodeStatus;
  alerts: SensorAlert[];
}

// ─── Mock Data Generators ─────────────────────────────────────────────────────

const generateHistory = (base: number, points = 24, spread = 8) =>
  Array.from({ length: points }, (_, i) => ({
    time: `${String(i).padStart(2, "0")}:00`,
    value: Math.max(0, base + (Math.random() - 0.5) * spread),
  }));

const INITIAL_NODES: NodeData[] = [
  {
    node_id: "ST-001",
    location: "Blok A - Unit 12",
    timestamp: new Date(),
    online: true,
    level_cm: 145,
    level_pct: 72,
    h2s_ppm: 3.2,
    ch4_ppm: 420,
    nh3_ppm: 8.1,
    temp_c: 31.2,
    humidity_pct: 78,
    ph: 7.45,
    turbidity_ntu: 45,
    status: "Waspada",
    alerts: [
      {
        id: "a1",
        severity: "warning",
        type: "Level Tinggi",
        message: "Level septic tank mendekati 75% kapasitas",
        value: 72,
        unit: "%",
        timestamp: new Date(Date.now() - 12 * 60000),
        acknowledged: false,
      },
    ],
  },
  {
    node_id: "ST-002",
    location: "Blok B - Unit 05",
    timestamp: new Date(Date.now() - 45000),
    online: true,
    level_cm: 89,
    level_pct: 44,
    h2s_ppm: 1.1,
    ch4_ppm: 210,
    nh3_ppm: 4.5,
    temp_c: 29.8,
    humidity_pct: 72,
    ph: 7.1,
    turbidity_ntu: 28,
    status: "Aman",
    alerts: [],
  },
  {
    node_id: "ST-003",
    location: "Blok C - Unit 21",
    timestamp: new Date(Date.now() - 3 * 60000),
    online: false,
    level_cm: 188,
    level_pct: 94,
    h2s_ppm: 12.8,
    ch4_ppm: 1250,
    nh3_ppm: 28.4,
    temp_c: 34.1,
    humidity_pct: 85,
    ph: 6.8,
    turbidity_ntu: 180,
    status: "Kritis",
    alerts: [
      {
        id: "a2",
        severity: "critical",
        type: "H2S Kritis",
        message: "Konsentrasi H2S melampaui 10 ppm (OSHA limit)",
        value: 12.8,
        unit: "ppm",
        timestamp: new Date(Date.now() - 8 * 60000),
        acknowledged: false,
      },
      {
        id: "a3",
        severity: "critical",
        type: "CH4 Kritis",
        message: "Konsentrasi Metana melampaui 1000 ppm",
        value: 1250,
        unit: "ppm",
        timestamp: new Date(Date.now() - 6 * 60000),
        acknowledged: false,
      },
    ],
  },
  {
    node_id: "ST-004",
    location: "Blok D - Unit 03",
    timestamp: new Date(Date.now() - 20000),
    online: true,
    level_cm: 201,
    level_pct: 100,
    h2s_ppm: 2.0,
    ch4_ppm: 380,
    nh3_ppm: 5.2,
    temp_c: 30.5,
    humidity_pct: 74,
    ph: 7.3,
    turbidity_ntu: 60,
    status: "Penuh",
    alerts: [
      {
        id: "a4",
        severity: "critical",
        type: "Tank Penuh",
        message:
          "Septic tank telah mencapai kapasitas maksimum — segera kuras!",
        value: 100,
        unit: "%",
        timestamp: new Date(Date.now() - 2 * 60000),
        acknowledged: false,
      },
    ],
  },
];

// ─── Helper Functions ─────────────────────────────────────────────────────────

const statusConfig = {
  Aman: {
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    ring: "#10b981",
    badge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
    dot: "bg-emerald-400",
  },
  Waspada: {
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    ring: "#f59e0b",
    badge: "bg-amber-500/20 text-amber-300 border-amber-500/40",
    dot: "bg-amber-400",
  },
  Kritis: {
    color: "text-rose-400",
    bg: "bg-rose-500/10",
    border: "border-rose-500/30",
    ring: "#f43f5e",
    badge: "bg-rose-500/20 text-rose-300 border-rose-500/40",
    dot: "bg-rose-400",
  },
  Penuh: {
    color: "text-purple-400",
    bg: "bg-purple-500/10",
    border: "border-purple-500/30",
    ring: "#a855f7",
    badge: "bg-purple-500/20 text-purple-300 border-purple-500/40",
    dot: "bg-purple-400",
  },
};

const formatTimeAgo = (date: Date) => {
  const secs = Math.floor((Date.now() - date.getTime()) / 1000);
  if (secs < 60) return `${secs}d yang lalu`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m yang lalu`;
  return `${Math.floor(mins / 60)}j yang lalu`;
};

const formatTimestamp = (date: Date) =>
  date.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

// ─── Subcomponents ────────────────────────────────────────────────────────────

function TankGauge({ pct, status }: { pct: number; status: NodeStatus }) {
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
      <span className={`text-xs font-bold font-mono ${cfg.color}`}>{pct}%</span>
    </div>
  );
}

function GasBar({
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

function NodeCard({
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

function AlertItem({
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

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const [nodes, setNodes] = useState<NodeData[]>(INITIAL_NODES);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<string>("ST-001");
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [ackDialog, setAckDialog] = useState<{
    nodeId: string;
    alertId: string;
  } | null>(null);
  const [ackName, setAckName] = useState("Admin");
  const [historyData] = useState(() => generateHistory(72, 24, 15));
  const [gasHistoryH2S] = useState(() => generateHistory(3.2, 24, 2));
  const [refreshing, setRefreshing] = useState(false);

  // Simulate initial load
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 1400);
    return () => clearTimeout(t);
  }, []);

  // Auto refresh every 30s
  useEffect(() => {
    const interval = setInterval(() => {
      setNodes((prev) =>
        prev.map((n) => ({
          ...n,
          timestamp: n.online ? new Date() : n.timestamp,
          level_pct: Math.min(
            100,
            Math.max(5, n.level_pct + (Math.random() - 0.48) * 1.2),
          ),
          temp_c: +(n.temp_c + (Math.random() - 0.5) * 0.3).toFixed(1),
          h2s_ppm: +(n.h2s_ppm + (Math.random() - 0.5) * 0.2).toFixed(1),
        })),
      );
      setLastRefresh(new Date());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setLastRefresh(new Date());
      setRefreshing(false);
    }, 800);
  };

  const handleAckRequest = (nodeId: string, alertId: string) => {
    setAckDialog({ nodeId, alertId });
  };

  const handleAckConfirm = () => {
    if (!ackDialog) return;
    setNodes((prev) =>
      prev.map((n) =>
        n.node_id !== ackDialog.nodeId
          ? n
          : {
              ...n,
              alerts: n.alerts.map((a) =>
                a.id !== ackDialog.alertId
                  ? a
                  : {
                      ...a,
                      acknowledged: true,
                      ackBy: ackName,
                      ackAt: new Date(),
                    },
              ),
            },
      ),
    );
    setAckDialog(null);
  };

  const activeNode = nodes.find((n) => n.node_id === selectedNode) ?? nodes[0];
  const cfg = statusConfig[activeNode.status];

  const totalAlerts = nodes.reduce(
    (acc, n) => acc + n.alerts.filter((a) => !a.acknowledged).length,
    0,
  );
  const criticalCount = nodes.filter(
    (n) => n.status === "Kritis" || n.status === "Penuh",
  ).length;
  const onlineCount = nodes.filter((n) => n.online).length;

  const summaryCards = [
    {
      label: "Total Node",
      value: nodes.length,
      sub: `${onlineCount} online`,
      icon: Activity,
      color: "text-cyan-400",
      bg: "bg-cyan-500/10",
    },
    {
      label: "Node Kritis",
      value: criticalCount,
      sub: "butuh perhatian",
      icon: AlertTriangle,
      color: "text-rose-400",
      bg: "bg-rose-500/10",
    },
    {
      label: "Alert Aktif",
      value: totalAlerts,
      sub: "belum diakui",
      icon: Bell,
      color: "text-amber-400",
      bg: "bg-amber-500/10",
    },
    {
      label: "Koneksi",
      value: `${Math.round((onlineCount / nodes.length) * 100)}%`,
      sub: `${onlineCount}/${nodes.length} node`,
      icon: Wifi,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080c14] p-6">
        <div className="max-w-[1400px] mx-auto space-y-6">
          <Skeleton className="h-16 w-72 bg-slate-800" />
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24 bg-slate-800 rounded-xl" />
            ))}
          </div>
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-4 space-y-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-48 bg-slate-800 rounded-xl" />
              ))}
            </div>
            <div className="col-span-8 space-y-4">
              <Skeleton className="h-64 bg-slate-800 rounded-xl" />
              <Skeleton className="h-48 bg-slate-800 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div
        className="min-h-screen bg-[#080c14] text-slate-200"
        style={{ fontFamily: "'Space Mono', 'IBM Plex Mono', monospace" }}
      >
        {/* Subtle grid bg */}
        <div
          className="fixed inset-0 pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(rgba(6,182,212,0.03) 1px, transparent 1px),
              linear-gradient(90deg, rgba(6,182,212,0.03) 1px, transparent 1px)
            `,
            backgroundSize: "40px 40px",
          }}
        />

        <div className="relative max-w-[1440px] mx-auto px-4 py-6 space-y-5">
          {/* ── Header ── */}
          <header className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-8 bg-cyan-400 rounded-full" />
                <h1 className="text-xl font-bold text-slate-100 tracking-tight">
                  SepticSense
                  <span className="text-cyan-400 ml-1">Monitor</span>
                </h1>
                <Badge className="bg-cyan-500/10 text-cyan-400 border-cyan-500/30 text-[10px] font-bold">
                  LIVE
                  <span className="ml-1 inline-block w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse" />
                </Badge>
              </div>
              <p className="text-xs text-slate-500 ml-5 mt-0.5">
                Sistem Monitoring IoT Septic Tank · Dashboard Ringkasan
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-[11px] text-slate-500">
                  Terakhir diperbarui
                </p>
                <p className="text-xs font-mono text-slate-300">
                  {formatTimestamp(lastRefresh)}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="border-slate-700 text-slate-400 hover:text-slate-200"
                onClick={handleRefresh}
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 mr-1.5 ${refreshing ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
            </div>
          </header>

          {/* ── Summary Cards ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {summaryCards.map((c) => (
              <Card
                key={c.label}
                className={`border-slate-800 bg-slate-900/60 backdrop-blur-sm ${c.bg}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] text-slate-500 uppercase tracking-wider">
                        {c.label}
                      </p>
                      <p
                        className={`text-2xl font-bold font-mono ${c.color} mt-0.5`}
                      >
                        {c.value}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {c.sub}
                      </p>
                    </div>
                    <c.icon className={`w-8 h-8 ${c.color} opacity-50`} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* ── Main Content ── */}
          <div className="grid grid-cols-12 gap-4">
            {/* Left: Node List */}
            <div className="col-span-12 lg:col-span-4 space-y-3">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">
                Node List ({nodes.length})
              </h2>
              {nodes.map((node) => (
                <NodeCard
                  key={node.node_id}
                  node={node}
                  onAck={handleAckRequest}
                  selected={selectedNode === node.node_id}
                  onSelect={setSelectedNode}
                />
              ))}
            </div>

            {/* Right: Detail Panel */}
            <div className="col-span-12 lg:col-span-8 space-y-4">
              {/* Node Detail Header */}
              <Card
                className={`border bg-slate-900/80 backdrop-blur-sm ${cfg.border}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-100 text-lg font-mono">
                          {activeNode.node_id}
                        </span>
                        <Badge
                          className={`text-xs font-bold border px-2 ${cfg.badge}`}
                        >
                          {activeNode.status}
                        </Badge>
                        {activeNode.online ? (
                          <span className="flex items-center gap-1 text-xs text-emerald-400">
                            <Wifi className="w-3.5 h-3.5" /> Online
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-rose-400">
                            <WifiOff className="w-3.5 h-3.5" /> Offline
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-500 mt-0.5">
                        {activeNode.location}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] text-slate-500">Last Update</p>
                      <p className="text-xs font-mono text-slate-300">
                        {formatTimestamp(activeNode.timestamp)}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {formatTimeAgo(activeNode.timestamp)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Level + Gas Readings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Level Gauge + Radial */}
                <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-sm">
                  <CardHeader className="pb-2 pt-4 px-4">
                    <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                      Level Septic Tank
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <div className="flex items-center justify-center gap-6">
                      <RadialBarChart
                        width={130}
                        height={130}
                        cx={65}
                        cy={65}
                        innerRadius={40}
                        outerRadius={60}
                        data={[{ value: activeNode.level_pct, fill: cfg.ring }]}
                        startAngle={90}
                        endAngle={-270}
                      >
                        <PolarAngleAxis
                          type="number"
                          domain={[0, 100]}
                          tick={false}
                        />
                        <RadialBar
                          background={{ fill: "#1e293b" }}
                          dataKey="value"
                          cornerRadius={4}
                        />
                        <text
                          x={65}
                          y={58}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          className="font-bold"
                          style={{
                            fill: cfg.ring,
                            fontSize: 20,
                            fontFamily: "monospace",
                          }}
                        >
                          {Math.round(activeNode.level_pct)}%
                        </text>
                        <text
                          x={65}
                          y={76}
                          textAnchor="middle"
                          style={{ fill: "#64748b", fontSize: 10 }}
                        >
                          kapasitas
                        </text>
                      </RadialBarChart>
                      <div className="space-y-2">
                        <div>
                          <p className="text-[11px] text-slate-500">
                            Ketinggian
                          </p>
                          <p
                            className={`text-2xl font-bold font-mono ${cfg.color}`}
                          >
                            {activeNode.level_cm}
                            <span className="text-sm text-slate-500 ml-1">
                              cm
                            </span>
                          </p>
                        </div>
                        <Separator className="bg-slate-800" />
                        <div>
                          <p className="text-[11px] text-slate-500">Status</p>
                          <Badge
                            className={`text-xs font-bold border mt-1 ${cfg.badge}`}
                          >
                            {activeNode.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Gas Sensors */}
                <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-sm">
                  <CardHeader className="pb-2 pt-4 px-4">
                    <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                      Parameter Gas
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4 space-y-3">
                    <GasBar
                      label="H₂S (Hidrogen Sulfida)"
                      value={activeNode.h2s_ppm}
                      max={20}
                      threshold={10}
                      unit="ppm"
                      icon={Wind}
                    />
                    <GasBar
                      label="CH₄ (Metana)"
                      value={activeNode.ch4_ppm}
                      max={2000}
                      threshold={1000}
                      unit="ppm"
                      icon={Wind}
                    />
                    <GasBar
                      label="NH₃ (Amonia)"
                      value={activeNode.nh3_ppm}
                      max={50}
                      threshold={25}
                      unit="ppm"
                      icon={Wind}
                    />
                  </CardContent>
                </Card>
              </div>

              {/* Level Trend Chart */}
              <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-sm">
                <CardHeader className="pb-2 pt-4 px-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                      Tren Level — 24 Jam Terakhir
                    </CardTitle>
                    <span className="text-[11px] text-slate-600 font-mono">
                      {activeNode.node_id}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="px-2 pb-4">
                  <ResponsiveContainer width="100%" height={160}>
                    <AreaChart data={historyData}>
                      <defs>
                        <linearGradient
                          id="levelGrad"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor={cfg.ring}
                            stopOpacity={0.3}
                          />
                          <stop
                            offset="95%"
                            stopColor={cfg.ring}
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis
                        dataKey="time"
                        tick={{ fill: "#475569", fontSize: 10 }}
                        tickLine={false}
                        axisLine={{ stroke: "#1e293b" }}
                        interval={3}
                      />
                      <YAxis
                        tick={{ fill: "#475569", fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                        domain={[0, 100]}
                        tickFormatter={(v) => `${v}%`}
                        width={36}
                      />
                      <RechartTooltip
                        contentStyle={{
                          background: "#0f172a",
                          border: "1px solid #1e293b",
                          borderRadius: 6,
                          fontSize: 11,
                        }}
                        labelStyle={{ color: "#94a3b8" }}
                        formatter={(v: any) => [`${v.toFixed(1)}%`, "Level"]}
                      />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke={cfg.ring}
                        strokeWidth={2}
                        fill="url(#levelGrad)"
                        dot={false}
                        activeDot={{ r: 4, fill: cfg.ring }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Environment + H2S Trend */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Environment Params */}
                <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-sm">
                  <CardHeader className="pb-2 pt-4 px-4">
                    <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                      Parameter Lingkungan
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        {
                          icon: Thermometer,
                          label: "Suhu",
                          value: `${activeNode.temp_c}°C`,
                          color: "text-orange-400",
                          sub: "DHT22",
                        },
                        {
                          icon: Droplets,
                          label: "Kelembaban",
                          value: `${activeNode.humidity_pct}%`,
                          color: "text-blue-400",
                          sub: "RH",
                        },
                        {
                          icon: FlaskConical,
                          label: "pH",
                          value: activeNode.ph.toFixed(2),
                          color: "text-violet-400",
                          sub: "0–14 skala",
                        },
                        {
                          icon: Eye,
                          label: "Turbiditas",
                          value: `${activeNode.turbidity_ntu}`,
                          color: "text-slate-300",
                          sub: "NTU",
                        },
                      ].map((p) => (
                        <div
                          key={p.label}
                          className="p-2 rounded-lg bg-slate-800/50 text-center"
                        >
                          <p.icon
                            className={`w-4 h-4 mx-auto mb-1 ${p.color}`}
                          />
                          <p
                            className={`text-lg font-bold font-mono ${p.color}`}
                          >
                            {p.value}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            {p.label}
                          </p>
                          <p className="text-[10px] text-slate-600">{p.sub}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* H2S Mini Chart */}
                <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-sm">
                  <CardHeader className="pb-2 pt-4 px-4">
                    <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                      Tren H₂S — 24 Jam
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-2 pb-4">
                    <ResponsiveContainer width="100%" height={150}>
                      <LineChart data={gasHistoryH2S}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis
                          dataKey="time"
                          tick={{ fill: "#475569", fontSize: 9 }}
                          tickLine={false}
                          axisLine={{ stroke: "#1e293b" }}
                          interval={5}
                        />
                        <YAxis
                          tick={{ fill: "#475569", fontSize: 9 }}
                          tickLine={false}
                          axisLine={false}
                          width={28}
                        />
                        <RechartTooltip
                          contentStyle={{
                            background: "#0f172a",
                            border: "1px solid #1e293b",
                            borderRadius: 6,
                            fontSize: 11,
                          }}
                          formatter={(v: any) => {
                            const value = Number(v ?? 0);
                            return [`${value.toFixed(2)} ppm`, "H₂S"];
                          }}
                        />
                        {/* OSHA threshold line */}
                        <Line
                          type="monotone"
                          dataKey={() => 10}
                          stroke="#f43f5e"
                          strokeWidth={1}
                          strokeDasharray="4 2"
                          dot={false}
                          name="OSHA Limit"
                        />
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke="#06b6d4"
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ r: 3 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                    <p className="text-[10px] text-slate-600 text-center mt-1">
                      — — Garis merah: OSHA limit (10 ppm)
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Alerts Panel */}
              <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-sm">
                <CardHeader className="pb-2 pt-4 px-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                      <Bell className="w-3.5 h-3.5" />
                      Alert Aktif — Semua Node
                      {totalAlerts > 0 && (
                        <Badge className="bg-rose-500/20 text-rose-300 border-rose-500/40 text-[10px]">
                          {totalAlerts}
                        </Badge>
                      )}
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-2">
                  {nodes.flatMap((n) =>
                    n.alerts.map((a) => (
                      <div key={a.id} className="space-y-1">
                        <p className="text-[10px] text-slate-600 font-mono pl-1">
                          {n.node_id} · {n.location}
                        </p>
                        <AlertItem
                          alert={a}
                          onAck={(alertId) =>
                            handleAckRequest(n.node_id, alertId)
                          }
                        />
                      </div>
                    )),
                  )}
                  {totalAlerts === 0 &&
                    nodes.every((n) =>
                      n.alerts.every((a) => a.acknowledged),
                    ) && (
                      <div className="flex items-center justify-center gap-2 py-6 text-slate-600">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <span className="text-sm">
                          Semua alert telah diakui
                        </span>
                      </div>
                    )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Footer */}
          <footer className="text-center text-[11px] text-slate-700 py-2 font-mono">
            SepticSense IoT Monitor · Data diperbarui setiap 30 detik via MQTT
          </footer>
        </div>

        {/* Ack Dialog */}
        <Dialog open={!!ackDialog} onOpenChange={() => setAckDialog(null)}>
          <DialogContent className="bg-slate-900 border-slate-700 text-slate-200 max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-slate-100 font-mono">
                Acknowledge Alert
              </DialogTitle>
              <DialogDescription className="text-slate-400 text-sm">
                Konfirmasi bahwa Anda telah mengetahui dan menangani alert ini.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div>
                <p className="text-xs text-slate-500 mb-1">Nama / Identitas</p>
                <input
                  className="w-full bg-slate-800 border border-slate-600 rounded-md px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
                  value={ackName}
                  onChange={(e) => setAckName(e.target.value)}
                  placeholder="Masukkan nama Anda..."
                />
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                <Clock className="w-3 h-3" />
                Waktu acknowledge: {formatTimestamp(new Date())}
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                className="border-slate-600 text-slate-400"
                onClick={() => setAckDialog(null)}
              >
                Batal
              </Button>
              <Button
                className="bg-cyan-600 hover:bg-cyan-500 text-white"
                onClick={handleAckConfirm}
                disabled={!ackName.trim()}
              >
                <CheckCheck className="w-3.5 h-3.5 mr-1.5" />
                Konfirmasi Ack
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
