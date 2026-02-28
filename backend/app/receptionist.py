import io
import re
import os
import warnings
import numpy as np
import json
import joblib
import smtplib

from typing import Literal
from pathlib import Path
from datetime import datetime, timedelta
from email.message import EmailMessage
from dotenv import load_dotenv
from fastapi import (
    FastAPI,
    Depends,
    HTTPException,
    UploadFile,
    File,
    APIRouter,
    Form,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy import create_engine, text
from passlib.context import CryptContext
from jose import jwt, JWTError
from pydantic import BaseModel, EmailStr
from google.cloud import vision
from transformers import (
    AutoTokenizer,
    AutoModelForTokenClassification,
    pipeline as hf_pipeline,
)
from services.recep_multi_disease_engine import (
    multi_disease_screening,
    DISEASE_FEATURE_MAP,
    DISEASE_MAP
)
from services.patient_health_analysis import analyze_patient_health
from services.symptom_cdss_engine import run_symptom_cdss
warnings.filterwarnings("ignore", category=FutureWarning)
load_dotenv()

router = APIRouter(prefix="/api/receptionist", tags=["Receptionist"])

# -----------------------------
# 1. CONFIGURATION
# -----------------------------
BASE_DIR = Path(r"D:/E/Frontend")
MODEL_PATH = BASE_DIR / "models" / "english_ner"
GOOGLE_CREDS = BASE_DIR / "GoogleCloudAPI" / "handwritingocr-481216-593bc8379de9.json"

# ===================== DATABASE =====================
DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=3600,
)

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL not set")

# ===================== JWT SETTINGS =====================
SECRET_KEY = os.getenv("JWT_RECEPTIONIST_SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError("JWT_RECEPTIONIST_SECRET_KEY not set")

JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ALGORITHM = JWT_ALGORITHM

ACCESS_TOKEN_EXPIRE_MINUTES = int(
    os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 1440)
)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/api/receptionist/login"
)

# -----------------------------
# 2. SCHEMAS
# -----------------------------
class ReceptionistRegister(BaseModel):
    username: str
    name: str
    email: EmailStr
    password: str

class ProfileUpdate(BaseModel):
    name: str
    email: EmailStr

class DigitalVisitCreate(BaseModel):
    prescription_serial: str 
    patient_id: str | None
    name: str
    phone: str
    age: int | None
    gender: Literal["MALE", "FEMALE", "OTHER"] | None
    height_cm: float | None
    weight_kg: float | None
    bp_systolic: int | None
    bp_diastolic: int | None
    doctor_id: int | None
    department: str | None = None
    doctor_name: str | None = None

class UnifiedIntakeCreate(BaseModel):
    is_new_patient: bool
    patient_id: str | None
    name: str
    phone: str
    age: int | None
    gender: Literal["MALE", "FEMALE", "OTHER"] | None
    height_cm: float | None
    weight_kg: float | None
    bp_systolic: int | None
    bp_diastolic: int | None
    doctor_id: int | None = None
    doctor_name: str | None = None
    department: str | None = None
    mode: Literal["DIGITAL", "HANDWRITTEN"]


# -----------------------------
# 3. MODELS & SERVICES INITIALIZATION
# -----------------------------
try:
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = str(GOOGLE_CREDS)
    vision_client = vision.ImageAnnotatorClient()

    tokenizer = AutoTokenizer.from_pretrained(str(MODEL_PATH))
    ner_model = AutoModelForTokenClassification.from_pretrained(str(MODEL_PATH))
    ner_pipeline = hf_pipeline(
        "ner",
        model=ner_model,
        tokenizer=tokenizer,
        aggregation_strategy="first",
    )

    print("✅ System initialized successfully.")
except Exception as e:
    print(f"❌ Initialization Error: {e}")

# -----------------------------
# GLOBAL CACHED DISEASE MAP
# -----------------------------
try:
    with engine.begin() as conn:
        DISEASE_MAP = {
            r.disease_name.lower().strip(): r.id
            for r in conn.execute(
                text("SELECT id, disease_name FROM diseases")
            )
        }
    print("✅ Disease map cached successfully.")
except Exception as e:
    DISEASE_MAP = {}
    print("❌ Failed to cache disease map:", e)

