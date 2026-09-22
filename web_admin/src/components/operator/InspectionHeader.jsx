import React from 'react';
import { Layers, Volume2, VolumeX, User, Clock, History, LogOut } from 'lucide-react';

export default function InspectionHeader({
  telemetry,
  statusBg,
  statusTextColor,
  statusText,
  audioState,
  onOpenAudioModal,
  localOperatorName,
  loginTimeStr,
  onNavigateHistory,
  onOpenLogoutModal
}) {
  return (
    <header className={`rounded-2xl p-3 sm:p-4 border-2 shadow-xl backdrop-blur-xl transition-all duration-300 shrink-0 ${statusBg}`}>
      <div className="flex flex-col lg:flex-row items-center justify-between gap-3 sm:gap-4">
        
        {/* Part Number & QTY Target */}
        <div className="flex-1 text-center lg:text-left min-w-0">
          <div className="text-xs sm:text-sm font-black tracking-widest text-amber-400 uppercase flex items-center justify-center lg:justify-start gap-1.5">
            <Layers className="w-4 h-4" />
            <span>PART NUMBER</span>
          </div>
          <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-wide mt-0.5 truncate">
            {telemetry.p_no || 'MENUNGGU SISON...'}
          </div>
          {telemetry.p_no ? (
            <div className="text-sm sm:text-base font-bold text-emerald-400 mt-0.5">
              Target: <span className="text-white font-extrabold">{telemetry.target_qty} PCS</span> | Selesai: <span className="text-white font-extrabold">{telemetry.qty_completed} PCS</span>
            </div>
          ) : (
            <div className="text-xs sm:text-sm font-bold text-slate-400 mt-0.5">Siap menerima trigger transaksi inspeksi</div>
          )}
        </div>

        {/* Center Status Banner (Besar & Kontras Tinggi) */}
        <div className="flex-1 text-center px-4 py-2 rounded-2xl bg-slate-900/80 border border-white/15 shadow-inner min-w-0">
          <div className="text-xs sm:text-sm font-black text-slate-400 tracking-wider uppercase">
            STATUS KAMERA
          </div>
          <div className={`text-xl sm:text-2xl lg:text-3xl tracking-wide font-black ${statusTextColor}`}>
            {statusText}
          </div>

          {/* Verification Hold Progress Bar */}
          {telemetry.live_metrics?.is_stabilizing && (
            <div className="w-full max-w-xs mx-auto mt-2 bg-slate-950/80 rounded-full h-2 overflow-hidden border border-teal-500/40">
              <div 
                className="bg-gradient-to-r from-teal-500 to-emerald-400 h-full rounded-full transition-all duration-100 ease-out shadow-[0_0_8px_rgba(20,184,166,0.8)]"
                style={{ width: `${telemetry.live_metrics.hold_progress || 0}%` }}
              />
            </div>
          )}

          {telemetry.status !== 'STANDBY' && telemetry.status !== 'IDLE' && (
            <div className="text-xs sm:text-sm text-slate-200 font-bold truncate max-w-lg mx-auto mt-0.5">
              {telemetry.live_metrics?.total_count > 0 ? (
                <span>
                  Inspeksi: Labels{' '}
                  <span className={telemetry.live_metrics.labels_complete ? 'text-emerald-400 font-black' : 'text-rose-400 font-black'}>
                    {telemetry.live_metrics.detected_count}/{telemetry.live_metrics.total_count}
                  </span>
                  {' '}(Min {telemetry.live_metrics.min_coverage || 100}%) | AvgConf:{' '}
                  <span className={telemetry.live_metrics.avg_conf_ok ? 'text-emerald-400 font-black' : 'text-rose-400 font-black'}>
                    {telemetry.live_metrics.current_avg_conf}%/{telemetry.live_metrics.target_avg_conf}%
                  </span>
                </span>
              ) : (
                <span>{telemetry.pesan_ui ? String(telemetry.pesan_ui).replace(/<[^>]+>/g, '') : '-'}</span>
              )}
            </div>
          )}
          {telemetry.p_no && telemetry.status !== 'STANDBY' && telemetry.status !== 'COMPLETED' && (
            <div className="text-base sm:text-lg font-black text-emerald-300 mt-1 bg-emerald-950/70 py-1 px-5 rounded-full inline-block border-2 border-emerald-400/50 tracking-widest shadow-lg shadow-emerald-900/40">
              TAMPAK: {telemetry.current_side === 'FRONT' ? 'DEPAN' : telemetry.current_side === 'REAR' ? 'BELAKANG' : telemetry.current_side}
            </div>
          )}
        </div>

        {/* Right: Operator Badge, Audio Control & Actions (Riwayat Inspeksi + Keluar Shift) */}
        <div className="flex-1 flex flex-col items-center lg:items-end justify-center gap-2 min-w-0">
          {/* Row 1: Audio Control (Ditaruh di atas Riwayat Inspeksi) & Operator Info */}
          <div className="flex items-center gap-2">
            {/* Tombol Atur Audio Speaker USB */}
            <button
              type="button"
              onClick={onOpenAudioModal}
              className={`py-1.5 px-3 rounded-2xl text-xs sm:text-sm font-extrabold flex items-center gap-2 border shadow-inner backdrop-blur-md transition-all cursor-pointer hover:scale-105 active:scale-95 ${
                audioState.isEnabled 
                  ? 'bg-slate-900/90 hover:bg-slate-800 text-sky-300 border-sky-500/30 shadow-sky-500/10' 
                  : 'bg-rose-950/80 hover:bg-rose-900/90 text-rose-300 border-rose-500/40 shadow-rose-950/20'
              }`}
              title="Pengaturan Suara Speaker USB"
            >
              {audioState.isEnabled ? (
                <Volume2 className="w-3.5 h-3.5 text-sky-400" />
              ) : (
                <VolumeX className="w-3.5 h-3.5 text-rose-400" />
              )}
              <span>{audioState.isEnabled ? `Audio ${audioState.volume}%` : 'Audio Mute'}</span>
            </button>

            {/* Operator Name & Time (Terkunci ke user lokal browser) */}
            <div className="flex items-center gap-2 bg-slate-900/90 px-3.5 py-1.5 rounded-2xl border border-white/10 text-sky-300 text-xs sm:text-sm font-extrabold shadow-inner backdrop-blur-md">
              <div className="w-6 h-6 rounded-lg bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-sky-400 shrink-0">
                <User className="w-3.5 h-3.5" />
              </div>
              <span className="truncate max-w-[140px] text-white">{localOperatorName}</span>
              <span className="text-slate-600 font-normal">|</span>
              <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="font-mono text-slate-300">{loginTimeStr}</span>
            </div>
          </div>

          {/* Row 2: Sub-Actions: Riwayat Inspeksi & Keluar Shift */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onNavigateHistory}
              className="group relative overflow-hidden py-2 px-3.5 rounded-2xl bg-gradient-to-r from-blue-600/90 via-indigo-600/90 to-blue-700/90 hover:from-blue-500 hover:via-indigo-500 hover:to-blue-600 text-white font-extrabold text-xs sm:text-sm flex items-center gap-2 border border-blue-400/30 shadow-lg shadow-blue-600/25 hover:shadow-blue-500/40 backdrop-blur-md transition-all duration-200 cursor-pointer hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
            >
              <div className="w-6 h-6 rounded-lg bg-white/15 border border-white/20 flex items-center justify-center text-sky-200 group-hover:scale-110 group-hover:bg-white/25 transition-transform duration-200 shrink-0">
                <History className="w-3.5 h-3.5" />
              </div>
              <span className="tracking-wide">Riwayat Inspeksi</span>
            </button>

            <button
              type="button"
              onClick={onOpenLogoutModal}
              className="group relative overflow-hidden py-2 px-3.5 rounded-2xl bg-gradient-to-r from-rose-600/90 via-red-600/90 to-rose-700/90 hover:from-rose-500 hover:via-red-500 hover:to-rose-600 text-white font-extrabold text-xs sm:text-sm flex items-center gap-2 border border-rose-400/30 shadow-lg shadow-rose-600/25 hover:shadow-rose-500/40 backdrop-blur-md transition-all duration-200 cursor-pointer hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
            >
              <div className="w-6 h-6 rounded-lg bg-white/15 border border-white/20 flex items-center justify-center text-rose-200 group-hover:scale-110 group-hover:bg-white/25 transition-transform duration-200 shrink-0">
                <LogOut className="w-3.5 h-3.5" />
              </div>
              <span className="tracking-wide">Keluar</span>
            </button>
          </div>
        </div>

      </div>
    </header>
  );
}
