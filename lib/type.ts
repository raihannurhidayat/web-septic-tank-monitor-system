// ─── Types ───────────────────────────────────────────────────────────────────

export type NodeStatus = "Aman" | "Waspada" | "Kritis" | "Penuh";

export interface SensorAlert {
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

export interface NodeData {
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

// ─── MQTT Sensor Type ───────────────────────────────────────────────────────────
// ============================================================
//  SEPTIC TANK IoT — TypeScript Types
//  Sesuai PRD Section 4.5 JSON Payload
// ============================================================

export type LevelStatus = "AMAN" | "WASPADA" | "KRITIS" | "PENUH";

export interface SensorPayload {
  node_id: string;
  timestamp: string;
  level_cm: number;
  level_pct: number;
  level_status: LevelStatus;
  h2s_ppm: number;
  ch4_ppm: number;
  nh3_ppm: number;
  temp_c: number;
  humidity_pct: number;
  ph: number;
  turbidity_ntu: number;
  gas_alert: boolean;
  level_alert: boolean;
}

export interface AlertPayload {
  node_id: string;
  timestamp: string;
  level_alert: boolean;
  gas_alert: boolean;
  level_status: LevelStatus;
  level_pct: number;
  h2s_over?: number;
  ch4_over?: number;
  nh3_over?: number;
}

export interface AlertLog {
  id: string;
  timestamp: string;
  node_id: string;
  type: "GAS" | "LEVEL" | "COMBINED";
  message: string;
  level_status?: LevelStatus;
  level_pct?: number;
  h2s_over?: number;
  ch4_over?: number;
  nh3_over?: number;
  acknowledged: boolean;
}

export interface HistoricalDataPoint {
  timestamp: string;
  level_pct: number;
  h2s_ppm: number;
  ch4_ppm: number;
  nh3_ppm: number;
  temp_c: number;
  humidity_pct: number;
  ph: number;
  turbidity_ntu: number;
}

export interface MqttConnectionStatus {
  connected: boolean;
  broker: string;
  lastConnected: string | null;
  error: string | null;
}

// Threshold constants — sesuai PRD Section 2.2 & OSHA standard
export const THRESHOLDS = {
  H2S_PPM: 10,
  CH4_PPM: 1000,
  NH3_PPM: 25,
  LEVEL_WASPADA_PCT: 60,
  LEVEL_KRITIS_PCT: 80,
  LEVEL_PENUH_PCT: 95,
  PH_MIN: 6.0,
  PH_MAX: 8.5,
} as const;

export const STATUS_CONFIG: Record<
  LevelStatus,
  { color: string; bg: string; border: string; label: string }
> = {
  AMAN: {
    color: "#22c55e",
    bg: "rgba(34,197,94,0.12)",
    border: "rgba(34,197,94,0.4)",
    label: "AMAN",
  },
  WASPADA: {
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.12)",
    border: "rgba(245,158,11,0.4)",
    label: "WASPADA",
  },
  KRITIS: {
    color: "#ef4444",
    bg: "rgba(239,68,68,0.12)",
    border: "rgba(239,68,68,0.4)",
    label: "KRITIS",
  },
  PENUH: {
    color: "#7f1d1d",
    bg: "rgba(127,29,29,0.25)",
    border: "rgba(239,68,68,0.8)",
    label: "PENUH",
  },
};
