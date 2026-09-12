import os
import time
import asyncio
import json
import threading
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db, User, verify_password, SisonConfig, log_audit_event
from core import state, stream_worker, log_inspeksi_db
from integrations import SisonSender
from api.auth import create_admin_token

router = APIRouter()

class OperatorLoginRequest(BaseModel):
    username: str
    pin: str
    shift: Optional[str] = "Shift 1"

class OperatorHeartbeatRequest(BaseModel):
    username: Optional[str] = "op"
    fullname: Optional[str] = "Operator"
    role: Optional[str] = "operator"

class NGResolveRequest(BaseModel):
    action: Optional[str] = None
    action_type: Optional[str] = None
    username: Optional[str] = ""
    pin: Optional[str] = ""

class ClearPopupRequest(BaseModel):
    popup_type: Optional[str] = "ALL"

@router.get("/video_feed")
def video_feed():
    """Streaming video MJPEG real-time dengan anotasi AI YOLOv8."""
    def gen_frames():
        while True:
            frame_bytes = stream_worker.get_latest_jpeg()
            if frame_bytes is None:
                time.sleep(0.03)
                continue
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
            time.sleep(0.03)

    return StreamingResponse(
        gen_frames(),
        media_type="multipart/x-mixed-replace; boundary=frame",
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0"
        }
    )

def _get_operator_state_dict() -> dict:
    with state.lock:
        cur_status = state.status
        cur_id = state.id_trans
        cur_pno = state.p_no
        qty_rem = state.qty
        tgt_qty = state.target_qty
        qty_comp = max(0, tgt_qty - qty_rem) if tgt_qty > 0 else 0
        side = state.current_side
        mode = getattr(state, 'inspection_mode', 'AI')
        op_name = state.operator_name
        op_uname = state.operator_username
        op_role = state.operator_role
        op_login_ts = state.operator_login_time
        part_ok = getattr(state, 'part_ok_popup', False)
        flip_part = getattr(state, 'flip_part_popup', False)
        details = dict(state.last_inspection_details) if hasattr(state, 'last_inspection_details') else {}
        live_metrics = dict(state.live_metrics) if hasattr(state, 'live_metrics') else {}
        # Kirim timestamp ke frontend — frontend yang memutuskan apakah event ini baru (< 3 detik)
        front_ok_notif_ts = getattr(state, 'front_ok_notif_ts', 0.0)

    ng_active = bool(stream_worker.ng_active or cur_status == "NG")

    return {
        "status": cur_status,
        "id_trans": cur_id,
        "p_no": cur_pno,
        "qty_remaining": qty_rem,
        "target_qty": tgt_qty,
        "qty_completed": qty_comp,
        "current_side": "FRONT" if side == "F" else "REAR",
        "inspection_mode": mode,
        "pesan_ui": stream_worker.last_pesan_ui,
        "live_metrics": live_metrics,
        "is_cam_active": stream_worker.is_cam_active,
        "reconnect_attempts": stream_worker.reconnect_attempts,
        "operator": {
            "name": op_name,
            "username": op_uname,
            "role": op_role,
            "login_time": op_login_ts
        },
        "popups": {
            "part_ok": part_ok,
            "flip_part": flip_part,
            "front_ok_notif": (time.time() - front_ok_notif_ts) < 3.0 if front_ok_notif_ts > 0 else False,
            "front_ok_notif_ts": front_ok_notif_ts,
            "ng_active": ng_active,
            "ng_image_url": "",
            "details": details
        }
    }

@router.get("/operator/state")
def get_operator_state():
    """Telemetry status lengkap untuk antarmuka Operator Inspection."""
    return _get_operator_state_dict()

@router.get("/operator/events")
async def operator_events(request: Request):
    """Server-Sent Events (SSE) untuk real-time update tampilan HUD & Popups."""
    async def event_generator():
        while True:
            if await request.is_disconnected():
                break
            payload = _get_operator_state_dict()
            yield f"data: {json.dumps(payload)}\n\n"
            await asyncio.sleep(0.2)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

@router.post("/operator/heartbeat")
def operator_heartbeat(req: OperatorHeartbeatRequest, request: Request):
    """Heartbeat berkala dari browser layar operator untuk sinkronisasi state aktif per-operator."""
    client_ip = request.client.host if request.client else "127.0.0.1"
    uname = req.username or "op"
    fname = req.fullname or uname
    u_role = req.role or "operator"

    state.update_operator_heartbeat(
        username=uname,
        fullname=fname,
        role=u_role,
        client_ip=client_ip
    )
    return {"success": True, "active_count": len(state.get_all_active_operators())}

