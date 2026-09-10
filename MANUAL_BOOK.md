# 📖 MANUAL BOOK & PANDUAN PENGGUNA SISTEM KAMERA INSPEKSI AI (QUALITY CONTROL)

Dokumentasi Resmi & Panduan Operasional Sistem Inspeksi Visual Komponen Berbasis AI (Computer Vision YOLOv8/ONNX) Terintegrasi SISON.

---

# DAFTAR ISI

1. [BAB 1: PENDAHULUAN](#bab-1-pendahuluan)
   - [1.1 Tujuan dan Ruang Lingkup](#11-tujuan-dan-ruang-lingkup)
   - [1.2 Istilah dan Singkatan](#12-istilah-dan-singkatan)
   - [1.3 Gambaran Arsitektur Sistem](#13-gambaran-arsitektur-sistem)
2. [BAB 2: INSTALASI DAN KONFIGURASI AWAL](#bab-2-instalasi-dan-konfigurasi-awal)
   - [2.1 Persyaratan Perangkat Keras & Lunak](#21-persyaratan-perangkat-keras--lunak)
   - [2.2 Clone Repository dari GitHub](#22-clone-repository-dari-github)
   - [2.3 Konfigurasi Environment Python & Dependensi](#23-konfigurasi-environment-python--dependensi)
   - [2.4 Setup & Konfigurasi Database PostgreSQL](#24-setup--konfigurasi-database-postgresql)
   - [2.5 Konfigurasi File .env](#25-konfigurasi-file-env)
   - [2.6 Build Frontend Web Admin (React/Vite)](#26-build-frontend-web-admin-reactvite)
   - [2.7 Menjalankan Sistem](#27-menjalankan-sistem)
   - [2.8 Akun Bawaan Default Sistem](#28-akun-bawaan-default-sistem)
3. [BAB 3: KONFIGURASI INTEGRASI SISON](#bab-3-konfigurasi-integrasi-sison)
   - [3.1 Alur Integrasi SISON ↔ Kamera](#31-alur-integrasi-sison--kamera)
   - [3.2 Mengatur Webhook Callback URL SISON](#32-mengatur-webhook-callback-url-sison)
   - [3.3 Menerbitkan & Menggunakan Service Token (30 Hari)](#33-menerbitkan--menggunakan-service-token-30-hari)
   - [3.4 Spesifikasi Endpoint API untuk Tim SISON](#34-spesifikasi-endpoint-api-untuk-tim-sison)
   - [3.5 Uji Konektivitas Callback Webhook (Test Ping)](#35-uji-konektivitas-callback-webhook-test-ping)
4. [BAB 4: PEMBUATAN MASTERDATA & MODEL AI (LABELING HINGGA BEST.PT)](#bab-4-pembuatan-masterdata--model-ai-labeling-hingga-bestpt)
   - [4.1 Persiapan Dataset Gambar Komponen](#41-persiapan-dataset-gambar-komponen)
   - [4.2 Standar Anotasi & Konvensi Labeling (Front & Rear)](#42-standar-anotasi--konvensi-labeling-front--rear)
   - [4.3 Pelatihan (Training) Model YOLOv8](#43-pelatihan-training-model-yolov8)
   - [4.4 Validasi & Export Model best.pt](#44-validasi--export-model-bestpt)
   - [4.5 Upload Model ke Web Admin & Konversi ONNX](#45-upload-model-ke-web-admin--konversi-onnx)
   - [4.6 Pengaturan Part Rule (Aturan Verifikasi Komponen)](#46-pengaturan-part-rule-aturan-verifikasi-komponen)
5. [BAB 5: PANDUAN PENGGUNA UNTUK OPERATOR](#bab-5-panduan-pengguna-untuk-operator)
   - [5.1 Login Operator & Pemilihan Shift](#51-login-operator--pemilihan-shift)
   - [5.2 Memahami Tampilan Layar Kiosk Inspeksi (Monitor 2)](#52-memahami-tampilan-layar-kiosk-inspeksi-monitor-2)
   - [5.3 Alur Kerja Inspeksi Normal](#53-alur-kerja-inspeksi-normal)
   - [5.4 Alur Inspeksi Multi-Sisi (Front ➔ Rear)](#54-alur-inspeksi-multi-sisi-front--rear)
   - [5.5 Fungsi Tombol Manual: Bypass OK & Reject NG](#55-fungsi-tombol-manual-bypass-ok--reject-ng)
   - [5.6 Riwayat Inspeksi Operator](#56-riwayat-inspeksi-operator)
   - [5.7 Logout Operator](#57-logout-operator)
6. [BAB 6: PANDUAN PENGGUNA UNTUK PENGAWAS / ADMIN](#bab-6-panduan-pengguna-untuk-pengawas--admin)
   - [6.1 Login Pengawas / Administrator](#61-login-pengawas--administrator)
   - [6.2 Live Dashboard Monitoring & Statistik Efisiensi](#62-live-dashboard-monitoring--statistik-efisiensi)
   - [6.3 Monitoring Line Produksi (Multi-Stasiun)](#63-monitoring-line-produksi-multi-stasiun)
   - [6.4 Riwayat Inspeksi & Ekspor Laporan](#64-riwayat-inspeksi--ekspor-laporan)
   - [6.5 Manajemen Masterdata Model AI](#65-manajemen-masterdata-model-ai)
   - [6.6 Pengaturan Rule Komponen](#66-pengaturan-rule-komponen)
   - [6.7 Manajemen Pengguna (User Management)](#67-manajemen-pengguna-user-management)
   - [6.8 Konfigurasi Hardware Kamera & Audio Buzzer](#68-konfigurasi-hardware-kamera--audio-buzzer)
   - [6.9 Status Kesehatan Sistem (System Health Telemetry)](#69-status-kesehatan-sistem-system-health-telemetry)
   - [6.10 Audit Logs Sistem](#610-audit-logs-sistem)
7. [BAB 7: TROUBLESHOOTING & PEMELIHARAAN SISTEM](#bab-7-troubleshooting--pemeliharaan-sistem)
   - [7.1 Masalah Kamera & Video Feed](#71-masalah-kamera--video-feed)
   - [7.2 Masalah Database & SQLite Offline Buffer](#72-masalah-database--sqlite-offline-buffer)
   - [7.3 Penanganan Listrik Padam / Crash Recovery](#73-penanganan-listrik-padam--crash-recovery)
   - [7.4 Masalah Integrasi & Token SISON](#74-masalah-integrasi--token-sison)
   - [7.5 Penanganan False Alarm AI / Deteksi Tidak Stabil](#75-penanganan-false-alarm-ai--deteksi-tidak-stabil)
   - [7.6 Prosedur Restart & Pemeliharaan Berkala](#76-prosedur-restart--pemeliharaan-berkala)

---

# BAB 1: PENDAHULUAN

## 1.1 Tujuan dan Ruang Lingkup
Dokumen Manual Book ini disusun sebagai panduan teknis dan operasional resmi bagi penerapan **Sistem Kamera Inspeksi AI & Quality Control**. Sistem ini dirancang untuk:
1. **Otomatisasi Verifikasi Kualitas Komponen:** Memastikan seluruh klip, baut, segel, pegas, dan komponen terpasang lengkap dengan posisi yang benar menggunakan inferensi kecerdasan buatan (*Deep Learning*).
2. **Eliminasi Kesalahan Manusia (*Zero Human Error*):** Mencegah part cacat (*Defect / NG*) terkirim ke proses perakitan berikutnya.
3. **Integrasi Penuh dengan SISON:** Mendukung pertukaran data dua arah secara otomatis (*Machine-to-Machine*) antara sistem MES/SISON dan stasiun kamera.
4. **Ketahanan Operasional Industri 24/7:** Dilengkapi kemampuan *Crash Recovery* otomatis saat listrik padam dan *SQLite Outbox Buffer* yang mencegah hilangnya data saat jaringan terputus.

---

## 1.2 Istilah dan Singkatan
| Istilah | Definisi |
| :--- | :--- |
| **SISON** | *Sistem Informasi Operasional Nasional* — Sistem MES/Server utama manufaktur yang mengontrol urutan pekerjaan dan data transaksi part. |
| **YOLOv8** | *You Only Look Once version 8* — Arsitektur model Computer Vision terkini untuk deteksi objek berkecepatan tinggi (*real-time*). |
| **ONNX** | *Open Neural Network Exchange* — Format model teroptimasi yang berjalan sangat cepat pada CPU/GPU industri. |
| **Service Token** | Token otentikasi Bearer jangka panjang (30 hari) tersimpan di database yang digunakan oleh server SISON untuk memanggil API kamera. |
| **Front (F) & Rear (R)** | Label penandaan sisi depan (*Front*) dan sisi belakang (*Rear*) pada komponen multi-sisi. |
| **OK / Pass** | Status bahwa seluruh komponen part telah lengkap terdeteksi dan memenuhi ambang batas kualitas (*Confidence Threshold*). |
| **NG / Reject** | *Not Good* — Status bahwa ada komponen yang hilang, salah posisi, atau rusak. |
| **Offline Buffer** | Mekanisme antrean data berbasis SQLite lokal (`offline_buffer.db`) yang menampung log dan status callback jika database PostgreSQL atau jaringan SISON sedang mengalami gangguan. |

---

## 1.3 Gambaran Arsitektur Sistem

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             LINE PRODUKSI OPERATOR                          │
├──────────────────────────────────────┬──────────────────────────────────────┤
│              MONITOR 1               │              MONITOR 2               │
│        (Aplikasi Sistem SISON)       │       (Kiosk Sistem Kamera AI)       │
│ • Operator Login Akun SISON          │ • Video Feed Real-time & Bounding Box│
│ • Scan Barcode Part Number           │ • Status Kelengkapan Komponen (OK/NG)│
│ • Menampilkan Alur Kerja Perakitan   │ • Audio Buzzer & Panduan Balik Sisi  │
└──────────────────┬───────────────────┴──────────────────▲───────────────────┘
                   │                                      │
                   │ 1. POST /api/start                   │ 2. Telemetry SSE &
                   │    (Header: Bearer Service Token)    │    Video MJPEG Stream
                   ▼                                      │
┌─────────────────────────────────────────────────────────┴───────────────────┐
│                      SISTEM KAMERA INSPEKSI AI (FASTAPI)                     │
├─────────────────────────────────────────────────────────────────────────────┤
│  • api/server.py        : REST API, SSE Server & Static Web Handler         │
│  • core/detector.py     : Inference Pipeline YOLOv8/ONNX & Rule Evaluation  │
│  • core/stream.py       : Background Frame Grabber & Hardware Watchdog      │
│  • core/state.py        : Global Thread-Safe State & Auto Crash Recovery    │
│  • database/models.py   : PostgreSQL ORM (InspectionLog, Transaction, User) │
│  • integrations/        : SISON Webhook Callback Sender & SQLite Buffer     │
└──────────────────┬──────────────────────────────────────────────────────────┘
                   │
                   │ 3. POST Callback Webhook: { "id_trans": "...", "status": 2 }
                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                             SERVER BACKEND SISON                            │
│                     (Menerima Status Lolos / Tolak Part)                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

# BAB 2: INSTALASI DAN KONFIGURASI AWAL

## 2.1 Persyaratan Perangkat Keras & Lunak
* **Perangkat Keras (Hardware):**
  * PC Industri / Laptop: Processor Intel Core i5/i7 (Generasi 8+) atau AMD Ryzen 5+.
  * RAM: Minimal 8 GB (Disarankan 16 GB).
  * Storage: SSD minimal 120 GB (Tersisa ruang kosong > 10 GB).
  * Kamera: USB Industrial Camera (Logitech C920/C930e atau industrial USB UVC Camera 1080p).
  * 2 Monitor Display (Monitor 1: SISON, Monitor 2: Kiosk Kamera).
* **Perangkat Lunak (Software):**
  * Sistem Operasi: Windows 10 / Windows 11 Pro 64-bit.
  * Python: Versi 3.10.x atau 3.11.x (Centang *"Add Python to PATH"* saat instalasi).
  * Node.js: Versi LTS (v18.x atau v20.x).
  * PostgreSQL: Versi 14, 15, atau 16.
  * Git for Windows.

---

## 2.2 Clone Repository dari GitHub
Buka **PowerShell** atau **Command Prompt**, lalu arahkan ke direktori proyek dan clone repository resmi:
```powershell
cd C:\Users\ghilman\Documents\Project
git clone https://github.com/scpackingdev/camera-inspection.git
cd camera-inspection
```

---

## 2.3 Konfigurasi Environment Python & Dependensi
1. Buat virtual environment Python agar dependensi terisolasi:
   ```powershell
   python -m venv venv
   .\venv\Scripts\Activate.ps1
   ```
2. Pasang seluruh pustaka dependensi Python:
   ```powershell
   pip install --upgrade pip
   pip install -r requirements.txt
   ```

---

## 2.4 Setup & Konfigurasi Database PostgreSQL
1. Buka **pgAdmin** atau terminal `psql`.
2. Buat database baru bernama `sugity_camera_db`:
   ```sql
   CREATE DATABASE sugity_camera_db;
   ```
3. Pastikan user PostgreSQL memiliki hak akses penuh terhadap database tersebut.
4. *(Catatan: Skema tabel dan data awal akan dibuat secara otomatis oleh sistem saat pertama kali dijalankan).*

---

## 2.5 Konfigurasi File `.env`
Salin file template `.env.example` menjadi `.env`:
```powershell
copy .env.example .env
```
Buka file `.env` dan sesuaikan parameter berikut:
```env
# --- BASIS DATA POSTGRESQL ---
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sugity_camera_db
DB_USER=postgres
DB_PASSWORD=user_password_anda

# URL Koneksi Database
DATABASE_URL=postgresql://postgres:user_password_anda@localhost:5432/sugity_camera_db

# --- SERVER FASTAPI ---
SERVER_HOST=0.0.0.0
SERVER_PORT=8000

# --- KEAMANAN & TOKEN JWT ---
SECRET_KEY=sugity_super_secret_jwt_key_2026
ACCESS_TOKEN_EXPIRE_MINUTES=480
```

---

## 2.6 Build Frontend Web Admin (React/Vite)
Aplikasi antarmuka pengguna berbasis React 18 / Vite. Jalankan build produksi agar bundle file statis tersaji optimal melalui server FastAPI:
```powershell
cd web_admin
npm install
npm run build
cd ..
```

---

## 2.7 Menjalankan Sistem
Jalankan entry point utama aplikasi:
```powershell
python main.py
```
* **Apa yang terjadi saat dijalankan?**
  1. Melakukan inisialisasi koneksi database PostgreSQL dan migrasi skema tabel secara otomatis.
  2. Melakukan seeding data awal (Akun default, suara audio AI, auto-detect hardware kamera USB).
  3. Memulai worker background pemrosesan kamera MJPEG stream dan sinkronisasi SQLite buffer.
  4. Menjalankan server web FastAPI pada port `8000`.
  5. Otomatis membuka web browser ke alamat `http://localhost:8000/`.

---

## 2.8 Akun Bawaan Default Sistem
Saat database pertama kali diinisialisasi, sistem otomatis menyediakan akun bawaan:
* **Role Pengawas / Admin:**
  * **Username:** `pengawas`
  * **Password / PIN:** `1234`
  * *(Sangat disarankan segera mengganti password bawaan setelah login pertama kali di menu Manajemen Pengguna).*

---

# BAB 3: KONFIGURASI INTEGRASI SISON

## 3.1 Alur Integrasi SISON ↔ Kamera
Integrasi bekerja menggunakan arsitektur **Machine-to-Machine**:
1. **Trigger Mulai (SISON ➔ Kamera):** Server SISON memanggil `POST http://<IP_KAMERA>:8000/api/start` dengan menyertakan **Bearer Service Token** di header HTTP.
2. **Proses Inspeksi:** Kamera menerima Part Number, mencocokkan model AI `.pt` yang sesuai, dan memverifikasi kelengkapan komponen.
3. **Hasil Callback (Kamera ➔ SISON):** Kamera mengirimkan HTTP `POST` ke Callback URL SISON dengan payload kode status: `2` (OK), `98` (NG / Cacat), atau `99` (Cancel).

---

## 3.2 Mengatur Webhook Callback URL SISON
1. Login sebagai **Pengawas / Admin** di Web Admin.
2. Buka menu **Config Sison** (`/sison-config`).
3. Pada card **Konfigurasi Webhook Callback SISON**, masukkan alamat URL server SISON yang bertugas menerima hasil inspeksi.
   * *Contoh:* `http://192.168.1.100:3000/api/kamera/callback`
4. Klik tombol **Simpan Callback URL**.

---

## 3.3 Menerbitkan & Menggunakan Service Token (30 Hari)
Untuk menjaga keamanan API tanpa membebani operator di line produksi:
1. Masuk ke halaman **Config Sison** di Web Admin.
2. Pada card **Service Token Integrasi SISON**, klik tombol **Generate Service Token**.
3. Sistem akan menerbitkan token bertanda tangan kriptografi aman yang berlaku selama **30 Hari** dan otomatis tersimpan di database.
4. Klik tombol **Salin Token**.
5. Berikan token tersebut kepada tim pengembang SISON untuk dipasang pada konfigurasi server SISON mereka.

> [!TIP]
> Di antarmuka Web Admin terdapat indikator masa aktif token (*Token Aktif*, *Segera Kedaluwarsa*, atau *Kedaluwarsa*). Admin cukup mengklik tombol *Generate Token Baru* sebulan sekali untuk memperbarui masa aktif.

---

## 3.4 Spesifikasi Endpoint API untuk Tim SISON

### A. Endpoint Memulai Transaksi: `POST /api/start`
* **URL:** `http://<IP_PC_KAMERA>:8000/api/start`
* **Headers:**
  ```http
  Content-Type: application/json
  Authorization: Bearer <SERVICE_TOKEN_30_HARI>
  ```
* **Request Payload (JSON):**
  ```json
  {
    "id_trans": "TRX-20260821-0001",
    "p_no": "74231-0K550-00",
    "lot": "LOT-8821",
    "unique_no": "UNQ-9901",
    "p_name": "Armrest Sub-Assy Door",
    "qty": 1
  }
  ```
* **Keterangan Parameter:**
  * `id_trans` (String, Wajib): ID Transaksi unik dari sistem SISON.
  * `p_no` (String, Wajib): Part Number yang akan diinspeksi. Sistem kamera akan otomatis me-load model AI yang sesuai dengan nomor part ini.
  * `qty` (Integer, Wajib): Target jumlah part yang diinspeksi.
  * `lot`, `unique_no`, `p_name` (String, Opsional): Informasi tambahan untuk pencatatan log.

### B. Format Webhook Callback Hasil (Kamera ➔ SISON)
* **Method:** `POST` ke Callback Webhook URL yang telah dikonfigurasi.
* **Payload JSON:**
  ```json
  {
    "id_trans": "TRX-20260821-0001",
    "status": 2
  }
  ```
* **Keterangan Standar Kode Status SISON:**
  * `status: 0` ➔ **Standby** (Belum diproses / Menunggu transaksi).
  * `status: 1` ➔ **Processing** (Sedang diproses / Running inspeksi).
  * `status: 2` ➔ **OK / PASS** (Inspeksi selesai 100% dan seluruh part lolos standar).
  * `status: 98` ➔ **NG / REJECT** (Komponen cacat / ditolak).
  * `status: 99` ➔ **CANCEL** (Transaksi Kanban dibatalkan).

---

## 3.5 Uji Konektivitas Callback Webhook (Test Ping)
Pada halaman **Config Sison**, klik tombol **🧪 Uji Koneksi**. Sistem akan mengirimkan paket uji ke server SISON dan menampilkan latensi jaringan (ms) serta kode status respon HTTP secara langsung di layar.

---

# BAB 4: PEMBUATAN MASTERDATA & MODEL AI (LABELING HINGGA BEST.PT)

## 4.1 Persiapan Dataset Gambar Komponen
1. **Pengambilan Foto:**
   * Ambil foto part langsung di bawah pencahayaan stasiun kamera kerja.
   * Ambil foto dari berbagai variasi posisi part (geser sedikit ke kiri/kanan, rotasi sudut 5-10 derajat).
   * Ambil foto part kondisi **Lengkap (OK)** dan kondisi **Cacat / Komponen Kurang (NG)**.
   * Jumlah dataset yang direkomendasikan: Minimal **100 – 300 foto per part number**.
2. **Pemisahan Gambar Sisi:**
   * Foto tampak depan (*Front Side*).
   * Foto tampak belakang (*Rear Side*).

---

## 4.2 Standar Anotasi & Konvensi Labeling (Front & Rear)
Gunakan aplikasi anotasi standar seperti **Roboflow**, **LabelImg**, atau **CVAT** dengan format ekspor **YOLOv8 PyTorch (TXT)**.

### Aturan Konvensi Penamaan Label (Wajib Diikuti):
Sistem kamera menggunakan algoritma parsing otomatis berbasis prefix nama label:
1. **Komponen Tampak Depan:** Awali dengan prefix **`F-`**
   * *Contoh:* `F-KLIP-PUTIH`, `F-BAUT-M6`, `F-SEAL-HITAM`, `F-LABEL-BARCODE`
2. **Komponen Tampak Belakang:** Awali dengan prefix **`R-`**
   * *Contoh:* `R-KLIP-KUNING`, `R-SPRING-BESI`, `R-CONNECTOR-4PIN`
3. **Komponen Tanpa Sisi Khusus:**
   * Jika part hanya memiliki 1 sisi inspeksi tunggal, penamaan label bebas (misal: `KLIP-1`, `SCREW-A`).

> [!IMPORTANT]
> Konsistensi penamaan label `F-` dan `R-` sangat penting agar sistem kamera dapat secara otomatis memandu operator membalik part saat inspeksi multi-sisi.

---

## 4.3 Pelatihan (Training) Model YOLOv8
Gunakan environment Python dengan pustaka `ultralytics` untuk melatih model:
```powershell
pip install ultralytics
```
Jalankan script training (atau via terminal CLI):
```powershell
yolo detect train data=dataset_part.yaml model=yolov8n.pt epochs=100 imgsz=640 batch=16 name=model_part_74231
```
* **Rekomendasi Parameter:**
  * Base Model: `yolov8n.pt` (Nano - Sangat cepat untuk CPU) atau `yolov8s.pt` (Small - Lebih akurat).
  * Epochs: `80 - 150 epochs`.
  * Image Size: `640`.

---

## 4.4 Validasi & Export Model best.pt
Setelah proses training selesai, file bobot model terbaik akan tersimpan di:
`runs/detect/model_part_74231/weights/best.pt`

Ubah nama file model sesuai dengan **Part Number** produk yang bersangkutan:
* *Contoh:* Jika Part Number adalah `74231-0K550-00`, ubah nama file menjadi:
  `74231-0K550-00.pt`

---

## 4.5 Upload Model ke Web Admin & Konversi ONNX
1. Buka Web Admin ➔ Menu **Masterdata Model** (`/models`).
2. Klik tombol **Upload Model .pt**.
3. Masukkan Part Number dan pilih file `.pt` yang telah disiapkan.
4. Sistem akan secara otomatis:
   * Menyimpan model ke direktori `weights/`.
   * Mengekstrak seluruh daftar nama class/label yang ada di dalam model.
   * Melakukan kompilasi optimasi ke format **ONNX Runtime Engine (`.onnx`)** untuk akselerasi inferensi CPU.

---

## 4.6 Pengaturan Part Rule (Aturan Verifikasi Komponen)
Setelah model diupload, buat aturan pengecekan komponen:
1. Buka menu **Setting Rule** (`/rules`).
2. Pilih Part Number yang baru ditambahkan.
3. Atur parameter untuk setiap komponen:
   * **Sisi:** Tentukan apakah komponen masuk sisi `F` (Front) atau `R` (Rear).
   * **Min Confidence:** Ambang batas keyakinan deteksi minimal (Default: `0.70` atau 70%).
   * **Target Coverage:** Jumlah kemunculan komponen yang wajib terdeteksi (Default: `1.0`).
4. Klik **Simpan Aturan**.

---

# BAB 5: PANDUAN PENGGUNA UNTUK OPERATOR

## 5.1 Login Operator & Pemilihan Shift
1. Pada **Monitor 2**, buka halaman login (`http://localhost:8000/login`).
2. Masukkan **Username**, **PIN / Password**, dan pilih **Shift Kerja** (Shift 1, Shift 2, atau Shift 3).
3. Klik tombol **Masuk**.
4. Sistem akan otomatis membuka antarmuka **Kiosk Inspeksi Operator** dalam mode fullscreen.

---

## 5.2 Memahami Tampilan Layar Kiosk Inspeksi (Monitor 2)
Layar Kiosk dirancang ergonomis dengan Heads-Up Display (HUD):
* **Panel Kiri (Live Video Feed):**
  * Menampilkan siaran kamera langsung.
  * Bounding box berwarna hijau menunjukkan komponen yang terdeteksi valid beserta skor keyakinannya.
* **Panel Kanan (Status & Checklist Komponen):**
  * **Header:** Menampilkan ID Transaksi aktif, Part Number, Operator, dan Shift.
  * **Counter QTY:** Menampilkan progres part yang telah selesai (misal: `1 / 10 PCS`).
  * **Side Indicator:** Menunjukkan sisi yang sedang diinspeksi (`SISI DEPAN [F]` atau `SISI BELAKANG [R]`).
  * **Component Checklist:** Daftar komponen yang wajib ada. Kotak akan berubah menjadi hijau centang saat komponen terdeteksi.

---

## 5.3 Alur Kerja Inspeksi Normal
1. Operator men-scan barcode part di aplikasi SISON (Monitor 1).
2. Monitor 2 (Kamera) otomatis aktif dan menampilkan status `RUNNING`.
3. Letakkan part di bawah sorotan kamera.
4. AI mendeteksi kelengkapan seluruh komponen secara real-time.
5. Saat semua komponen lengkap:
   * Indikator berubah menjadi hijau `PASS / OK`.
   * Suara audio konfirmasi berbunyi.
   * Counter QTY bertambah secara otomatis.
   * Kamera mengirimkan status sukses ke sistem SISON.

---

## 5.4 Alur Inspeksi Multi-Sisi (Front ➔ Rear)
Untuk part yang memiliki dua sisi inspeksi:
1. Letakkan part pada posisi **Sisi Depan (Front)** terlebih dahulu.
2. Setelah seluruh komponen sisi depan lengkap, layar akan memunculkan popup **"BALIK PART KE SISI BELAKANG (REAR)"** disertai instruksi audio.
3. Balik part ke sisi belakang di bawah kamera.
4. AI secara otomatis melanjutkan verifikasi komponen sisi belakang.
5. Setelah sisi belakang lengkap, part dinyatakan **OK Penuh**.

---

## 5.5 Fungsi Tombol Manual: Bypass OK & Reject NG
Jika terjadi kondisi khusus pada area kerja:
* **Tombol "Manual Pass (OK)":**
  * Digunakan jika komponen secara fisik terpasang sempurna namun terhalang bayangan atau pantulan cahaya ekstrim.
  * Memerlukan konfirmasi PIN Pengawas untuk keamanan audit kualitas.
  * Sistem mencatat log dengan metode `MANUAL`.
* **Tombol "Reject (NG)":**
  * Digunakan jika operator menemukan cacat fisik (misal: part retak, tergores, atau klip patah).
  * Sistem langsung menghentikan transaksi, membunyikan alarm peringatan NG, dan mengirimkan status `NG (2)` ke server SISON.

---

## 5.6 Riwayat Inspeksi Operator
Operator dapat melihat ringkasan pekerjaan shift yang sedang berjalan melalui menu **History Operator** untuk memastikan seluruh target transaksi harian tercapai tanpa ada part yang tertinggal.

---

## 5.7 Logout Operator
Setelah shift berakhir, klik tombol profil operator di pojok kanan atas, lalu pilih **Logout**. Sesi kerja operator akan ditutup secara rapi di database audit log.

---

# BAB 6: PANDUAN PENGGUNA UNTUK PENGAWAS / ADMIN

## 6.1 Login Pengawas / Administrator
1. Buka alamat `http://<IP_KAMERA>:8000/login`.
2. Masukkan kredensial akun Pengawas/Admin.
3. Anda akan diarahkan ke **Admin Dashboard & Management Console**.

---

## 6.2 Live Dashboard Monitoring & Statistik Efisiensi
Halaman Dashboard menyajikan metrik operasional secara komprehensif:
* **Kartu Statistik Utama:** Total Part Diinspeksi, Total OK, Total NG, dan Rasio Lolos (*Pass Rate %*).
* **AI Quality Efficiency:** Persentase deteksi murni AI vs intervensi Manual Bypass.
* **Grafik Tren Produksi per Jam:** Memantau throughput part per jam kerja.
* **Tabel Transaksi Terkini:** Status real-time transaksi yang sedang berjalan di stasiun kamera.

---

## 6.3 Monitoring Line Produksi (Multi-Stasiun)
Menu **Monitoring Line** (`/line-monitoring`) menampilkan status stasiun kamera secara terpusat untuk kebutuhan monitor display di ruang kontrol atau TV monitoring pabrik (*Andon Display*).

---

## 6.4 Riwayat Inspeksi & Ekspor Laporan
1. Buka menu **History Inspeksi** (`/history`).
2. Filter data berdasarkan rentang tanggal, status (OK/NG/MANUAL), atau Part Number.
3. Klik tombol **Export Excel / CSV** untuk mengunduh laporan audit kualitas berkala.

---

## 6.5 Manajemen Masterdata Model AI
* Buka menu **Masterdata Model** (`/models`).
* Melihat daftar model `.pt` dan `.onnx` yang aktif.
* Menghapus atau mengunggah versi model AI yang telah diperbarui (*Retrained Model*).
* Sistem mendukung *Zero-Downtime Hot Reload* (model langsung aktif tanpa perlu merestart server).

---

## 6.6 Pengaturan Rule Komponen
* Buka menu **Setting Rule** (`/rules`).
* Menyesuaikan nilai *Confidence Threshold* per komponen jika diperlukan penyesuaian sensitivitas deteksi di lapangan.

---

## 6.7 Manajemen Pengguna (User Management)
1. Buka menu **User Manajemen** (`/users`).
2. **Tambah User Baru:**
   * Masukkan Username, NIK Karyawan, Nama Lengkap, dan Password/PIN.
   * Tentukan Role: `Operator`, `Pengawas`, atau `Admin`.
3. **Reset Password / Nonaktifkan User:** Pengawas dapat mengatur ulang PIN operator atau menonaktifkan akun karyawan yang sudah tidak bertugas.

---

## 6.8 Konfigurasi Hardware Kamera & Audio Buzzer
* **Menu Konfigurasi Kamera:**
  * Memindai seluruh port USB perangkat kamera yang tercolok (*Auto-Scan*).
  * Memilih index kamera aktif atau resolusi capture stream.
* **Menu Audio & Suara (`/audio-config`):**
  * Mengaktifkan/menonaktifkan suara buzzer.
  * Mengatur tingkat volume suara.
  * Mengganti jenis suara audio untuk kondisi: *Part OK*, *Balik Sisi*, *Part NG*, dan *Selesai Transaksi*.

---

## 6.9 Status Kesehatan Sistem (System Health Telemetry)
Menu **Status Sistem** (`/system-health`) menampilkan metrik kesehatan PC secara berkala:
* Penggunaan CPU & RAM.
* Sisa kapasitas harddisk (disertai alarm peringatan jika sisa storage < 10%).
* Latensi koneksi basis data PostgreSQL.
* Jumlah antrean data yang belum tersinkronisasi pada *Offline Buffer*.

---

## 6.10 Audit Logs Sistem
Menu **Audit Logs** (`/logs`) mencatat seluruh rekaman aktivitas krusial sistem (siapa yang login, perubahan aturan rule, upload model AI, dan aksi bypass) untuk menjamin transparansi operasional.

---

# BAB 7: TROUBLESHOOTING & PEMELIHARAAN SISTEM

## 7.1 Masalah Kamera & Video Feed

| Gejala Masalah | Penyebab Umum | Solusi Perbaikan |
| :--- | :--- | :--- |
| **Layar video hitam / "Kamera Terputus"** | Kabel USB longgar atau port USB kekurangan daya listrik. | 1. Cabut dan tancapkan kembali kabel USB kamera ke port USB 3.0 (warna biru).<br>2. Buka menu Admin ➔ Konfigurasi Kamera ➔ Klik **Scan Kamera Ulang** ➔ Pilih perangkat aktif. |
| **Video feed patah-patah / FPS rendah** | Beban CPU tinggi atau port USB menggunakan hub kecepatan rendah. | 1. Pastikan kamera dicolok langsung ke motherboard PC (bukan melalui USB Splitter pasif).<br>2. Pastikan model ONNX aktif untuk inferensi ringan. |

---

## 7.2 Masalah Database & SQLite Offline Buffer

| Gejala Masalah | Penyebab Umum | Solusi Perbaikan |
| :--- | :--- | :--- |
| **Peringatan "Failover / Offline Buffer Active"** | Layanan database PostgreSQL lokal berhenti atau service mati. | 1. Buka Windows Services (`services.msc`) ➔ Cari `postgresql-x64-xx` ➔ Klik **Start / Restart**.<br>2. Sistem secara otomatis akan menguras dan menyinkronkan seluruh log di `offline_buffer.db` ke PostgreSQL begitu database hidup kembali. |

---

## 7.3 Penanganan Listrik Padam / Crash Recovery
Jika terjadi mati listrik mendadak di tengah proses inspeksi:
1. Hidupkan kembali PC stasiun kerja.
2. Jalankan aplikasi via `python main.py`.
3. Sistem secara otomatis menjalankan modul **Crash Recovery**:
   * Membaca transaksi terakhir yang belum selesai dari database.
   * Mengembalikan counter sisa QTY dan status part persis sebelum listrik padam.
   * Operator dapat langsung melanjutkan sisa part tanpa perlu mengulang dari part nomor satu.

---

## 7.4 Masalah Integrasi & Token SISON

| Gejala Masalah | Penyebab Umum | Solusi Perbaikan |
| :--- | :--- | :--- |
| **SISON menerima respon error HTTP 401 Unauthorized** | Service Token SISON telah kedaluwarsa (> 30 hari) atau salah ketik. | 1. Buka Web Admin ➔ Menu **Config Sison**.<br>2. Klik tombol **Generate Token Baru**.<br>3. Salin token baru dan perbarui konfigurasi di server SISON. |
| **Hasil inspeksi tidak masuk ke SISON (Callback Timeout)** | IP Server SISON berubah atau firewall memblokir port. | 1. Buka menu Config Sison ➔ Uji tombol **🧪 Uji Koneksi Callback**.<br>2. Pastikan alamat IP dan Port SISON benar serta dapat di-ping melalui Command Prompt. |

---

## 7.5 Penanganan False Alarm AI / Deteksi Tidak Stabil

| Gejala Masalah | Penyebab Umum | Solusi Perbaikan |
| :--- | :--- | :--- |
| **Komponen ada tetapi kotak deteksi tidak muncul** | Pencahayaan stasiun kerja redup atau sudut part terlalu miring. | 1. Pastikan lampu penerangan LED inspeksi menyala terang dan merata.<br>2. Buka menu **Setting Rule** ➔ Turunkan sedikit nilai *Min Confidence* (misal dari `0.75` menjadi `0.65`). |
| **Komponen salah terdeteksi sebagai label lain** | Nilai threshold terlalu rendah atau variasi dataset training kurang. | 1. Naikkan nilai *Min Confidence* pada komponen terkait ke `0.80`.<br>2. Tambahkan sampel foto kondisi tersebut ke dataset training, lalu lakukan retrain model YOLOv8. |

---

## 7.6 Prosedur Restart & Pemeliharaan Berkala
* **Pembersihan Lensa Kamera:** Bersihkan lensa kamera menggunakan kain microfiber kering seminggu sekali untuk mencegah debu pabrik mengaburkan kualitas gambar.
* **Restart Mingguan:** Lakukan restart PC mingguan pada saat pergantian hari libur produksi untuk menyegarkan memori RAM dan cache sistem operasi.
* **Backup Database:** Lakukan backup berkala pada database `sugity_camera_db` menggunakan perintah:
  ```powershell
  pg_dump -U postgres -d sugity_camera_db -F c -b -v -f "C:\backup\kamera_db_backup.dump"
  ```

---

*Manual Book Sistem Kamera Inspeksi AI — Versi 2.0 (Clean Architecture Edition)*
