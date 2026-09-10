import React from 'react';

export default function StatusBadge({ status, className = "" }) {
  let badgeStyle = "bg-slate-800/90 text-slate-300 border-slate-600/50";
  let text = status;

  if (typeof status === 'number') {
    if (status === 2) {
      badgeStyle = "bg-emerald-500/15 text-emerald-400 border-emerald-500/40 shadow-emerald-950/20";
      text = "Selesai (OK)";
    } else if (status === 1) {
      badgeStyle = "bg-amber-500/15 text-amber-400 border-amber-500/40 animate-pulse";
      text = "RUNNING / PROSES";
    } else if (status === 98) {
      badgeStyle = "bg-rose-500/15 text-rose-400 border-rose-500/40 animate-pulse";
      text = "NG (REJECT)";
    } else if (status === 99) {
      badgeStyle = "bg-purple-500/15 text-purple-300 border-purple-500/40";
      text = "BATAL (CANCEL)";
    } else if (status === 0) {
      badgeStyle = "bg-slate-800/90 text-slate-300 border-slate-600/50";
      text = "STANDBY";
    } else {
      badgeStyle = "bg-rose-500/15 text-rose-400 border-rose-500/40";
      text = "NG / Gagal";
    }
  } else if (typeof status === 'string') {
    const s = status.toUpperCase().trim();
    if (s === 'STANDBY' || s === 'IDLE' || s === 'READY') {
      badgeStyle = "bg-slate-800/90 text-slate-300 border-slate-600/50";
      text = "STANDBY";
    } else if (s.includes('OK') || s === 'SELESAI' || s === 'ACTIVE' || s === 'LOGIN') {
      badgeStyle = "bg-emerald-500/15 text-emerald-400 border-emerald-500/40";
    } else if (s.includes('RUNNING') || s === 'PENDING' || s.includes('MANUAL')) {
      badgeStyle = "bg-amber-500/15 text-amber-400 border-amber-500/40";
    } else if (s.includes('NG') || s === 'FAILED' || s === 'LOGOUT' || s === 'DELETE' || s.includes('ALARM')) {
      badgeStyle = "bg-rose-500/15 text-rose-400 border-rose-500/40 animate-pulse";
    } else {
      badgeStyle = "bg-blue-500/15 text-blue-400 border-blue-500/40";
    }
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-black tracking-wide border shadow-sm shrink-0 whitespace-nowrap ${badgeStyle} ${className}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0"></span>
      <span className="truncate">{text}</span>
    </span>
  );
}
