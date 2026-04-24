"use client";

// ============================================================
//  useMqtt.ts — Revised
//  Koneksi MQTT + konversi payload IoT → format dashboard
//  Semua proses parsing & adaptasi di client (browser)
// ============================================================

import { useEffect, useRef, useState, useCallback } from "react";
import mqtt, { MqttClient } from "mqtt";
import {
  DashboardNodeData,
  parseMqttMessage,
  upsertNode,
  acknowledgeAlert as ackAlertHelper,
  acknowledgeAllAlerts,
} from "@/lib/mqttAdapter";

// ── Konfigurasi broker (bisa di-override via .env.local) ───
const MQTT_BROKER_WS =
  process.env.NEXT_PUBLIC_MQTT_BROKER ?? "wss://broker.hivemq.com:8884/mqtt";

// Wildcard "+" = subscribe SEMUA node sekaligus
// Contoh: septic-iot/septic-tank-001/data, septic-iot/ST-002/data, dst
const TOPIC_DATA =
  process.env.NEXT_PUBLIC_MQTT_TOPIC_DATA ?? "septic-iot/+/data";
const TOPIC_ALERT =
  process.env.NEXT_PUBLIC_MQTT_TOPIC_ALERT ?? "septic-iot/+/alert";

const MAX_HISTORY = 50; // titik historis per node

export interface MqttConnectionStatus {
  connected: boolean;
  broker: string;
  lastConnected: string | null;
  error: string | null;
}

export interface HistoricalPoint {
  timestamp: Date;
  level_pct: number;
  h2s_ppm: number;
  ch4_ppm: number;
  nh3_ppm: number;
  temp_c: number;
  humidity_pct: number;
  ph: number;
  turbidity_ntu: number;
}

