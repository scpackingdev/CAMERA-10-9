from typing import Optional
from datetime import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db, Transaction, AuditLog, CameraConfig, User, InspectionLog, log_audit_event
from api.auth import get_current_user_name
from core import state, stream_worker

router = APIRouter()

@router.get("/line-monitoring")
def get_line_monitoring_data(db: Session = Depends(get_db)):
    """Mengambil status real-time HANYA untuk stasiun/line kerja yang benar-benar AKTIF."""
    with state.lock:
        cur_status = state.status
        p_no = state.p_no
        qty_rem = state.qty
        tgt_qty = state.target_qty
        qty_comp = max(0, tgt_qty - qty_rem) if tgt_qty > 0 else 0
        side = state.current_side

    # Dapatkan seluruh operator yang aktif dari berbagai PC / Browser
    active_operators = state.get_all_active_operators(timeout_seconds=90.0)

    # Ambil seluruh daftar kamera aktif dari database
    cams = db.query(CameraConfig).filter(CameraConfig.is_active == True).order_by(CameraConfig.id.asc()).all()
    if not cams and stream_worker.is_cam_active:
        cams = [CameraConfig(id=1, name="Kamera QC Utama", source="0", is_active=True)]

    # Hitung total inspeksi hari ini
    today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    today_logs = db.query(InspectionLog).filter(InspectionLog.created_at >= today_start).all()
    today_total = len(today_logs)
    today_ok = len([l for l in today_logs if (l.detection_status or '').upper() == 'OK'])
    today_ng = len([l for l in today_logs if (l.detection_status or '').upper() == 'NG'])

    stations = []
    # Buat stasiun HANYA jika ada operator yang aktif/login
    for idx, assigned_op in enumerate(active_operators, 1):
        station_id = f"STATION-{str(idx).zfill(2)}"
        cam = cams[idx - 1] if idx - 1 < len(cams) else None
        cam_name = cam.name if cam else f"Kamera Web Client {idx}"
        cam_id = cam.id if cam else None
        cam_source = cam.source if cam else f"{idx - 1}"
        cam_live = bool(stream_worker.is_cam_active and (cam.is_active if cam else True))

        stations.append({
            "id": station_id,
            "line_name": f"Station {idx} ({cam_name})",
            "camera_id": cam_id,
            "camera_name": cam_name,
            "camera_source": cam_source,
            "is_camera_active": cam_live,
            "status": cur_status if cam_live else "STANDBY",
            "part_no": p_no if cam_live else "STANDBY",
            "target_qty": tgt_qty if cam_live else 0,
            "qty_completed": qty_comp if cam_live else 0,
            "qty_remaining": qty_rem if cam_live else 0,
            "current_side": "FRONT" if side == "F" else "REAR",
            "operator": {
                "name": assigned_op.get("fullname") or assigned_op.get("username") or "Operator",
                "username": assigned_op.get("username", "-"),
                "role": assigned_op.get("role", "-"),
                "login_time": assigned_op.get("login_time", 0),
                "client_ip": assigned_op.get("client_ip", "-"),
                "is_active": True
            },
            "video_feed_url": "/api/video_feed",
            "last_pesan_ui": stream_worker.last_pesan_ui if cam_live else "Standby",
            "ng_active": bool((stream_worker.ng_active or cur_status == "NG") and cam_live)
        })

    return {
        "timestamp": datetime.now().isoformat(),
        "summary": {
            "total_stations": len(stations),
            "active_operators": len(active_operators),
            "today_total_inspections": today_total,
            "today_ok": today_ok,
            "today_ng": today_ng,
            "alarm_ng_active": bool((stream_worker.ng_active or cur_status == "NG") and len(stations) > 0)
        },
        "active_operators_list": active_operators,
        "stations": stations
    }

@router.get("/transactions")
def get_transactions(date_filter: Optional[str] = None, db: Session = Depends(get_db)):
    """Mengambil 50 transaksi terbaru untuk Dashboard monitoring."""
    query = db.query(Transaction)
    
    if date_filter:
        try:
            filter_date = datetime.strptime(date_filter, "%Y-%m-%d").date()
            start_date = datetime(filter_date.year, filter_date.month, filter_date.day, 0, 0, 0)
            end_date = datetime(filter_date.year, filter_date.month, filter_date.day, 23, 59, 59)
            query = query.filter(Transaction.start_time >= start_date, Transaction.start_time <= end_date)
            return query.order_by(Transaction.start_time.desc()).all()
        except ValueError:
            pass
            
    trans = query.order_by(Transaction.start_time.desc()).limit(50).all()
    return trans

@router.delete("/transactions/running")
def clear_running_transactions(db: Session = Depends(get_db), uname: str = Depends(get_current_user_name)):
    """Hapus seluruh transaksi berstatus RUNNING (status=1) dari database."""
    deleted_count = db.query(Transaction).filter(Transaction.status == 1).delete()
    db.commit()
    log_audit_event(db, uname, "DELETE_RUNNING_TRANS", f"Menghapus {deleted_count} transaksi ber-status RUNNING")
    return {"success": True, "count": deleted_count, "message": f"Berhasil menghapus {deleted_count} transaksi RUNNING."}

@router.get("/audit-logs")
def get_audit_logs(date_filter: Optional[str] = None, db: Session = Depends(get_db)):
    """Mengambil riwayat audit aktivitas user dan sistem."""
    query = db.query(AuditLog)
    if date_filter:
        try:
            f_date = datetime.strptime(date_filter, "%Y-%m-%d").date()
            start_date = datetime(f_date.year, f_date.month, f_date.day, 0, 0, 0)
            end_date = datetime(f_date.year, f_date.month, f_date.day, 23, 59, 59)
            query = query.filter(AuditLog.timestamp >= start_date, AuditLog.timestamp <= end_date)
        except ValueError:
            pass
    raw_logs = query.order_by(AuditLog.timestamp.desc()).limit(100).all()
    result = []
    for log in raw_logs:
        ts_str = log.timestamp.isoformat() if log.timestamp else datetime.now().isoformat()
        result.append({
            "id": log.id,
            "timestamp": ts_str,
            "created_at": ts_str,
            "username": log.username or "SYSTEM",
            "action": log.action,
            "details": log.details or ""
        })
    return result
