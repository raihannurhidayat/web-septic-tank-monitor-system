// ============================================================
//  mqttAdapter.ts
//  Konversi payload MQTT (IoT raw) → format Dashboard
//  Berjalan di client-side (browser), zero server dependency
// ============================================================

// ── 1. Tipe payload MENTAH dari IoT device ─────────────────
export interface MqttRawPayload {
  node_id: string;
  timestamp: string; // "2026-04-22T00:00:47Z"
  level_cm: number;
  level_pct: number;
  level_status: "AMAN" | "WASPADA" | "KRITIS" | "PENUH";
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

// ── 2. Tipe format Dashboard (format yang kamu pakai) ───────
export type AlertSeverity = "warning" | "critical";
export type NodeStatus = "Aman" | "Waspada" | "Kritis" | "Penuh" | "Offline";

export interface DashboardAlert {
  id: string;
  severity: AlertSeverity;
  type: string;
  message: string;
  value: number;
  unit: string;
  timestamp: Date;
  acknowledged: boolean;
}

export interface DashboardNodeData {
  node_id: string;
  location: string;
  timestamp: Date; // sudah jadi Date object
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
  alerts: DashboardAlert[];
}

// ── 3. Threshold (OSHA/WHO — PRD §2.2) ─────────────────────
export const THRESHOLDS = {
  H2S_PPM: 10,
  CH4_PPM: 1000,
  NH3_PPM: 25,
  PH_MIN: 6.0,
  PH_MAX: 8.5,
  LEVEL_WASPADA: 60,
  LEVEL_KRITIS: 80,
  LEVEL_PENUH: 95,
  ONLINE_MS: 5 * 60 * 1000, // 5 menit = device dianggap offline
} as const;

// ── 4. Registry lokasi node ─────────────────────────────────
// Tambahkan node_id → nama lokasi sesuai deployment lapangan
const NODE_LOCATION_MAP: Record<string, string> = {
  "septic-tank-001": "Blok A - Unit 01",
  "septic-tank-002": "Blok A - Unit 02",
  "septic-tank-003": "Blok B - Unit 10",
  "ST-001": "Blok A - Unit 01",
  "ST-002": "Blok B - Unit 15",
  "ST-003": "Blok C - Unit 21",
};

function getLocation(nodeId: string): string {
  return NODE_LOCATION_MAP[nodeId] ?? `Node ${nodeId}`;
}

// ── 5. Helpers ──────────────────────────────────────────────
function isOnline(isoTimestamp: string): boolean {
  try {
    return Date.now() - new Date(isoTimestamp).getTime() < THRESHOLDS.ONLINE_MS;
  } catch {
    return false;
  }
}

function mapStatus(
  levelStatus: MqttRawPayload["level_status"],
  online: boolean,
): NodeStatus {
  // if (!online) return "Offline";
  return (
    {
      AMAN: "Aman",
      WASPADA: "Waspada",
      KRITIS: "Kritis",
      PENUH: "Penuh",
    } as const
  )[levelStatus];
}

function makeAlertId(nodeId: string, type: string, ts: string): string {
  return `${nodeId}-${type}-${ts}`.replace(/\W/g, "-");
}

// ── 6. Build alert list dari satu payload ───────────────────
function buildAlerts(raw: MqttRawPayload, receivedAt: Date): DashboardAlert[] {
  const alerts: DashboardAlert[] = [];

  if (raw.h2s_ppm > THRESHOLDS.H2S_PPM) {
    alerts.push({
      id: makeAlertId(raw.node_id, "h2s", raw.timestamp),
      severity: raw.h2s_ppm > THRESHOLDS.H2S_PPM * 1.5 ? "critical" : "warning",
      type: "H2S Kritis",
      message: `Konsentrasi H2S melampaui ${THRESHOLDS.H2S_PPM} ppm (OSHA limit)`,
      value: raw.h2s_ppm,
      unit: "ppm",
      timestamp: receivedAt,
      acknowledged: false,
    });
  }

  if (raw.ch4_ppm > THRESHOLDS.CH4_PPM) {
    alerts.push({
      id: makeAlertId(raw.node_id, "ch4", raw.timestamp),
      severity: "critical",
      type: "CH4 Kritis",
      message: `Konsentrasi Metana melampaui ${THRESHOLDS.CH4_PPM} ppm`,
      value: raw.ch4_ppm,
      unit: "ppm",
      timestamp: receivedAt,
      acknowledged: false,
    });
  }

  if (raw.nh3_ppm > THRESHOLDS.NH3_PPM) {
    alerts.push({
      id: makeAlertId(raw.node_id, "nh3", raw.timestamp),
      severity: raw.nh3_ppm > THRESHOLDS.NH3_PPM * 1.5 ? "critical" : "warning",
      type: "NH3 Tinggi",
      message: `Konsentrasi Amonia melampaui ${THRESHOLDS.NH3_PPM} ppm (OSHA TWA)`,
      value: raw.nh3_ppm,
      unit: "ppm",
      timestamp: receivedAt,
      acknowledged: false,
    });
  }

  if (
    raw.level_alert ||
    raw.level_status === "KRITIS" ||
    raw.level_status === "PENUH"
  ) {
    alerts.push({
      id: makeAlertId(raw.node_id, "level", raw.timestamp),
      severity: raw.level_status === "PENUH" ? "critical" : "warning",
      type: `Level ${raw.level_status === "PENUH" ? "Penuh" : "Kritis"}`,
      message: `Level kotoran ${raw.level_pct.toFixed(1)}% (${raw.level_cm} cm) — ${
        raw.level_status === "PENUH"
          ? "Risiko limpah! Segera lakukan pengurasan."
          : "Jadwalkan pengurasan segera."
      }`,
      value: raw.level_pct,
      unit: "%",
      timestamp: receivedAt,
      acknowledged: false,
    });
  }

  if (
    raw.ph !== 0 &&
    (raw.ph < THRESHOLDS.PH_MIN || raw.ph > THRESHOLDS.PH_MAX)
  ) {
    alerts.push({
      id: makeAlertId(raw.node_id, "ph", raw.timestamp),
      severity: "warning",
      type: raw.ph < THRESHOLDS.PH_MIN ? "pH Terlalu Asam" : "pH Terlalu Basa",
      message: `pH ${raw.ph.toFixed(2)} di luar rentang normal (${THRESHOLDS.PH_MIN}–${THRESHOLDS.PH_MAX})`,
      value: raw.ph,
      unit: "",
      timestamp: receivedAt,
      acknowledged: false,
    });
  }

  return alerts;
}

// ── 7. Merge alerts — preserve acknowledged state ───────────
// Supaya saat ada update baru, alert yang sudah di-ack user tidak reset
export function mergeAlerts(
  existing: DashboardAlert[],
  incoming: DashboardAlert[],
): DashboardAlert[] {
  return incoming.map((newAlert) => {
    const old = existing.find((e) => e.type === newAlert.type);
    return old?.acknowledged ? { ...newAlert, acknowledged: true } : newAlert;
  });
}

// ────────────────────────────────────────────────────────────
//  FUNGSI UTAMA: adaptMqttPayload
//  Input : MqttRawPayload (object dari IoT)
//  Output: DashboardNodeData (format dashboard kamu)
// ────────────────────────────────────────────────────────────
export function adaptMqttPayload(
  raw: MqttRawPayload,
  options?: {
    locationOverride?: string;
    existingAlerts?: DashboardAlert[];
  },
): DashboardNodeData {
  const receivedAt = new Date();
  const online = isOnline(raw.timestamp);
  const newAlerts = buildAlerts(raw, receivedAt);

  return {
    node_id: raw.node_id,
    location: options?.locationOverride ?? getLocation(raw.node_id),
    timestamp: new Date(raw.timestamp), // string ISO → Date
    online,
    level_cm: raw.level_cm,
    level_pct: raw.level_pct,
    h2s_ppm: raw.h2s_ppm,
    ch4_ppm: raw.ch4_ppm,
    nh3_ppm: raw.nh3_ppm,
    temp_c: raw.temp_c,
    humidity_pct: raw.humidity_pct,
    ph: raw.ph,
    turbidity_ntu: raw.turbidity_ntu,
    status: mapStatus(raw.level_status, online),
    alerts: mergeAlerts(options?.existingAlerts ?? [], newAlerts),
  };
}

// ── Parse dari string MQTT message ─────────────────────────
export function parseMqttMessage(
  rawString: string,
  options?: Parameters<typeof adaptMqttPayload>[1],
): DashboardNodeData | null {
  try {
    const parsed = JSON.parse(rawString) as MqttRawPayload;
    return adaptMqttPayload(parsed, options);
  } catch (err) {
    console.error("[mqttAdapter] Gagal parse:", err);
    return null;
  }
}

// ── Upsert node ke dalam array nodes ───────────────────────
export function upsertNode(
  nodes: DashboardNodeData[],
  incoming: DashboardNodeData,
): DashboardNodeData[] {
  const idx = nodes.findIndex((n) => n.node_id === incoming.node_id);
  if (idx === -1) return [...nodes, incoming];
  const updated = [...nodes];
  updated[idx] = {
    ...incoming,
    alerts: mergeAlerts(nodes[idx].alerts, incoming.alerts),
  };
  return updated;
}

// ── Acknowledge helpers ─────────────────────────────────────
export function acknowledgeAlert(
  node: DashboardNodeData,
  alertId: string,
): DashboardNodeData {
  return {
    ...node,
    alerts: node.alerts.map((a) =>
      a.id === alertId ? { ...a, acknowledged: true } : a,
    ),
  };
}

export function acknowledgeAllAlerts(
  node: DashboardNodeData,
): DashboardNodeData {
  return {
    ...node,
    alerts: node.alerts.map((a) => ({ ...a, acknowledged: true })),
  };
}