@router.post("/operator/login")
def operator_login(req: OperatorLoginRequest, request: Request, db: Session = Depends(get_db)):
    """Otentikasi operator sebelum memasuki layar kamera inspeksi AI."""
    username = req.username.strip()
    pin = req.pin.strip()

    if not username or not pin:
        raise HTTPException(status_code=400, detail="Username dan PIN tidak boleh kosong!")

    user = db.query(User).filter(User.username == username, User.is_active == True).first()
    if not user or not verify_password(pin, user.password):
        raise HTTPException(status_code=401, detail="Username atau PIN salah!")

    if user.role not in ["operator", "pengawas", "admin"]:
        raise HTTPException(status_code=403, detail="Role pengguna tidak diizinkan masuk ke layar inspeksi!")

    fullname = user.fullname.strip() if (getattr(user, 'fullname', None) and user.fullname.strip()) else username
    client_ip = request.client.host if request.client else "127.0.0.1"

    state.update_operator_heartbeat(
        username=user.username,
        fullname=fullname,
        role=user.role,
        client_ip=client_ip
    )

    token = create_admin_token(user.username, user.role, expires_in_seconds=8 * 3600)
    log_audit_event(db, user.username, "OPERATOR_LOGIN", f"Operator {fullname} masuk ke layar inspeksi (IP: {client_ip}).")

    return {
        "success": True,
        "token": token,
        "username": user.username,
        "fullname": fullname,
        "role": user.role
    }

class OperatorLogoutPayload(BaseModel):
    username: Optional[str] = ""

@router.post("/operator/logout")
def operator_logout(req: Optional[OperatorLogoutPayload] = None, db: Session = Depends(get_db)):
    """Keluar dari sesi operator aktif."""
    uname = req.username if (req and req.username) else (state.operator_username or "OPERATOR")
    state.remove_operator_session(uname)
    log_audit_event(db, uname, "OPERATOR_LOGOUT", f"Operator {uname} logout dari layar inspeksi.")
    return {"success": True}

class CancelKanbanRequest(BaseModel):
    reason: Optional[str] = "Stok part pengganti habis"
    username: Optional[str] = ""
    status: Optional[int] = 99  # 98 = NG (Reject), 99 = Cancel (Batal)

@router.post("/operator/manual-pass")
def manual_pass():
    """Trigger manual pass OK saat part diverifikasi secara visual oleh operator (Fallback jika AI tidak mendeteksi)."""
    with state.lock:
        curr_status = state.status
        if curr_status == "COMPLETED" or (curr_status in ["RUNNING", "OK"] and state.qty <= 0 and state.target_qty > 0):
            raise HTTPException(status_code=400, detail="Batch inspeksi sudah selesai (100% OK).")
        if curr_status not in ["RUNNING", "OK"]:
            raise HTTPException(status_code=400, detail="Sistem dalam posisi STANDBY. Tidak ada transaksi aktif.")
        
        cur_side = state.current_side
        rules = state.aturan_sisi
        cur_pno = state.p_no
        cur_id = state.id_trans
        op_name = state.operator_name or state.operator_username or "Operator"
        
        # Cek apakah part memiliki dua sisi (Front & Rear)
        has_rear = any(r.get("nama_komponen", "").lower().startswith("r-") for r in rules)
        
        if cur_side == "F" and has_rear:
            state.current_side = "R"
            state.flip_part_popup = False
            state.part_ok_popup = False
            
            state.last_inspection_details = {
                "label_terdeteksi": "Pemeriksaan Visual Sisi Depan",
                "avg_confidence": "100% (Manual Pass Front)",
                "found_labels": "- SISI DEPAN (FRONT) : OK (MANUAL PASS)"
            }
            stream_worker.last_pesan_ui = "Sisi Depan OK (Pass Manual)! Balik Part ke sisi Belakang."
            return {"success": True, "action": "flip_part", "message": "Sisi Depan OK! Balik Part ke sisi Belakang."}
        else:
            state.qty -= 1
            rem_qty = state.qty
            state.current_side = "F"
            state.flip_part_popup = False
            
            state.last_inspection_details = {
                "label_terdeteksi": "Pemeriksaan Visual Operator",
                "avg_confidence": "100% (Manual Pass)",
                "found_labels": "- INSPEKSI VISUAL OPERATOR : OK (MANUAL PASS)"
            }

            if rem_qty <= 0:
                state.status = "COMPLETED"
                state.part_ok_popup = True
                state.flip_part_popup = False
                state.completed_time = time.time()
                stream_worker.last_pesan_ui = "BATCH SELESAI (100% OK)! SILAKAN MULAI TRANSAKSI BARU."
            else:
                state.part_ok_popup = True
                stream_worker.last_pesan_ui = f"Part Manual OK! Sisa: {rem_qty} PCS. Lanjut part berikutnya."

    threading.Thread(target=log_inspeksi_db, args=(cur_id, cur_pno, "OK", 1.0, "MANUAL", op_name), daemon=True).start()
    if rem_qty <= 0:
        threading.Thread(target=SisonSender.send_callback, args=(cur_id, 2), daemon=True).start()
        
    return {
        "success": True,
        "action": "completed" if rem_qty <= 0 else "part_ok",
        "message": "Batch inspeksi selesai (100% OK)!" if rem_qty <= 0 else f"Part Manual OK! Sisa: {max(0, rem_qty)} PCS"
    }

