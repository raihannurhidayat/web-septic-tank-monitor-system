"use client";

// ============================================================
//  useMqtt — Custom Hook
//  Koneksi ke MQTT Broker via WebSocket (MQTT over WS)
//  Broker: broker.hivemq.com:8884 (wss) atau port 8083 (ws)
// ============================================================

import { useEffect, useRef, useState, useCallback } from "react";
import mqtt, { MqttClient } from "mqtt";
import {
  SensorPayload,
  AlertPayload,
  AlertLog,
  HistoricalDataPoint,
  MqttConnectionStatus,
} from "@/lib/type";

const MQTT_BROKER_WS = "wss://broker.hivemq.com:8884/mqtt";
const TOPIC_DATA = "septic-iot/node-001/data";
const TOPIC_ALERT = "septic-iot/node-001/alert";
const MAX_HISTORY_POINTS = 50; // simpan 50 data point terakhir

export function useMqtt() {
  const clientRef = useRef<MqttClient | null>(null);

  const [connectionStatus, setConnectionStatus] =
    useState<MqttConnectionStatus>({
      connected: false,
      broker: MQTT_BROKER_WS,
      lastConnected: null,
      error: null,
    });

  const [latestData, setLatestData] = useState<SensorPayload | null>(null);
  const [historicalData, setHistoricalData] = useState<HistoricalDataPoint[]>(
    [],
  );
  const [alertLogs, setAlertLogs] = useState<AlertLog[]>([]);
  const [lastMessageTime, setLastMessageTime] = useState<Date | null>(null);

  // ── Connect ────────────────────────────────────────────────
  const connect = useCallback(() => {
    if (clientRef.current?.connected) return;

    setConnectionStatus((prev) => ({ ...prev, error: null }));

    const client = mqtt.connect(MQTT_BROKER_WS, {
      clientId: `septic-dashboard-${Math.random().toString(16).substring(2, 8)}`,
      clean: true,
      connectTimeout: 10000,
      reconnectPeriod: 3000,
      keepalive: 30,
      protocolVersion: 5,
    });

    client.on("connect", () => {
      console.log("[MQTT] Connected to", MQTT_BROKER_WS);
      setConnectionStatus({
        connected: true,
        broker: MQTT_BROKER_WS,
        lastConnected: new Date().toISOString(),
        error: null,
      });

      // Subscribe ke kedua topic
      client.subscribe([TOPIC_DATA, TOPIC_ALERT], { qos: 1 }, (err) => {
        if (err) {
          console.error("[MQTT] Subscribe error:", err);
        } else {
          console.log("[MQTT] Subscribed to:", TOPIC_DATA, TOPIC_ALERT);
        }
      });
    });

    client.on("message", (topic: string, message: Buffer) => {
      try {
        const raw = message.toString();
        const parsed = JSON.parse(raw);
        setLastMessageTime(new Date());

        if (topic === TOPIC_DATA) {
          handleSensorData(parsed as SensorPayload);
        } else if (topic === TOPIC_ALERT) {
          handleAlertData(parsed as AlertPayload);
        }
      } catch (e) {
        console.error("[MQTT] Parse error:", e);
      }
    });

    client.on("reconnect", () => {
      console.log("[MQTT] Reconnecting...");
      setConnectionStatus((prev) => ({
        ...prev,
        connected: false,
        error: "Reconnecting...",
      }));
    });

    client.on("error", (err: Error) => {
      console.error("[MQTT] Error:", err.message);
      setConnectionStatus((prev) => ({
        ...prev,
        connected: false,
        error: err.message,
      }));
    });

    client.on("close", () => {
      console.log("[MQTT] Connection closed");
      setConnectionStatus((prev) => ({
        ...prev,
        connected: false,
      }));
    });

    client.on("offline", () => {
      setConnectionStatus((prev) => ({
        ...prev,
        connected: false,
        error: "Client offline",
      }));
    });

    clientRef.current = client;
  }, []);

  // ── Disconnect ─────────────────────────────────────────────
  const disconnect = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.end(true);
      clientRef.current = null;
      setConnectionStatus((prev) => ({
        ...prev,
        connected: false,
      }));
    }
  }, []);

  // ── Handle Sensor Data ────────────────────────────────────
  const handleSensorData = (data: SensorPayload) => {
    setLatestData(data);

    // Tambah ke historical data (FIFO, max 50 points)
    const point: HistoricalDataPoint = {
      timestamp: data.timestamp,
      level_pct: data.level_pct,
      h2s_ppm: data.h2s_ppm,
      ch4_ppm: data.ch4_ppm,
      nh3_ppm: data.nh3_ppm,
      temp_c: data.temp_c,
      humidity_pct: data.humidity_pct,
      ph: data.ph,
      turbidity_ntu: data.turbidity_ntu,
    };

    setHistoricalData((prev) => {
      const updated = [...prev, point];
      return updated.slice(-MAX_HISTORY_POINTS);
    });
  };

  // ── Handle Alert Data ─────────────────────────────────────
  const handleAlertData = (alert: AlertPayload) => {
    const log: AlertLog = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: alert.timestamp || new Date().toISOString(),
      node_id: alert.node_id,
      type:
        alert.gas_alert && alert.level_alert
          ? "COMBINED"
          : alert.gas_alert
            ? "GAS"
            : "LEVEL",
      message: buildAlertMessage(alert),
      level_status: alert.level_status,
      level_pct: alert.level_pct,
      h2s_over: alert.h2s_over,
      ch4_over: alert.ch4_over,
      nh3_over: alert.nh3_over,
      acknowledged: false,
    };

    setAlertLogs((prev) => [log, ...prev].slice(0, 100)); // simpan 100 alert terakhir
  };

  // ── Acknowledge Alert ─────────────────────────────────────
  const acknowledgeAlert = useCallback((id: string) => {
    setAlertLogs((prev) =>
      prev.map((log) => (log.id === id ? { ...log, acknowledged: true } : log)),
    );
  }, []);

  // ── Acknowledge All ───────────────────────────────────────
  const acknowledgeAll = useCallback(() => {
    setAlertLogs((prev) => prev.map((log) => ({ ...log, acknowledged: true })));
  }, []);

  // ── Auto-connect on mount ─────────────────────────────────
  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  // ── Helpers ───────────────────────────────────────────────
  const unacknowledgedCount = alertLogs.filter((l) => !l.acknowledged).length;

  return {
    connectionStatus,
    latestData,
    historicalData,
    alertLogs,
    unacknowledgedCount,
    lastMessageTime,
    connect,
    disconnect,
    acknowledgeAlert,
    acknowledgeAll,
  };
}

function buildAlertMessage(alert: AlertPayload): string {
  const parts: string[] = [];
  if (alert.level_alert) {
    parts.push(
      `Level kotoran ${alert.level_pct?.toFixed(1)}% — Status: ${alert.level_status}`,
    );
  }
  if (alert.gas_alert) {
    const gases: string[] = [];
    if (alert.h2s_over) gases.push(`H2S ${alert.h2s_over.toFixed(2)} ppm`);
    if (alert.ch4_over) gases.push(`CH4 ${alert.ch4_over.toFixed(1)} ppm`);
    if (alert.nh3_over) gases.push(`NH3 ${alert.nh3_over.toFixed(2)} ppm`);
    parts.push(`Gas berbahaya terdeteksi: ${gases.join(", ")}`);
  }
  return parts.join(" | ");
}
