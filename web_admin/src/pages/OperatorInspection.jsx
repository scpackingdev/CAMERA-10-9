import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { WifiOff } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/client';
import soundManager from '../utils/soundManager';
import ConfirmModal from '../components/ConfirmModal';
import InspectionHeader from '../components/operator/InspectionHeader';
import InspectionToolbar from '../components/operator/InspectionToolbar';
import InspectionCameraFeed from '../components/operator/InspectionCameraFeed';
import PartOkModal from '../components/operator/PartOkModal';
import NgAlarmModal from '../components/operator/NgAlarmModal';
import CancelKanbanModal from '../components/operator/CancelKanbanModal';
import AudioSettingsModal from '../components/operator/AudioSettingsModal';

export default function OperatorInspection() {
  const navigate = useNavigate();

  // State Telemetry
  const [telemetry, setTelemetry] = useState({
    status: 'STANDBY',
    id_trans: '',
    p_no: '',
    qty_remaining: 0,
    target_qty: 0,
    qty_completed: 0,
    current_side: 'FRONT',
    inspection_mode: 'AI',
    pesan_ui: 'STANDBY',
    is_cam_active: true,
    reconnect_attempts: 0,
    operator: {
      name: localStorage.getItem('operator_name') || 'Operator',
      username: localStorage.getItem('username') || '',
      role: localStorage.getItem('user_role') || 'operator',
      login_time: Date.now() / 1000
    },
    popups: {
      part_ok: false,
      flip_part: false,
      ng_active: false,
      ng_image_url: '',
      details: {}
    },
    live_metrics: {}
  });

  // Modal States
  const [showPartOkModal, setShowPartOkModal] = useState(false);
  const [showNgModal, setShowNgModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  // Ref untuk mencegah suara sisi depan OK diputar lebih dari sekali — track by timestamp event dari backend
  const frontOkPlayedTsRef = useRef(0);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showAudioModal, setShowAudioModal] = useState(false);

  // Audio State Reactivity
  const [audioState, setAudioState] = useState({
    isEnabled: soundManager.isEnabled,
    volume: Math.round(soundManager.volume * 100),
    selectedDeviceId: soundManager.selectedDeviceId,
    selectedDeviceName: soundManager.selectedDeviceName,
    config: soundManager.config
  });

  // Audio Devices State (Hardware USB Speaker & Browser Output Devices)
  const [audioDevices, setAudioDevices] = useState([
    { id: 'default', name: 'Default - Output Sistem Komputer (Otomatis)', is_default: true, type: 'output' }
  ]);
  const [scanningAudioDevices, setScanningAudioDevices] = useState(false);

  const fetchOrScanAudioDevices = async (isManualScan = false) => {
    setScanningAudioDevices(true);
    try {
      // Ambil daftar perangkat output audio asli langsung dari browser API
      const browserDevs = await soundManager.getBrowserAudioDevices();
      setAudioDevices(browserDevs);
      
      if (isManualScan) {
        toast.success(`Ditemukan ${browserDevs.length} opsi output audio!`, { icon: '🎧' });
      }
    } catch (err) {
      console.warn('Gagal memindai perangkat audio:', err);
      if (isManualScan) toast.error('Gagal memindai perangkat audio');
    } finally {
      setScanningAudioDevices(false);
    }
  };

  const handleAudioDeviceChange = async (e) => {
    const chosenId = e.target.value;
    const chosenDev = audioDevices.find((d) => d.id === chosenId) || { id: chosenId, name: 'Audio Output' };
    await soundManager.setAudioOutputDevice(chosenDev.id, chosenDev.name);
    soundManager.testSound('ok', 'chime');
    toast.success(`Output audio dialihkan ke: ${chosenDev.name}`, { icon: '🎧' });
  };

  useEffect(() => {
    if (showAudioModal) {
      fetchOrScanAudioDevices(false);
    }
  }, [showAudioModal]);

  // State NG Confirmation
  const [ngResolving, setNgResolving] = useState(false);

  // Reference to pause SSE updates briefly after actions to prevent state flicker
  const ignoreSseRef = useRef(0);

  // State Jaringan & Auto-Reconnect
  const [isNetworkOffline, setIsNetworkOffline] = useState(false);
  const offlineErrorsRef = useRef(0);

  // Sinkronisasi Konfigurasi Audio Backend Real-time
  useEffect(() => {
    const fetchAudioConfig = async () => {
      try {
        const res = await api.get('/api/audio/config');
        if (res.data) {
          soundManager.syncConfig(res.data);
        }
      } catch {}
    };
    fetchAudioConfig();

    // Auto-sync audio config setiap 10 detik & saat window focus
    const audioSyncTimer = setInterval(fetchAudioConfig, 10000);
    const onFocus = () => fetchAudioConfig();
    window.addEventListener('focus', onFocus);

    const unsub = soundManager.subscribe((state) => {
      setAudioState(state);
    });

    return () => {
      clearInterval(audioSyncTimer);
      window.removeEventListener('focus', onFocus);
      unsub();
    };
  }, []);

  // 1. Sinkronisasi Real-Time via SSE (Server-Sent Events) dengan Fallback Polling & Network Recovery
  useEffect(() => {
    let eventSource = null;
    let fallbackInterval = null;

    const handleOnline = () => {
      setIsNetworkOffline(false);
      offlineErrorsRef.current = 0;
      toast.success('Koneksi Jaringan Pulih!', { icon: '🟢' });
    };

    const handleOffline = () => {
      setIsNetworkOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const connectSSE = () => {
      try {
        eventSource = new EventSource('/api/operator/events');
        eventSource.onmessage = (e) => {
          try {
            const data = JSON.parse(e.data);
            if (ignoreSseRef.current > Date.now()) return;
            setTelemetry((prev) => ({
              ...prev,
              ...data
            }));
            setIsNetworkOffline(false);
            offlineErrorsRef.current = 0;
          } catch {}
        };
        eventSource.onerror = () => {
          if (eventSource) eventSource.close();
          offlineErrorsRef.current += 1;
          if (offlineErrorsRef.current > 3) setIsNetworkOffline(true);
        };
      } catch {
        offlineErrorsRef.current += 1;
        if (offlineErrorsRef.current > 3) setIsNetworkOffline(true);
      }
    };

    connectSSE();
    const reconnectInterval = setInterval(() => {
      if (!eventSource || eventSource.readyState === EventSource.CLOSED) {
        connectSSE();
      }
    }, 4000);

    fallbackInterval = setInterval(async () => {
      if (ignoreSseRef.current > Date.now()) return;
      try {
        const res = await api.get('/api/operator/telemetry');
        if (res.data) {
          setTelemetry((prev) => ({
            ...prev,
            ...res.data
          }));
          setIsNetworkOffline(false);
          offlineErrorsRef.current = 0;
        }
      } catch {
        offlineErrorsRef.current += 1;
        if (offlineErrorsRef.current > 3) setIsNetworkOffline(true);
      }
    }, 2000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (eventSource) eventSource.close();
      if (fallbackInterval) clearInterval(fallbackInterval);
      if (reconnectInterval) clearInterval(reconnectInterval);
    };
  }, []);

  // Sinkronisasi Sesi Operator Aktif (Heartbeat Session)
  useEffect(() => {
    const syncOperatorSession = async () => {
      try {
        const username = localStorage.getItem('username') || 'op';
        const fullname = localStorage.getItem('operator_name') || username;
        const role = localStorage.getItem('user_role') || 'operator';
        await api.post('/api/operator/heartbeat', { username, fullname, role });
      } catch {}
    };
    syncOperatorSession();
    const heartbeatTimer = setInterval(syncOperatorSession, 15000);
    return () => clearInterval(heartbeatTimer);
  }, []);

  // Pengecekan Kedaluwarsa Sesi (8 Jam untuk Operator)
  useEffect(() => {
    const checkSessionExpiry = () => {
      const token = localStorage.getItem('operator_token') || localStorage.getItem('admin_token');
      if (!token) {
        navigate('/login');
        return;
      }
      try {
        const parts = token.split('.');
        if (parts.length === 2) {
          const payloadB64 = parts[0];
          const padding = '='.repeat((4 - (payloadB64.length % 4)) % 4);
          const base64 = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
          const jsonPayload = JSON.parse(atob(base64 + padding));
          if (jsonPayload.exp && Date.now() / 1000 > jsonPayload.exp) {
            toast.error('Sesi kerja Anda telah kedaluwarsa (lebih dari 8 jam). Silakan login kembali.', { duration: 5000 });
            localStorage.removeItem('admin_token');
            localStorage.removeItem('operator_token');
            localStorage.removeItem('user_role');
            localStorage.removeItem('username');
            localStorage.removeItem('operator_name');
            navigate('/login');
          }
        }
      } catch {}
    };

    checkSessionExpiry();
    const sessionTimer = setInterval(checkSessionExpiry, 30000);
    return () => clearInterval(sessionTimer);
  }, [navigate]);

  // Browser Audio Unlock Handler pada interaksi pertama operator
  useEffect(() => {
    const unlockAudio = () => {
      soundManager.initContext();
    };
    window.addEventListener('click', unlockAudio, { capture: true, passive: true });
    window.addEventListener('keydown', unlockAudio, { capture: true, passive: true });
    window.addEventListener('touchstart', unlockAudio, { capture: true, passive: true });
    return () => {
      window.removeEventListener('click', unlockAudio, { capture: true });
      window.removeEventListener('keydown', unlockAudio, { capture: true });
      window.removeEventListener('touchstart', unlockAudio, { capture: true });
    };
  }, []);

  // 2. Tangani Perubahan Popups & Audio Notifikasi
  const prevPopupsRef = useRef({});
  useEffect(() => {
    if (telemetry.popups) {
      const prev = prevPopupsRef.current || {};
      const isBatchCompleted = telemetry.status === 'COMPLETED' || (telemetry.qty_remaining === 0 && (telemetry.qty_actual || 0) > 0);
      const wasBatchCompleted = prev.status === 'COMPLETED' || (prev.qty_remaining === 0 && (prev.qty_actual || 0) > 0);

      // Trigger 4: Suara Selesai Batch (Kemenangan/Target Selesai)
      if (isBatchCompleted && !wasBatchCompleted && telemetry.status !== 'STANDBY') {
        soundManager.playFinish();
        setShowPartOkModal(false);
      }
      // Trigger 1: Suara Part OK (Hanya jika batch BELUM selesai)
      else if (telemetry.popups.part_ok && !isBatchCompleted && telemetry.status !== 'STANDBY') {
        if (!prev.part_ok) {
          soundManager.playOk();
        }
        setShowPartOkModal(true);
      } else {
        setShowPartOkModal(false);
      }

      // Trigger 3: Suara Alarm Cacat NG
      if (telemetry.popups.ng_active || telemetry.status === 'NG') {
        if (!prev.ng_active && telemetry.status !== 'STANDBY') {
          soundManager.startNg();
        }
        setShowNgModal(true);
      } else {
        setShowNgModal(false);
        if (prev.ng_active || prev.status === 'NG') {
          soundManager.stopNg();
        }
      }

      prevPopupsRef.current = { 
        ...telemetry.popups, 
        status: telemetry.status, 
        current_side: telemetry.current_side,
        qty_remaining: telemetry.qty_remaining,
        qty_actual: telemetry.qty_actual
      };
    }
  }, [telemetry.popups, telemetry.status, telemetry.current_side, telemetry.qty_completed, telemetry.qty_remaining, telemetry.qty_actual]);

  // Trigger 2 TERPISAH: Suara "Balik Part" (Flip) — watch front_ok_notif_ts secara independen
  // Dipisah agar tidak terblokir oleh timing prevPopupsRef atau batching SSE
  useEffect(() => {
    const notifTs = telemetry.popups?.front_ok_notif_ts || 0;
    if (
      notifTs > 0 &&
      notifTs !== frontOkPlayedTsRef.current &&
      (Date.now() / 1000 - notifTs) < 5 &&
      telemetry.status !== 'STANDBY'
    ) {
      frontOkPlayedTsRef.current = notifTs;
      soundManager.playOk();
      setTimeout(() => soundManager.playFlip(), 1200);
      toast.success('✅ Sisi Depan OK! Silakan balik part ke Sisi Belakang (REAR)', {
        id: 'flip-side-toast',
        icon: '🔄',
        duration: 3500
      });
    }
  }, [telemetry.popups?.front_ok_notif_ts, telemetry.status]);

  useEffect(() => {
    return () => {
      soundManager.stopNg();
    };
  }, []);


  // Action Handlers
  const handleOpenCancelModal = () => {
    setShowCancelModal(true);
  };

  const handleCancelKanban = async (reason = 'Stok part pengganti habis', statusCode = 99) => {
    soundManager.stopAll();
    setIsCancelling(true);
    try {
      const res = await api.post('/api/operator/cancel-kanban', { reason, status: statusCode });
      soundManager.stopAll();
      setShowCancelModal(false);
      setShowNgModal(false);
      setShowPartOkModal(false);
      const isNg = statusCode === 98;
      toast.error(
        res.data?.message || (isNg ? 'Transaksi Ditolak sebagai NG (Status: 98).' : 'Transaksi Kanban Dibatalkan (Status: 99).'), 
        { icon: isNg ? '❌' : '⛔', duration: 4000 }
      );
      const stateRes = await api.get('/api/operator/state');
      if (stateRes.data) setTelemetry(stateRes.data);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Gagal memproses transaksi Kanban');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleClosePartOkModal = async () => {
    soundManager.stopAll();
    ignoreSseRef.current = Date.now() + 1500; // Block stale SSE for 1.5s
    setShowPartOkModal(false);
    try {
      await api.post('/api/operator/clear-popup', { popup_type: 'part_ok' });
    } catch {}
  };

  const handleFinishBatch = async () => {
    soundManager.stopAll();
    ignoreSseRef.current = Date.now() + 1500; // Block stale SSE for 1.5s
    setShowPartOkModal(false);
    try {
      await api.post('/api/operator/clear-popup', { popup_type: 'ALL' });
      const stateRes = await api.get('/api/operator/state');
      if (stateRes.data) setTelemetry(stateRes.data);
    } catch {}
  };

  const handleResolveNg = async (actionType = 'RETRY') => {
    soundManager.stopAll();
    setNgResolving(true);
    try {
      const res = await api.post('/api/operator/resolve-ng', { action: actionType });
      if (res.data?.success) {
        soundManager.stopAll();
        setShowNgModal(false);
        if (actionType === 'CONFIRM_REPLACE') {
          toast.success('Part Cacat Dikonfirmasi. Silakan pasang Part Pengganti Baru!', { icon: '🚨' });
        } else if (actionType === 'REJECT_NG') {
          toast.error('Transaksi Ditolak sebagai NG (Status: 98). Callback SISON terkirim.', { icon: '❌', duration: 4000 });
        } else {
          toast.success('Alarm Dimatikan. Memulai Deteksi Ulang Part (Reposisi)...', { icon: '🔄' });
        }
        const stateRes = await api.get('/api/operator/state');
        if (stateRes.data) setTelemetry(stateRes.data);
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Gagal merespons alarm NG');
    } finally {
      setNgResolving(false);
    }
  };

  const handleLogout = async () => {
    const myUname = localStorage.getItem('username') || '';
    try {
      await api.post('/api/operator/logout', { username: myUname });
    } catch {}
    localStorage.removeItem('operator_token');
    localStorage.removeItem('operator_name');
    localStorage.removeItem('user_role');
    localStorage.removeItem('username');
    localStorage.removeItem('admin_token');
    navigate('/login');
  };

  // Status Styling Logic
  const isRunning = telemetry.status === 'OK' || telemetry.status === 'RUNNING';
  const isManualMode = isRunning && (telemetry.inspection_mode === 'MANUAL');
  const isNg = telemetry.status === 'NG';
  const isCompleted = telemetry.status === 'COMPLETED';
  const isPopupVisible = showPartOkModal;

  let statusBg = 'bg-blue-900/80 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)] transition-all duration-300';
  let statusText = 'STANDBY';
  let statusTextColor = 'text-blue-300 font-bold tracking-widest';

  if (isNg) {
    statusBg = 'bg-rose-950/80 border-rose-500 animate-pulse';
    statusText = 'NG TERDETEKSI';
    statusTextColor = 'text-rose-400 font-black';
  } else if (isPopupVisible) {
    statusBg = 'bg-emerald-900/90 border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.4)] transition-all duration-300';
    statusText = 'MENUNGGU KONFIRMASI OPERATOR';
    statusTextColor = 'text-emerald-300 font-black tracking-widest';
  } else if (isCompleted) {
    statusBg = 'bg-sky-950/80 border-sky-500';
    statusText = 'SELESAI (OK)';
    statusTextColor = 'text-sky-400 font-bold';
  } else if (isRunning) {
    if (isManualMode) {
      statusBg = 'bg-amber-950/80 border-amber-500';
      statusText = 'MODE MANUAL (VISUAL)';
      statusTextColor = 'text-amber-400 font-bold';
    } else if (telemetry.live_metrics?.is_ng_stabilizing) {
      statusBg = 'bg-amber-950/90 border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.4)]';
      statusText = `MEMVERIFIKASI CACAT (${telemetry.live_metrics.ng_progress || 0}%)`;
      statusTextColor = 'text-amber-300 font-black tracking-wider animate-pulse';
    } else if (telemetry.live_metrics?.is_stabilizing) {
      statusBg = 'bg-teal-950/90 border-teal-400 shadow-[0_0_20px_rgba(20,184,166,0.4)]';
      statusText = `MEMVERIFIKASI OK (${telemetry.live_metrics.hold_progress || 0}%)`;
      statusTextColor = 'text-teal-300 font-black tracking-wider animate-pulse';
    } else {
      statusBg = 'bg-emerald-950/80 border-emerald-500';
      statusText = telemetry.current_side === 'REAR' ? 'DETECT PART (SISI REAR)' : 'DETECT PART (SISI FRONT)';
      statusTextColor = 'text-emerald-400 font-bold';
    }
  }

  // Operator yang login di browser lokal ini (Edge / Opera / Chrome)
  const localOperatorName = localStorage.getItem('operator_name') || localStorage.getItem('username') || 'Operator';
  const opLoginDate = telemetry.operator?.login_time ? new Date(telemetry.operator.login_time * 1000) : new Date();
  const loginTimeStr = opLoginDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className={`h-screen max-h-screen w-screen overflow-hidden flex flex-col p-2.5 sm:p-3 gap-2 font-sans select-none app-bg-gradient box-border ${isNg ? 'ring-8 ring-rose-600 animate-pulse' : ''}`}>
      
      {/* Offline Network Warning Banner */}
      {isNetworkOffline && (
        <div className="bg-gradient-to-r from-amber-600 via-rose-600 to-amber-700 text-white px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-black flex items-center justify-between shadow-2xl animate-pulse border border-white/30 z-50 shrink-0">
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4 animate-bounce shrink-0" />
            <span>⚠️ Jaringan Terputus dari Server. Menghubungkan kembali secara otomatis... Progress inspeksi tetap aman tersimpan.</span>
          </div>
          <span className="bg-black/40 px-2 py-0.5 rounded-md text-[11px] font-mono shrink-0">Auto-Reconnecting</span>
        </div>
      )}

      {/* 1. TOP HUD (HEADS-UP DISPLAY) HEADER */}
      <InspectionHeader
        telemetry={telemetry}
        statusBg={statusBg}
        statusTextColor={statusTextColor}
        statusText={statusText}
        audioState={audioState}
        onOpenAudioModal={() => setShowAudioModal(true)}
        localOperatorName={localOperatorName}
        loginTimeStr={loginTimeStr}
        onNavigateHistory={() => navigate('/operator/history')}
        onOpenLogoutModal={() => setShowLogoutModal(true)}
      />

      {/* 2. ACTION TOOLBAR (Permanen, Disabled saat Standby, Aktif saat Transaksi) */}
      <InspectionToolbar
        isRunning={isRunning}
        isNg={isNg}
        onOpenCancelKanban={handleOpenCancelModal}
      />

      {/* 3. LIVE VIDEO CAMERA STREAM CONTAINER WITH FLOATING POPUPS */}
      <InspectionCameraFeed telemetry={telemetry}>
        {/* DRAGGABLE FLOATING POPUP: PART OK / INSPEKSI SELESAI */}
        <PartOkModal
          isOpen={showPartOkModal}
          telemetry={telemetry}
          onClose={handleClosePartOkModal}
          onFinishBatch={handleFinishBatch}
        />

        {/* DRAGGABLE FLOATING POPUP: NG ABNORMALITY & 3 OPSI KEPUTUSAN */}
        <NgAlarmModal
          isOpen={showNgModal}
          telemetry={telemetry}
          ngResolving={ngResolving}
          onResolveNg={handleResolveNg}
          onOpenCancelKanban={handleOpenCancelModal}
        />

        {/* DRAGGABLE FLOATING POPUP: SAFE CONFIRMATION BATALKAN KANBAN */}
        <CancelKanbanModal
          isOpen={showCancelModal}
          telemetry={telemetry}
          isCancelling={isCancelling}
          onClose={() => setShowCancelModal(false)}
          onConfirmCancel={handleCancelKanban}
        />
      </InspectionCameraFeed>

      {/* 8. MODAL KONFIRMASI LOGOUT OPERATOR */}
      <ConfirmModal
        isOpen={showLogoutModal}
        title="Konfirmasi Keluar Sesi"
        message="Apakah Anda yakin ingin keluar dari layar Inspeksi Operator? Sesi aktif operator Anda akan diakhiri."
        confirmText="Ya, Keluar"
        cancelText="Batal"
        isDanger={true}
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutModal(false)}
      />

      {/* 9. MODAL PENGATURAN AUDIO & SPEAKER USB OPERATOR */}
      <AudioSettingsModal
        isOpen={showAudioModal}
        audioState={audioState}
        audioDevices={audioDevices}
        scanningAudioDevices={scanningAudioDevices}
        onFetchOrScanAudioDevices={fetchOrScanAudioDevices}
        onAudioDeviceChange={handleAudioDeviceChange}
        onClose={() => {
          soundManager.stopNg();
          setShowAudioModal(false);
        }}
      />
    </div>
  );
}