export function useMqtt() {
  const clientRef = useRef<MqttClient | null>(null);

  const [connectionStatus, setConnectionStatus] =
    useState<MqttConnectionStatus>({
      connected: false,
      broker: MQTT_BROKER_WS,
      lastConnected: null,
      error: null,
    });

  // ── State utama ─────────────────────────────────────────────
  // nodes: semua node yang pernah mengirim data (multi-node support)
  const [nodes, setNodes] = useState<DashboardNodeData[]>([]);

  // latestNode: node yang paling terakhir update (shortcut untuk single-node view)
  const [latestNode, setLatestNode] = useState<DashboardNodeData | null>(null);

  // history: Map<node_id, HistoricalPoint[]>
  const [history, setHistory] = useState<Map<string, HistoricalPoint[]>>(
    new Map(),
  );

  const [lastMessageTime, setLastMessageTime] = useState<Date | null>(null);

  // ── Connect ─────────────────────────────────────────────────
  const connect = useCallback(() => {
    if (clientRef.current?.connected) return;
    setConnectionStatus((prev) => ({ ...prev, error: null }));

    const client = mqtt.connect(MQTT_BROKER_WS, {
      clientId: `septic-dash-${Math.random().toString(16).substring(2, 8)}`,
      clean: true,
      connectTimeout: 10_000,
      reconnectPeriod: 3_000,
      keepalive: 30,
    });

    client.on("connect", () => {
      setConnectionStatus({
        connected: true,
        broker: MQTT_BROKER_WS,
        lastConnected: new Date().toISOString(),
        error: null,
      });
      client.subscribe([TOPIC_DATA, TOPIC_ALERT], { qos: 1 }, (err) => {
        if (err) console.error("[MQTT] Subscribe error:", err);
        else console.log("[MQTT] Subscribed →", TOPIC_DATA, TOPIC_ALERT);
      });
    });

    client.on("message", (topic: string, message: Buffer) => {
      const raw = message.toString();
      setLastMessageTime(new Date());

      if (topic.endsWith("/data")) {
        setNodes((prevNodes) => {
          // Cari node lama untuk preserve acknowledged state alerts
          const existing = prevNodes.find((n) =>
            raw.includes(`"${n.node_id}"`),
          );

          // ── KONVERSI PAYLOAD IoT → FORMAT DASHBOARD ──────────
          const adapted = parseMqttMessage(raw, {
            existingAlerts: existing?.alerts ?? [],
          });

          if (!adapted) return prevNodes;

          // Update latestNode (pakai functional update terpisah)
          setLatestNode(adapted);

          // Update history untuk node ini
          setHistory((prevHist) => {
            const nodeHistory = prevHist.get(adapted.node_id) ?? [];
            const newPoint: HistoricalPoint = {
              timestamp: adapted.timestamp,
              level_pct: adapted.level_pct,
              h2s_ppm: adapted.h2s_ppm,
              ch4_ppm: adapted.ch4_ppm,
              nh3_ppm: adapted.nh3_ppm,
              temp_c: adapted.temp_c,
              humidity_pct: adapted.humidity_pct,
              ph: adapted.ph,
              turbidity_ntu: adapted.turbidity_ntu,
            };
            const updated = [...nodeHistory, newPoint].slice(-MAX_HISTORY);
            return new Map(prevHist).set(adapted.node_id, updated);
          });

          return upsertNode(prevNodes, adapted);
        });
      }

      // /alert topic: sudah di-handle di dalam adaptMqttPayload via /data,
      // tapi bisa dipakai untuk trigger browser Notification API
      if (topic.endsWith("/alert")) {
        try {
          const alertPayload = JSON.parse(raw);
          console.warn("[MQTT] Alert diterima:", alertPayload);

          // Opsional: trigger browser push notification
          if (
            typeof window !== "undefined" &&
            "Notification" in window &&
            Notification.permission === "granted"
          ) {
            new Notification(`⚠ Alert — ${alertPayload.node_id}`, {
              body: alertPayload.gas_alert
                ? "Gas berbahaya melebihi batas OSHA!"
                : `Level kotoran ${alertPayload.level_pct?.toFixed(1)}% — ${alertPayload.level_status}`,
              icon: "/favicon.ico",
            });
          }
        } catch {
          console.error("[MQTT] Alert parse error");
        }
      }
    });

    client.on("reconnect", () =>
      setConnectionStatus((p) => ({
        ...p,
        connected: false,
        error: "Reconnecting...",
      })),
    );
    client.on("error", (err: Error) =>
      setConnectionStatus((p) => ({
        ...p,
        connected: false,
        error: err.message,
      })),
    );
    client.on("close", () =>
      setConnectionStatus((p) => ({ ...p, connected: false })),
    );

    clientRef.current = client;
  }, []);

  // ── Disconnect ───────────────────────────────────────────────
  const disconnect = useCallback(() => {
    clientRef.current?.end(true);
    clientRef.current = null;
    setConnectionStatus((p) => ({ ...p, connected: false }));
  }, []);

  // ── Acknowledge satu alert ───────────────────────────────────
  const acknowledgeAlert = useCallback((nodeId: string, alertId: string) => {
    const updateNode = (n: DashboardNodeData) =>
      n.node_id === nodeId ? ackAlertHelper(n, alertId) : n;

    setNodes((prev) => prev.map(updateNode));
    setLatestNode((prev) => (prev ? updateNode(prev) : prev));
  }, []);

  // ── Acknowledge semua alert di satu node ─────────────────────
  const acknowledgeAll = useCallback((nodeId: string) => {
    const updateNode = (n: DashboardNodeData) =>
      n.node_id === nodeId ? acknowledgeAllAlerts(n) : n;

    setNodes((prev) => prev.map(updateNode));
    setLatestNode((prev) => (prev ? updateNode(prev) : prev));
  }, []);

  // ── Minta izin browser notification ─────────────────────────
  const requestNotificationPermission = useCallback(async () => {
    if (typeof window !== "undefined" && "Notification" in window) {
      await Notification.requestPermission();
    }
  }, []);

  // ── Auto-connect on mount ────────────────────────────────────
  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  // ── Computed ─────────────────────────────────────────────────
  const unacknowledgedCount = nodes.reduce(
    (sum, n) => sum + n.alerts.filter((a) => !a.acknowledged).length,
    0,
  );

  // Ambil history untuk node tertentu
  const getNodeHistory = useCallback(
    (nodeId: string): HistoricalPoint[] => history.get(nodeId) ?? [],
    [history],
  );

  return {
    // Connection
    connectionStatus,
    lastMessageTime,
    connect,
    disconnect,
    requestNotificationPermission,

    // Data (sudah dalam format dashboard)
    nodes, // semua node — untuk multi-node view
    latestNode, // node terakhir update — untuk single-node view
    getNodeHistory, // fn(nodeId) → HistoricalPoint[]

    // Alert management
    unacknowledgedCount,
    acknowledgeAlert, // (nodeId, alertId) => void
    acknowledgeAll, // (nodeId) => void
  };
}
