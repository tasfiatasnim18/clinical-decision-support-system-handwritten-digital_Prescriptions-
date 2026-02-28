#!/usr/bin/env python
# coding: utf-8

import os
import json
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy import create_engine, text
from passlib.context import CryptContext
from jose import jwt, JWTError
from pydantic import BaseModel, EmailStr
from dotenv import load_dotenv

from services.recep_multi_disease_engine import (
    multi_disease_screening,
    DISEASE_FEATURE_MAP,
    DISEASE_MAP
)
from services.patient_health_analysis import analyze_patient_health

load_dotenv()

router = APIRouter(prefix="/api/lab", tags=["Lab"])

# ======================================================
# DATABASE
# ======================================================
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL not set")

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=3600
)

# ======================================================
# JWT CONFIG
# ======================================================
SECRET_KEY = os.getenv("JWT_LAB_SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError("JWT_LAB_SECRET_KEY not set")

ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 1440))

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/lab/login")

# ======================================================
# SCHEMAS
# ======================================================

class LabRegister(BaseModel):
    username: str
    name: str
    email: EmailStr
    password: str


class LabReportCreate(BaseModel):
    disease: str

    glucose: Optional[float] = None
    cholesterol: Optional[float] = None
    insulin: Optional[float] = None
    skin_thickness: Optional[float] = None
    dpf: Optional[float] = None

    total_bilirubin: Optional[float] = None
    direct_bilirubin: Optional[float] = None
    sgpt: Optional[float] = None
    sgot: Optional[float] = None


# ======================================================
# HELPERS
# ======================================================

def hash_pass(p):
    return pwd_context.hash(p)


def verify_pass(p, h):
    return pwd_context.verify(p, h)


def create_token(data):
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode({**data, "exp": expire}, SECRET_KEY, algorithm=ALGORITHM)


def normalize_gender(g):
    if g in ("MALE", "Male", "male", 0, "0"):
        return 0
    if g in ("FEMALE", "Female", "female", 1, "1"):
        return 1
    return None


