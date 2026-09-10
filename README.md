# 🎥 Sistem Kamera Inspeksi AI & Quality Control — Web Edition

[![Python 3.10+](https://img.shields.io/badge/Python-3.10%2B-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100%2B-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React 18](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)](https://reactjs.org)
[![YOLOv8](https://img.shields.io/badge/Ultralytics-YOLOv8-FF6F00?style=flat-square&logo=yolo&logoColor=white)](https://ultralytics.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14%2B-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://postgresql.org)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)](https://tailwindcss.com)

Sistem inspeksi kualitas visual berbasis **AI Computer Vision (YOLOv8 & ONNX Engine)** yang terintegrasi langsung dengan **SISON (Sistem Informasi Operasional Nasional / MES)**. Dirancang khusus untuk operasional industri manufaktur 24/7 dengan arsitektur **Clean Modular, Decoupled Edge Computing, Zero Data Loss, dan Self-Healing Resilience**.

---

## 🌟 Fitur Utama Sistem

* **🧠 High-Speed Multi-Model AI Engine**:
  * Inferensi real-time berbasis YOLOv8 (`.pt`) dan akselerasi **ONNX Runtime Engine** (`.onnx`).
  * In-Memory LRU Model Cache dengan hot-reload dan pembersihan memori otomatis (*Zero Memory Leak*).
* **🔄 Multi-Side Smart Inspection (Front & Rear)**:
  * Deteksi otomatis pergantian sisi komponen (`Sisi: FRONT (F)` & `Sisi: REAR (R)`) dari prefix label.
  * Alur terpandu dengan modal interaktif dan audio buzzer peringatan.
* **🛡️ Industrial Crash Recovery & State Persistence**:
  * Pemulihan otomatis saat server mati mendadak atau listrik padam; sistem langsung melanjutkan dari part terakhir yang belum selesai tanpa mengulang dari part pertama.
* **📦 SQLite Outbox Buffer (Zero Data Loss)**:
  * Pengalihan otomatis penyimpanan log dan callback SISON ke SQLite lokal (`offline_buffer.db`) saat database PostgreSQL pusat atau jaringan mengalami gangguan, dan sinkronisasi otomatis saat koneksi pulih.
* **🎯 Exact-Token Defect Matching & Whitelist**:
  * Pencegahan alarm palsu (*False Alarm NG*) pada nama komponen normal (misal: `R-KLIP-KUNING-01`, `SPRING`, `RING`).
* **👥 Multi-Station & Operator Session Registry**:
  * Manajemen multi-stasiun kerja dengan pencatatan audit log, masa berlaku sesi 8 jam, dan keamanan PIN/Password.
* **🎨 Modern Adaptive UI (Light & Dark Mode)**:
  * Antarmuka Operator Kiosk Fullscreen dengan Heads-Up Display (HUD), telemetri Server-Sent Events (SSE), dan mode terang/gelap berkontras tinggi.

---

## 📁 Struktur Proyek (Clean Architecture)

```
sistem-kamera-web/
│
├── main.py                     # Entry point utama aplikasi (FastAPI + Launcher)
├── requirements.txt            # Dependensi Python
├── .env.example                # Template konfigurasi environment
├── offline_buffer.db           # Basis data SQLite lokal untuk antrean offline
│
├── core/                       # 🧠 Engine Inti & Video Processing
│   ├── state.py                # Global state inspeksi (Singleton, Thread-Safe, Crash Recovery)
│   ├── detector.py             # Pipeline inferensi YOLOv8/ONNX, defect filter & DB logger
│   ├── stream.py               # Background stream worker, MJPEG encoder & camera watchdog
│   ├── rules.py                # Evaluasi aturan kelengkapan label & confidence threshold
│   └── camera.py               # Hardware camera discovery & OpenCV capture device factory
│
├── database/                   # 🗄️ Lapisan Basis Data (Data Persistence Layer)
│   ├── connection.py           # PostgreSQL connection pool & SQLAlchemy session factory
│   ├── models.py               # ORM Models (InspectionLog, Transaction, PartRule, User, AuditLog)
│   ├── migrations.py           # Auto-migration skema database saat startup
│   ├── seeder.py               # Data awal default (Admin, Operator, Pengawas, Hardware Camera)
│   └── security.py             # Enkripsi & verifikasi kata sandi (SHA-256 with Salt)
│
├── api/                        # 🌐 Backend REST API & Telemetry (FastAPI Layer)
│   ├── server.py               # Inisialisasi FastAPI, CORS, Security Headers, SPA Static Files
│   ├── auth.py                 # JWT Bearer Token, Role Verification, & Rate Limiting
│   └── routes/                 # Endpoint Rute API Terorganisir
│       ├── sison_inbound.py    # POST /api/start — Penerima trigger transaksi dari SISON
│       ├── operator_routes.py  # SSE Telemetry, status realtime, manual pass, clear popup
│       ├── model_routes.py     # Masterdata Model: upload .pt, convert .onnx, detail label
│       ├── rule_routes.py      # Setting aturan inspeksi & target coverage per part
│       ├── camera_routes.py    # Pemindaian perangkat kamera & switch sumber aktif
│       ├── inspection_routes.py# Riwayat log inspeksi & export data
│       ├── user_routes.py      # Manajemen akun user & otentikasi PIN/Password
│       ├── system_routes.py    # Status kesehatan sistem, audit trail & transaksi
│       ├── sison_config_routes.py # Konfigurasi webhook & callback URL SISON
│       └── auth_routes.py      # Login operator, pengawas, admin, dan logout
│
├── integrations/               # 🔗 Integrasi Eksternal & Offline Resilience
│   ├── sison_client.py         # HTTP Webhook Sender hasil inspeksi ke SISON (Auto-Retry 3x)
│   └── offline_sync.py         # SQLite Outbox Buffer & Background Sync Worker
│
├── web_admin/                  # 💻 Frontend React 18 / Vite Application
│   ├── src/
│   │   ├── pages/              # Halaman: Operator Inspection, Dashboard, Masterdata Model, dll.
│   │   ├── components/         # Komponen reusable (Sidebar, Navbar, HUD Cards, Modals)
│   │   ├── api/                # Axios Client Instance & API Interceptors
│   │   └── utils/              # Helper tema (Light/Dark), formatting, dan audio synth
│   └── dist/                   # Hasil build produksi React (di-serve langsung oleh FastAPI)
│
└── weights/                    # 📦 Direktori Berkas Bobot Model AI (.pt / .onnx)
```

---

## 🚀 Panduan Instalasi & Menjalankan Sistem

### 1. Prasyarat Sistem
* **Python**: Versi `3.10` atau lebih baru
* **Node.js**: Versi `18.x` atau `20.x` (LTS)
* **PostgreSQL**: Versi `14+`
* **Kamera**: USB Webcam / Industrial USB Camera UVC Compatible

### 2. Persiapan File Environment (`.env`)
Salin file template `.env.example` menjadi `.env`:
```bash
cp .env.example .env
```
Sesuaikan konfigurasi koneksi database dan kredensial server:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sugity_camera_db
DB_USER=postgres
DB_PASSWORD=user

DATABASE_URL=postgresql://postgres:user@localhost:5432/sugity_camera_db

SERVER_HOST=0.0.0.0
SERVER_PORT=8000
SECRET_KEY=sugity_super_secret_jwt_key_2026
ACCESS_TOKEN_EXPIRE_MINUTES=480
```

### 3. Instalasi Dependensi Python
```bash
pip install -r requirements.txt
```

### 4. Build Frontend Web Admin
```bash
cd web_admin
npm install
npm run build
cd ..
```

### 5. Jalankan Server
```bash
python main.py
```
> 💡 *Aplikasi akan otomatis menyalakan background stream worker, auto-migration database, sync worker, dan membuka browser default di `http://localhost:8000/`.*

---

## 👥 Hak Akses & Role Pengguna

| Role | Akses Fitur Utama |
| :--- | :--- |
| **Operator** | Layar Inspeksi Kiosk Realtime, Video Feed AI, Manual Pass/Reject, Konfirmasi NG Alarm, Riwayat Log Pribadi. |
| **Pengawas (Supervisor)** | Semua akses Operator + Override NG Approval (PIN), Monitoring Line, Live Dashboard, Akses History Global. |
| **Admin** | Semua akses Pengawas + **Masterdata Model AI** (Upload/Convert ONNX), Setting Rules, Manajemen User, Konfigurasi Kamera & SISON, Audit Logs. |

*Default Akun Awal:*
* **Admin**: `admin` / PIN: `1234` / Password: `admin`
* **Supervisor**: `spv` / PIN: `1234`
* **Operator**: `op` / PIN: `1234`

---

## 🔗 Spesifikasi API Integrasi SISON

### 1. Inbound: Pemicuan Transaksi Baru dari SISON
* **Endpoint**: `POST /api/start`
* **Header**: `Authorization: Bearer <API_KEY_SISON>`
* **Payload JSON**:
```json
{
  "id_trans": "TRX-20260814-001",
  "p_no": "74231-0K550-00",
  "lot": "LOT-8891",
  "unique_no": "UNQ-001",
  "p_name": "Front Panel Assy",
  "qty": 5
}
```

### 2. Outbound: Webhook Callback Hasil Inspeksi ke SISON
* **Endpoint Target**: Dikonfigurasi pada menu *Config Sison* (Default: `http://localhost:3000/api/kamera/callback`)
* **Payload JSON**:
```json
{
  "id_trans": "TRX-20260814-001",
  "status": 2
}
```
* **Keterangan Kode Nilai Status SISON**:
  * `status = 0`: **Standby** (Belum diproses / Menunggu transaksi).
  * `status = 1`: **Processing** (Sedang diproses / Running inspeksi).
  * `status = 2`: **OK / Completed** (Inspeksi selesai 100% dan seluruh part lolos uji).
  * `status = 98`: **NG / Reject** (Inspeksi ditolak / Part cacat).
  * `status = 99`: **Cancel** (Transaksi Kanban dibatalkan).

---

## 🛡️ Arsitektur Ketahanan & Fail-Safe

```
                      ┌────────────────────────────────────────┐
                      │             SERVER SISON               │
                      └──────────────────┬─────────────────────┘
                                         │ (POST /api/start)
                                         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    SISTEM KAMERA INSPEKSI AI (EDGE)                         │
│                                                                             │
│   ┌─────────────────────┐               ┌───────────────────────────────┐   │
│   │   OpenCV Capture    │ ── Frame ──>  │    YOLOv8 / ONNX Inference    │   │
│   │   (Watchdog Auto)   │               │   (Token Defect & Whitelist)  │   │
│   └─────────────────────┘               └───────────────┬───────────────┘   │
│                                                         │                   │
│                                              ┌──────────┴──────────┐        │
│                                              │ State Machine & HUD │        │
│                                              └──────────┬──────────┘        │
│                                                         │                   │
│                       ┌─────────────────────────────────┴─────────────┐     │
│                       ▼                                               ▼     │
│       ┌───────────────────────────────┐               ┌───────────────────┐ │
│       │     PostgreSQL Primary DB     │               │  SISON Callback   │ │
│       └───────────────┬───────────────┘               └─────────┬─────────┘ │
│                       │ (Jika DB Offline)                       │ (Timeout) │
│                       ▼                                         ▼           │
│       ┌───────────────────────────────────────────────────────────────────┐ │
│       │             SQLite Local Buffer (offline_buffer.db)               │ │
│       │         (Auto Flush & Retry saat Server / Jaringan Pulih)         │ │
│       └───────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📄 Lisensi & Kontribusi
Proyek ini dikembangkan khusus untuk sistem inspeksi visual manufaktur presisi tinggi. Seluruh hak cipta dilindungi.
