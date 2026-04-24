"use client";

// ============================================================
//  Contoh 3: History Chart + useEffect Pattern
//  Menampilkan sparkline historis dan cara akses getNodeHistory
// ============================================================

import { useMqtt, HistoricalPoint } from "@/hooks/useMqtt";
import { useState, useEffect } from "react";

// Dummy history untuk preview sebelum data live masuk
const DUMMY_HISTORY: HistoricalPoint[] = Array.from({ length: 15 }, (_, i) => ({
  timestamp: new Date(Date.now() - (14 - i) * 5000),
  level_pct: 40 + i * 3.5 + Math.random() * 2,
  h2s_ppm: 1 + i * 0.2 + Math.random() * 0.3,
  ch4_ppm: 150 + i * 40 + Math.random() * 20,
  nh3_ppm: 4 + i * 0.5 + Math.random() * 0.5,
  temp_c: 29 + i * 0.2 + Math.random() * 0.3,
  humidity_pct: 70 + i * 0.5 + Math.random(),
  ph: 7.3 - i * 0.02,
  turbidity_ntu: 30 + i * 5 + Math.random() * 3,
}));

// Tipe untuk konfigurasi chart
type ChartKey = keyof Omit<HistoricalPoint, "timestamp">;
interface ChartConfig {
  key: ChartKey;
  label: string;
  unit: string;
  color: string;
  threshold?: number;
}

const CHART_CONFIGS: ChartConfig[] = [
  {
    key: "level_pct",
    label: "Level Kotoran",
    unit: "%",
    color: "#22c55e",
    threshold: 80,
  },
  {
    key: "h2s_ppm",
    label: "H2S",
    unit: "ppm",
    color: "#a855f7",
    threshold: 10,
  },
  {
    key: "ch4_ppm",
    label: "CH4",
    unit: "ppm",
    color: "#f97316",
    threshold: 1000,
  },
  {
    key: "nh3_ppm",
    label: "NH3",
    unit: "ppm",
    color: "#06b6d4",
    threshold: 25,
  },
  { key: "temp_c", label: "Suhu", unit: "°C", color: "#f59e0b" },
  { key: "ph", label: "pH", unit: "", color: "#4ade80" },
];

// ── SVG Sparkline ────────────────────────────────────────────
function Sparkline({
  values,
  color,
  threshold,
  height = 50,
}: {
  values: number[];
  color: string;
  threshold?: number;
  height?: number;
}) {
  if (values.length < 2) {
    return (
      <svg
        width="100%"
        height={height}
        viewBox="0 0 200 50"
        preserveAspectRatio="none"
      >
        <text
          x="100"
          y="28"
          textAnchor="middle"
          fill="#374151"
          fontSize="11"
          fontFamily="monospace"
        >
          Menunggu data...
        </text>
      </svg>
    );
  }

  const W = 200,
    H = height,
    pad = 3;
  const min = Math.min(...values);
  const max = Math.max(...values) || 1;
  const range = max - min || 1;

  const pts = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (W - pad * 2);
    const y = pad + (1 - (v - min) / range) * (H - pad * 2);
    return `${x},${y}`;
  });

  const lastPt = pts[pts.length - 1].split(",");
  const thresholdY =
    threshold !== undefined
      ? pad + (1 - (threshold - min) / range) * (H - pad * 2)
      : null;

  const areaPath = `M ${pts[0]} L ${pts.join(" L ")} L ${pad + (W - pad * 2)},${H - pad} L ${pad},${H - pad} Z`;

  return (
    <svg
      width="100%"
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient
          id={`g${color.replace("#", "")}`}
          x1="0"
          y1="0"
          x2="0"
          y2="1"
        >
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>

      <path d={areaPath} fill={`url(#g${color.replace("#", "")})`} />
      <polyline
        points={pts.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* Threshold line */}
      {thresholdY !== null && thresholdY >= pad && thresholdY <= H - pad && (
        <line
          x1={pad}
          y1={thresholdY}
          x2={W - pad}
          y2={thresholdY}
          stroke="#ef4444"
          strokeWidth="1"
          strokeDasharray="3,3"
          opacity="0.6"
        />
      )}

      {/* Last value dot */}
      <circle
        cx={parseFloat(lastPt[0])}
        cy={parseFloat(lastPt[1])}
        r="2.5"
        fill={color}
      />
    </svg>
  );
}