# -----------------------------
# 4. CONSTANTS & MAPS
# -----------------------------
NER_LABEL_MAP = {
    "PROBLEM": "symptoms",
    "SIGN": "symptoms",
    "DISEASE": "symptoms",
    "DRUG": "medicines",
    "TREATMENT": "medicines",
    "TEST": "tests",
    "LAB": "tests",
}

# -----------------------------
# 5. UTILITY FUNCTIONS
# -----------------------------
def safe_join(values):
    return ", ".join(sorted(values)) if values else ""


def to_python(obj):
    if isinstance(obj, np.generic):
        return obj.item()
    return obj


def simple_ner_extract(text: str):
    results = {
        "symptoms": set(),
        "medicines": set(),
        "tests": set(),
    }

    for ent in ner_pipeline(text):
        if ent.get("score", 0) < 0.6:
            continue

        category = NER_LABEL_MAP.get(ent.get("entity_group", "").upper())
        if not category:
            continue

        raw = ent["word"]

        # 🔹 FIX: split camelCase + bad OCR merges
        raw = re.sub(r"([a-z])([A-Z])", r"\1 \2", raw)
        raw = re.sub(r"[^a-zA-Z\s]", " ", raw)
        raw = re.sub(r"\s+", " ", raw).strip().lower()

        for token in raw.split():
            if len(token) < 3:
                continue
            results[category].add(token)

    return {k: ", ".join(sorted(v)) for k, v in results.items()}

# --------------------------------------------------
# HELPERS
# --------------------------------------------------
def num(pattern, text, cast=float):
    m = re.search(pattern, text, re.I)
    return cast(m.group(1)) if m else None

def reserve_ids(conn, is_new_patient: bool):
    row = conn.execute(text("""
        SELECT last_prescription_serial, last_patient_id
        FROM counters
        WHERE id = 1
        FOR UPDATE
    """)).first()

    new_serial = row.last_prescription_serial + 1

    if is_new_patient:
        new_patient = row.last_patient_id + 1
        conn.execute(text("""
            UPDATE counters
            SET last_prescription_serial=:s,
                last_patient_id=:p
            WHERE id=1
        """), {"s": new_serial, "p": new_patient})
    else:
        conn.execute(text("""
            UPDATE counters
            SET last_prescription_serial=:s
            WHERE id=1
        """), {"s": new_serial})

    return new_serial, (f"P{new_patient}" if is_new_patient else None)

def resolve_patient(
    conn,
    manual_patient_id: str | None,
    name: str,
    phone: str,
    age: int | None,
    gender: str | None,
):
    # 🔹 OLD PATIENT (manual ID)
    if manual_patient_id:
        row = conn.execute(
            text("""
                SELECT patient_id, patient_code
                FROM patient_details
                WHERE patient_id = :pid
            """),
            {"pid": manual_patient_id},
        ).first()

        if not row:
            raise HTTPException(404, "Patient ID not found")

        return row.patient_code, row.patient_id

    # 🔹 NEW PATIENT (already generated by intake)
    # ⛔ NO increment here
    # ⛔ NO rejection
    row = conn.execute(
        text("""
            SELECT patient_id, patient_code
            FROM patient_details
            WHERE phone = :phone
            ORDER BY created_at DESC
            LIMIT 1
        """),
        {"phone": phone},
    ).first()

    if row:
        return row.patient_code, row.patient_id

    raise HTTPException(
        400,
        "New patient must be created via intake first"
    )

