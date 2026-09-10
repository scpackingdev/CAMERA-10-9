import React, { useState } from 'react';
import { OctagonAlert, Ban, ArrowLeft } from 'lucide-react';
import DraggableFloatingCard from './DraggableFloatingCard';

export default function CancelKanbanModal({
  isOpen,
  telemetry,
  isCancelling,
  onClose,
  onConfirmCancel
}) {
  const [reason, setReason] = useState('Stok part pengganti habis');
  const [statusCode, setStatusCode] = useState(99);

  if (!isOpen) return null;

  const targetQty = telemetry.target_qty || 1;
  const remQty = telemetry.qty_remaining !== undefined ? telemetry.qty_remaining : (telemetry.qty || 0);
  const compQty = Math.max(0, targetQty - remQty);

  const handleReasonChange = (newReason) => {
    setReason(newReason);
    if (newReason.includes('cacat') || newReason.includes('abnormalitas')) {
      setStatusCode(98);
    }
  };

  const handleConfirm = () => {
    onConfirmCancel(reason, statusCode);
  };

  return (
    <DraggableFloatingCard
      title={statusCode === 98 ? "TOLAK TRANSAKSI (NG)" : "BATALKAN KANBAN"}
      badge="KONFIRMASI AKHIR"
      color={statusCode === 98 ? "rose" : "purple"}
      icon={OctagonAlert}
      onClose={onClose}
    >
      <div className="space-y-3.5 text-left">
        {/* Banner Peringatan Industrial */}
        <div className={`flex items-start gap-3 border-2 p-3 rounded-2xl shadow-inner ${
          statusCode === 98
            ? 'bg-rose-950/80 border-rose-500/50'
            : 'bg-purple-950/80 border-purple-500/50'
        }`}>
          <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 ${
            statusCode === 98
              ? 'bg-rose-600/30 border-rose-400 text-rose-300'
              : 'bg-purple-600/30 border-purple-400 text-purple-300'
          }`}>
            <Ban className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-black text-white leading-tight">
              {statusCode === 98 ? "Akhiri Sebagai NG (Status 98)?" : "Batalkan Transaksi Kanban Ini?"}
            </h3>
            <p className="text-xs text-slate-300 font-medium mt-0.5 leading-relaxed">
              {statusCode === 98
                ? "Hasil transaksi akan dikirim ke server SISON sebagai status 98 (NG / Reject)."
                : "Transaksi akan dihentikan dan dikirim ke server SISON sebagai status 99 (Cancel)."}
            </p>
          </div>
        </div>

        {/* Ringkasan Informasi Transaksi */}
        <div className="p-3 rounded-2xl bg-slate-900/90 border border-white/15 space-y-2 text-xs shadow-inner">
          <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
            <span className="text-slate-400 font-bold uppercase">ID Transaksi:</span>
            <span className="font-mono font-black text-blue-400 text-sm">{telemetry.id_trans || '-'}</span>
          </div>
          <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
            <span className="text-slate-400 font-bold uppercase">Part Number:</span>
            <span className="font-mono font-black text-white text-xs sm:text-sm">{telemetry.p_no || '-'}</span>
          </div>
          <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
            <span className="text-slate-400 font-bold uppercase">Progres Inspeksi:</span>
            <span className="font-bold text-amber-300">
              {compQty} / {targetQty} PCS Selesai (Sisa {remQty} PCS)
            </span>
          </div>
          <div className="flex items-center justify-between pt-0.5">
            <span className="text-slate-400 font-bold uppercase">Callback SISON:</span>
            <span className={`font-mono font-black px-2 py-0.5 rounded border ${
              statusCode === 98
                ? 'text-rose-400 bg-rose-500/20 border-rose-500/40'
                : 'text-purple-300 bg-purple-500/20 border-purple-500/40'
            }`}>
              STATUS {statusCode} ({statusCode === 98 ? 'NG / REJECT' : 'CANCEL'})
            </span>
          </div>
        </div>

        {/* Pemilihan Kode Status SISON */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-extrabold uppercase text-slate-300 block tracking-wide">
            Pilih Status Akhir ke SISON:
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setStatusCode(99)}
              className={`py-2 px-2.5 rounded-xl border text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                statusCode === 99
                  ? 'bg-purple-600 text-white border-purple-400 shadow-md shadow-purple-900/50'
                  : 'bg-slate-900/90 text-slate-400 border-white/10 hover:text-white'
              }`}
            >
              <span>Status 99 (BATAL)</span>
            </button>
            <button
              type="button"
              onClick={() => setStatusCode(98)}
              className={`py-2 px-2.5 rounded-xl border text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                statusCode === 98
                  ? 'bg-rose-600 text-white border-rose-400 shadow-md shadow-rose-900/50'
                  : 'bg-slate-900/90 text-slate-400 border-white/10 hover:text-white'
              }`}
            >
              <span>Status 98 (NG)</span>
            </button>
          </div>
        </div>

        {/* Pilihan Alasan Pembatalan / Reject */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-extrabold uppercase text-slate-300 block tracking-wide">
            Alasan:
          </label>
          <select
            value={reason}
            onChange={(e) => handleReasonChange(e.target.value)}
            className="w-full bg-slate-900 border border-white/20 rounded-xl py-2 px-3 text-xs text-white font-medium focus:outline-none focus:border-rose-400 transition-colors cursor-pointer"
          >
            <option value="Stok part pengganti habis">Stok part pengganti habis / kosong</option>
            <option value="Part cacat / abnormalitas fisik parah">Part cacat / abnormalitas fisik parah</option>
            <option value="Salah scan Kanban / Salah part">Salah scan Kanban / Salah part</option>
            <option value="Instruksi Pengawas / Supervisor">Instruksi Pengawas / Supervisor</option>
          </select>
        </div>

        {/* Tombol Aksi */}
        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <button
            type="button"
            disabled={isCancelling}
            onClick={onClose}
            className="w-full py-2.5 px-3 bg-slate-800 hover:bg-slate-700 border border-white/20 text-slate-200 font-bold rounded-xl shadow text-xs uppercase tracking-wide transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali</span>
          </button>

          <button
            type="button"
            disabled={isCancelling}
            onClick={handleConfirm}
            className={`w-full py-2.5 px-3 font-black rounded-xl shadow-lg text-xs uppercase tracking-wide transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 hover:scale-[1.02] active:scale-[0.98] text-white ${
              statusCode === 98
                ? 'bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 hover:from-rose-500 hover:to-red-500 shadow-rose-600/50'
                : 'bg-gradient-to-r from-purple-700 via-indigo-600 to-purple-800 hover:from-purple-600 hover:to-indigo-500 shadow-purple-600/50'
            }`}
          >
            <Ban className="w-4 h-4" />
            <span>
              {isCancelling
                ? 'Memproses...'
                : (statusCode === 98 ? 'Ya, Tolak NG (98)' : 'Ya, Batalkan (99)')}
            </span>
          </button>
        </div>
      </div>
    </DraggableFloatingCard>
  );
}
