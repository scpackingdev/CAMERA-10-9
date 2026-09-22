import time
import requests
from database import SessionLocal, SisonConfig

def get_callback_url() -> str:
    """Baca URL callback Sison dari DB. Fallback ke default jika error."""
    try:
        with SessionLocal() as db:
            cfg = db.query(SisonConfig).first()
            return cfg.callback_url if cfg and cfg.callback_url else "http://localhost:3000/api/kamera/callback"
    except Exception:
        return "http://localhost:3000/api/kamera/callback"

class SisonSender:
    @staticmethod
    def send_callback(id_trans: str, status: int = 2, max_retries: int = 3, retry_delay: float = 1.0) -> dict:
        """
        Mengirim status hasil inspeksi ke server SISON dengan Auto-Retry hingga 3x:
        - 0  = Antri / Standby (Belum diproses)
        - 1  = Progress (Sedang diproses / Running)
        - 2  = OK / Completed (Inspeksi selesai & lolos semua part)
        - 98 = Cancel (Transaksi Kanban dibatalkan / Cancel Kanban)
        - 99 = NG (Inspeksi ditolak / Part cacat / Reject)
        """
        _STATUS_LABEL = {0: "Standby", 1: "Progress", 2: "OK", 98: "Cancel", 99: "NG"}
        status_label = _STATUS_LABEL.get(status, f"Unknown({status})")

        url = get_callback_url()
        payload = {"id_trans": id_trans, "status": status}
        last_error = None

        print(f"[SISON] ══════════════════════════════════════")
        print(f"[SISON] Mulai kirim callback ke SISON")
        print(f"[SISON] URL     : {url}")
        print(f"[SISON] Payload : id_trans={id_trans}, status={status} ({status_label})")
        print(f"[SISON] Max retry: {max_retries}x, delay: {retry_delay}s")
        print(f"[SISON] ══════════════════════════════════════")

        for attempt in range(1, max_retries + 1):
            print(f"[SISON] >> Percobaan {attempt}/{max_retries} ...")
            try:
                res = requests.post(url, json=payload, timeout=2.5)
                response_body = res.text[:300] if res.text else "(kosong)"
                if res.status_code in [200, 201, 204]:
                    print(f"[SISON] ✓ BERHASIL (Percobaan {attempt}/{max_retries})")
                    print(f"[SISON]   HTTP Status : {res.status_code}")
                    print(f"[SISON]   Response    : {response_body}")
                    return {"success": True, "attempt": attempt, "status_code": res.status_code}
                else:
                    last_error = f"HTTP {res.status_code}: {res.text[:200]}"
                    print(f"[SISON] ✗ GAGAL (Percobaan {attempt}/{max_retries})")
                    print(f"[SISON]   HTTP Status : {res.status_code}")
                    print(f"[SISON]   Response    : {response_body}")
            except Exception as e:
                last_error = str(e)
                print(f"[SISON] ✗ ERROR (Percobaan {attempt}/{max_retries})")
                print(f"[SISON]   Exception   : {e}")

            if attempt < max_retries:
                print(f"[SISON]   Menunggu {retry_delay}s sebelum retry ...")
                time.sleep(retry_delay)

        print(f"[SISON] ✗✗ OFFLINE — Gagal setelah {max_retries}x percobaan")
        print(f"[SISON]    URL      : {url}")
        print(f"[SISON]    Payload  : {payload}")
        print(f"[SISON]    Error    : {last_error}")
        return {"success": False, "attempts": max_retries, "error": last_error}

    @staticmethod
    def test_ping(url: str, timeout: float = 3.0) -> dict:
        """Menguji konektivitas ke server SISON (Test Webhook Endpoint)."""
        test_payload = {"ping": "kamera_inspection", "test": True, "timestamp": int(time.time())}
        start_t = time.time()
        try:
            res = requests.post(url, json=test_payload, timeout=timeout)
            latency_ms = round((time.time() - start_t) * 1000, 1)
            return {
                "success": True,
                "status_code": res.status_code,
                "latency_ms": latency_ms,
                "response": res.text[:200]
            }
        except Exception as e:
            latency_ms = round((time.time() - start_t) * 1000, 1)
            return {
                "success": False,
                "error": str(e),
                "latency_ms": latency_ms
            }
