/**
 * 🔊 SoundManager: Audio Notification Engine (AI Voice & Uploaded Audio Files)
 * Dirancang khusus untuk Kiosk Operator Industri & Manajemen Audio Admin.
 * Memutar file audio hasil sintesis AI dan file audio yang diunggah secara presisi & zero-latency.
 */

class SoundManager {
  constructor() {
    this.ctx = null;
    this.isEnabled = localStorage.getItem('inspection_audio_enabled') !== 'false';
    this.volume = parseFloat(localStorage.getItem('inspection_audio_volume') || '0.8');
    this.selectedDeviceId = localStorage.getItem('inspection_audio_device_id') || 'default';
    this.selectedDeviceName = localStorage.getItem('inspection_audio_device_name') || 'Default Speaker Output';
    
    // Config 4 File Audio (AI Voice / Uploaded Audio)
    this.config = {
      ok_custom_url: '/uploads/audio/default_ok.mp3',
      flip_custom_url: '/uploads/audio/default_flip.mp3',
      ng_custom_url: '/uploads/audio/default_ng.mp3',
      finish_custom_url: '/uploads/audio/default_finish.mp3',
    };

    // Active Audio Player Refs
    this.activeAudio = null;
    this.activeFlipAudio = null;
    this.activeNgAudio = null;

    // Listeners for UI state reactivity
    this.listeners = new Set();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    this.listeners.forEach(cb => cb({
      isEnabled: this.isEnabled,
      volume: Math.round(this.volume * 100),
      selectedDeviceId: this.selectedDeviceId,
      selectedDeviceName: this.selectedDeviceName,
      config: { ...this.config }
    }));
  }