@router.post("/operator/manual-reject")
def manual_reject():
    """Trigger manual reject NG saat operator menemukan kecacatan secara visual."""
    with state.lock:
        curr_status = state.status
        if curr_status not in ["RUNNING", "OK"]:
            raise HTTPException(status_code=400, detail="Sistem dalam posisi STANDBY. Tidak ada transaksi aktif.")
        
        state.status = "NG"
        cur_pno = state.p_no
        cur_id = state.id_trans
        op_name = state.operator_name or state.operator_username or "Operator"
        stream_worker.last_pesan_ui = "STATUS: NG (MANUAL REJECT)! TENTUKAN AKSI PADA MODAL."
        stream_worker.ng_active = True

    threading.Thread(target=log_inspeksi_db, args=(cur_id, cur_pno, "NG", 0.0, "MANUAL", op_name), daemon=True).start()
    return {"success": True, "message": "Manual reject triggered. Status: NG."}

@router.api_route("/operator/resolve-ng", methods=["GET", "POST"])
def resolve_ng(req: Optional[NGResolveRequest] = None, db: Session = Depends(get_db)):
    """
    Konfirmasi abnormalitas NG dari modal inspeksi operator:
    1. RETRY / DISMISS: Part sebenarnya bagus (model salah baca / reposisi part). Kamera langsung deteksi ulang part yang sama.
    2. CONFIRM_REPLACE / CONFIRM_NG: Part benar cacat (NG) dan diganti dengan part baru. Catat log NG, reset sisi ke Depan (F).
    """
    raw_action = (req.action or req.action_type or "RETRY") if req else "RETRY"
    action_type = raw_action.upper()
    
    with state.lock:
        state.status = "RUNNING"
        state.current_side = "F"
        state.flip_part_popup = False
        state.part_ok_popup = False
        state.cooldown_until = time.time() + 1.5
            
        cur_op = state.operator_name or state.operator_username or "Operator"
        cur_id = state.id_trans
        cur_pno = state.p_no

    stream_worker.ng_active = False

    if action_type in ["REJECT_NG", "CONFIRM_REJECT", "REJECT"]:
        # Tolak transaksi secara langsung sebagai NG (Status 98)
        with state.lock:
            state.reset_to_standby()
            stream_worker.ng_active = False
            stream_worker.last_pesan_ui = "STANDBY"

        msg = f"Transaksi {cur_id} (Part: {cur_pno}) ditolak sebagai NG (Status 98) oleh {cur_op}."
        threading.Thread(target=log_inspeksi_db, args=(cur_id, cur_pno, "NG", 0.0, "AI", cur_op), daemon=True).start()
        threading.Thread(target=SisonSender.send_callback, args=(cur_id, 98), daemon=True).start()
        try:
            from sqlalchemy.sql import func
            from database import Transaction
            trans = db.query(Transaction).filter(Transaction.id_trans == cur_id).first()
            if trans:
                trans.status = 98  # 98 = NG / REJECT
                trans.end_time = func.now()
                db.commit()
        except Exception as e:
            print(f"[DB WARN] Gagal update status transaksi NG (98): {e}")

        try:
            log_audit_event(db, cur_op, "REJECT_NG", msg)
        except Exception:
            pass

        return {"success": True, "message": msg, "status": 98}

    elif action_type in ["CONFIRM_REPLACE", "CONFIRM_NG", "REPLACE", "CONFIRM", "YES"]:
        msg = f"Part dikonfirmasi cacat (NG) dan diganti part baru oleh {cur_op}."
        threading.Thread(target=log_inspeksi_db, args=(cur_id, cur_pno, "NG", 0.0, "AI", cur_op), daemon=True).start()
        try:
            log_audit_event(db, cur_op, "NG_REPLACED", f"{msg} (Trans: {cur_id}, Part: {cur_pno})")
        except Exception:
            pass
    else:
        # RETRY / DISMISS / FALSE_ALARM
        msg = f"Alarm NG diabaikan / Deteksi ulang (Salah Baca) oleh {cur_op}."
        stream_worker.last_pesan_ui = "Mendeteksi Ulang Part... Tahan Posisi Part."
        try:
            log_audit_event(db, cur_op, "RETRY_INSPECTION", f"{msg} (Trans: {cur_id}, Part: {cur_pno})")
        except Exception:
            pass

    return {"success": True, "message": msg}