// ────────────────────────────────────────────────────────────
//  KOMPONEN UTAMA
// ────────────────────────────────────────────────────────────
export default function HistoryChart() {
  const { latestNode, getNodeHistory, connectionStatus } = useMqtt();

  // ID node yang ditampilkan (bisa dari URL param / state selector)
  const targetNodeId = latestNode?.node_id ?? "septic-tank-001";

  // Ambil history dari hook — sudah difilter per node
  const liveHistory = getNodeHistory(targetNodeId);

  // Gunakan data live jika ada, fallback ke dummy
  const history: HistoricalPoint[] =
    liveHistory.length > 0 ? liveHistory : DUMMY_HISTORY;

  // ── Contoh useEffect: trigger side effect saat data baru masuk ──
  useEffect(() => {
    if (!latestNode) return;

    // Contoh 1: Log ke console setiap update
    console.log("[Dashboard] Data baru:", {
      node: latestNode.node_id,
      level: `${latestNode.level_pct.toFixed(1)}%`,
      status: latestNode.status,
      alerts: latestNode.alerts.length,
    });

    // Contoh 2: Update document title dengan status terkini
    const alertCount = latestNode.alerts.filter((a) => !a.acknowledged).length;
    document.title =
      alertCount > 0
        ? `(${alertCount}) ⚠ ${latestNode.node_id} — Septic Monitor`
        : `${latestNode.node_id} — Septic Monitor`;

    // Cleanup: reset title saat unmount
    return () => {
      document.title = "Septic Tank Monitor";
    };
  }, [latestNode]); // re-run setiap kali latestNode berubah

  // ── Contoh useEffect: deteksi transisi status ────────────────
  const [prevStatus, setPrevStatus] = useState(latestNode?.status);
  useEffect(() => {
    if (!latestNode) return;
    if (latestNode.status !== prevStatus) {
      console.warn(
        `[Dashboard] Status berubah: ${prevStatus} → ${latestNode.status}`,
      );
      setPrevStatus(latestNode.status);
    }
  }, [latestNode?.status]);

  const latest = history[history.length - 1];

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6 font-mono">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">Trend Historis</h1>
          <p className="text-gray-400 text-sm">
            Node: {targetNodeId} · {history.length} titik data
          </p>
        </div>
        <span
          className={`text-xs px-3 py-1 rounded-full border ${
            connectionStatus.connected
              ? "text-green-400 border-green-400/40"
              : "text-gray-500 border-gray-500/40"
          }`}
        >
          {liveHistory.length > 0 ? "● Data Live" : "○ Demo Data"}
        </span>
      </div>

      {/* ── Chart Grid ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {CHART_CONFIGS.map((cfg) => {
          const values = history.map((h) => h[cfg.key] as number);
          const latestVal = latest?.[cfg.key] as number | undefined;
          const isOverThreshold =
            cfg.threshold !== undefined && latestVal !== undefined
              ? latestVal > cfg.threshold
              : false;

          return (
            <div
              key={cfg.key}
              className={`rounded-xl border p-4 transition-colors ${
                isOverThreshold
                  ? "border-red-400/30 bg-red-400/5"
                  : "border-white/10 bg-white/5"
              }`}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-gray-400">{cfg.label}</span>
                <div className="text-right">
                  <span
                    className="text-lg font-bold"
                    style={{ color: isOverThreshold ? "#ef4444" : cfg.color }}
                  >
                    {latestVal !== undefined ? latestVal.toFixed(2) : "—"}
                  </span>
                  <span className="text-xs text-gray-500 ml-1">{cfg.unit}</span>
                </div>
              </div>

              {/* Sparkline */}
              <Sparkline
                values={values}
                color={isOverThreshold ? "#ef4444" : cfg.color}
                threshold={cfg.threshold}
              />

              {/* Threshold info */}
              {cfg.threshold && (
                <div className="flex justify-between text-xs mt-2 text-gray-600">
                  <span>
                    Batas: {cfg.threshold} {cfg.unit}
                  </span>
                  {isOverThreshold && (
                    <span className="text-red-400">⚠ Melebihi batas</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Cara mengakses history secara langsung ──────────── */}
      <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="text-xs text-gray-500 mb-2">
          Cara akses history data (untuk integrasi ke tabel/export):
        </div>
        <pre className="text-xs text-green-300 overflow-auto">
          {`// Di komponen manapun:
const { getNodeHistory } = useMqtt();
const history = getNodeHistory("septic-tank-001");

// history adalah HistoricalPoint[] dengan struktur:
// {
//   timestamp: Date,
//   level_pct: ${latest?.level_pct.toFixed(2) ?? "72.50"},
//   h2s_ppm: ${latest?.h2s_ppm.toFixed(2) ?? "3.20"},
//   ch4_ppm: ${latest?.ch4_ppm.toFixed(2) ?? "420.00"},
//   nh3_ppm: ${latest?.nh3_ppm.toFixed(2) ?? "8.10"},
//   temp_c: ${latest?.temp_c.toFixed(2) ?? "31.20"},
//   humidity_pct: ${latest?.humidity_pct.toFixed(2) ?? "78.00"},
//   ph: ${latest?.ph.toFixed(2) ?? "7.45"},
//   turbidity_ntu: ${latest?.turbidity_ntu.toFixed(2) ?? "45.00"},
// }
// Total titik: ${history.length} (max 50)`}
        </pre>
      </div>
    </div>
  );
}
