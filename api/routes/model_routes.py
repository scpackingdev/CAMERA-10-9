import os
import re
import shutil
import tempfile
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Depends
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import get_db, PartRule, Transaction, log_audit_event
from api.auth import get_current_user_name
from core import model_cache
from core.rules import is_defect_label
from .rule_routes import get_or_create_global_settings

router = APIRouter()
WEIGHTS_DIR = os.path.join(os.getcwd(), "weights")

class RenameModelSchema(BaseModel):
    new_part_no: str

def sanitize_part_no(part_no: str) -> str:
    """Sanitasi part_no untuk mencegah serangan Path Traversal (CWE-22 / OWASP Top 10)."""
    if not part_no:
        raise HTTPException(status_code=400, detail="Part number tidak boleh kosong")
    cleaned = re.sub(r'[^a-zA-Z0-9_\-\.]', '', os.path.basename(part_no.strip()))
    if not cleaned or cleaned.startswith("..") or cleaned.startswith("."):
        raise HTTPException(status_code=400, detail="Format part number tidak valid atau mengandung karakter terlarang!")
    return cleaned

@router.get("/models")
def get_models(db: Session = Depends(get_db)):
    if not os.path.exists(WEIGHTS_DIR):
        os.makedirs(WEIGHTS_DIR)
    
    active_trans = db.query(Transaction).filter(Transaction.status == 1).first()
    active_pno = active_trans.part_no if active_trans else ""

    parts_dict = {}
    for filename in os.listdir(WEIGHTS_DIR):
        if filename.endswith(".pt") or filename.endswith(".onnx"):
            is_onnx = filename.endswith(".onnx")
            part_no = filename[:-5] if is_onnx else filename[:-3]
            file_path = os.path.join(WEIGHTS_DIR, filename)
            size_mb = round(os.path.getsize(file_path) / (1024 * 1024), 2)
            mtime = datetime.fromtimestamp(os.path.getmtime(file_path)).strftime('%Y-%m-%d %H:%M')

            if part_no not in parts_dict:
                parts_dict[part_no] = {
                    "part_no": part_no,
                    "has_pt": False,
                    "has_onnx": False,
                    "pt_size_mb": None,
                    "onnx_size_mb": None,
                    "last_modified": mtime,
                    "is_active": (part_no.lower() == active_pno.lower()) if active_pno else False
                }

            if is_onnx:
                parts_dict[part_no]["has_onnx"] = True
                parts_dict[part_no]["onnx_size_mb"] = size_mb
            else:
                parts_dict[part_no]["has_pt"] = True
                parts_dict[part_no]["pt_size_mb"] = size_mb

    for p_no, item in parts_dict.items():
        if item["has_onnx"]:
            item["format"] = "ONNX"
            item["filename"] = f"{p_no}.onnx"
            item["size_mb"] = item["onnx_size_mb"]
        else:
            item["format"] = "PT"
            item["filename"] = f"{p_no}.pt"
            item["size_mb"] = item["pt_size_mb"]

    return list(parts_dict.values())

@router.post("/models/{part_no}/convert-onnx")
def convert_model_to_onnx(part_no: str, db: Session = Depends(get_db), uname: str = Depends(get_current_user_name)):
    """Export model PyTorch (.pt) ke format ONNX ultra-ringan dengan 1-click."""
    safe_part_no = sanitize_part_no(part_no)
    pt_path = os.path.join(WEIGHTS_DIR, f"{safe_part_no}.pt")
    if not os.path.exists(pt_path):
        raise HTTPException(status_code=404, detail=f"Berkas model {safe_part_no}.pt tidak ditemukan!")

    try:
        from ultralytics import YOLO
        import time as pytime
        t_start = pytime.time()
        
        print(f"[ONNX EXPORT] Memulai konversi model {pt_path} ke format ONNX...")
        yolo_model = YOLO(pt_path)
        yolo_model.export(format="onnx", dynamic=False, simplify=True)
        duration_s = round(pytime.time() - t_start, 2)
        
        model_cache.clear()

        onnx_file = f"{safe_part_no}.onnx"
        onnx_path = os.path.join(WEIGHTS_DIR, onnx_file)
        onnx_size = round(os.path.getsize(onnx_path) / (1024 * 1024), 2) if os.path.exists(onnx_path) else 0

        log_audit_event(db, uname, "CONVERT_ONNX", f"Export model {safe_part_no}.pt ke format ONNX ({onnx_size} MB dalam {duration_s}s)")
        return {
            "success": True, 
            "message": f"Model {safe_part_no} berhasil dikonversi ke format ONNX ({onnx_size} MB) dalam {duration_s} detik!",
            "onnx_size_mb": onnx_size,
            "duration_seconds": duration_s
        }
    except Exception as e:
        print(f"[ONNX EXPORT ERROR] {e}")
        raise HTTPException(status_code=500, detail=f"Gagal mengonversi ke ONNX: {str(e)}")