  initContext() {
    const sinkVal = (this.selectedDeviceId && this.selectedDeviceId !== 'default') ? this.selectedDeviceId : '';
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        try {
          this.ctx = sinkVal ? new AudioCtx({ sinkId: sinkVal }) : new AudioCtx();
        } catch {
          this.ctx = new AudioCtx();
        }
      }
    }
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      if (typeof this.ctx.setSinkId === 'function' && sinkVal && this.ctx.sinkId !== sinkVal) {
        this.ctx.setSinkId(sinkVal).catch(() => {});
      }
    }
    return this.ctx;
  }

  async setAudioOutputDevice(deviceId, deviceName = '') {
    this.selectedDeviceId = deviceId || 'default';
    if (deviceName) {
      this.selectedDeviceName = deviceName;
      localStorage.setItem('inspection_audio_device_name', deviceName);
    }
    localStorage.setItem('inspection_audio_device_id', this.selectedDeviceId);
    
    const sinkVal = (this.selectedDeviceId === 'default' || !this.selectedDeviceId) ? '' : this.selectedDeviceId;

    // Terapkan ke AudioContext aktif atau bangun ulang jika diperlukan
    if (this.ctx) {
      if (typeof this.ctx.setSinkId === 'function') {
        try {
          await this.ctx.setSinkId(sinkVal);
        } catch (err) {
          console.warn('[SoundManager] ctx.setSinkId gagal, rebuild AudioContext:', err);
          try {
            await this.ctx.close();
          } catch {}
          this.ctx = null;
          this.initContext();
        }
      } else {
        try {
          await this.ctx.close();
        } catch {}
        this.ctx = null;
        this.initContext();
      }
    }

    if (this.activeAudio && typeof this.activeAudio.setSinkId === 'function') {
      try {
        await this.activeAudio.setSinkId(sinkVal);
      } catch {}
    }

    if (this.activeNgAudio && typeof this.activeNgAudio.setSinkId === 'function') {
      try {
        await this.activeNgAudio.setSinkId(sinkVal);
      } catch {}
    }
    this.notify();
  }

  async getBrowserAudioDevices() {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        return [{ id: 'default', name: 'Default - Output Sistem Komputer (Otomatis)', is_default: true, type: 'output' }];
      }

      let devices = await navigator.mediaDevices.enumerateDevices();
      let audioOutputs = devices.filter(d => d.kind === 'audiooutput');

      // Jika label masih kosong (karena browser butuh trigger izin media)
      const isBlank = audioOutputs.some(d => !d.label || d.label.trim() === '');
      if (isBlank) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream.getTracks().forEach(track => track.stop());
          devices = await navigator.mediaDevices.enumerateDevices();
          audioOutputs = devices.filter(d => d.kind === 'audiooutput');
        } catch {}
      }

      const result = [];
      result.push({
        id: 'default',
        name: 'Default - Output Sistem Komputer (Otomatis)',
        label: 'Default - Output Sistem Komputer (Otomatis)',
        is_default: true,
        type: 'output'
      });

      audioOutputs.forEach((d, idx) => {
        if (d.deviceId === 'default') return;
        const name = d.label || `Speaker ${idx + 1}`;
        const nameLower = name.toLowerCase();
        const isUsb = nameLower.includes('usb');
        const isHeadset = nameLower.includes('headset') || nameLower.includes('headphone') || nameLower.includes('earphone');

        result.push({
          id: d.deviceId,
          name: name,
          label: name,
          is_usb: isUsb,
          is_headset: isHeadset,
          type: 'output'
        });
      });

      return result;
    } catch (err) {
      console.warn('[SoundManager] getBrowserAudioDevices error:', err);
      return [{ id: 'default', name: 'Default - Output Sistem Komputer (Otomatis)', is_default: true, type: 'output' }];
    }
  }

  setEnabled(enabled) {
    this.isEnabled = !!enabled;
    localStorage.setItem('inspection_audio_enabled', this.isEnabled ? 'true' : 'false');
    if (!this.isEnabled) {
      this.stopAll();
    }
    this.notify();
  }

  setVolume(volPercent) {
    const clamped = Math.max(0, Math.min(100, volPercent));
    this.volume = clamped / 100;
    localStorage.setItem('inspection_audio_volume', this.volume.toString());
    if (this.activeAudio) {
      this.activeAudio.volume = this.volume;
    }
    if (this.activeNgAudio) {
      this.activeNgAudio.volume = this.volume;
    }
    this.notify();
  }

  syncConfig(newConfig) {
    if (!newConfig) return;
    this.config = {
      ...this.config,
      ...newConfig
    };
    if (newConfig.is_enabled !== undefined) {
      this.isEnabled = !!newConfig.is_enabled;
    }
    if (newConfig.volume !== undefined) {
      this.volume = Math.max(0, Math.min(100, newConfig.volume)) / 100;
    }
    this.notify();
  }

  // --- HENTIKAN SUARA ALARM CACAT (NG LOOP) ---
  stopNg() {
    if (this.activeNgAudio) {
      try {
        this.activeNgAudio.pause();
        this.activeNgAudio.currentTime = 0;
      } catch {}
      this.activeNgAudio = null;
    }
  }

  // --- HENTIKAN SELURUH SUARA SECARA INSTAN ---
  stopAll() {
    if (this.activeAudio) {
      try {
        this.activeAudio.pause();
        this.activeAudio.currentTime = 0;
      } catch {}
      this.activeAudio = null;
    }
    if (this.activeFlipAudio) {
      try {
        this.activeFlipAudio.pause();
        this.activeFlipAudio.currentTime = 0;
      } catch {}
      this.activeFlipAudio = null;
    }
    this.stopNg();
    if (window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
  }

  // --- PEMUTAR FILE AUDIO (AI VOICE / UPLOAD) ---
  playAudioFile(url) {
    if (!this.isEnabled || this.volume <= 0 || !url) return;
    // Potong suara ucapan sebelumnya jika masih aktif agar tidak saling tumpang tindih
    if (this.activeAudio) {
      try {
        this.activeAudio.pause();
        this.activeAudio.currentTime = 0;
      } catch {}
      this.activeAudio = null;
    }
    this.stopNg();
    try {
      const audio = new Audio(url);
      audio.volume = this.volume;
      const sinkVal = (this.selectedDeviceId && this.selectedDeviceId !== 'default') ? this.selectedDeviceId : '';
      if (typeof audio.setSinkId === 'function' && sinkVal) {
        audio.setSinkId(sinkVal).catch(() => {});
      }
      audio.onended = () => {
        if (this.activeAudio === audio) {
          this.activeAudio = null;
        }
      };
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn('[SoundManager] Play audio error (Autoplay/Device):', err);
        });
      }
      this.activeAudio = audio;
    } catch (err) {
      console.warn('[SoundManager] Audio initialization error:', err);
    }
  }

  playAudioLoop(url) {
    if (!this.isEnabled || this.volume <= 0 || !url) return;
    // Potong/matikan suara sebelumnya agar tidak bertabrakan
    this.stopAll();
    try {
      const audio = new Audio(url);
      audio.volume = this.volume;
      audio.loop = true;
      const sinkVal = (this.selectedDeviceId && this.selectedDeviceId !== 'default') ? this.selectedDeviceId : '';
      if (typeof audio.setSinkId === 'function' && sinkVal) {
        audio.setSinkId(sinkVal).catch(() => {});
      }
      audio.play().catch((err) => {
        console.warn('[SoundManager] Loop audio play error:', err);
      });
      this.activeNgAudio = audio;
    } catch (err) {
      console.warn('[SoundManager] Loop audio error:', err);
    }
  }

  // --- 1. SUARA PART OK ---
  playOk() {
    const url = this.config.ok_custom_url || '/uploads/audio/default_ok.mp3';
    this.playAudioFile(url);
  }

  // --- 2. SUARA BALIK PART (FLIP) — slot audio terpisah agar tidak terpotong oleh playOk ---
  playFlip() {
    const url = this.config.flip_custom_url || '/uploads/audio/default_flip.mp3';
    if (!this.isEnabled || this.volume <= 0 || !url) return;
    // Hentikan flip sebelumnya jika masih ada
    if (this.activeFlipAudio) {
      try { this.activeFlipAudio.pause(); this.activeFlipAudio.currentTime = 0; } catch {}
      this.activeFlipAudio = null;
    }
    try {
      const audio = new Audio(url);
      audio.volume = this.volume;
      const sinkVal = (this.selectedDeviceId && this.selectedDeviceId !== 'default') ? this.selectedDeviceId : '';
      if (typeof audio.setSinkId === 'function' && sinkVal) {
        audio.setSinkId(sinkVal).catch(() => {});
      }
      audio.onended = () => { if (this.activeFlipAudio === audio) this.activeFlipAudio = null; };
      const p = audio.play();
      if (p !== undefined) p.catch(err => console.warn('[SoundManager] playFlip error:', err));
      this.activeFlipAudio = audio;
    } catch (err) {
      console.warn('[SoundManager] playFlip init error:', err);
    }
  }


  // --- 3. SUARA ALARM CACAT (NG LOOP) ---
  startNg() {
    const url = this.config.ng_custom_url || '/uploads/audio/default_ng.mp3';
    this.playAudioLoop(url);
  }

  // --- 4. SUARA SELESAI BATCH (FINISH) ---
  playFinish() {
    const url = this.config.finish_custom_url || '/uploads/audio/default_finish.mp3';
    this.playAudioFile(url);
  }

  // --- 5. TEST METHOD ---
  testSound(category, customUrl = null) {
    this.stopAll();
    if (category === 'ok') {
      this.playAudioFile(customUrl || this.config.ok_custom_url || '/uploads/audio/default_ok.mp3');
    } else if (category === 'flip') {
      this.playAudioFile(customUrl || this.config.flip_custom_url || '/uploads/audio/default_flip.mp3');
    } else if (category === 'ng') {
      this.playAudioLoop(customUrl || this.config.ng_custom_url || '/uploads/audio/default_ng.mp3');
      // Auto stop test NG setelah 4 detik
      setTimeout(() => {
        this.stopAll();
      }, 4000);
    } else if (category === 'finish') {
      this.playAudioFile(customUrl || this.config.finish_custom_url || '/uploads/audio/default_finish.mp3');
    }
  }
}

export const soundManager = new SoundManager();
export default soundManager;
