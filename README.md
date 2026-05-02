# SepticSense Monitor

Sistem monitoring kondisi septic tank berbasis IoT (Internet of Things) dengan dashboard web real-time. Proyek ini mengintegrasikan sensor fisik (ultrasonik, gas, pH, turbidity) dengan backend MQTT dan antarmuka web modern untuk memantau status septic tank secara berkala.

## Fitur Utama

- **Monitoring Level Real-Time** — Visualisasi level kotoran dalam satuan cm, persentase kapasitas, dan status (Aman / Waspada / Kritis / Penuh)
- **Deteksi Gas Berbahaya** — Monitor H₂S, CH₄, dan NH₃ dengan threshold berbasis standar OSHA
- **Parameter Lingkungan** — Suhu, kelembaban, pH, dan turbiditas air limbah
- **Multi-Node Support** — Pantau puluhan septic tank dari satu dashboard terpusat
- **Visualisasi Data** — Grafik tren 24 jam, radial bar, dan gauge meter interaktif
- **Alert System** — Notifikasi otomatis saat parameter melampaui ambang batas, dengan fitur acknowledge
- **MQTT Integration** — Komunikasi real-time antara perangkat IoT dan dashboard via protokol MQTT

## Arsitektur Sistem

```
┌─────────────────────────────────────────────────────────────────┐
│                        EDGE LAYER                              │
│  ESP32 + JSN-SR04T + MQ-136 + MQ-4 + MQ-137 + DHT22 + pH     │
└───────────────────────────┬─────────────────────────────────────┘
                            │ WiFi / LoRaWAN
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                     MQTT BROKER (Mosquitto/EMQX)               │
└───────────────────────────┬─────────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│                   WEB DASHBOARD (Next.js)                       │
│  • Real-time Charts (Recharts)                                  │
│  • Alert Management                                             │
│  • Multi-node Overview                                          │
│  • Environment Parameters                                       │
└─────────────────────────────────────────────────────────────────┘
```

## Tech Stack

- **Frontend**: Next.js 16.2.4, React 19, TypeScript
- **UI Components**: shadcn/ui, Tailwind CSS, Radix UI
- **Charts**: Recharts
- **IoT Protocol**: MQTT (mqtt v5.15.1)
- **Icons**: Lucide React

## Struktur Proyek

```
web-monitor-system/
├── app/                    # Next.js app router
│   ├── page.tsx           # Dashboard utama
│   └── layout.tsx         # Root layout
├── components/            # UI components
│   ├── node-card.tsx      # Kartu informasi node
│   ├── tank-gauge.tsx     # Visualisasi level tank
│   ├── gas-bar.tsx        # Bar meter gas
│   ├── history-chart.tsx  # Grafik historis
│   ├── alert-item.tsx     # Item alert
│   └── ui/               # shadcn/ui components
├── hooks/
│   └── useMqtt.tsx        # Custom hook untuk koneksi MQTT
├── lib/
│   ├── mqttAdapter.ts     # Adaptor payload MQTT → format dashboard
│   ├── type.ts            # TypeScript types
│   └── utils.ts           # Utility functions
├── constants/
│   └── mockdata.ts        # Data mock untuk development
└── docs/
    └── prd/               # Product Requirements Document
```

## Getting Started

### Prerequisites

- Node.js 18+
- MQTT Broker (Mosquitto / EMQX) untuk koneksi IoT
- ESP32 dengan sensor-sensor terpasang (untuk deployment penuh)

### Installation

1. Clone repository:
```bash
git clone <repo-url>
cd web-monitor-system
```

2. Install dependencies:
```bash
npm install
```

3. Jalankan development server:
```bash
npm run dev
```

4. Buka [http://localhost:3000](http://localhost:3000) di browser.

### MQTT Configuration

Sesuaikan koneksi MQTT di `hooks/useMqtt.tsx`:
- Broker URL
- Topic subscription (default: `septic-tank/+/data`)
- QoS level
