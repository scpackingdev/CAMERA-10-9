from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean
from sqlalchemy.sql import func
from .connection import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    username = Column(String, unique=True, index=True)
    password = Column(String)
    role = Column(String)  # 'operator', 'pengawas', 'admin'
    fullname = Column(String)
    nik = Column(String, unique=True, nullable=True, index=True)  # Nomor Induk Karyawan (Unik)
    is_active = Column(Boolean, default=True)

class Transaction(Base):
    __tablename__ = "transactions"
    id_trans = Column(String, primary_key=True, index=True)
    part_no = Column(String, nullable=True)
    part_name = Column(String, nullable=True)
    lot_no = Column(String, nullable=True)
    unique_no = Column(String, nullable=True)
    target_qty = Column(Integer, default=10)
    qty_actual = Column(Integer, default=0)
    status = Column(Integer, default=0)  # 0=Standby, 1=Running, 2=OK, 98=NG, 99=Cancel
    start_time = Column(DateTime, nullable=True)
    end_time = Column(DateTime, nullable=True)

class InspectionLog(Base):
    __tablename__ = "inspection_logs"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    id_trans = Column(String, index=True)
    part_no = Column(String, index=True)
    detection_status = Column(String)  # 'OK' or 'NG'
    image_path = Column(String, nullable=True)
    confidence_score = Column(Float)
    method = Column(String, default="AI", server_default="AI")  # 'AI' or 'MANUAL'
    operator_name = Column(String, nullable=True)  # Nama operator yang bertugas
    created_at = Column(DateTime, server_default=func.now())

class CameraConfig(Base):
    __tablename__ = "camera_configs"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String)
    source = Column(String)  # '0', '1', or RTSP url
    is_active = Column(Boolean, default=False)

class PartRule(Base):
    __tablename__ = "part_rules"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    p_no = Column(String, index=True, nullable=False)
    sisi = Column(String, default="-")  # e.g., 'Depan', 'Belakang' atau '-'
    nama_komponen = Column(String, nullable=False)
    qty = Column(Integer, default=1)
    min_confidence = Column(Float, default=0.70)
    avg_confidence = Column(Float, default=0.75)
    min_coverage = Column(Float, default=1.0)

class GlobalSettings(Base):
    __tablename__ = "global_settings"
    id = Column(Integer, primary_key=True, autoincrement=True)
    default_avg_conf = Column(Float, default=0.75)
    default_min_conf = Column(Float, default=0.70)
    default_min_coverage = Column(Float, default=1.0)

class SisonConfig(Base):
    __tablename__ = "sison_config"
    id = Column(Integer, primary_key=True, autoincrement=True)
    callback_url = Column(String, default="http://localhost:3000/api/kamera/callback")
    api_key = Column(String, default="kamera-secret-key")
    service_token = Column(String, nullable=True)          # Service Token jangka panjang (30 hari)
    service_token_expires_at = Column(DateTime, nullable=True)  # Tanggal kedaluwarsa service token


class AudioConfig(Base):
    __tablename__ = "audio_config"
    id = Column(Integer, primary_key=True, autoincrement=True)
    is_enabled = Column(Boolean, default=True)
    volume = Column(Integer, default=80)  # 0 - 100
    ok_custom_url = Column(String, default="/uploads/audio/default_ok.mp3")
    flip_custom_url = Column(String, default="/uploads/audio/default_flip.mp3")
    ng_custom_url = Column(String, default="/uploads/audio/default_ng.mp3")
    finish_custom_url = Column(String, default="/uploads/audio/default_finish.mp3")
    # Legacy type fields (optional compatibility)
    ok_sound_type = Column(String, default="custom")
    flip_sound_type = Column(String, default="custom")
    ng_sound_type = Column(String, default="custom")
    finish_sound_type = Column(String, default="custom")

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    timestamp = Column(DateTime, default=datetime.now, server_default=func.now())
    username = Column(String, index=True, default="SYSTEM")
    action = Column(String, nullable=False)
    details = Column(String, nullable=True)

def log_audit_event(db, username: str, action: str, details: str = ""):
    """Helper untuk mencatat aktivitas sistem / user ke tabel audit_logs."""
    try:
        log = AuditLog(
            username=username or "SYSTEM",
            action=action,
            details=details,
            timestamp=datetime.now()
        )
        db.add(log)
        db.commit()
    except Exception as e:
        print(f"[AUDIT LOG ERROR] Gagal mencatat log '{action}': {e}")