@router.get("/models/{part_no}/download")
def download_model(part_no: str, fmt: Optional[str] = None):
    safe_part_no = sanitize_part_no(part_no)
    if fmt == "onnx" or (fmt is None and os.path.exists(os.path.join(WEIGHTS_DIR, f"{safe_part_no}.onnx"))):
        file_path = os.path.join(WEIGHTS_DIR, f"{safe_part_no}.onnx")
        filename = f"{safe_part_no}.onnx"
    else:
        file_path = os.path.join(WEIGHTS_DIR, f"{safe_part_no}.pt")
        filename = f"{safe_part_no}.pt"

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Model file not found")
    return FileResponse(file_path, filename=filename, media_type="application/octet-stream")

@router.get("/models/{part_no}/detail")
def get_model_detail(part_no: str, db: Session = Depends(get_db)):
    safe_part_no = sanitize_part_no(part_no)
    pt_path = os.path.join(WEIGHTS_DIR, f"{safe_part_no}.pt")
    onnx_path = os.path.join(WEIGHTS_DIR, f"{safe_part_no}.onnx")
    
    file_path = onnx_path if os.path.exists(onnx_path) else pt_path
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Model file not found")
    
    rules = db.query(PartRule).filter(PartRule.p_no == safe_part_no).all()
    components = []
    for r in rules:
        sisi_val = str(r.sisi).strip().upper() if r.sisi and str(r.sisi).strip() not in ["", "-"] else ""
        if not sisi_val:
            raw_lbl = str(r.nama_komponen or "").strip()
            first_tok = raw_lbl.split('-')[0].strip().upper() if '-' in raw_lbl else (raw_lbl.split('_')[0].strip().upper() if '_' in raw_lbl else raw_lbl.split()[0].strip().upper() if ' ' in raw_lbl else raw_lbl[:1].upper())
            sisi_val = first_tok or "-"

        display_sisi = "FRONT (F)" if sisi_val in ["F", "FRONT"] else ("REAR (R)" if sisi_val in ["R", "REAR"] else sisi_val)

        components.append({
            "sisi": display_sisi,
            "raw_sisi": sisi_val,
            "nama_komponen": r.nama_komponen,
            "qty": r.qty or 1,
            "min_confidence": r.min_confidence or 0.75
        })

    # Fallback jika PartRule di DB belum terisi tapi file .pt ada
    if not components and os.path.exists(pt_path):
        try:
            import torch
            ckpt = torch.load(pt_path, map_location="cpu", weights_only=False)
            names = None
            if isinstance(ckpt, dict) and 'model' in ckpt:
                raw = getattr(ckpt['model'], 'names', None)
                if raw is not None:
                    names = [str(v) for k, v in sorted(raw.items(), key=lambda x: int(x[0]))]
            if names:
                for label in names:
                    if is_defect_label(label):
                        continue
                    raw_lbl = str(label).strip()
                    first_tok = raw_lbl.split('-')[0].strip().upper() if '-' in raw_lbl else (raw_lbl.split('_')[0].strip().upper() if '_' in raw_lbl else raw_lbl[:1].upper())
                    sisi_val = first_tok if first_tok in ['F', 'R', 'FRONT', 'REAR'] else (first_tok or "-")
                    display_sisi = "FRONT (F)" if sisi_val in ["F", "FRONT"] else ("REAR (R)" if sisi_val in ["R", "REAR"] else sisi_val)
                    components.append({
                        "sisi": display_sisi,
                        "raw_sisi": sisi_val,
                        "nama_komponen": label,
                        "qty": 1,
                        "min_confidence": 0.75
                    })
        except Exception as e_detail:
            print(f"[DETAIL MODEL FALLBACK ERROR] {e_detail}")

    mtime = datetime.fromtimestamp(os.path.getmtime(file_path)).strftime('%Y-%m-%d %H:%M:%S')
    size_mb = round(os.path.getsize(file_path) / (1024 * 1024), 2)

    return {
        "part_no": safe_part_no,
        "filename": os.path.basename(file_path),
        "format": "ONNX" if os.path.exists(onnx_path) else "PT",
        "has_pt": os.path.exists(pt_path),
        "has_onnx": os.path.exists(onnx_path),
        "size_mb": size_mb,
        "last_modified": mtime,
        "komponen_count": len(components),
        "komponen": components
    }