@router.post("/operator/cancel-kanban")
def cancel_kanban(req: Optional[CancelKanbanRequest] = None, db: Session = Depends(get_db)):
    """Membatalkan / Mengakhiri proses transaksi Kanban yang sedang aktif (misal stok part pengganti habis atau reject NG)."""
    with state.lock:
        cur_status = state.status
        cur_id = state.id_trans
        cur_pno = state.p_no
        cur_op = state.operator_name or state.operator_username or "Operator"
        rem_qty = state.qty
        tgt_qty = state.target_qty
        
        if not cur_id or cur_status == "STANDBY":
            raise HTTPException(status_code=400, detail="Tidak ada transaksi aktif yang dapat dibatalkan.")
            
        state.reset_to_standby()
        stream_worker.ng_active = False
        stream_worker.last_pesan_ui = "STANDBY"

    reason_str = req.reason.strip() if (req and req.reason and req.reason.strip()) else "Stok part pengganti habis"
    status_code = 98 if (req and req.status == 98) else 99
    status_label = "NG (REJECT)" if status_code == 98 else "BATAL (CANCEL)"
    action_type = "REJECT_NG" if status_code == 98 else "CANCEL_KANBAN"

    # Kirim Webhook Callback status (98 = NG, 99 = CANCEL) ke Server SISON
    threading.Thread(target=SisonSender.send_callback, args=(cur_id, status_code), daemon=True).start()

    # Update status transaksi di database lokal
    try:
        from sqlalchemy.sql import func
        from database import Transaction
        trans = db.query(Transaction).filter(Transaction.id_trans == cur_id).first()
        if trans:
            trans.status = status_code
            trans.end_time = func.now()
            db.commit()
    except Exception as e:
        print(f"[DB WARN] Gagal update status transaksi {status_code}: {e}")

    # Catat audit log
    log_audit_event(
        db, 
        cur_op, 
        action_type, 
        f"Transaksi {cur_id} (Part: {cur_pno}) diakhiri sebagai {status_label} (Status: {status_code}) oleh {cur_op}. Sisa {rem_qty}/{tgt_qty} PCS. Alasan: {reason_str}"
    )

    return {
        "success": True, 
        "message": f"Transaksi {cur_id} berhasil diakhiri ({status_label} - Status: {status_code}). Sistem kembali ke STANDBY.",
        "id_trans": cur_id,
        "status": status_code
    }

@router.post("/operator/clear-popup")
def clear_popup(req: ClearPopupRequest):
    """Menutup modal popup Part OK atau Balik Part dari antarmuka web."""
    with state.lock:
        if req.popup_type in ["ALL", "part_ok"]:
            state.part_ok_popup = False
        if req.popup_type in ["ALL", "flip_part"]:
            state.flip_part_popup = False
            
        should_reset = bool(state.status == "COMPLETED" or state.qty <= 0)

    if should_reset:
        state.reset_to_standby()
        stream_worker.last_pesan_ui = "STANDBY"

    return {"success": True}
