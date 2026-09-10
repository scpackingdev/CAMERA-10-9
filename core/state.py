import threading
import time

class SystemState:
    """Thread-safe singleton state untuk sinkronisasi data antar thread, modul, & stasiun kerja."""
    def __init__(self):
        self.lock = threading.RLock()
        self.status: str = "STANDBY"
        self.id_trans: str = ""
        self.p_no: str = ""
        self.qty: int = 0
        self.target_qty: int = 0
        self.aturan_sisi: list = []
        self.daftar_sisi: list = []
        self.progress_sisi: int = 0
        self.cooldown_until: float = 0.0
        self.inspection_mode: str = "AI"  # "AI" or "MANUAL"
        self.part_ok_popup: bool = False
        self.front_ok_notif_ts: float = 0.0  # Timestamp kapan sisi Depan (Front) berhasil OK — bukan bool, agar tidak dikonsumsi habis oleh 1 SSE call
        self.current_side: str = "F"      # "F" = Front, "R" = Rear
        self.flip_part_popup: bool = False
        self.last_inspection_details: dict = {}
        self.live_metrics: dict = {}
        self.ok_start_time: float = 0.0
        self.hold_duration: float = 1.2
        self.ng_start_time: float = 0.0
        self.ng_hold_duration: float = 1.0
        self.completed_time: float = 0.0
        self.operator_name: str = ""       # Nama operator utama
        self.operator_username: str = ""   # Username operator utama
        self.operator_role: str = ""       # Role operator utama
        self.operator_shift: str = "Shift 1"
        self.operator_login_time: float = 0.0
        
        # Multi-Station & Multi-Operator Session Registry
        self.active_operator_sessions: dict = {}

    def update_operator_heartbeat(self, username: str, fullname: str, role: str, client_ip: str = "127.0.0.1", station_id: str = "STATION-01"):
        """Perbarui sesi aktif operator per pengguna/komputer."""
        with self.lock:
            now = time.time()
            if username not in self.active_operator_sessions:
                login_ts = now
            else:
                login_ts = self.active_operator_sessions[username].get('login_time', now)

            self.active_operator_sessions[username] = {
                "username": username,
                "fullname": fullname or username,
                "role": role or "operator",
                "login_time": login_ts,
                "last_seen": now,
                "client_ip": client_ip,
                "station_id": station_id
            }

            # Set sebagai operator utama jika belum ada
            if not self.operator_name:
                self.operator_name = fullname or username
                self.operator_username = username
                self.operator_role = role
                self.operator_login_time = login_ts

    def remove_operator_session(self, username: str):
        """Hapus operator dari sesi aktif saat logout."""
        with self.lock:
            if username in self.active_operator_sessions:
                del self.active_operator_sessions[username]
            if self.operator_username == username:
                if self.active_operator_sessions:
                    next_user = next(iter(self.active_operator_sessions.values()))
                    self.operator_name = next_user["fullname"]
                    self.operator_username = next_user["username"]
                    self.operator_role = next_user["role"]
                    self.operator_login_time = next_user["login_time"]
                else:
                    self.operator_name = ""
                    self.operator_username = ""
                    self.operator_role = ""
                    self.operator_login_time = 0.0

    def get_all_active_operators(self, timeout_seconds: float = 60.0) -> list:
        """Mengembalikan daftar seluruh operator yang sedang aktif/online (sesi maksimal 8 jam)."""
        with self.lock:
            now = time.time()
            active_list = []
            for u, data in list(self.active_operator_sessions.items()):
                # Jika sesi operator sudah lebih dari 8 jam (28800 detik), hapus sesi (kedaluwarsa)
                login_time = data.get("login_time", now)
                if (now - login_time) > (8 * 3600):
                    del self.active_operator_sessions[u]
                    if self.operator_username == u:
                        self.operator_name = ""
                        self.operator_username = ""
                        self.operator_role = ""
                        self.operator_login_time = 0.0
                    continue
                if now - data.get("last_seen", 0) <= timeout_seconds:
                    active_list.append(data)
            return active_list

    def reset_to_standby(self):
        """Mereset status mesin ke STANDBY untuk menyambut transaksi SISON berikutnya."""
        with self.lock:
            self.status = "STANDBY"
            self.id_trans = ""
            self.p_no = ""
            self.qty = 0
            self.target_qty = 0
            self.aturan_sisi = []
            self.daftar_sisi = []
            self.progress_sisi = 0
            self.current_side = "F"
            self.completed_time = 0.0
            self.inspection_mode = "AI"
            self.part_ok_popup = False
            self.front_ok_notif_ts = 0.0
            self.flip_part_popup = False
            self.last_inspection_details = {}
            self.live_metrics = {}
            self.ok_start_time = 0.0
            self.ng_start_time = 0.0

    def recover_pending_inspection_state(self):
        """
        Auto Crash Recovery & State Persistence:
        Memeriksa apakah ada transaksi inspeksi yang masih aktif / belum selesai (status == 0)
        sebelum server mati/restart, lalu memulihkan state inspeksi secara otomatis tanpa mengulang dari awal.
        """
        try:
            from database import SessionLocal, Transaction, InspectionLog, PartRule
            with SessionLocal() as db:
                # Cari transaksi status 1 (IN_PROGRESS / PROCESSING) yang paling baru
                pending_trans = db.query(Transaction).filter(Transaction.status == 1).order_by(Transaction.id.desc()).first()
                if not pending_trans:
                    return

                id_trans = pending_trans.id_trans
                p_no = pending_trans.p_no
                target_qty = pending_trans.target_qty or 1

                # Hitung jumlah part yang sudah lolos OK
                completed_count = db.query(InspectionLog).filter(
                    InspectionLog.id_trans == id_trans,
                    InspectionLog.detection_status == "OK"
                ).count()

                # Ambil operator terakhir yang bertugas
                last_log = db.query(InspectionLog).filter(InspectionLog.id_trans == id_trans).order_by(InspectionLog.id.desc()).first()
                last_op = last_log.operator_name if last_log and last_log.operator_name else "Operator"

                # Ambil aturan sisi part
                db_rules = db.query(PartRule).filter(PartRule.p_no == p_no).order_by(PartRule.id.asc()).all()
                aturan_sisi = [{
                    "sisi": r.sisi,
                    "nama_komponen": r.nama_komponen,
                    "qty": r.qty or 1,
                    "min_confidence": r.min_confidence,
                    "avg_confidence": r.avg_confidence,
                    "min_coverage": r.min_coverage
                } for r in db_rules]

                if completed_count >= target_qty:
                    # Transaksi sebenarnya sudah terpenuhi sebelum crash, tandai selesai OK (2)
                    pending_trans.status = 2
                    db.commit()
                    print(f"[CRASH RECOVERY] Transaksi {id_trans} (Part {p_no}) sudah selesai ({completed_count}/{target_qty} PCS).")
                    return

                remaining_qty = target_qty - completed_count

                with self.lock:
                    self.status = "RUNNING"
                    self.id_trans = id_trans
                    self.p_no = p_no
                    self.target_qty = target_qty
                    self.qty = remaining_qty
                    self.current_side = "F"
                    self.aturan_sisi = aturan_sisi
                    self.operator_name = last_op
                    self.part_ok_popup = False
                    self.front_ok_notif_ts = 0.0
                    self.flip_part_popup = False
                    self.ok_start_time = 0.0

                print("=" * 65)
                print(f"[CRASH RECOVERY] 🛡️ MEMULIHKAN PROGRESS INSPEKSI SEBELUM SERVER CRASH / RESTART")
                print(f"  • ID Transaksi : {id_trans}")
                print(f"  • Part Number  : {p_no}")
                print(f"  • Progress     : Melanjutkan dari Part ke-{completed_count + 1} (Sisa: {remaining_qty}/{target_qty} PCS)")
                print(f"  • Operator     : {last_op}")
                print("=" * 65)
        except Exception as e:
            print(f"[CRASH RECOVERY WARN] Gagal menjalankan crash recovery: {e}")

state = SystemState()
