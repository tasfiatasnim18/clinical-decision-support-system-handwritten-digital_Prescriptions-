import os
import json
from fastapi import FastAPI, Depends, HTTPException, status, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy import create_engine, text
from pydantic import BaseModel, EmailStr
from passlib.context import CryptContext
from jose import jwt, JWTError
from datetime import datetime, timedelta, date
from passlib.hash import bcrypt
from collections import defaultdict
from dotenv import load_dotenv
from typing import Any
from services.recep_multi_disease_engine import (
    multi_disease_screening,
    DISEASE_FEATURE_MAP,
    DISEASE_MAP
)
from services.patient_health_analysis import (
    analyze_patient_health,
    get_patient_health_summary
)
from services.symptom_cdss_engine import run_symptom_cdss
load_dotenv()

# 1️⃣ Create FastAPI app first
app = FastAPI(title="MedAI Doctor")

# ===================== DATABASE =====================
DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=3600
)
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL not set")

# ===================== JWT SETTINGS =====================
SECRET_KEY = os.getenv("JWT_DOCTOR_SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError("JWT_DOCTOR_SECRET_KEY not set")

JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ALGORITHM = JWT_ALGORITHM

ACCESS_TOKEN_EXPIRE_MINUTES = int(
    os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 1440)
)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ===================== SCHEMAS =====================
class DoctorRegister(BaseModel):
    username: str
    password: str
    full_name: str
    email: str
    specialization: str

class DoctorPrescriptionUpdate(BaseModel):
    symptoms: str
    diagnosis: str
    medicines: Any     # list / dict (JSON)
    tests: str | None = None
    next_followup_date: date | None = None
    pregnancies: int | None = 0

# ===================== HELPER FUNCTION =====================
def safe_json(value):
    if not value:
        return None
    try:
        return json.loads(value)
    except Exception:
        return None

def extract_disease_features(features: dict, disease: str):
    return {
        k: v for k, v in features.items()
        if v is not None
    }

def normalize_gender(g):
    if g is None:
        return None
    if g in ("MALE", "Male", "male", 0, "0"):
        return 0
    if g in ("FEMALE", "Female", "female", 1, "1"):
        return 1
    return None

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/doctor/login")

