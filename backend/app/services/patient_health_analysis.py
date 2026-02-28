# ==========================================================
# Patient Health Summary (COLUMN-BASED)
# ==========================================================

from datetime import datetime
from statistics import mean
from sqlalchemy import text
from typing import Dict, List

RECENT_WINDOW = 3
IMPROVEMENT_THRESHOLD = 20
CRITICAL_RISK = 80
NO_DISEASE_RISK = 25

DISEASES = ["obesity", "diabetes", "liver", "cardiovascular"]

# ----------------------------------------------------------
# PUBLIC ENTRY
# ----------------------------------------------------------

def analyze_patient_health(engine, patient_id: str) -> Dict:
    disease_results = {}
    max_risk = 0

    with engine.begin() as conn:
        for disease in DISEASES:
            visits = _fetch_disease_history(conn, patient_id, disease)

            if not visits:
                disease_results[disease] = _no_disease_summary()
                continue

            summary = _analyze_disease(visits)
            disease_results[disease] = summary
            max_risk = max(max_risk, summary["current_risk"])

        overall_status = _overall_status(max_risk)

        _upsert_patient_health_summary(
            conn,
            patient_id,
            disease_results,
            overall_status,
            max_risk
        )

    return {
        "patient_id": patient_id,
        "overall_status": overall_status,
        "max_risk": max_risk,
        "diseases": disease_results,
        "updated_at": datetime.utcnow().isoformat()
    }

# ----------------------------------------------------------
# FETCH HISTORY
# ----------------------------------------------------------

def _fetch_disease_history(conn, patient_id: str, disease: str) -> List[Dict]:
    rows = conn.execute(
        text(f"""
            SELECT dp.created_at, dp.{disease}_risk_score AS risk
            FROM disease_prediction dp
            JOIN prescriptions p
              ON p.prescription_serial = dp.prescription_serial
            WHERE p.patient_id = :pid
              AND dp.{disease}_risk_score IS NOT NULL
            ORDER BY dp.created_at ASC
        """),
        {"pid": patient_id}
    ).fetchall()

    return [{"date": r.created_at, "risk": float(r.risk)} for r in rows]

# ----------------------------------------------------------
# ANALYSIS
# ----------------------------------------------------------

def _analyze_disease(visits: List[Dict]) -> Dict:
    recent = visits[-RECENT_WINDOW:]
    past = visits[:-RECENT_WINDOW]

    current = round(mean(v["risk"] for v in recent), 2)
    previous = round(mean(v["risk"] for v in past), 2) if past else current

    improvement = previous - current
    improvement_pct = round((improvement / previous) * 100, 2) if previous else 0

    trend, status = _classify_status(current, improvement_pct)

    return {
        "status": status,
        "current_risk": current,
        "previous_risk": previous,
        "trend": trend,
        "improvement": improvement_pct
    }

def _no_disease_summary():
    return {
        "status": "NO_DISEASE",
        "current_risk": 0,
        "previous_risk": 0,
        "trend": "STABLE",
        "improvement": 0
    }

# ----------------------------------------------------------
# STATUS RULES
# ----------------------------------------------------------

def _classify_status(current_risk: float, improvement_pct: float):
    if current_risk >= CRITICAL_RISK:
        return "UP", "CRITICAL"
    if current_risk < NO_DISEASE_RISK:
        return "DOWN", "NO_DISEASE"
    if improvement_pct >= IMPROVEMENT_THRESHOLD:
        return "DOWN", "IMPROVING"
    if improvement_pct <= -IMPROVEMENT_THRESHOLD:
        return "UP", "WORSENING"
    return "STABLE", "STABLE"

def _overall_status(max_risk: float) -> str:
    if max_risk >= 80:
        return "CRITICAL"
    if max_risk >= 50:
        return "NEEDS_ATTENTION"
    if max_risk >= 25:
        return "MONITOR"
    return "HEALTHY"

# ----------------------------------------------------------
# UPSERT (ONE ROW ONLY)
# ----------------------------------------------------------