def lab_required(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("role") != "lab":
            raise HTTPException(403, "Lab access only")
        return payload
    except JWTError:
        raise HTTPException(401, "Invalid or expired token")


# ======================================================
# REGISTER
# ======================================================

@router.post("/register")
def register(data: LabRegister):
    with engine.begin() as conn:
        exists = conn.execute(
            text("SELECT 1 FROM lab_users WHERE username=:u OR email=:e"),
            {"u": data.username, "e": data.email}
        ).first()

        if exists:
            raise HTTPException(400, "User already exists")

        conn.execute(
            text("""
                INSERT INTO lab_users
                (username, name, email, password, status, created_at)
                VALUES (:u, :n, :e, :p, 'PENDING', NOW())
            """),
            {
                "u": data.username,
                "n": data.name,
                "e": data.email,
                "p": hash_pass(data.password)
            }
        )

    return {"message": "Registration submitted for approval"}


# ======================================================
# LOGIN
# ======================================================

@router.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    with engine.begin() as conn:
        user = conn.execute(
            text("SELECT * FROM lab_users WHERE username=:u"),
            {"u": form_data.username}
        ).first()

        if not user:
            raise HTTPException(401, "Invalid credentials")

        user_data = user._mapping

        if not verify_pass(form_data.password, user_data["password"]):
            raise HTTPException(401, "Invalid credentials")

        if user_data["status"] != "APPROVED":
            raise HTTPException(403, "Account not approved")

        return {
            "access_token": create_token({
                "id": user_data["id"],
                "sub": user_data["username"],
                "role": "lab"
            }),
            "token_type": "bearer"
        }
@router.get("/me") 
def get_lab_profile(payload=Depends(lab_required)): 
    with engine.connect() as conn: 
        lab = conn.execute( 
            text("""
                SELECT id, username, name, email, status 
                FROM lab_users WHERE id=:i 
            """), 
            {"i": payload["id"]}
        ).first()
        
        if not lab: 
            raise HTTPException(404, "Lab not found") 
        return dict(lab._mapping)

# ======================================================
# SUBMIT LAB REPORT
# ======================================================

@router.post("/submit-report/{prescription_serial}")
def submit_lab_report(
    prescription_serial: str,
    data: LabReportCreate,
    payload=Depends(lab_required)
):

    selected = data.disease.lower()

    if selected not in DISEASE_FEATURE_MAP:
        raise HTTPException(400, "Invalid disease selected")

    # ----------------------------------------
    # 1️⃣ FETCH PATIENT + VITALS FROM DB
    # ----------------------------------------
    with engine.begin() as conn:

        rx = conn.execute(
            text("""
                SELECT patient_id, status
                FROM prescriptions
                WHERE prescription_serial=:s
                FOR UPDATE
            """),
            {"s": prescription_serial}
        ).first()

        if not rx:
            raise HTTPException(404, "Prescription not found")

        if rx.status != "FINAL":
            raise HTTPException(409, "Prescription must be FINAL")

        patient_id = rx.patient_id

        patient = conn.execute(
            text("SELECT age, gender FROM patient_details WHERE patient_id=:pid"),
            {"pid": patient_id}
        ).first()

        vitals = conn.execute(
            text("""
                SELECT height_cm, weight_kg, bmi,
                       bp_systolic AS ap_hi,
                       bp_diastolic AS ap_lo,
                       pregnancies,
                       phone
                FROM patient_health_records
                WHERE prescription_serial=:s
            """),
            {"s": prescription_serial}
        ).first()

    if not patient or not vitals:
        raise HTTPException(400, "Patient data incomplete")

    # ----------------------------------------
    # 2️⃣ DERIVED FEATURES (Backend Only)
    # ----------------------------------------
    ap_hi = vitals.ap_hi
    ap_lo = vitals.ap_lo

    pulse_pressure = None
    map_value = None

    if ap_hi is not None and ap_lo is not None:
        pulse_pressure = ap_hi - ap_lo
        map_value = (ap_hi + 2 * ap_lo) / 3

    # ----------------------------------------
    # 3️⃣ BUILD FULL FEATURE SET
    # ----------------------------------------
    features = {
        "age": patient.age,
        "gender": normalize_gender(patient.gender),
        "pregnancies": vitals.pregnancies,

        "height_cm": vitals.height_cm,
        "weight_kg": vitals.weight_kg,
        "bmi": vitals.bmi,

        "ap_hi": ap_hi,
        "ap_lo": ap_lo,
        "pulse_pressure": pulse_pressure,
        "map": map_value,

        # Lab inputs only from UI
        "glucose": data.glucose,
        "cholesterol": data.cholesterol,
        "insulin": data.insulin,
        "skin_thickness": data.skin_thickness,
        "dpf": data.dpf,
        "total_bilirubin": data.total_bilirubin,
        "direct_bilirubin": data.direct_bilirubin,
        "sgpt_alamine_aminotransferase": data.sgpt,
        "sgot_aspartate_aminotransferase": data.sgot,
    }

    # ----------------------------------------
    # 4️⃣ RUN ML ENGINE
    # ----------------------------------------
    all_results = multi_disease_screening(features)
    result = all_results.get(selected)

    if not result or result["prediction"] == -1:
        raise HTTPException(400, "Insufficient data for selected disease")

    # ----------------------------------------
    # 5️⃣ PREPARE DATABASE ROW
    # ----------------------------------------
    row = {
        "prescription_serial": prescription_serial,
        "patient_id": patient_id,
        "phone": vitals.phone, 
        "model_name": "lab_triggered_engine",
        "model_version": "v2.0",
    }

    ALL = ["obesity", "diabetes", "liver", "cardiovascular"]

    for d in ALL:
        row[f"{d}_prediction_result"] = None
        row[f"{d}_confidence_score"] = None
        row[f"{d}_risk_score"] = None
        row[f"{d}_features_json"] = None

    row[f"{selected}_prediction_result"] = result["prediction"]
    row[f"{selected}_confidence_score"] = result["confidence"]
    row[f"{selected}_risk_score"] = result["future_risk"]
    row[f"{selected}_features_json"] = json.dumps({
        "features": result.get("features_used", {}),
        "expected": DISEASE_FEATURE_MAP.get(selected, [])
    })

    disease_id = DISEASE_MAP.get(selected)
    row["disease_ids"] = str(disease_id) if disease_id else None
    row["disease_names"] = selected

    # ----------------------------------------
    # 6️⃣ STORE RESULT
    # ----------------------------------------
    with engine.begin() as conn:

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
                    :model_name,
                    :model_version,
                    NOW()
                )
            """),
            row
        )

    analyze_patient_health(engine, patient_id)

    return {
        "message": "Lab report processed successfully",
        "prescription_serial": prescription_serial,
        "disease": selected,
        "prediction": result
    }
