import re

DEFECT_KEYWORDS = {"ng", "defect", "cacat", "reject", "broken", "patah", "scratch", "dent", "missing", "miss", "crack", "deform", "burr"}

def is_defect_label(lbl: str, required_labels_set: set = None) -> bool:
    """
    Pengecekan apakah label terdeteksi merupakan label cacat/defect.
    Aman dari kata normal seperti 'kuning', 'spring', 'ring', 'tongue', dll.
    """
    if not lbl:
        return False
    lbl_clean = str(lbl).strip().lower()
    
    # 1. Jika label ini terdaftar sebagai komponen normal wajib inspeksi, BUKAN NG
    if required_labels_set and lbl_clean in required_labels_set:
        return False
        
    # 2. Tokenisasi berdasarkan pemisah '-' atau '_' atau spasi
    tokens = re.split(r'[-_\s]+', lbl_clean)
    
    # 3. Cek apakah ada token kata utuh yang cocok persis dengan kata kunci defect
    return any(token in DEFECT_KEYWORDS for token in tokens)

def get_rules_for_side(all_rules: list, side: str) -> list:
    """
    Filter aturan berdasarkan sisi ('f-' untuk Front/Depan, 'r-' untuk Rear/Belakang).
    Mendukung input: 'F', 'FRONT', 'R', 'REAR'.
    Menjamin sisi Depan (F) selalu terisolasi secara ketat dari sisi Belakang (R).
    """
    side_str = str(side or 'F').strip().upper()
    is_rear = side_str in ["R", "REAR", "BELAKANG"]
    prefix = "r-" if is_rear else "f-"
    
    # Filter komponen normal saja (abaikan jika ada label defect yang tersisa)
    normal_rules = [r for r in all_rules if not is_defect_label(r.get("nama_komponen", ""))]
    target_list = normal_rules if normal_rules else all_rules

    # 1. Filter berdasarkan prefix nama_komponen ('f-' atau 'r-')
    filtered = [r for r in target_list if str(r.get("nama_komponen", "")).lower().startswith(prefix)]
    if filtered:
        return filtered
    
    # 2. Filter berdasarkan field 'sisi' di database
    side_char = "R" if is_rear else "F"
    filtered_by_col = [r for r in target_list if str(r.get("sisi", "")).strip().upper() == side_char]
    if filtered_by_col:
        return filtered_by_col

    return target_list

def calculate_inspection_metrics(aturan_aktif: list, label_counts: dict, detected_confidences: list) -> dict:
    """
    Menghitung metrik kelengkapan label dan rata-rata skor keyakinan untuk sisi aktif.
    Hanya menghitung komponen normal (non-defect) sebagai syarat kelengkapan.
    """
    required_labels = list(set(
        r.get("nama_komponen", "").lower()
        for r in aturan_aktif
        if r.get("nama_komponen") and not is_defect_label(r.get("nama_komponen"))
    ))
    target_avg_conf = aturan_aktif[0].get("avg_confidence", 0.75) if aturan_aktif else 0.75
    target_coverage = aturan_aktif[0].get("min_coverage", 1.0) if aturan_aktif else 1.0
    
    current_avg_conf = (sum(detected_confidences) / len(detected_confidences)) if detected_confidences else 0.0
    detected_required_count = sum(1 for req_lbl in required_labels if label_counts.get(req_lbl, 0) > 0)
    total_required_count = len(required_labels)
    
    detected_ratio = detected_required_count / total_required_count if total_required_count > 0 else 1.0
    labels_complete = (detected_ratio >= target_coverage)
    avg_conf_ok = (current_avg_conf >= target_avg_conf)

    return {
        "required_labels": required_labels,
        "target_avg_conf": target_avg_conf,
        "target_coverage": target_coverage,
        "current_avg_conf": current_avg_conf,
        "detected_required_count": detected_required_count,
        "total_required_count": total_required_count,
        "detected_ratio": detected_ratio,
        "labels_complete": labels_complete,
        "avg_conf_ok": avg_conf_ok
    }
