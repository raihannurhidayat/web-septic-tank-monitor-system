import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── Mock Data Generators ─────────────────────────────────────────────────────

export const generateHistory = (base: number, points = 24, spread = 8) =>
  Array.from({ length: points }, (_, i) => ({
    time: `${String(i).padStart(2, "0")}:00`,
    value: Math.max(0, base + (Math.random() - 0.5) * spread),
  }));

// ─── Helper Functions ─────────────────────────────────────────────────────────

export const formatTimeAgo = (date: Date) => {
  const secs = Math.floor((Date.now() - date.getTime()) / 1000);
  if (secs < 60) return `${secs}d yang lalu`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m yang lalu`;
  return `${Math.floor(mins / 60)}j yang lalu`;
};

export const formatTimestamp = (date: Date) =>
  date.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
