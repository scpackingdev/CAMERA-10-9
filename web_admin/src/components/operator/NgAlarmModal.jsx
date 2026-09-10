import React from 'react';
import { ShieldAlert, RotateCcw, CheckCircle2, Ban, XCircle } from 'lucide-react';
import DraggableFloatingCard from './DraggableFloatingCard';

export default function NgAlarmModal({
  isOpen,
  telemetry,
  ngResolving,
  onResolveNg,
  onOpenCancelKanban
}) {
  if (!isOpen) return null;

  return (
    <DraggableFloatingCard
      title="ALARM CACAT (NG) AKTIF"
      badge="PENGECEKAN KONDISI PART"
      color="rose"
      icon={ShieldAlert}
      onClose={() => onResolveNg('RETRY')}
    >
      <div className="space-y-3">
        {/* Banner Status Header */}
        <div className="text-center">
          <div className="inline-flex items-center gap-1.5 bg-rose-500/30 border border-rose-400 px-3 py-0.5 rounded-full text-rose-200 font-black text-xs uppercase tracking-wider animate-pulse mb-1">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>SIRENE & ALARM NG AKTIF!</span>
          </div>
          <h2 className="text-base sm:text-lg font-black text-white leading-tight">
            ⚠️ CACAT / NG TERDETEKSI! ⚠️
          </h2>
          <p className="text-xs text-rose-300 font-medium mt-0.5">
            Periksa kondisi fisik part di stasiun inspeksi, lalu pilih tindakan di bawah.
          </p>
        </div>

        {/* Kotak Informasi Cacat NG */}
        <div className="p-3 rounded-2xl bg-slate-900/90 border-2 border-rose-500/40 text-left space-y-2 shadow-inner text-xs">
          <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
            <span className="text-slate-400 font-bold uppercase">Part Number:</span>
            <span className="font-mono font-black text-white text-sm">{telemetry.p_no || 'STANDBY'}</span>
          </div>
          <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
            <span className="text-slate-400 font-bold uppercase">Sisi Terdeteksi:</span>
            <span className="font-bold text-amber-300">{telemetry.current_side === 'F' ? 'FRONT (DEPAN)' : 'REAR (BELAKANG)'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400 font-bold uppercase">Pesan Sistem / AI:</span>
            <span className="font-bold text-rose-300 truncate max-w-[220px]">
              {telemetry.pesan_ui ? String(telemetry.pesan_ui).replace(/<[^>]+>/g, '') : 'Abnormalitas / Cacat terdeteksi'}
            </span>
          </div>
        </div>

        {/* 4 Opsi Keputusan Tindakan */}
        <div className="space-y-2 pt-1">
          {/* Opsi 1: Model Salah Baca / Part Sebenarnya Bagus */}
          <button
            type="button"
            disabled={ngResolving}
            onClick={() => onResolveNg('RETRY')}
            className="w-full py-2 px-3 bg-gradient-to-r from-sky-700 to-blue-700 hover:from-sky-600 hover:to-blue-600 text-white font-bold rounded-xl shadow-md border border-sky-400/40 text-xs flex items-center justify-between transition-all cursor-pointer disabled:opacity-50 hover:scale-[1.01] active:scale-[0.99]"
          >
            <div className="flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-sky-200 shrink-0" />
              <span className="text-left font-black tracking-wide">🔄 INSPEKSI ULANG (REPOSISI PART)</span>
            </div>
            <span className="text-[10px] bg-sky-950/80 px-2 py-0.5 rounded text-sky-200 border border-sky-400/30">AI Salah Baca</span>
          </button>

          {/* Opsi 2: Benar-benar NG & Ada Part Pengganti */}
          <button
            type="button"
            disabled={ngResolving}
            onClick={() => onResolveNg('CONFIRM_REPLACE')}
            className="w-full py-2 px-3 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold rounded-xl shadow-md border border-amber-400/40 text-xs flex items-center justify-between transition-all cursor-pointer disabled:opacity-50 hover:scale-[1.01] active:scale-[0.99]"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-amber-200 shrink-0" />
              <span className="text-left font-black tracking-wide">🚨 BENAR NG (GANTI PART BARU)</span>
            </div>
            <span className="text-[10px] bg-amber-950/80 px-2 py-0.5 rounded text-amber-200 border border-amber-400/30">Ada Pengganti</span>
          </button>

          {/* Opsi 3: Benar-benar NG & Selesaikan Transaksi Sebagai NG (Status 98) */}
          <button
            type="button"
            disabled={ngResolving}
            onClick={() => onResolveNg('REJECT_NG')}
            className="w-full py-2 px-3 bg-gradient-to-r from-rose-700 via-rose-600 to-red-700 hover:from-rose-600 hover:to-red-600 text-white font-bold rounded-xl shadow-md border border-rose-400/40 text-xs flex items-center justify-between transition-all cursor-pointer disabled:opacity-50 hover:scale-[1.01] active:scale-[0.99]"
          >
            <div className="flex items-center gap-2">
              <XCircle className="w-4 h-4 text-rose-200 shrink-0" />
              <span className="text-left font-black tracking-wide">❌ AKHIRI SEBAGAI NG</span>
            </div>
            <span className="text-[10px] bg-rose-950/90 px-2 py-0.5 rounded text-rose-200 border border-rose-500/40 font-bold">Status 98 (NG)</span>
          </button>

          {/* Opsi 4: Batalkan Kanban (Status 99) */}
          <button
            type="button"
            disabled={ngResolving}
            onClick={onOpenCancelKanban}
            className="w-full py-2 px-3 bg-gradient-to-r from-purple-800 via-indigo-800 to-purple-900 hover:from-purple-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-md border border-purple-400/40 text-xs flex items-center justify-between transition-all cursor-pointer disabled:opacity-50 hover:scale-[1.01] active:scale-[0.99]"
          >
            <div className="flex items-center gap-2">
              <Ban className="w-4 h-4 text-purple-300 shrink-0" />
              <span className="text-left font-black tracking-wide text-purple-100">⛔ BATALKAN KANBAN</span>
            </div>
            <span className="text-[10px] bg-purple-950/90 px-2 py-0.5 rounded text-purple-200 border border-purple-500/40 font-bold">Status 99 (Cancel)</span>
          </button>
        </div>
      </div>
    </DraggableFloatingCard>
  );
}
