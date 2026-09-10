import React, { useState, useEffect } from 'react';
import { Activity, CheckCircle, Clock, AlertOctagon, XCircle, Trash2, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/client';
import PageHeader from '../components/PageHeader';
import StatCard from '../components/StatCard';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import ConfirmModal from '../components/ConfirmModal';

export default function Dashboard() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showClearModal, setShowClearModal] = useState(false);
  const [clearing, setClearing] = useState(false);

  const fetchTransactions = async () => {
    try {
      const res = await api.get('/api/admin/transactions');
      setTransactions(res.data || []);
    } catch (err) {
      console.error('Failed to fetch transactions', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
    const interval = setInterval(fetchTransactions, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleClearRunning = async () => {
    setClearing(true);
    try {
      const res = await api.delete('/api/admin/transactions/running');
      toast.success(res.data?.message || 'Transaksi RUNNING berhasil dibersihkan');
      setShowClearModal(false);
      fetchTransactions();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Gagal membersihkan transaksi RUNNING');
    } finally {
      setClearing(false);
    }
  };

  const totalCount = transactions.length;
  const okCount = transactions.filter(t => t.status === 2).length;
  const runningCount = transactions.filter(t => t.status === 1).length;
  const ngCount = transactions.filter(t => t.status === 98).length;
  const cancelCount = transactions.filter(t => t.status === 99).length;

  // Calculate Yield Rate (% OK)
  const completedTotal = okCount + ngCount + cancelCount;
  const passRateVal = completedTotal > 0 ? (okCount / completedTotal) * 100 : 100;
  const passRateStr = passRateVal.toFixed(1) + '%';
  const yieldColor = passRateVal >= 95 ? 'emerald' : (passRateVal >= 85 ? 'amber' : 'rose');

  // Limit display to 10 most recent transactions
  const displayTransactions = transactions.slice(0, 10);

  const tableHeaders = [
    "ID Trans", "Part No", "Unique No", "Nama Part", "Progres Qty (Aktual / Target)", "Status", "Mulai", "Selesai"
  ];

  return (
    <div className="space-y-6 font-sans">
      <PageHeader
        title="Live"
        highlightTitle="Dashboard"
        subtitle="Pemantauan transaksi inspeksi kamera secara real-time"
      />

      {/* Stat Cards (6 Cards Layout) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <StatCard title="Total Transaksi" value={totalCount} icon={Activity} color="blue" />
        <StatCard title="Inspeksi OK (Status 2)" value={okCount} icon={CheckCircle} color="emerald" />
        <StatCard title="Yield Rate (% OK)" value={passRateStr} icon={TrendingUp} color={yieldColor} />
        <StatCard title="Proses Running (Status 1)" value={runningCount} icon={Clock} color="amber" />
        <StatCard title="Inspeksi NG (Status 98)" value={ngCount} icon={XCircle} color="rose" />
        <StatCard title="Batal (Status 99)" value={cancelCount} icon={AlertOctagon} color="purple" />
      </div>

      {/* Live Table */}
      <div className="glass-card p-6 sm:p-7 border-2 border-white/10 rounded-3xl shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 gap-3">
          <div className="flex items-center gap-3">
            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
              <span>Transaksi Terbaru</span>
            </h2>
            <span className="text-xs sm:text-sm font-extrabold px-3 py-1 rounded-xl bg-blue-500/20 text-blue-300 border border-blue-500/30">
              10 Terbaru
            </span>
          </div>

          <div className="flex items-center gap-3">
            {runningCount > 0 && (
              <button
                onClick={() => setShowClearModal(true)}
                disabled={clearing}
                className="flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-bold text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-xl hover:bg-rose-600 hover:text-white transition-all disabled:opacity-50 cursor-pointer shadow-md"
              >
                <Trash2 className="w-4 h-4" />
                <span>Hapus Data RUNNING ({runningCount})</span>
              </button>
            )}
            <span className="text-xs sm:text-sm font-semibold text-slate-400">Live Sync (1s)</span>
          </div>
        </div>

        <DataTable headers={tableHeaders} isLoading={loading} maxHeight="480px" center={true}>
          {displayTransactions.map((t) => {
            const targetQty = t.target_qty || 1;
            const actualQty = t.qty_actual || 0;
            const pct = Math.min(100, Math.round((actualQty / targetQty) * 100));

            return (
              <tr key={t.id_trans} className="hover:bg-white/5 transition-colors border-b border-white/5">
                <td className="p-4 font-mono font-bold text-blue-400 text-center text-xs sm:text-sm">{t.id_trans}</td>
                <td className="p-4 text-center font-bold text-white text-xs sm:text-sm">{t.part_no || '-'}</td>
                <td className="p-4 text-center font-mono text-slate-300 text-xs sm:text-sm">{t.unique_no || '-'}</td>
                <td className="p-4 text-center font-medium text-slate-200 text-xs sm:text-sm truncate max-w-[150px]">{t.part_name || '-'}</td>

                {/* Progress Bar Visual (Target vs Actual) */}
                <td className="p-4">
                  <div className="flex flex-col gap-1.5 w-48 mx-auto">
                    <div className="flex justify-between items-center text-xs font-bold px-0.5">
                      <span className="text-emerald-400">{actualQty} Pcs</span>
                      <span className="text-slate-400">/ {targetQty} Pcs</span>
                      <span className="text-[11px] font-mono font-extrabold text-blue-300 bg-blue-500/20 px-2 py-0.5 rounded border border-blue-500/30">{pct}%</span>
                    </div>
                    <div className="w-full h-2.5 bg-black/40 rounded-full overflow-hidden border border-white/10 p-0.5">
                      <div 
                        className={`h-full transition-all duration-500 rounded-full ${
                          pct >= 100 
                            ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' 
                            : t.status === 0 
                            ? 'bg-rose-500' 
                            : 'bg-blue-500 animate-pulse'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </td>

                <td className="p-4 text-center"><StatusBadge status={t.status} /></td>
                <td className="p-4 text-xs sm:text-sm font-semibold text-slate-300 text-center font-mono">
                  {t.start_time ? new Date(t.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                </td>
                <td className="p-4 text-xs sm:text-sm font-semibold text-slate-300 text-center font-mono">
                  {t.end_time ? new Date(t.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                </td>
              </tr>
            );
          })}
        </DataTable>
      </div>

      <ConfirmModal
        isOpen={showClearModal}
        title="Hapus Transaksi RUNNING"
        message={`Apakah Anda yakin ingin menghapus ${runningCount} transaksi berstatus RUNNING yang menggantung dari database?`}
        confirmText="Hapus Data RUNNING"
        isDanger={true}
        onConfirm={handleClearRunning}
        onCancel={() => setShowClearModal(false)}
      />
    </div>
  );
}