# --------------------------------------------------
# FEATURE EXTRACTION (SINGLE SOURCE OF TRUTH)
# --------------------------------------------------
def extract_vitals(text: str):
    d = {
        "age": num(r"Age[:\- ]*(\d+)", text, int),
        "gender": None,
        "height_cm": num(r"Height[:\- ]*(\d+\.?\d*)", text),
        "weight_kg": num(r"Weight[:\- ]*(\d+\.?\d*)", text),
        "bmi": None,

        "age_of_the_patient": num(r"Age[:\- ]*(\d+)", text, int),
        "gender_of_the_patient": None,
        "total_bilirubin": None,
        "direct_bilirubin": None,
        "alkphos_alkaline_phosphotase": None,
        "sgpt_alamine_aminotransferase": None,
        "sgot_aspartate_aminotransferase": None,
        "total_protiens": None,
        "alb_albumin": None,
        "a/g_ratio_albumin_and_globulin_ratio": None,

        "ap_hi": None,
        "ap_lo": None,
        "cholesterol": None,
        "gluc": None,
        "smoke": None,
        "alco": None,
        "active": None,
        "pulse_pressure": None,
        "map": None,

        "pregnancies": None,
        "skin_thickness": None,
        "insulin": None,
        "dpf": None,
    }

    # --- LIVER ---
    d.update({
        "total_bilirubin": num(r"Total Bilirubin[:\- ]*(\d+\.?\d*)", text),
        "direct_bilirubin": num(r"Direct Bilirubin[:\- ]*(\d+\.?\d*)", text),
        "alkphos_alkaline_phosphotase": num(
            r"(?:ALP|Alkaline Phosphatase)[:\- ]*(\d+\.?\d*)", text
        ),
        "sgpt_alamine_aminotransferase": num(
            r"SGPT(?:\s*\(ALT\))?[:\- ]*(\d+\.?\d*)", text
        ),
        "sgot_aspartate_aminotransferase": num(
            r"SGOT(?:\s*\(AST\))?[:\- ]*(\d+\.?\d*)", text
        ),
        "total_protiens": num(
            r"(?:Total Protein|Total Proteins)[:\- ]*(\d+\.?\d*)", text
        ),
        "alb_albumin": num(
            r"(?:Albumin|ALB)[:\- ]*(\d+\.?\d*)", text
        ),
        "a/g_ratio_albumin_and_globulin_ratio": num(
            r"(?:A/G Ratio|Albumin/Globulin Ratio)[:\- ]*(\d+\.?\d*)", text
        ),
    })

    # --- HYPERTENSION ---
    d.update({
        "cholesterol": num(r"Cholesterol[:\- ]*(\d+)", text, int),
        "gluc": num(r"Glucose[:\- ]*(\d+)", text, int),
        "smoke": num(r"(?:Smoking|Smoke)[:\- ]*(\d+)", text, int),
        "alco": num(r"Alcohol[:\- ]*(\d+)", text, int),
        "active": num(r"(?:Physical Activity|Active)[:\- ]*(\d+)", text, int),
    })

    bp = re.search(r"BP[:\- ]*(\d{2,3})\s*/\s*(\d{2,3})", text)
    ap = re.search(
        r"AP High[:\- ]*(\d{2,3}).*?AP Low[:\- ]*(\d{2,3})",
        text,
        re.I,
    )

    if bp:
        d["ap_hi"] = int(bp.group(1))
        d["ap_lo"] = int(bp.group(2))
    elif ap:
        d["ap_hi"] = int(ap.group(1))
        d["ap_lo"] = int(ap.group(2))

    d["pulse_pressure"] = num(r"Pulse Pressure[:\- ]*(\d+\.?\d*)", text)
    d["map"] = num(r"MAP[:\- ]*(\d+\.?\d*)", text)

    if d["pulse_pressure"] is None and d["ap_hi"] and d["ap_lo"]:
        d["pulse_pressure"] = d["ap_hi"] - d["ap_lo"]

    if d["map"] is None and d["ap_hi"] and d["ap_lo"]:
        d["map"] = round(d["ap_lo"] + (d["pulse_pressure"] / 3), 2)

    d.update({
        "pregnancies": num(r"Pregnancies[:\- ]*(\d+)", text, int),
        "skin_thickness": num(
            r"(?:Skin Thickness|SkinFold)[:\- ]*(\d+\.?\d*)", text
        ),
        "insulin": num(r"Insulin[:\- ]*(\d+\.?\d*)", text),
        "dpf": num(
            r"(?:DPF|Diabetes Pedigree Function)[:\- ]*(\d+\.?\d*)", text
        ),
    })

    d["glucose"] = d["gluc"] if d["gluc"] is not None else None

    g = re.search(r"\b(Male|Female)\b", text, re.I)

    if g:
        gender_val = "MALE" if g.group(1).lower() == "male" else "FEMALE"
        d["gender"] = gender_val
        d["gender_of_the_patient"] = gender_val

    if d["height_cm"] and d["weight_kg"]:
        d["bmi"] = round(
            d["weight_kg"] / ((d["height_cm"] / 100) ** 2), 2
        )

    if d["age"] is None and d["age_of_the_patient"] is not None:
        d["age"] = d["age_of_the_patient"]

    return d

