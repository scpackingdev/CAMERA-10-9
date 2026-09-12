import os
import threading
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy.sql import func

from core import state
from database import get_db, PartRule, Transaction, SessionLocal, SisonConfig, User, verify_password, log_audit_event
from api.auth import decode_admin_token
from integrations import SisonSender

router = APIRouter()
security = HTTPBearer(auto_error=False)

def verify_bearer_token(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)):
    """
    Validasi Bearer token dari SISON atau UI.
    Menerima dua jenis token:
    1. Service Token tersimpan di DB (berlaku 30 hari) — digunakan oleh sistem SISON.
    2. Dynamic JWT Token dari hasil login akun pengawas/admin.
    """
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=401,
            detail="Header Authorization: Bearer <SERVICE_TOKEN> diperlukan! Hubungi Admin untuk mendapatkan Service Token SISON.",
        )

    token = credentials.credentials.strip()

    # 1. Cek apakah cocok dengan Service Token tersimpan di DB (paling prioritas untuk SISON)
    db = SessionLocal()
    try:
        cfg = db.query(SisonConfig).first()
        if cfg and cfg.service_token and token == cfg.service_token:
            from datetime import datetime
            if cfg.service_token_expires_at and datetime.utcnow() > cfg.service_token_expires_at:
                raise HTTPException(
                    status_code=401,
                    detail="Service Token SISON telah kedaluwarsa. Minta Admin untuk menerbitkan Service Token baru."
                )
            return {"u": "sison_service", "r": "sison"}
    finally:
        db.close()

    # 2. Fallback: Validasi dynamic JWT token dari login akun pengawas/admin
    try:
        payload = decode_admin_token(token)
        if payload and payload.get("u") and payload.get("r") in ["operator", "pengawas", "admin", "sison"]:
            return payload
    except HTTPException:
        raise
    except Exception:
        pass

    raise HTTPException(
        status_code=401,
        detail="Bearer Token tidak valid atau telah kedaluwarsa. Hubungi Admin untuk mendapatkan Service Token SISON.",
    )

# Alias untuk kompatibilitas
verify_api_key = verify_bearer_token

class StartRequest(BaseModel):
    id_trans: str
    p_no: str
    lot: Optional[str] = "-"
    unique_no: Optional[str] = "-"
    p_name: Optional[str] = "-"
    qty: Optional[int] = 1

class OverrideRequest(BaseModel):
    pin: str

def execute_sison_start(req: StartRequest, db: Session) -> dict:
    """Eksekusi start transaksi SISON dan perbarui state inspeksi real-time."""
    id_trans = (req.id_trans or "").strip()
    p_no = (req.p_no or "").strip()
    if not id_trans:
        raise HTTPException(status_code=400, detail="Field 'id_trans' wajib diisi (Tidak boleh kosong)!")
    if not p_no:
        raise HTTPException(status_code=400, detail="Field 'p_no' (Part Number) wajib diisi!")

    qty = max(1, int(req.qty or 1))
    lot = (req.lot or "-").strip() or "-"
    unique_no = (req.unique_no or "-").strip() or "-"
    p_name = (req.p_name or "-").strip() or "-"

    existing_trans = db.query(Transaction).filter(Transaction.id_trans == id_trans).first()
    if existing_trans:
        existing_trans.target_qty = qty
        existing_trans.qty_actual = 0
        existing_trans.status = 1  # 1 = PROSES / PROCESSING
        existing_trans.start_time = func.now()
    else:
        new_trans = Transaction(
            id_trans=id_trans,
            part_no=p_no,
            part_name=p_name,
            lot_no=lot,
            unique_no=unique_no,
            target_qty=qty,
            qty_actual=0,
            status=1,  # 1 = PROSES / PROCESSING
            start_time=func.now()
        )
        db.add(new_trans)
    
    db.commit()

    # Load Aturan Sisi Part dari Database
    db_rules = db.query(PartRule).filter(PartRule.p_no == p_no).order_by(PartRule.id.asc()).all()
    daftar_sisi = [r.sisi for r in db_rules] if db_rules else ["F"]
    curr_side = "F"  # Transaksi inspeksi part selalu dimulai dari Sisi Depan (Front)

    # Konversi ORM object ke plain dict agar aman diakses lintas-thread dengan .get()
    rules_as_dict = [
        {
            "id": r.id,
            "p_no": r.p_no,
            "sisi": r.sisi,
            "nama_komponen": r.nama_komponen,
            "min_confidence": r.min_confidence if r.min_confidence is not None else 0.70,
            "avg_confidence": r.avg_confidence if r.avg_confidence is not None else 0.75,
            "min_coverage": r.min_coverage if r.min_coverage is not None else 1.0,
        }
        for r in db_rules
    ]

    with state.lock:
        state.status = "RUNNING"
        state.id_trans = id_trans
        state.p_no = p_no
        state.target_qty = qty
        state.qty = qty
        state.daftar_sisi = daftar_sisi
        state.aturan_sisi = rules_as_dict
        state.progress_sisi = 0
        state.current_side = "F"
        state.part_ok_popup = False
        state.flip_part_popup = False

    # Kirim Webhook Callback status 1 (Processing / In-Progress) ke Server SISON
    threading.Thread(target=SisonSender.send_callback, args=(id_trans, 1), daemon=True).start()

    return {
        "status": "SUCCESS",
        "message": f"Transaksi {id_trans} diterima. Sistem Kamera Inspeksi RUNNING.",
        "id_trans": id_trans,
        "p_no": p_no,
        "qty": qty,
        "sisi": curr_side
    }

class ResetRequest(BaseModel):
    id_trans: Optional[str] = ""

@router.post("/start")
def api_start(req: StartRequest, db: Session = Depends(get_db), _: bool = Depends(verify_api_key)):
    return execute_sison_start(req, db)

@router.post("/reset")
def api_reset(req: Optional[ResetRequest] = None, db: Session = Depends(get_db)):
    """Reset sistem kamera ke STANDBY dan kirim callback status 0 ke SISON."""
    with state.lock:
        cur_id = req.id_trans if (req and req.id_trans) else (state.id_trans or "STANDBY")
        state.reset_to_standby()

    # Kirim Webhook Callback status 0 (Standby) ke Server SISON
    threading.Thread(target=SisonSender.send_callback, args=(cur_id, 0), daemon=True).start()

    return {
        "status": "SUCCESS",
        "message": "Sistem kamera di-reset ke STANDBY (Status 0).",
        "id_trans": cur_id,
        "status_code": 0
    }

@router.post("/override")
def api_override(req: OverrideRequest, db: Session = Depends(get_db)):
    """Verifikasi PIN Override secara dinamis terhadap akun Pengawas / Admin di database."""
    pin = (req.pin or "").strip()
    if not pin:
        raise HTTPException(status_code=400, detail="PIN tidak boleh kosong!")
    
    supervisors = db.query(User).filter(
        User.role.in_(["pengawas", "admin"]), 
        User.is_active == True
    ).all()

    for sup in supervisors:
        if verify_password(pin, sup.password):
            log_audit_event(db, sup.username, "PIN_OVERRIDE", f"Otorisasi override sistem berhasil diverifikasi ({sup.fullname or sup.username})")
            return {
                "status": "SUCCESS", 
                "message": f"Otorisasi override berhasil ({sup.fullname or sup.username})",
                "authorized_by": sup.username
            }

    log_audit_event(db, "UNKNOWN", "PIN_OVERRIDE_FAILED", "Percobaan otorisasi override sistem gagal (PIN salah)")
    raise HTTPException(status_code=403, detail="PIN Pengawas salah atau akun tidak memiliki hak akses override!")
