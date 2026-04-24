"use client";

import { AlertItem } from "@/components/alert-item";
import { GasBar } from "@/components/gas-bar";
import HistoryChart from "@/components/history-chart";
import LoadingSkeleton from "@/components/loading-skeleton";
import { NodeCard } from "@/components/node-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  defaultStatusConfig,
  INITIAL_NODES,
  statusConfig,
} from "@/constants/mockdata";
import { useMqtt } from "@/hooks/useMqtt";
import { NodeData } from "@/lib/type";
import { formatTimeAgo, formatTimestamp, generateHistory } from "@/lib/utils";
import {
  Activity,
  AlertTriangle,
  Bell,
  CheckCheck,
  CheckCircle2,
  Clock,
  Droplets,
  Eye,
  FlaskConical,
  RefreshCw,
  Thermometer,
  Wifi,
  WifiOff,
  Wind,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  Tooltip as RechartTooltip,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";

export default function Dashboard() {
  // MQTT data --------------------------------------------------------
  const { latestNode, nodes: mqttNodes } = useMqtt();

  console.log({ mqttNodes });

  const [nodes, setNodes] = useState<NodeData[]>([]);
  // const [nodes, setNodes] = useState<NodeData[]>(INITIAL_NODES);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<string>("ST-001");
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [ackDialog, setAckDialog] = useState<{
    nodeId: string;
    alertId: string;
  } | null>(null);
  const [ackName, setAckName] = useState("Admin");
  const [historyData, setHistoryData] = useState(() =>
    generateHistory(72, 24, 15),
  );
  const [gasHistoryH2S, setGasHistoryH2S] = useState(() =>
    generateHistory(3.2, 24, 2),
  );
  const [gasHistoryCH4, setGasHistoryCH4] = useState(() =>
    generateHistory(800, 24, 300),
  );
  const [gasHistoryNH3, setGasHistoryNH3] = useState(() =>
    generateHistory(25, 24, 10),
  );
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    setNodes(mqttNodes as NodeData[]);
  }, [mqttNodes]);

  useEffect(() => {
    setHistoryData((prev) =>
      [
        ...prev,
        {
          time: new Date().toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          value: latestNode?.level_pct ?? 0,
        },
      ].slice(-24),
    );
  }, [mqttNodes]);

  useEffect(() => {
    setGasHistoryH2S((prev) =>
      [
        ...prev,
        {
          time: new Date().toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          value: latestNode?.h2s_ppm ?? 0,
        },
      ].slice(-24),
    );
  }, [mqttNodes]);

  useEffect(() => {
    setGasHistoryCH4((prev) =>
      [
        ...prev,
        {
          time: new Date().toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          value: latestNode?.ch4_ppm ?? 0,
        },
      ].slice(-24),
    );
  }, [mqttNodes]);

  useEffect(() => {
    setGasHistoryNH3((prev) =>
      [
        ...prev,
        {
          time: new Date().toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          value: latestNode?.nh3_ppm ?? 0,
        },
      ].slice(-24),
    );
  }, [mqttNodes]);

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
  const cfg = activeNode?.status
    ? statusConfig[activeNode?.status]
    : defaultStatusConfig;

  const totalAlerts = nodes.reduce(
    (acc, n) => acc + n.alerts.filter((a) => !a.acknowledged).length,
    0,
  );
  const criticalCount = nodes.filter(
    (n) => n.status === "Kritis" || n.status === "Penuh",
  ).length;
  const onlineCount = nodes.filter((n) => n.online).length;

  if (!mqttNodes.length) {
    return <LoadingSkeleton />;
  }

  return (
    <TooltipProvider>
      <div
        className="min-h-screen bg-[#080c14] text-slate-200"
        style={{ fontFamily: "'Space Mono', 'IBM Plex Mono', monospace" }}
      >
        {/* Subtle grid bg */}
        {/* <div
          className="fixed inset-0 pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(rgba(6,182,212,0.03) 1px, transparent 1px),
              linear-gradient(90deg, rgba(6,182,212,0.03) 1px, transparent 1px)
            `,
            backgroundSize: "40px 40px",
          }}
        /> */}

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

          {/* History Chart */}
          {/* <HistoryChart /> */}

          {/* ── Main Content ── */}
          <div className="grid grid-cols-12 gap-4">
            {/* Left: Node List */}
            <div className="col-span-12 lg:col-span-4 space-y-3">
              <NodeCard
                key={nodes[0]?.node_id}
                node={nodes[0]}
                onAck={handleAckRequest}
                selected={selectedNode === nodes[0]?.node_id}
                onSelect={setSelectedNode}
              />
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
                          {activeNode?.node_id}
                        </span>
                        <Badge
                          className={`text-xs font-bold border px-2 ${cfg.badge}`}
                        >
                          {activeNode?.status}
                        </Badge>
                        {activeNode ? (
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
                        {activeNode?.location}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] text-slate-500">Last Update</p>
                      <p className="text-xs font-mono text-slate-300">
                        {formatTimestamp(lastRefresh)}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {formatTimeAgo(lastRefresh)}
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
                        data={[
                          { value: activeNode?.level_pct, fill: cfg.ring },
                        ]}
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
                          {Math.round(activeNode?.level_pct)}%
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
                            {activeNode?.level_cm}
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
                            {activeNode?.status}
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
                      value={activeNode?.h2s_ppm}
                      max={10}
                      threshold={10}
                      unit="ppm"
                      icon={Wind}
                    />
                    <GasBar
                      label="CH₄ (Metana)"
                      value={activeNode?.ch4_ppm}
                      max={1000}
                      threshold={1000}
                      unit="ppm"
                      icon={Wind}
                    />
                    <GasBar
                      label="NH₃ (Amonia)"
                      value={activeNode?.nh3_ppm}
                      max={25}
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
                      {activeNode?.node_id}
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
                          value: `${activeNode?.temp_c}°C`,
                          color: "text-orange-400",
                          sub: "DHT22",
                        },
                        {
                          icon: Droplets,
                          label: "Kelembaban",
                          value: `${activeNode?.humidity_pct}%`,
                          color: "text-blue-400",
                          sub: "RH",
                        },
                        {
                          icon: FlaskConical,
                          label: "pH",
                          value: activeNode?.ph.toFixed(2),
                          color: "text-violet-400",
                          sub: "0–14 skala",
                        },
                        {
                          icon: Eye,
                          label: "Turbiditas",
                          value: `${activeNode?.turbidity_ntu}`,
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

                {/* CH₄ Mini Chart */}
                <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-sm">
                  <CardHeader className="pb-2 pt-4 px-4">
                    <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                      Tren CH₄ — 24 Jam
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-2 pb-4">
                    <ResponsiveContainer width="100%" height={150}>
                      <LineChart data={gasHistoryCH4}>
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
                          dataKey={() => 1000}
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
                      — — Garis merah: OSHA limit (1000 ppm)
                    </p>
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

                {/* NH₃ Mini Chart */}
                <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-sm">
                  <CardHeader className="pb-2 pt-4 px-4">
                    <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                      Tren NH₃ — 24 Jam
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-2 pb-4">
                    <ResponsiveContainer width="100%" height={150}>
                      <LineChart data={gasHistoryNH3}>
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
                            return [`${value.toFixed(2)} ppm`, "NH₃"];
                          }}
                        />
                        {/* OSHA threshold line */}
                        <Line
                          type="monotone"
                          dataKey={() => 25}
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
                      — — Garis merah: OSHA limit (25 ppm)
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
