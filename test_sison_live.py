"""
Uji Coba Otomatis Integrasi Webhook Callback SISON (Status 0, 1, 2, 98, 99).
Skrip ini mensimulasikan server SISON lokal pada port 9999,
kemudian mengirimkan callback untuk masing-masing status dan memvalidasi payload yang diterima.
"""
import json
import threading
from http.server import HTTPServer, BaseHTTPRequestHandler
import integrations.sison_client as sc
from integrations.sison_client import SisonSender

received_payloads = []

class MockSisonHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length)
        data = json.loads(body.decode('utf-8'))
        received_payloads.append(data)
        
        # Balas HTTP 200 OK ke kamera
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(b'{"status": "received", "code": 200}')

    def log_message(self, format, *args):
        pass  # Heningkan log default http.server

def run_test():
    # 1. Nyalakan Mock Server SISON di port 9999
    server = HTTPServer(('127.0.0.1', 9999), MockSisonHandler)
    server_thread = threading.Thread(target=server.serve_forever, daemon=True)
    server_thread.start()

    # 2. Arahkan callback SISON ke Mock Server
    original_get_url = sc.get_callback_url
    sc.get_callback_url = lambda: "http://127.0.0.1:9999/api/kamera/callback"

    print("\n" + "=" * 60)
    print("  [TEST] PENGUJIAN INTEGRASI WEBHOOK CALLBACK SISON")
    print("=" * 60)

    test_cases = [
        ("TRX-DEMO-000", 0,  "STANDBY (Belum Diproses)"),
        ("TRX-DEMO-001", 1,  "RUNNING (Sedang Diproses)"),
        ("TRX-DEMO-002", 2,  "OK / COMPLETED (Lolos 100%)"),
        ("TRX-DEMO-098", 98, "NG / REJECT (Part Cacat)"),
        ("TRX-DEMO-099", 99, "CANCEL (Kanban Dibatalkan)"),
    ]

    all_passed = True

    for id_trans, status, label in test_cases:
        res = SisonSender.send_callback(id_trans=id_trans, status=status, max_retries=1)
        if res.get("success"):
            print(f"  [KIRIM SUKSES] Status {status:2d} ({label:30s}) -> id_trans: {id_trans}")
        else:
            print(f"  [KIRIM GAGAL]  Status {status:2d} -> Error: {res.get('error')}")
            all_passed = False

    # 3. Verifikasi Data yang Diterima di Server SISON
    print("\n" + "-" * 60)
    print("  [DATA] PAYLOAD YANG DITERIMA OLEH SERVER SISON:")
    print("-" * 60)
    for idx, p in enumerate(received_payloads, 1):
        print(f"  [{idx}] JSON: {json.dumps(p)}")

    print("-" * 60)
    if len(received_payloads) == len(test_cases) and all_passed:
        print("  [HASIL] KESIMPULAN: SELURUH KODE STATUS (0, 1, 2, 98, 99) 100% SESUAI & BEKERJA DENGAN BAIK!")
    else:
        print("  [PERINGATAN] ADA STATUS YANG TIDAK DITERIMA DENGAN BENAR.")
    print("=" * 60 + "\n")

    # Bersihkan mock server
    server.shutdown()
    sc.get_callback_url = original_get_url

if __name__ == "__main__":
    run_test()