# =========================
# PATIENT DETAILS
# =========================
def extract_prescription_serial(text: str):
    patterns = [
        r"(?:prescription\s*serial|rx\s*no|prescription\s*no)\s*[:#\-]?\s*(\d{6,})",
        r"(?:serial\s*no)\s*[:#\-]?\s*(\d{6,})",
    ]
    for p in patterns:
        m = re.search(p, text, re.I)
        if m:
            return m.group(1)
    return None


def extract_patient_identity(text_data: str):
    details = {}

    pid_m = re.search(
        r"(?:Patient\s*ID|Pt\s*ID|PID|ID)\s*[:\-]?\s*([A-Za-z0-9\-\/]+)",
        text_data,
        re.I,
    )
    if pid_m:
        details["patient_id"] = pid_m.group(1).strip()

    name_m = re.search(
        r"(?:Patient\s*Name|Pt\s*Name|Name)\s*[:\-]?\s*([A-Za-z.\s]{3,60})"
        r"(?=\s*(Contact|Phone|Mobile|Gender|Age|Wt|Weight|Ht|Height|BP|Blood|$))",
        text_data,
        re.I,
    )
    if name_m:
        details["name"] = name_m.group(1).strip()

    phone_m = re.search(
        r"(?:Contact|Phone|Mobile|Tel)?\s*[:\-]?\s*(\+?8801\d{9}|01\d{9})",
        text_data,
    )
    if phone_m:
        details["phone"] = phone_m.group(1).strip()

    return details

def normalize_gender(g):
    if g is None:
        return None
    if g in ("MALE", "Male", "male", 0, "0"):
        return 0
    if g in ("FEMALE", "Female", "female", 1, "1"):
        return 1
    return None

def extract_disease_features(vitals: dict, disease: str):
    feature_list = DISEASE_FEATURE_MAP.get(disease, [])
    return {
        f: vitals.get(f)
        for f in feature_list
        if vitals.get(f) is not None
    }

def hash_pass(p):
    return pwd_context.hash(p)


def verify_pass(p, h):
    return pwd_context.verify(p, h)


def create_token(data):
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode(
        {**data, "exp": expire},
        SECRET_KEY,
        algorithm=ALGORITHM,
    )

