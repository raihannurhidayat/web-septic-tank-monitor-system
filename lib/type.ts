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
