import React from 'react';
import { Check } from 'lucide-react';
import DraggableFloatingCard from './DraggableFloatingCard';

export default function PartOkModal({
  isOpen,
  telemetry,
  onClose,
  onFinishBatch
}) {
  if (!isOpen) return null;

  const isFinalPart = telemetry.qty_remaining <= 0 || telemetry.status === 'COMPLETED';
  const currentPartNum = isFinalPart ? (telemetry.target_qty || 2) : (telemetry.qty_completed || 1);

  return (
    <DraggableFloatingCard
      title={isFinalPart ? "INSPEKSI SELESAI" : `PART #${currentPartNum} SELESAI`}
      badge={isFinalPart ? "SELESAI (100% OK)" : `SISA ${telemetry.qty_remaining} PCS`}
      color="emerald"
      icon={Check}
      onClose={isFinalPart ? onFinishBatch : onClose}
    >
      <div className="space-y-3 text-left">
        {/* Judul Rata Kiri */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-emerald-400 shadow-md shrink-0 animate-pulse">
            <Check className="w-5 h-5 stroke-[3]" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base sm:text-lg font-black text-white leading-tight">
              {isFinalPart ? "Seluruh Part Selesai Diinspeksi!" : `Part #${currentPartNum} Berhasil Terverifikasi!`}
            </h3>
            <p className="text-xs text-emerald-300 font-bold mt-0.5 truncate">
              {isFinalPart
                ? `Semua sisi part (${telemetry.target_qty || 2} PCS) terdeteksi dengan status OK.`
                : `Part #${currentPartNum} OK. Sisa: ${telemetry.qty_remaining} PCS.`}
            </p>
          </div>
        </div>

        {/* 1. Metrik Kelengkapan Label & Rata-rata Akurasi (Di atas) */}
        <div className="grid grid-cols-2 gap-2.5 bg-slate-900/90 p-2.5 sm:p-3 rounded-2xl border border-white/15 text-xs shadow-inner">
          <div className="px-1">
            <span className="text-slate-400 block text-[11px] uppercase font-extrabold tracking-wide mb-0.5">Label Terdeteksi:</span>
            <span className="font-black text-white text-sm sm:text-base">{telemetry.popups?.details?.label_terdeteksi || '3/3'}</span>
          </div>
          <div className="border-l border-white/15 pl-3">
            <span className="text-slate-400 block text-[11px] uppercase font-extrabold tracking-wide mb-0.5">Rata-rata Akurasi:</span>
            <span className="font-black text-emerald-400 text-sm sm:text-base">{telemetry.popups?.details?.avg_confidence || '95%'}</span>
          </div>
        </div>

        {/* 2. Nama Label Terverifikasi */}
        <div>
          <span className="text-[11px] uppercase font-extrabold text-slate-300 block mb-1.5 tracking-wide">
            Nama Label Terverifikasi {isFinalPart ? "(Sisi Belakang Akhir):" : ":"}
          </span>
          <div className="flex flex-col gap-1.5 p-2 bg-slate-900/90 rounded-2xl border border-white/15 shadow-inner">
            {telemetry.popups?.details?.found_labels ? (
              telemetry.popups.details.found_labels.split('\n').filter(Boolean).map((lbl, idx) => (
                <div 
                  key={idx} 
                  className="flex items-center justify-between px-2.5 py-1.5 sm:py-2 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-xs font-mono font-bold text-emerald-200 shadow-sm"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="truncate">{lbl.replace(/^-\s*/, '').split(':')[0]?.trim() || lbl.replace(/^-\s*/, '')}</span>
                  </div>
                  {lbl.includes(':') && (
                    <span className="text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-md font-black text-xs shrink-0 border border-emerald-500/30">
                      {lbl.split(':')[1]?.trim()}
                    </span>
                  )}
                </div>
              ))
            ) : (
              <span className="text-xs text-slate-400 font-bold p-1">{telemetry.popups?.details?.label_terdeteksi || 'Semua label lengkap'}</span>
            )}
          </div>
        </div>

        {/* Tombol Aksi Dinamis */}
        {isFinalPart ? (
          <button
            type="button"
            onClick={onFinishBatch}
            className="w-full py-2.5 sm:py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs sm:text-sm font-black rounded-xl shadow-lg shadow-emerald-600/40 transition-all cursor-pointer hover:scale-[1.01] active:scale-[0.99] text-center mt-0.5"
          >
            ✅ SELESAI & STANDBY
          </button>
        ) : (
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 sm:py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs sm:text-sm font-black rounded-xl shadow-lg shadow-emerald-600/40 transition-all cursor-pointer hover:scale-[1.01] active:scale-[0.99] text-center mt-0.5"
          >
            ✅ LANJUTKAN KE PART BERIKUTNYA ({currentPartNum + 1}/{telemetry.target_qty}) →
          </button>
        )}
      </div>
    </DraggableFloatingCard>
  );
}