@router.post("/models")
def upload_model(
    part_no: str = Form(...), 
    file: UploadFile = File(...), 
    db: Session = Depends(get_db), 
    uname: str = Depends(get_current_user_name)
):
    safe_part_no = sanitize_part_no(part_no)
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ['.pt', '.onnx']:
        raise HTTPException(status_code=400, detail="Hanya file berekstensi .pt atau .onnx yang diizinkan")
    
    if not os.path.exists(WEIGHTS_DIR):
        os.makedirs(WEIGHTS_DIR)
        
    file_path = os.path.join(WEIGHTS_DIR, f"{safe_part_no}{ext}")
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        model_cache.clear()

        # Auto-generate PartRule jika file adalah .pt
        if ext == '.pt':
            try:
                import torch
                ckpt = torch.load(file_path, map_location="cpu", weights_only=False)
                names = None
                if isinstance(ckpt, dict) and 'model' in ckpt:
                    raw = getattr(ckpt['model'], 'names', None)
                    if raw is not None:
                        names = [str(v) for k, v in sorted(raw.items(), key=lambda x: int(x[0]))]
                if names:
                    gs = get_or_create_global_settings(db)
                    db.query(PartRule).filter(PartRule.p_no == safe_part_no).delete()
                    db.flush()
                    for label in names:
                        # Jangan masukkan label defect/NG ke tabel PartRule (Checklist Komponen Wajib)
                        if is_defect_label(label):
                            continue
                        raw_lbl = str(label).strip()
                        first_tok = raw_lbl.split('-')[0].strip().upper() if '-' in raw_lbl else (raw_lbl.split('_')[0].strip().upper() if '_' in raw_lbl else raw_lbl[:1].upper())
                        detected_sisi = first_tok if first_tok in ['F', 'R', 'FRONT', 'REAR'] else (first_tok or "-")
                        db.add(PartRule(
                            p_no=safe_part_no,
                            sisi=detected_sisi,
                            nama_komponen=label,
                            qty=1,
                            min_confidence=gs.default_min_conf,
                            avg_confidence=gs.default_avg_conf,
                            min_coverage=gs.default_min_coverage
                        ))
                    db.commit()
            except Exception as e_lbl:
                print(f"Notice auto-generate rule: {e_lbl}")

        log_audit_event(db, uname, "UPLOAD_MODEL", f"Mengunggah model AI {safe_part_no}{ext}")
        return {"success": True, "message": f"Model for {safe_part_no}{ext} uploaded successfully!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/models/preview-labels")
async def preview_model_labels(file: UploadFile = File(...)):
    """Baca label names dari file .pt sementara — tidak disimpan permanen."""
    if not file.filename.endswith('.pt'):
        return {"label_count": 0, "labels": {}, "note": "Preview label otomatis hanya tersedia untuk file .pt"}
    
    try:
        import torch
    except ImportError:
        raise HTTPException(status_code=500, detail="torch tidak terinstall di server")

    tmp = tempfile.NamedTemporaryFile(suffix=".pt", delete=False)
    try:
        shutil.copyfileobj(file.file, tmp)
        tmp.close()

        ckpt = torch.load(tmp.name, map_location="cpu", weights_only=False)

        names = None
        if isinstance(ckpt, dict) and 'model' in ckpt:
            raw = getattr(ckpt['model'], 'names', None)
            if raw is not None:
                names = {str(k): v for k, v in raw.items()}
        
        if names is None:
            return {"label_count": 0, "labels": {}}

        return {"label_count": len(names), "labels": names}

    except Exception as e:
        return {"label_count": 0, "labels": {}, "error": str(e)}
    finally:
        if os.path.exists(tmp.name):
            os.unlink(tmp.name)

@router.put("/models/{part_no}")
def rename_model(part_no: str, data: RenameModelSchema, db: Session = Depends(get_db), uname: str = Depends(get_current_user_name)):
    safe_old_pno = sanitize_part_no(part_no)
    safe_new_pno = sanitize_part_no(data.new_part_no)
    
    renamed = False
    for ext in [".pt", ".onnx"]:
        old_path = os.path.join(WEIGHTS_DIR, f"{safe_old_pno}{ext}")
        new_path = os.path.join(WEIGHTS_DIR, f"{safe_new_pno}{ext}")
        if os.path.exists(old_path):
            os.rename(old_path, new_path)
            renamed = True
            
    if not renamed:
        raise HTTPException(status_code=404, detail="Model not found")
        
    model_cache.clear()
    log_audit_event(db, uname, "RENAME_MODEL", f"Mengubah nama model {safe_old_pno} menjadi {safe_new_pno}")
    return {"success": True, "message": "Model renamed successfully"}

@router.delete("/models/{part_no}")
def delete_model(part_no: str, db: Session = Depends(get_db), uname: str = Depends(get_current_user_name)):
    safe_part_no = sanitize_part_no(part_no)
    deleted = False
    for ext in [".pt", ".onnx"]:
        file_path = os.path.join(WEIGHTS_DIR, f"{safe_part_no}{ext}")
        if os.path.exists(file_path):
            os.remove(file_path)
            deleted = True

    if deleted:
        model_cache.clear()
        log_audit_event(db, uname, "DELETE_MODEL", f"Menghapus file model {safe_part_no}")
        return {"success": True, "message": "Model deleted"}
    raise HTTPException(status_code=404, detail="Model not found")