def doctor_required(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("role") != "doctor":
            raise HTTPException(403, "Doctor access only")
        return payload
    except JWTError:
        raise HTTPException(401, "Invalid or expired token")
# ===================== REGISTER =====================
@app.post("/register")
def register(doctor: DoctorRegister):
    with engine.begin() as conn:
        if conn.execute(
            text("SELECT 1 FROM doctors WHERE username=:u"),
            {"u": doctor.username}
        ).first():
            raise HTTPException(400, "Username already exists")

        conn.execute(
            text("""
                INSERT INTO doctors
                (username, password, full_name, email, specialization, status, created_at)
                VALUES (:u, :p, :f, :e, :s, 'PENDING', NOW())
            """),
            {
                "u": doctor.username,
                "p": bcrypt.hash(doctor.password),
                "f": doctor.full_name,
                "e": doctor.email,
                "s": doctor.specialization
            }
        )
    return {"message": "Registration submitted for approval"}

# ===================== LOGIN =====================
@app.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    with engine.connect() as conn:
        doctor = conn.execute(
            text("SELECT * FROM doctors WHERE username=:u"), {"u": form_data.username}
        ).first()
        if not doctor or not bcrypt.verify(form_data.password, doctor.password):
            raise HTTPException(401, "Invalid credentials")
        if doctor.status != "APPROVED":
            raise HTTPException(403, "Account not approved")
        token_data = {
            "sub": doctor.username,
            "id": doctor.id,
            "role": "doctor",
           "exp": datetime.utcnow() + timedelta(
                minutes=ACCESS_TOKEN_EXPIRE_MINUTES
            )
        }

        token = jwt.encode(token_data, SECRET_KEY, algorithm=ALGORITHM)
        return {"access_token": token, "token_type": "bearer"}

# ===================== CURRENT DOCTOR =====================
@app.get("/me")
def get_me(payload=Depends(doctor_required)):
    username = payload["sub"]
    with engine.connect() as conn:
        doctor = conn.execute(
            text("""
                SELECT id, username, full_name, email, specialization
                FROM doctors WHERE username=:u
            """),
            {"u": username}
        ).first()

        if not doctor:
            raise HTTPException(404, "Doctor not found")
        return dict(doctor._mapping)

# ===================== PATIENT HISTORY =====================
@app.get("/patients/history")
def doctor_patient_history(
    q: str = Query(...),
    page: int = Query(1, ge=1),
    limit: int = Query(10, le=50),
    payload=Depends(doctor_required)
):
    offset = (page - 1) * limit

    with engine.begin() as conn:
        total = conn.execute(
            text("""
                SELECT COUNT(DISTINCT p.prescription_serial)
                FROM patient_details pd
                JOIN patient_health_records phr 
                  ON pd.patient_id = phr.patient_id
                JOIN prescriptions p 
                  ON p.prescription_serial = phr.prescription_serial
                WHERE pd.patient_id = :q OR pd.phone = :q
            """),
            {"q": q}
        ).scalar()

        rows = conn.execute(
            text("""
                SELECT
                    p.prescription_serial,
                    p.created_at,
                    p.status,
                    p.diagnosis,
                    p.next_followup_date,

                    pd.patient_id,
                    pd.name,
                    pd.phone,
                    pd.age,
                    pd.gender,

                    phr.height_cm,
                    phr.weight_kg,
                    phr.bmi,
                    phr.bp_systolic,
                    phr.bp_diastolic,
                    phr.symptoms,
                    phr.pregnancies,
                    phr.medicines,
                    phr.tests,

                    dp.obesity_prediction_result,
                    dp.obesity_confidence_score,
                    dp.obesity_risk_score,
                    dp.obesity_features_json,

                    dp.diabetes_prediction_result,
                    dp.diabetes_confidence_score,
                    dp.diabetes_risk_score,
                    dp.diabetes_features_json,

                    dp.liver_prediction_result,
                    dp.liver_confidence_score,
                    dp.liver_risk_score,
                    dp.liver_features_json,

                    dp.cardiovascular_prediction_result,
                    dp.cardiovascular_confidence_score,
                    dp.cardiovascular_risk_score,
                    dp.cardiovascular_features_json,

                    dp.symptom_predictions_json,

                    d.full_name AS doctor_name,
                    d.specialization AS department,

                    GREATEST(
                      COALESCE(dp.obesity_risk_score, 0),
                      COALESCE(dp.diabetes_risk_score, 0),
                      COALESCE(dp.liver_risk_score, 0),
                      COALESCE(dp.cardiovascular_risk_score, 0)
                    ) AS max_risk

                FROM patient_details pd
                JOIN patient_health_records phr
                  ON pd.patient_id = phr.patient_id
                JOIN prescriptions p
                  ON p.prescription_serial = phr.prescription_serial
                LEFT JOIN disease_prediction dp
                  ON dp.prescription_serial = p.prescription_serial
                LEFT JOIN doctors d
                  ON d.id = p.doctor_id

                WHERE pd.patient_id = :q OR pd.phone = :q
                ORDER BY p.created_at DESC
                LIMIT :limit OFFSET :offset
            """),
            {"q": q, "limit": limit, "offset": offset}
        ).fetchall()

    visits = {}

    for r in rows:
        rx = r.prescription_serial

        # =====================================================
        # INITIALIZE VISIT ONCE
        # =====================================================
        if rx not in visits:
            visits[rx] = {
                "prescription_serial": rx,
                "status": r.status,
                "created_at": r.created_at,
                "doctor": {
                    "name": r.doctor_name,
                    "specialization": r.department
                },
                "patient": {
                    "patient_id": r.patient_id,
                    "name": r.name,
                    "phone": r.phone,
                    "age": r.age,
                    "gender": r.gender
                },
                "vitals": {
                    "height_cm": r.height_cm,
                    "weight_kg": r.weight_kg,
                    "bmi": r.bmi,
                    "bp": {
                        "systolic": r.bp_systolic,
                        "diastolic": r.bp_diastolic
                    },
                    "pregnancies": r.pregnancies
                },
                "clinical": {
                    "symptoms": r.symptoms,
                    "diagnosis": r.diagnosis,
                    "medicines": safe_json(r.medicines),
                    "tests": r.tests,
                    "next_followup_date": r.next_followup_date
                },
                "predictions": [],
                "symptom_cdss": None
            }

            # ===============================
            # ADD SYMPTOM CDSS (ONLY ONCE)
            # ===============================
            symptom_cdss = safe_json(r.symptom_predictions_json)

            if isinstance(symptom_cdss, list):
            
                clean_predictions = [
                    p for p in symptom_cdss
                    if isinstance(p, dict)
                ]
            
                if clean_predictions:
                    visits[rx]["symptom_cdss"] = {
                        "diseases_detected": len(clean_predictions),
                        "has_high_probability": any(
                            p.get("probability", 0) >= 70
                            for p in clean_predictions
                        ),
                        "top_probability": max(
                            (p.get("probability", 0) for p in clean_predictions),
                            default=0
                        ),
                        "predictions": clean_predictions
                    }

        # =====================================================
        # ADD LAB ML PREDICTIONS
        # =====================================================
        DISEASES = [
            ("obesity", "Obesity"),
            ("diabetes", "Diabetes"),
            ("liver", "Liver Disease"),
            ("cardiovascular", "Cardiovascular"),
        ]

        existing = {p["disease"] for p in visits[rx]["predictions"]}

        for key, label in DISEASES:
            if key in existing:
                continue

            result = getattr(r, f"{key}_prediction_result")
            if result is None or result == -1:
                continue

            visits[rx]["predictions"].append({
                "disease_id": DISEASE_MAP.get(key),
                "disease": key,
                "label": label,
                "result": result,
                "confidence": float(getattr(r, f"{key}_confidence_score"))
                    if getattr(r, f"{key}_confidence_score") is not None else None,
                "risk": float(getattr(r, f"{key}_risk_score"))
                    if getattr(r, f"{key}_risk_score") is not None else None,
                "features_json": safe_json(
                    getattr(r, f"{key}_features_json")
                )
            })

        visits[rx]["predictions"].sort(
            key=lambda x: x["risk"] if x["risk"] is not None else -1,
            reverse=True
        )

        visits[rx]["summary"] = {
            "diseases_detected": len(visits[rx]["predictions"]),
            "has_high_risk": any(
                p["risk"] is not None and p["risk"] >= 70
                for p in visits[rx]["predictions"]
            ),
            "max_risk": float(r.max_risk) if r.max_risk is not None else 0
        }

    return {
        "page": page,
        "limit": limit,
        "total_records": total,
        "total_pages": (total + limit - 1) // limit,
        "has_next": page < ((total + limit - 1) // limit),
        "has_prev": page > 1,
        "data": list(visits.values())
    }

@app.put("/prescriptions/{prescription_serial}")
def doctor_update_prescription(
    prescription_serial: str,
    data: DoctorPrescriptionUpdate,
    payload=Depends(doctor_required)
):

    with engine.begin() as conn:

        # -------------------------------
        # 1️⃣ OWNERSHIP CHECK
        # -------------------------------
        rx = conn.execute(
            text("""
                SELECT patient_id, doctor_id, status
                FROM prescriptions
                WHERE prescription_serial = :s
            """),
            {"s": prescription_serial}
        ).first()

        if not rx:
            raise HTTPException(404, "Prescription not found")

        if rx.doctor_id != payload["id"]:
            raise HTTPException(403, "Not your prescription")

        if rx.status != "DRAFT":
            raise HTTPException(409, "Only DRAFT prescriptions can be edited")

        # -------------------------------
        # 2️⃣ UPDATE PRESCRIPTION
        # -------------------------------
        conn.execute(
            text("""
                UPDATE prescriptions
                SET symptoms=:sym,
                    diagnosis=:diag,
                    medicines=:med,
                    tests=:tst,
                    next_followup_date=:follow,
                    status='FINAL'
                WHERE prescription_serial=:s
            """),
            {
                "s": prescription_serial,
                "sym": data.symptoms,
                "diag": data.diagnosis,
                "med": json.dumps(data.medicines),
                "tst": data.tests,
                "follow": data.next_followup_date
            }
        )

        conn.execute(
            text("""
                UPDATE patient_health_records
                SET symptoms=:sym,
                    medicines=:med,
                    tests=:tst,
                    pregnancies=:preg 
                WHERE prescription_serial=:s
            """),
            {
                "s": prescription_serial,
                "sym": data.symptoms,
                "med": json.dumps(data.medicines),
                "tst": data.tests,
                "preg": data.pregnancies or 0
            }
        )

        # -------------------------------
        # 3️⃣ FETCH VITALS
        # -------------------------------
        vitals = conn.execute(
            text("""
                SELECT
                    pd.age,
                    pd.gender,
                    pd.phone,
                    phr.height_cm,
                    phr.weight_kg,
                    phr.bmi,
                    phr.bp_systolic AS ap_hi,
                    phr.bp_diastolic AS ap_lo,
                    phr.pregnancies
                FROM patient_health_records phr
                JOIN patient_details pd
                  ON pd.patient_id = phr.patient_id
                WHERE phr.prescription_serial = :s
            """),
            {"s": prescription_serial}
        ).first()

        if not vitals:
            raise HTTPException(400, "Vitals missing")

        features = dict(vitals._mapping)
        features["gender"] = normalize_gender(features.get("gender"))
        
        if features.get("gender") == 0:
            features["pregnancies"] = 0


        # -------------------------------
        # 4️⃣ LAB ML PREDICTION
        # -------------------------------
        lab_results = multi_disease_screening(features)

        # -------------------------------
        # 5️⃣ SYMPTOM CDSS PREDICTION
        # -------------------------------
        symptom_dict = {
            s.strip().lower(): 1
            for s in (data.symptoms or "").split(",")
            if s.strip()
        }

        symptom_results = run_symptom_cdss(symptom_dict)

        # -------------------------------
        # 6️⃣ PREPARE ROW
        # -------------------------------
        row = {
            "prescription_serial": prescription_serial,
            "patient_id": rx.patient_id,
            "phone": features.get("phone"),
            "model_name": "doctor_triggered_engine",
            "model_version": "v2.0",
            "symptom_predictions_json": json.dumps(
                symptom_results.get("top_3_predictions", [])
            )
        }
        
        ALL = ["obesity", "diabetes", "liver", "cardiovascular"]
        
        disease_ids = []
        disease_names = []
        
        for d in ALL:
            row[f"{d}_prediction_result"] = None
            row[f"{d}_confidence_score"] = None
            row[f"{d}_risk_score"] = None
            row[f"{d}_features_json"] = None
        
        for disease, result in lab_results.items():
        
            if result["prediction"] == -1:
                continue
        
            did = DISEASE_MAP.get(disease)
            if did:
                disease_ids.append(str(did))
                disease_names.append(disease)
        
            row[f"{disease}_prediction_result"] = result["prediction"]
            row[f"{disease}_confidence_score"] = result["confidence"]
            row[f"{disease}_risk_score"] = result["future_risk"]
            row[f"{disease}_features_json"] = json.dumps({
                "features": result.get("features_used", {}),
                "expected": DISEASE_FEATURE_MAP.get(disease, [])
            })
        
        row["disease_ids"] = ",".join(disease_ids) if disease_ids else None
        row["disease_names"] = ",".join(disease_names) if disease_names else None


        # -------------------------------
        # 7️⃣ REPLACE OLD ROW
        # -------------------------------
        conn.execute(
            text("DELETE FROM disease_prediction WHERE prescription_serial=:s"),
            {"s": prescription_serial}
        )

        conn.execute(
            text("""
                INSERT INTO disease_prediction (
                    prescription_serial,
                    patient_id,
                    phone,
                    disease_ids,
                    disease_names,
                    obesity_prediction_result,
                    obesity_confidence_score,
                    obesity_risk_score,
                    obesity_features_json,
                    diabetes_prediction_result,
                    diabetes_confidence_score,
                    diabetes_risk_score,
                    diabetes_features_json,
                    liver_prediction_result,
                    liver_confidence_score,
                    liver_risk_score,
                    liver_features_json,
                    cardiovascular_prediction_result,
                    cardiovascular_confidence_score,
                    cardiovascular_risk_score,
                    cardiovascular_features_json,
                    symptom_predictions_json,
                    model_name,
                    model_version,
                    created_at
                )
                VALUES (
                    :prescription_serial,
                    :patient_id,
                    :phone,
                    :disease_ids,
                    :disease_names,
                    :obesity_prediction_result,
                    :obesity_confidence_score,
                    :obesity_risk_score,
                    :obesity_features_json,
                    :diabetes_prediction_result,
                    :diabetes_confidence_score,
                    :diabetes_risk_score,
                    :diabetes_features_json,
                    :liver_prediction_result,
                    :liver_confidence_score,
                    :liver_risk_score,
                    :liver_features_json,
                    :cardiovascular_prediction_result,
                    :cardiovascular_confidence_score,
                    :cardiovascular_risk_score,
                    :cardiovascular_features_json,
                    :symptom_predictions_json,
                    :model_name,
                    :model_version,
                    NOW()
                )
            """),
            row
        )

    analyze_patient_health(engine, rx.patient_id)

    return {
        "message": "Prescription finalized.",
        "prescription_serial": prescription_serial,
        "symptom_cdss": symptom_results
    }

@app.get("/patients/{q}/health-summary")
def patient_health_summary(q: str, payload=Depends(doctor_required)):
    with engine.begin() as conn:
        row = conn.execute(
            text("""
                SELECT patient_id
                FROM patient_details
                WHERE patient_id = :q OR phone = :q
            """),
            {"q": q}
        ).first()

    if not row:
        raise HTTPException(404, "Patient not found")

    return get_patient_health_summary(engine, row.patient_id)