def receptionist_required(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("role") != "receptionist":
            raise HTTPException(403, "Receptionist access only")
        return payload
    except JWTError:
        raise HTTPException(401, "Invalid or expired token")

# -----------------------------
# 6. API ENDPOINTS
# -----------------------------
@router.post("/analyze_and_store")
async def analyze_and_store(
    prescription_serial: str = Form(...),
    file: UploadFile = File(...),
    payload=Depends(receptionist_required),
):
    # =====================================================
    # 1️⃣ FILE VALIDATION
    # =====================================================
    if file.content_type not in ("image/png", "image/jpeg"):
        raise HTTPException(400, "Only PNG or JPEG images are allowed")

    image_bytes = await file.read()
    if len(image_bytes) > 5 * 1024 * 1024:
        raise HTTPException(400, "Image size exceeds 5MB limit")

    # =====================================================
    # 2️⃣ OCR
    # =====================================================
    vision_image = vision.Image(content=image_bytes)
    response = vision_client.document_text_detection(image=vision_image)
    raw_text = response.full_text_annotation.text or ""

    if not raw_text.strip():
        raise HTTPException(400, "No readable text detected")

    clean_text = re.sub(r"\s+", " ", raw_text).strip()

    # =====================================================
    # 3️⃣ OCR EXTRACTION
    # =====================================================
    vitals = extract_vitals(clean_text)
    ner_sections = simple_ner_extract(clean_text)
    identity = extract_patient_identity(clean_text)

    phone_number = identity.get("phone")
    if not phone_number:
        raise HTTPException(400, "Patient phone number not found")

    vitals["gender"] = normalize_gender(vitals.get("gender"))
    vitals["gender_of_the_patient"] = normalize_gender(
        vitals.get("gender_of_the_patient")
    )

    # =====================================================
    # 4️⃣ PRESCRIPTION LOCK (TX-1)
    # =====================================================
    with engine.begin() as conn:
        rx = conn.execute(
            text("""
                SELECT status, source, patient_id, patient_code
                FROM prescriptions
                WHERE prescription_serial = :s
                FOR UPDATE
            """),
            {"s": prescription_serial},
        ).first()

        if not rx:
            raise HTTPException(409, "Prescription not found")

        if rx.source != "HANDWRITTEN":
            raise HTTPException(409, "Only handwritten prescriptions allowed")

        if rx.status != "DRAFT":
            raise HTTPException(409, "Prescription must be in DRAFT")

        patient_id = rx.patient_id
        patient_code = rx.patient_code

        if not patient_id:
            raise HTTPException(409, "Patient not linked with prescription")

    # =====================================================
    # 5️⃣ ML PREDICTION (NO TX)
    # =====================================================
    vitals_ml = vitals.copy()
    vitals_ml["gender"] = normalize_gender(vitals_ml.get("gender"))

    try:
        diseases = multi_disease_screening(vitals_ml)
    except Exception:
        with engine.begin() as conn:
            conn.execute(
                text("""
                    UPDATE prescriptions
                    SET status='ERROR'
                    WHERE prescription_serial=:s
                """),
                {"s": prescription_serial},
            )
        raise HTTPException(500, "Prediction engine failed")

    # =====================================================
    # 5️⃣ SYMPTOM CDSS (ADD THIS BLOCK)
    # =====================================================
    symptom_dict = {
        s.strip().lower(): 1
        for s in ner_sections.get("symptoms", "").split(",")
        if s.strip()
    }
    
    try:
        symptom_results = run_symptom_cdss(symptom_dict)
    except Exception:
        symptom_results = {"top_3_predictions": []}


    # =====================================================
    # 6️⃣ PREPARE DISEASE PREDICTION ROW
    # =====================================================
    prediction_row = {
        "prescription_serial": prescription_serial,
        "patient_id": patient_id,
        "phone": phone_number,
        "symptom_predictions_json": json.dumps(symptom_results, default=to_python),
        "model_name": "receptionist_ocr_engine",
        "model_version": "v1.0",
    }

    ALL = ["obesity", "diabetes", "liver", "cardiovascular"]
    disease_ids, disease_names = [], []
    final_diseases = {}

    for d in ALL:
        prediction_row[f"{d}_prediction_result"] = None
        prediction_row[f"{d}_confidence_score"] = None
        prediction_row[f"{d}_risk_score"] = None
        prediction_row[f"{d}_features_json"] = None

        result = diseases.get(d, {
            "prediction": -1,
            "confidence": None,
            "future_risk": None,
            "features_used": {}
        })

        final_diseases[d] = result

        if result["prediction"] == -1:
            continue

        did = DISEASE_MAP.get(d)
        if not did:
            continue

        disease_ids.append(str(did))
        disease_names.append(d)

        prediction_row[f"{d}_prediction_result"] = result["prediction"]
        prediction_row[f"{d}_confidence_score"] = result["confidence"]
        prediction_row[f"{d}_risk_score"] = result["future_risk"]
        prediction_row[f"{d}_features_json"] = json.dumps({
            "features": result.get("features_used", {}),
            "expected": DISEASE_FEATURE_MAP.get(d, [])
        })

    prediction_row["disease_ids"] = ",".join(disease_ids) or None
    prediction_row["disease_names"] = ",".join(disease_names) or None

    # =====================================================
    # 7️⃣ FINAL COMMIT (TX-2)
    # =====================================================
    with engine.begin() as conn:
        # ---- patient vitals (idempotent)
        exists = conn.execute(
            text("""
                SELECT 1 FROM patient_health_records
                WHERE prescription_serial=:s
            """),
            {"s": prescription_serial},
        ).first()

        if not exists:
            conn.execute(
                text("""
                    INSERT INTO patient_health_records (
                        prescription_serial, patient_id, phone,
                        height_cm, weight_kg, bmi,
                        bp_systolic, bp_diastolic, created_at
                    )
                    VALUES (
                        :s, :pid, :p,
                        :h, :w, :bmi,
                        :sys, :dia, NOW()
                    )
                """),
                {
                    "s": prescription_serial,
                    "pid": patient_id,
                    "p": phone_number,
                    "h": vitals.get("height_cm"),
                    "w": vitals.get("weight_kg"),
                    "bmi": vitals.get("bmi"),
                    "sys": vitals.get("ap_hi"),
                    "dia": vitals.get("ap_lo"),
                },
            )

        # ---- replace disease prediction (safe)
        conn.execute(
            text("DELETE FROM disease_prediction WHERE prescription_serial=:s"),
            {"s": prescription_serial},
        )

        conn.execute(
            text("""
                INSERT INTO disease_prediction (
                    prescription_serial, patient_id, phone,
                    disease_ids, disease_names,
                    obesity_prediction_result, obesity_confidence_score, obesity_risk_score, obesity_features_json,
                    diabetes_prediction_result, diabetes_confidence_score, diabetes_risk_score, diabetes_features_json,
                    liver_prediction_result, liver_confidence_score, liver_risk_score, liver_features_json,
                    cardiovascular_prediction_result, cardiovascular_confidence_score, cardiovascular_risk_score, cardiovascular_features_json,
                    symptom_predictions_json,
                    model_name, model_version, created_at
                )
                VALUES (
                    :prescription_serial, :patient_id, :phone,
                    :disease_ids, :disease_names,
                    :obesity_prediction_result, :obesity_confidence_score, :obesity_risk_score, :obesity_features_json,
                    :diabetes_prediction_result, :diabetes_confidence_score, :diabetes_risk_score, :diabetes_features_json,
                    :liver_prediction_result, :liver_confidence_score, :liver_risk_score, :liver_features_json,
                    :cardiovascular_prediction_result, :cardiovascular_confidence_score, :cardiovascular_risk_score, :cardiovascular_features_json,
                    :symptom_predictions_json,
                    :model_name, :model_version, NOW()
                )
            """),
            prediction_row,
        )

        # ---- finalize prescription (SAME ROW)
        conn.execute(
            text("""
                UPDATE prescriptions
                SET
                    status='FINAL',
                    clean_text=:txt,
                    symptoms=:sym,
                    medicines=:med,
                    tests=:tst,
                    updated_at=NOW()
                WHERE prescription_serial=:s
            """),
            {
                "s": prescription_serial,
                "txt": clean_text,
                "sym": ner_sections["symptoms"],
                "med": ner_sections["medicines"],
                "tst": ner_sections["tests"],
            },
        )

    # =====================================================
    # 8️⃣ PATIENT HEALTH SUMMARY (BEST-EFFORT)
    # =====================================================
    try:
        analyze_patient_health(engine, patient_id)
    except Exception as e:
        print(f"⚠️ Health summary failed for {patient_id}: {e}")

    # =====================================================
    # 9️⃣ RESPONSE
    # =====================================================
    return {
        "message": "Handwritten prescription processed successfully",
        "prescription_serial": prescription_serial,
        "patient_id": patient_id,
        "patient_code": patient_code,
        "extracted_data": vitals,
        "ner_extracted": ner_sections,
        "patient_identity": identity,
        "diseases": final_diseases,
        "symptom_cdss": {
            "predictions": symptom_results.get("top_3_predictions", []),
            "warning": symptom_results.get("warning"),
            "diseases_detected": len(
                symptom_results.get("top_3_predictions", [])
            ),
            "has_high_probability": any(
                p.get("probability", 0) >= 70
                for p in symptom_results.get("top_3_predictions", [])
            ),
            "top_probability": max(
                [p.get("probability", 0)
                 for p in symptom_results.get("top_3_predictions", [])],
                default=0
            )
        },
        "clean_text": clean_text,
    }

@router.get("/latest-handwritten-draft")
def latest_handwritten_draft(payload=Depends(receptionist_required)):
    with engine.begin() as conn:
        row = conn.execute(text("""
            SELECT prescription_serial
            FROM prescriptions
            WHERE status='DRAFT'
              AND source='HANDWRITTEN'
            ORDER BY created_at DESC
            LIMIT 1
        """)).first()

    if not row:
        return {"prescription_serial": None}

    return {"prescription_serial": row.prescription_serial}

#=====================================================================================================
@router.post("/visit-intake")
def finalize_visit_intake(
    data: UnifiedIntakeCreate,
    payload=Depends(receptionist_required),
):
    bmi = None
    if data.height_cm and data.weight_kg:
        bmi = round(data.weight_kg / ((data.height_cm / 100) ** 2), 2)

    with engine.begin() as conn:

        # 🔒 LOCK COUNTERS
        counter = conn.execute(
            text("""
                SELECT last_prescription_serial, last_patient_id
                FROM counters
                WHERE id = 1
                FOR UPDATE
            """)
        ).first()

        # If first ever record
        if not counter:
            last_serial = 100000
            last_patient = 2000

            conn.execute(text("""
                INSERT INTO counters (id, last_prescription_serial, last_patient_id)
                VALUES (1, 100000, 2000)
            """))
        else:
            last_serial = counter.last_prescription_serial or 100000
            last_patient = counter.last_patient_id or 2000

        new_serial = last_serial + 1

        # ==========================
        # PATIENT RESOLUTION
        # ==========================

        if data.is_new_patient:
            new_patient_code = last_patient + 1
            patient_id = f"P{new_patient_code}"

            conn.execute(
                text("""
                    INSERT INTO patient_details (
                        patient_id,
                        patient_code,
                        name,
                        phone,
                        age,
                        gender,
                        created_at
                    ) VALUES (
                        :pid, :pc, :n, :p, :a, :g, NOW()
                    )
                """),
                {
                    "pid": patient_id,
                    "pc": new_patient_code,
                    "n": data.name,
                    "p": data.phone,
                    "a": data.age,
                    "g": data.gender,
                }
            )

        else:
            # Existing patient must exist
            row = conn.execute(
                text("""
                    SELECT patient_id, patient_code
                    FROM patient_details
                    WHERE patient_id = :pid
                """),
                {"pid": data.patient_id},
            ).first()

            if not row:
                raise HTTPException(404, "Patient ID not found")

            patient_id = row.patient_id
            new_patient_code = last_patient  # no increment

        # ==========================
        # INSERT PRESCRIPTION
        # ==========================

        conn.execute(
            text("""
                INSERT INTO prescriptions (
                    prescription_serial,
                    status,
                    source,
                    patient_id,
                    patient_code,
                    doctor_id,
                    doctor_name,
                    department,
                    created_at
                ) VALUES (
                    :s, 'DRAFT', :src,
                    :pid, :pc,
                    :doc_id, :doc_name, :dept,
                    NOW()
                )
            """),
            {
                "s": str(new_serial),
                "src": data.mode,
                "pid": patient_id,
                "pc": new_patient_code,
                "doc_id": data.doctor_id,
                "doc_name": data.doctor_name,
                "dept": data.department,
            }
        )

        # ==========================
        # INSERT VITALS
        # ==========================

        conn.execute(
            text("""
                INSERT INTO patient_health_records (
                    prescription_serial,
                    patient_id,
                    phone,
                    height_cm,
                    weight_kg,
                    bmi,
                    bp_systolic,
                    bp_diastolic,
                    created_at
                ) VALUES (
                    :s, :pid, :p,
                    :h, :w, :bmi,
                    :sys, :dia,
                    NOW()
                )
            """),
            {
                "s": str(new_serial),
                "pid": patient_id,
                "p": data.phone,
                "h": data.height_cm,
                "w": data.weight_kg,
                "bmi": bmi,
                "sys": data.bp_systolic,
                "dia": data.bp_diastolic,
            }
        )

        # ==========================
        # UPDATE COUNTERS (ONLY NOW)
        # ==========================

        if data.is_new_patient:
            conn.execute(
                text("""
                    UPDATE counters
                    SET last_prescription_serial = :s,
                        last_patient_id = :p
                    WHERE id = 1
                """),
                {
                    "s": new_serial,
                    "p": new_patient_code
                }
            )
        else:
            conn.execute(
                text("""
                    UPDATE counters
                    SET last_prescription_serial = :s
                    WHERE id = 1
                """),
                {"s": new_serial}
            )

    return {
        "prescription_serial": str(new_serial),
        "patient_id": patient_id,
        "status": "DRAFT"
    }

@router.get("/next-ids")
def get_next_ids(payload=Depends(receptionist_required)):
    with engine.begin() as conn:
        row = conn.execute(
            text("""
                SELECT last_prescription_serial, last_patient_id
                FROM counters
                WHERE id = 1
            """)
        ).first()

        # If first time (no counter yet)
        if not row:
            return {
                "prescription_serial": "100001",
                "patient_id": "P2001"
            }

        # If DB has zero values
        last_serial = row.last_prescription_serial or 100000
        last_patient = row.last_patient_id or 2000

        next_serial = last_serial + 1
        next_patient = last_patient + 1

    return {
        "prescription_serial": str(next_serial),
        "patient_id": f"P{next_patient}"
    }

#=====================================================================================================
@router.get("/patient/{patient_id}")
def get_patient(patient_id: str, payload=Depends(receptionist_required)):
    with engine.begin() as conn:
        r = conn.execute(
            text("""
                SELECT patient_id, name, phone, age, gender
                FROM patient_details
                WHERE patient_id = :pid
            """),
            {"pid": patient_id},
        ).first()

    if not r:
        raise HTTPException(404, "Patient not found")

    return dict(r._mapping)

@router.get("/patient-exists/{patient_id}")
def patient_exists(patient_id: str, payload=Depends(receptionist_required)):
    with engine.begin() as conn:
        r = conn.execute(
            text("SELECT 1 FROM patient_details WHERE patient_id=:pid"),
            {"pid": patient_id},
        ).first()

    return {"exists": bool(r)}




@router.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    with engine.begin() as conn:
        user = conn.execute(
            text("SELECT * FROM receptionists WHERE username=:u"),
            {"u": form_data.username},
        ).first()

        if not user:
            raise HTTPException(401, "Invalid credentials")

        user_data = user._mapping

        if not verify_pass(form_data.password, user_data["password"]):
            raise HTTPException(401, "Invalid credentials")

        if user_data["status"] != "APPROVED":
            return {
                "status": user_data["status"],
                "message": "Pending Admin Approval",
            }

        return {
            "access_token": create_token(
                {"sub": user_data["username"], "role": "receptionist"}
            ),
            "token_type": "bearer",
            "username": user_data["username"],
        }


@router.get("/me")
def me(payload=Depends(receptionist_required)):
    with engine.begin() as conn:
        r = conn.execute(
            text("""
                SELECT username, name, email, status
                FROM receptionists
                WHERE username=:u
            """),
            {"u": payload.get("sub")},
        ).first()

        if not r:
            raise HTTPException(404, "Not found")

        return dict(r._mapping)


@router.put("/update_profile")
def update_profile(
    data: ProfileUpdate,
    payload=Depends(receptionist_required),
):
    with engine.begin() as conn:
        conn.execute(
            text("""
                UPDATE receptionists
                SET name=:n, email=:e
                WHERE username=:u
            """),
            {
                "n": data.name,
                "e": data.email,
                "u": payload.get("sub"),
            },
        )

    return {"message": "Updated"}


@router.post("/register")
def register(data: ReceptionistRegister):
    with engine.begin() as conn:
        exists = conn.execute(
            text("""
                SELECT 1
                FROM receptionists
                WHERE username=:u OR email=:e
            """),
            {"u": data.username, "e": data.email},
        ).first()

        if exists:
            raise HTTPException(400, "User already exists")

        conn.execute(
            text("""
                INSERT INTO receptionists
                (username, name, email, password, status, created_at)
                VALUES
                (:u, :n, :e, :p, 'PENDING', NOW())
            """),
            {
                "u": data.username,
                "n": data.name,
                "e": data.email,
                "p": hash_pass(data.password),
            },
        )

    return {"message": "Success"}

@router.get("/prescription/{serial}")
def get_prescription_for_print(
    serial: str,
    payload=Depends(receptionist_required),
):
    with engine.begin() as conn:
        row = conn.execute(
            text("""
                SELECT
                    p.prescription_serial,
                    p.created_at,
                    p.patient_id,
                    p.department,
                    p.doctor_name,
                    p.doctor_id,

                    d.name,
                    d.phone,
                    d.age,
                    d.gender,

                    r.height_cm,
                    r.weight_kg,
                    r.bp_systolic,
                    r.bp_diastolic,
                    r.bmi

                FROM prescriptions p
                JOIN patient_details d
                    ON p.patient_id = d.patient_id
                LEFT JOIN patient_health_records r
                    ON r.prescription_serial = p.prescription_serial

                WHERE p.prescription_serial = :s
                AND p.status IN ('DRAFT', 'FINAL')
                LIMIT 1
            """),
            {"s": serial},
        ).first()

    if not row:
        raise HTTPException(404, "Prescription not found")

    return dict(row._mapping)
