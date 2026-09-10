import React, { useState } from 'react';
import { Code2, Copy, Check, Terminal, HelpCircle, KeyRound, PlayCircle, SendHorizontal, Server } from 'lucide-react';

export default function SisonApiDocs({
  generatedToken,
  jsonPayloadString,
  samplePayload,
  copiedPayload,
  onCopy
}) {
  const [copiedLoginCurl, setCopiedLoginCurl] = useState(false);
  const [copiedStartCurl, setCopiedStartCurl] = useState(false);
  const [copiedLoginBody, setCopiedLoginBody] = useState(false);

  const activeToken = generatedToken || '<TOKEN_DARI_LOGIN>';

  const loginSampleBody = JSON.stringify({
    username: "sison_service",
    password: "password_anda",
    shift: "Shift 1"
  }, null, 2);

  const loginCurl = `curl.exe -X POST "http://localhost:8000/api/login" \\
  -H "Content-Type: application/json" \\
  -d '{"username": "sison_service", "password": "password_anda", "shift": "Shift 1"}'`;

  const startCurl = `curl.exe -X POST "http://localhost:8000/api/start" \\
  -H "Authorization: Bearer ${activeToken}" \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(samplePayload)}'`;

  const handleCopy = (text, type) => {
    navigator.clipboard.writeText(text);
    if (type === 'loginCurl') {
      setCopiedLoginCurl(true);
      setTimeout(() => setCopiedLoginCurl(false), 2000);
    } else if (type === 'startCurl') {
      setCopiedStartCurl(true);
      setTimeout(() => setCopiedStartCurl(false), 2000);
    } else if (type === 'loginBody') {
      setCopiedLoginBody(true);
      setTimeout(() => setCopiedLoginBody(false), 2000);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Docs */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
          <Code2 className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white tracking-wide">
            Panduan Alur Integrasi API SISON (2 Langkah Otentikasi)
          </h2>
          <p className="text-xs text-slate-400">
            Standar otentikasi Bearer Token dinamis dan spesifikasi endpoint transaksi dua arah
          </p>
        </div>
      </div>

      {/* LANGKAH 1: OTENTIKASI & PENGAMBILAN TOKEN */}
      <div className="glass-card p-6 sm:p-8 border border-purple-500/20 rounded-3xl shadow-2xl space-y-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 px-6 py-1.5 bg-purple-600/30 border-b border-l border-purple-500/30 text-purple-200 text-xs font-bold rounded-bl-2xl">
          LANGKAH 1: OAUTH2 / LOGIN
        </div>

        <div className="flex items-center gap-3 pb-3 border-b border-white/10">
          <div className="p-2 rounded-xl bg-purple-500/20 text-purple-300">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-lg text-xs font-black bg-emerald-600 text-white">POST</span>
              <span className="text-base sm:text-lg font-mono font-bold text-white">/api/login</span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Dapatkan Bearer Token dinamis menggunakan kredensial akun SISON
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Request Payload Login */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Request Body (JSON):
              </span>
              <button
                onClick={() => handleCopy(loginSampleBody, 'loginBody')}
                className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-slate-300 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 hover:text-white transition-all cursor-pointer"
              >
                {copiedLoginBody ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLoginBody ? 'Tersalin!' : 'Salin JSON'}</span>
              </button>
            </div>
            <pre className="p-3.5 bg-black/60 border border-white/5 rounded-2xl font-mono text-xs text-amber-300 overflow-x-auto scrollbar-thin">
              {loginSampleBody}
            </pre>
          </div>

          {/* Expected Response Token */}
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
              Response Sukses (HTTP 200):
            </span>
            <pre className="p-3.5 bg-black/60 border border-white/5 rounded-2xl font-mono text-xs text-emerald-300 overflow-x-auto scrollbar-thin">
{`{
  "token": "eyJ1IjoiYWRtaW4iLCJyIjoiYWRtaW4iLCJleHAiOjE3NzE1OTI4MDB9.xxxxxxxx...",
  "role": "admin",
  "username": "sison_service",
  "fullname": "SISON Integration Account",
  "shift": "Shift 1"
}`}
            </pre>
          </div>
        </div>

        {/* cURL Login */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-purple-400" />
              Contoh Request cURL Login:
            </span>
            <button
              onClick={() => handleCopy(loginCurl, 'loginCurl')}
              className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-slate-300 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 hover:text-white transition-all cursor-pointer"
            >
              {copiedLoginCurl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLoginCurl ? 'Tersalin!' : 'Salin cURL Login'}</span>
            </button>
          </div>
          <pre className="p-3.5 bg-black/70 border border-white/10 rounded-2xl font-mono text-xs text-purple-300 overflow-x-auto scrollbar-thin leading-relaxed">
            {loginCurl}
          </pre>
        </div>
      </div>

      {/* LANGKAH 2: EKSEKUSI TRANSAKSI DENGAN BEARER TOKEN */}
      <div className="glass-card p-6 sm:p-8 border border-blue-500/20 rounded-3xl shadow-2xl space-y-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 px-6 py-1.5 bg-blue-600/30 border-b border-l border-blue-500/30 text-blue-200 text-xs font-bold rounded-bl-2xl">
          LANGKAH 2: TRIGGER TRANSAKSI
        </div>

        <div className="flex items-center gap-3 pb-3 border-b border-white/10">
          <div className="p-2 rounded-xl bg-blue-500/20 text-blue-300">
            <PlayCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-lg text-xs font-black bg-emerald-600 text-white">POST</span>
              <span className="text-base sm:text-lg font-mono font-bold text-white">/api/start</span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Kirimkan instruksi mulai inspeksi part ke kamera dengan menyertakan Bearer Token di header
            </p>
          </div>
        </div>

        {/* Headers Spec */}
        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
            Required HTTP Headers:
          </span>
          <div className="p-3.5 bg-black/40 border border-white/5 rounded-2xl font-mono text-xs text-slate-300 space-y-1.5">
            <div><span className="text-slate-500">Content-Type  :</span> <span className="text-amber-300">application/json</span></div>
            <div className="flex items-center justify-between gap-2">
              <div className="truncate">
                <span className="text-slate-500">Authorization :</span> <span className="text-emerald-400">Bearer {activeToken}</span>
              </div>
              <button
                onClick={() => onCopy(`Bearer ${activeToken}`, 'key')}
                className="text-[11px] font-sans font-semibold text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer shrink-0 bg-white/5 px-2.5 py-1 rounded-lg border border-white/10"
              >
                <Copy className="w-3.5 h-3.5" /> Salin Header
              </button>
            </div>
          </div>
        </div>

        {/* JSON Payload & Copy */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Request Body (JSON Payload):
            </span>
            <button
              onClick={() => onCopy(jsonPayloadString, 'payload')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-200 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 hover:text-white transition-all cursor-pointer"
            >
              {copiedPayload ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedPayload ? 'Tersalin!' : 'Salin JSON Payload'}</span>
            </button>
          </div>

          <pre className="p-4 bg-black/60 border border-white/5 rounded-2xl font-mono text-xs sm:text-sm text-blue-300 overflow-x-auto scrollbar-thin">
            {jsonPayloadString}
          </pre>
        </div>

        {/* Field Description Table */}
        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
            Struktur Parameter Payload:
          </span>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-white/10 rounded-2xl overflow-hidden">
              <thead className="bg-white/5 text-slate-300 border-b border-white/10 font-bold">
                <tr>
                  <th className="p-3">Field</th>
                  <th className="p-3">Tipe</th>
                  <th className="p-3">Wajib?</th>
                  <th className="p-3">Deskripsi & Contoh</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-300 font-mono">
                <tr>
                  <td className="p-3 font-bold text-white">id_trans</td>
                  <td className="p-3 text-amber-300">string</td>
                  <td className="p-3 text-emerald-400 font-sans font-bold">Ya</td>
                  <td className="p-3 font-sans">ID unik transaksi dari SISON (Contoh: <code>DEMO-1786211114</code>)</td>
                </tr>
                <tr>
                  <td className="p-3 font-bold text-white">p_no</td>
                  <td className="p-3 text-amber-300">string</td>
                  <td className="p-3 text-emerald-400 font-sans font-bold">Ya</td>
                  <td className="p-3 font-sans">Part number produk yang diinspeksi (Contoh: <code>74231-0K550-00</code>)</td>
                </tr>
                <tr>
                  <td className="p-3 font-bold text-white">lot</td>
                  <td className="p-3 text-amber-300">string</td>
                  <td className="p-3 text-slate-400 font-sans">Opsional</td>
                  <td className="p-3 font-sans">Nomor LOT produksi batch (Contoh: <code>LOT-8821</code>)</td>
                </tr>
                <tr>
                  <td className="p-3 font-bold text-white">unique_no</td>
                  <td className="p-3 text-amber-300">string</td>
                  <td className="p-3 text-slate-400 font-sans">Opsional</td>
                  <td className="p-3 font-sans">Nomor identifikasi unik komponen (Contoh: <code>UNQ-9901</code>)</td>
                </tr>
                <tr>
                  <td className="p-3 font-bold text-white">p_name</td>
                  <td className="p-3 text-amber-300">string</td>
                  <td className="p-3 text-slate-400 font-sans">Opsional</td>
                  <td className="p-3 font-sans">Nama part atau deskripsi komponen (Contoh: <code>Demo Part A</code>)</td>
                </tr>
                <tr>
                  <td className="p-3 font-bold text-white">qty</td>
                  <td className="p-3 text-blue-300">integer</td>
                  <td className="p-3 text-emerald-400 font-sans font-bold">Ya</td>
                  <td className="p-3 font-sans">Target jumlah QTY inspeksi per transaksi (Contoh: <code>1</code>)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* cURL Command Generator */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-blue-400" />
              Perintah Pengujian cURL Transaksi (Otomatis menyertakan token):
            </span>
            <button
              onClick={() => handleCopy(startCurl, 'startCurl')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-200 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 hover:text-white transition-all cursor-pointer"
            >
              {copiedStartCurl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedStartCurl ? 'Tersalin!' : 'Salin cURL Transaksi'}</span>
            </button>
          </div>

          <pre className="p-4 bg-black/70 border border-white/10 rounded-2xl font-mono text-xs text-emerald-300 overflow-x-auto scrollbar-thin leading-relaxed">
            {startCurl}
          </pre>
        </div>
      </div>

      {/* LANGKAH 3: WEBHOOK CALLBACK DARI KAMERA KE SISON */}
      <div className="glass-card p-6 sm:p-8 border border-emerald-500/20 rounded-3xl shadow-xl space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-white/10">
          <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-300">
            <SendHorizontal className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">
              Webhook Callback Hasil Inspeksi (Kamera $\rightarrow$ Server SISON)
            </h3>
            <p className="text-xs text-slate-400">
              Dikirimkan secara otomatis oleh kamera ke Callback URL saat inspeksi selesai (OK atau NG)
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs font-mono">
          <div className="p-3.5 bg-black/40 border border-white/5 rounded-2xl space-y-2">
            <span className="text-slate-400 font-sans font-bold block uppercase tracking-wider text-[11px]">Format Request Webhook:</span>
            <div><span className="text-slate-500">Method :</span> <span className="text-emerald-400 font-bold">POST</span></div>
            <div><span className="text-slate-500">URL    :</span> <span className="text-blue-300">&lt;Callback Webhook URL Anda&gt;</span></div>
            <div><span className="text-slate-500">Body   :</span> <span className="text-amber-300">{`{ "id_trans": "TRX-101", "status": 2 }`}</span></div>
          </div>

          <div className="p-3.5 bg-black/40 border border-white/5 rounded-2xl space-y-2">
            <span className="text-slate-400 font-sans font-bold block uppercase tracking-wider text-[11px]">Keterangan Nilai Kode Status SISON:</span>
            <div className="space-y-1 font-sans text-xs text-slate-300">
              <div><strong className="text-slate-400 font-mono font-bold">status: 0</strong> = <span className="text-slate-300 font-semibold">Standby</span> (Belum diproses / Menunggu transaksi)</div>
              <div><strong className="text-amber-400 font-mono font-bold">status: 1</strong> = <span className="text-amber-300 font-semibold">Sedang Diproses</span> (Running inspeksi)</div>
              <div><strong className="text-emerald-400 font-mono font-bold">status: 2</strong> = <span className="text-emerald-300 font-semibold">OK / Completed</span> (Lolos semua part 100%)</div>
              <div><strong className="text-rose-400 font-mono font-bold">status: 98</strong> = <span className="text-rose-300 font-semibold">NG (Reject)</span> (Part cacat / Abnormalitas)</div>
              <div><strong className="text-purple-400 font-mono font-bold">status: 99</strong> = <span className="text-purple-300 font-semibold">Cancel</span> (Transaksi Kanban dibatalkan)</div>
              <div className="text-slate-400 text-[11px] pt-1">Dilengkapi Auto-Retry 3x otomatis jika ada kendala jaringan.</div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Endpoint Monitoring & System Health */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* GET /health */}
        <div className="glass-card p-6 border border-white/10 rounded-3xl shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-blue-600 text-white">GET</span>
              <span className="font-mono font-bold text-white text-sm">/health</span>
            </div>
            <span className="text-xs text-emerald-400 font-semibold">Server Check</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Digunakan oleh sistem monitoring atau watchdog untuk memeriksa apakah server FastAPI dan kamera berjalan aktif.
          </p>
          <div className="p-3 bg-black/40 rounded-xl border border-white/5 font-mono text-xs text-emerald-400">
            {`{ "status": "ok", "app": "Sistem Kamera Inspeksi", "code": 200 }`}
          </div>
        </div>

        {/* GET /api/status */}
        <div className="glass-card p-6 border border-white/10 rounded-3xl shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-blue-600 text-white">GET</span>
              <span className="font-mono font-bold text-white text-sm">/api/status</span>
            </div>
            <span className="text-xs text-blue-400 font-semibold">Live State</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Mengembalikan status inspeksi saat ini (<code className="text-amber-300">RUNNING</code>, <code className="text-emerald-300">OK</code>, <code className="text-rose-300">NG</code>, <code className="text-slate-300">STANDBY</code>) dan sisa QTY.
          </p>
          <div className="p-3 bg-black/40 rounded-xl border border-white/5 font-mono text-xs text-blue-300">
            {`{ "status": "RUNNING", "p_no": "74231-0K550-00", "sisa_qty": 1 }`}
          </div>
        </div>
      </div>

      {/* 5. HTTP Response Status Reference Card */}
      <div className="glass-card p-6 sm:p-8 border border-white/10 rounded-3xl shadow-xl space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-blue-400" />
          Standar Status Response HTTP
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-1">
            <div className="font-mono font-bold text-emerald-400 text-sm">200 OK</div>
            <p className="text-slate-300">Payload & Bearer Token valid; transaksi inspeksi berhasil dimulai.</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-1">
            <div className="font-mono font-bold text-amber-400 text-sm">400 Bad Request</div>
            <p className="text-slate-300">Format JSON tidak valid atau parameter wajib (<code>p_no</code>, <code>id_trans</code>) kosong.</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 space-y-1">
            <div className="font-mono font-bold text-rose-400 text-sm">401 Unauthorized</div>
            <p className="text-slate-300">Bearer Token tidak disertakan, tidak valid, atau telah kedaluwarsa.</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/20 space-y-1">
            <div className="font-mono font-bold text-purple-400 text-sm">409 Conflict</div>
            <p className="text-slate-300">Kamera masih sibuk memproses inspeksi transaksi sebelumnya.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