def _upsert_patient_health_summary(
    conn,
    patient_id: str,
    data: Dict,
    overall_status: str,
    max_risk: float
):
    conn.execute(
        text("""
            INSERT INTO patient_health_summary (
                patient_id,

                obesity_status, obesity_current_risk, obesity_previous_risk, obesity_trend, obesity_improvement,
                diabetes_status, diabetes_current_risk, diabetes_previous_risk, diabetes_trend, diabetes_improvement,
                liver_status, liver_current_risk, liver_previous_risk, liver_trend, liver_improvement,
                cardiovascular_status, cardiovascular_current_risk, cardiovascular_previous_risk, cardiovascular_trend, cardiovascular_improvement,

                overall_status, overall_risk
            )
            VALUES (
                :pid,

                :os, :ocr, :opr, :ot, :oi,
                :ds, :dcr, :dpr, :dt, :di,
                :ls, :lcr, :lpr, :lt, :li,
                :cs, :ccr, :cpr, :ct, :ci,

                :overall_status, :overall_risk
            )
            ON DUPLICATE KEY UPDATE
                obesity_status=:os, obesity_current_risk=:ocr, obesity_previous_risk=:opr, obesity_trend=:ot, obesity_improvement=:oi,
                diabetes_status=:ds, diabetes_current_risk=:dcr, diabetes_previous_risk=:dpr, diabetes_trend=:dt, diabetes_improvement=:di,
                liver_status=:ls, liver_current_risk=:lcr, liver_previous_risk=:lpr, liver_trend=:lt, liver_improvement=:li,
                cardiovascular_status=:cs, cardiovascular_current_risk=:ccr, cardiovascular_previous_risk=:cpr, cardiovascular_trend=:ct, cardiovascular_improvement=:ci,
                overall_status=:overall_status, overall_risk=:overall_risk,
                updated_at=NOW()
        """),
        {
            "pid": patient_id,

            "os": data["obesity"]["status"],
            "ocr": data["obesity"]["current_risk"],
            "opr": data["obesity"]["previous_risk"],
            "ot": data["obesity"]["trend"],
            "oi": data["obesity"]["improvement"],

            "ds": data["diabetes"]["status"],
            "dcr": data["diabetes"]["current_risk"],
            "dpr": data["diabetes"]["previous_risk"],
            "dt": data["diabetes"]["trend"],
            "di": data["diabetes"]["improvement"],

            "ls": data["liver"]["status"],
            "lcr": data["liver"]["current_risk"],
            "lpr": data["liver"]["previous_risk"],
            "lt": data["liver"]["trend"],
            "li": data["liver"]["improvement"],

            "cs": data["cardiovascular"]["status"],
            "ccr": data["cardiovascular"]["current_risk"],
            "cpr": data["cardiovascular"]["previous_risk"],
            "ct": data["cardiovascular"]["trend"],
            "ci": data["cardiovascular"]["improvement"],

            "overall_status": overall_status,
            "overall_risk": max_risk
        }
    )

    # ----------------------------------------------------------
# READ SUMMARY (FOR PATIENT PORTAL)
# ----------------------------------------------------------

def get_patient_health_summary(engine, patient_id: int):
    """
    Fetch PRE-CALCULATED health summary
    from patient_health_summary table
    """

    with engine.begin() as conn:
        row = conn.execute(
            text("""
                SELECT *
                FROM patient_health_summary
                WHERE patient_id = :pid
            """),
            {"pid": patient_id}
        ).fetchone()

    if not row:
        return None

    r = row._mapping

    diseases = []

    for d in DISEASES:
        diseases.append({
            "disease": d,
            "status": r[f"{d}_status"],
            "current_risk": float(r[f"{d}_current_risk"] or 0),
            "previous_risk": float(r[f"{d}_previous_risk"] or 0),
            "trend": r[f"{d}_trend"],
            "improvement_pct": float(r[f"{d}_improvement"] or 0),
        })

    return {
        "patient_id": r["patient_id"],
        "overall_status": r["overall_status"],
        "max_risk": float(r["overall_risk"] or 0),
        "diseases": diseases,
        "updated_at": r.get("updated_at")
    }

__all__ = [
    "analyze_patient_health",
    "get_patient_health_summary",
]
