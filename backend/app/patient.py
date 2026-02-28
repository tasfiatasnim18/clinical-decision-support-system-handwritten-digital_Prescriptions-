import os
import json
import smtplib
from fastapi import FastAPI, Depends, HTTPException, status, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from services.patient_health_analysis import get_patient_health_summary
from sqlalchemy import create_engine, text
from pydantic import BaseModel, EmailStr
from passlib.context import CryptContext
from jose import jwt, JWTError
from datetime import datetime, timedelta
from email.message import EmailMessage
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="MedAI Patient Portal API")

# -----------------------------
# 1. MIDDLEWARE & CONFIG
# -----------------------------

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
SECRET_KEY = os.getenv("JWT_PATIENT_SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError("JWT_PATIENT_SECRET_KEY not set")

JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ALGORITHM = JWT_ALGORITHM

ACCESS_TOKEN_EXPIRE_MINUTES = int(
    os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 1440)
)

SMTP_HOST = os.getenv("SMTP_HOST")
SMTP_PORT = int(os.getenv("SMTP_PORT", 465))
SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASS = os.getenv("SMTP_PASS")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/patient/login")

# -----------------------------
# 2. SCHEMAS
# -----------------------------
class PatientRegister(BaseModel):
    patient_id: str
    name: str
    email: EmailStr | None = None
    phone: str | None = None
    password: str

class ForgotPasswordRequest(BaseModel):
    identifier: str  # email or phone

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

class PatientProfile(BaseModel):
    name: str
    email: EmailStr

# -----------------------------
# 3. UTILITIES & AUTH
# -----------------------------
def log_event(user_id: int, role: str, action: str, details: str):
    """Internal helper to record activity in audit_logs table."""
    try:
        with engine.begin() as conn:
            conn.execute(text("""
                INSERT INTO audit_logs (user_id, user_role, action_type, action_details)
                VALUES (:uid, :role, :act, :det)
            """), {"uid": user_id, "role": role, "act": action, "det": details})
    except Exception as e:
        print(f"Logging Failed: {e}")

def create_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=JWT_ALGORITHM)

def get_current_patient(token: str = Depends(oauth2_scheme)):
    """Decodes token and verifies if the patient is approved by Admin."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        patient_internal_id = payload.get("id")

        if not patient_internal_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload"
            )

        with engine.begin() as conn:
            patient = conn.execute(
                text("SELECT status FROM patient_login WHERE id = :i"),
                {"i": patient_internal_id}
            ).fetchone()

            if not patient:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="User does not exist"
                )

            # 🔐 APPROVAL GATEKEEPER
            if patient.status != "APPROVED":
                log_event(
                    patient_internal_id,
                    "patient",
                    "BLOCKED_ACCESS",
                    f"Status={patient.status}"
                )
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access Denied: Your account is awaiting Admin approval."
                )

        return patient_internal_id

    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )

def safe_json(value):
    if not value:
        return None
    try:
        return json.loads(value)
    except Exception:
        return None

def patient_required(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )

        if payload.get("role") != "patient":
            raise HTTPException(
                status_code=403,
                detail="Patient access only"
            )

        return payload

    except JWTError:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token"
        )

# -----------------------------
# 4. ENDPOINTS
# -----------------------------

@app.post("/register")
def register_patient(data: PatientRegister):
    
    email = data.email if data.email not in ("", None) else None
    phone = data.phone if data.phone not in ("", None) else None
    
    if not data.email and not data.phone:
        raise HTTPException(
            status_code=400,
            detail="Either email or phone is required"
        )

    with engine.begin() as conn:
        if data.email:
            if conn.execute(text("SELECT 1 FROM patient_login WHERE email=:e"), {"e": data.email}).fetchone():
                raise HTTPException(400, "Email already used")

        if data.phone:
            if conn.execute(text("SELECT 1 FROM patient_login WHERE phone=:p"), {"p": data.phone}).fetchone():
                raise HTTPException(400, "Phone already used")

        if conn.execute(text("SELECT 1 FROM patient_login WHERE patient_id=:pid"), {"pid": data.patient_id}).fetchone():
            raise HTTPException(400, "Patient ID already exists")

        conn.execute(
            text("""
                INSERT INTO patient_login (
                    patient_id,
                    name,
                    email,
                    phone,
                    password,
                    status
                )
                VALUES (
                    :pid,
                    :n,
                    :e,
                    :ph,
                    :p,
                    'PENDING'
                )
            """),
            {
                "pid": data.patient_id,
                "n": data.name,
                "e": data.email if data.email else None,
                "ph": data.phone if data.phone else None,
                "p": pwd_context.hash(data.password)
            }
        )

    return {"status":"registered","message":"Waiting for admin approval"}

@app.post("/login")
def login_patient(form: OAuth2PasswordRequestForm = Depends()):
    with engine.begin() as conn:
        user = conn.execute(text("""
            SELECT * FROM patient_login
            WHERE patient_id=:u OR email=:u OR phone=:u
        """), {"u": form.username}).fetchone()

        if not user or not pwd_context.verify(form.password, user.password):
            raise HTTPException(401, "Invalid credentials")

        if user.status != "APPROVED":
            log_event(user.id,"patient","LOGIN_BLOCKED",f"Status={user.status}")
            raise HTTPException(403, "Account awaiting admin approval")

        token = create_token({"id": user.id, "role": "patient"})
        log_event(user.id,"patient","LOGIN_SUCCESS","Logged in")
        return {"access_token":token,"token_type":"bearer"}

@app.get("/me")
def patient_me(patient_id: int = Depends(get_current_patient)):
    with engine.begin() as conn:
        p = conn.execute(text("""
            SELECT patient_id,name,email,phone FROM patient_login WHERE id=:i
        """), {"i": patient_id}).fetchone()
        return dict(p._mapping)

@app.put("/update")
def update_patient(profile: PatientProfile, patient_id: int = Depends(get_current_patient)):
    with engine.begin() as conn:
        conn.execute(text("""
            UPDATE patient_login SET name=:n, email=:e WHERE id=:i
        """), {
            "n": profile.name,
            "e": profile.email,
            "i": patient_id
        })
    return {"status": "updated"}

@app.get("/history")
def patient_history(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=50),
    from_date: str | None = Query(None),
    to_date: str | None = Query(None),
    sort_by: str = Query("created_at", regex="^(created_at|risk)$"),
    order: str = Query("desc", regex="^(asc|desc)$"),
    patient_id: int = Depends(get_current_patient)
):
    offset = (page - 1) * limit

    filters = ""
    params = {
        "id": patient_id,
        "limit": limit,
        "offset": offset,
        "sort_by": sort_by,
        "order": order
    }

    if from_date:
        filters += " AND p.created_at >= :from_date"
        params["from_date"] = from_date

    if to_date:
        filters += " AND p.created_at <= :to_date"
        params["to_date"] = to_date

    with engine.begin() as conn:

        # ✅ TOTAL COUNT
        total = conn.execute(
            text(f"""
                SELECT COUNT(*)
                FROM prescriptions p
                JOIN patient_login pl
                    ON pl.patient_id = p.patient_id
                WHERE pl.id = :id
                {filters}
            """),
            params
        ).scalar()

        # ✅ PAGINATED DATA
        rows = conn.execute(
            text(f"""
                SELECT
                    p.prescription_serial,
                    p.created_at,
        
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
        
                    GREATEST(
                        COALESCE(dp.obesity_risk_score, 0),
                        COALESCE(dp.diabetes_risk_score, 0),
                        COALESCE(dp.liver_risk_score, 0),
                        COALESCE(dp.cardiovascular_risk_score, 0)
                    ) AS max_risk
        
                FROM prescriptions p
                LEFT JOIN patient_details pd
                    ON pd.patient_id = p.patient_id
                LEFT JOIN patient_health_records phr
                    ON phr.prescription_serial = p.prescription_serial
                LEFT JOIN disease_prediction dp
                    ON dp.prescription_serial = p.prescription_serial
                WHERE p.patient_id = (
                    SELECT patient_id FROM patient_login WHERE id = :id
                )
                {filters}
                ORDER BY
                    CASE WHEN :sort_by = 'risk' AND :order = 'desc' THEN max_risk END DESC,
                    CASE WHEN :sort_by = 'risk' AND :order = 'asc' THEN max_risk END ASC,
                
                    CASE WHEN :sort_by = 'created_at' AND :order = 'desc' THEN p.created_at END DESC,
                    CASE WHEN :sort_by = 'created_at' AND :order = 'asc' THEN p.created_at END ASC,
                
                    p.created_at DESC

                LIMIT :limit OFFSET :offset
            """),
            params
        ).fetchall()

    # 3️⃣ RESPONSE ASSEMBLY
    visits = {}

    for r in rows:
        rx = r.prescription_serial

        if rx not in visits:
            visits[rx] = {
                "prescription_serial": rx,
                "created_at": r.created_at,

                "patient": {
                    "patient_id": r.patient_id,
                    "name": r.name,
                    "phone": r.phone,
                    "age": r.age,
                    "gender": r.gender,
                },

                "vitals": {
                    "height_cm": r.height_cm,
                    "weight_kg": r.weight_kg,
                    "bmi": r.bmi,
                    "bp": {
                        "systolic": r.bp_systolic,
                        "diastolic": r.bp_diastolic,
                    }
                },

                "clinical": {
                    "symptoms": r.symptoms,
                    "medicines": r.medicines,
                    "tests": r.tests,
                },

                "predictions": []
            }

        DISEASES = [
            {"key": "obesity", "label": "Obesity"},
            {"key": "diabetes", "label": "Diabetes"},
            {"key": "liver", "label": "Liver Disease"},
            {"key": "cardiovascular", "label": "Cardiovascular Risk"}
        ]
        
        existing = {p["disease"] for p in visits[rx]["predictions"]}
        
        for d in DISEASES:
            key = d["key"]
            label = d["label"]
        
            if key in existing:
                continue
        
            result = getattr(r, f"{key}_prediction_result")
            if result is None or result == -1:
                continue
        
            visits[rx]["predictions"].append({
                "disease": key,
                "label": label,
                "result": int(result),
                "confidence": (
                    float(getattr(r, f"{key}_confidence_score"))
                    if getattr(r, f"{key}_confidence_score") is not None else None
                ),
                "risk": (
                    float(getattr(r, f"{key}_risk_score"))
                    if getattr(r, f"{key}_risk_score") is not None else None
                ),
                "features_json": safe_json(
                    getattr(r, f"{key}_features_json")
                )
            })


        visits[rx]["predictions"].sort(
            key=lambda x: x["risk"] if x["risk"] is not None else -1,
            reverse=True
        )

        # ------------------------------
        # SYMPTOM CDSS SECTION
        # ------------------------------
        raw_symptom = safe_json(
            getattr(r, "symptom_predictions_json", None)
        )
        
        if raw_symptom and isinstance(raw_symptom, dict):
        
            predictions = raw_symptom.get("top_3_predictions", [])
        
            visits[rx]["symptom_cdss"] = {
                "diseases_detected": len(predictions),
                "has_high_probability": any(
                    p.get("probability", 0) >= 70
                    for p in predictions
                ),
                "top_probability": max(
                    (p.get("probability", 0) for p in predictions),
                    default=0
                ),
                "predictions": predictions
            }
        else:
            visits[rx]["symptom_cdss"] = None


        visits[rx]["summary"] = {
            "diseases_detected": len(visits[rx]["predictions"]),
            "has_high_risk": any(
                p["risk"] is not None and p["risk"] >= 70
                for p in visits[rx]["predictions"]
            ),
            "max_risk": float(r.max_risk) if r.max_risk is not None else 0
        }

    # 4️⃣ FINAL PAGINATED RESPONSE
    return {
        "page": page,
        "limit": limit,
        "total_records": total,
        "total_pages": (total + limit - 1) // limit,
        "has_next": page < ((total + limit - 1) // limit),
        "has_prev": page > 1,
        "data": list(visits.values())
    }

@app.get("/history/{prescription_serial}")
def visit_detail(
    prescription_serial: str,
    patient_internal_id: int = Depends(get_current_patient)
):
    with engine.begin() as conn:
        row = conn.execute(
            text("""
                SELECT
                    p.prescription_serial,
                    p.created_at,

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

                    GREATEST(
                        COALESCE(dp.obesity_risk_score, 0),
                        COALESCE(dp.diabetes_risk_score, 0),
                        COALESCE(dp.liver_risk_score, 0),
                        COALESCE(dp.cardiovascular_risk_score, 0)
                    ) AS max_risk

                FROM prescriptions p
                LEFT JOIN patient_details pd
                    ON pd.patient_id = p.patient_id
                LEFT JOIN patient_health_records phr
                    ON phr.prescription_serial = p.prescription_serial
                LEFT JOIN disease_prediction dp
                    ON dp.prescription_serial = p.prescription_serial
                WHERE p.prescription_serial = :rx
                AND p.patient_id = (
                    SELECT patient_id
                    FROM patient_login
                    WHERE id = :id
                )
            """),
            {"rx": prescription_serial, "id": patient_internal_id}
        ).fetchone()

    if not row:
        raise HTTPException(404, "Prescription not found")

    r = row

    visit = {
        "prescription_serial": r.prescription_serial,
        "created_at": r.created_at,

        "patient": {
            "patient_id": r.patient_id,
            "name": r.name,
            "phone": r.phone,
            "age": r.age,
            "gender": r.gender,
        },

        "vitals": {
            "height_cm": r.height_cm,
            "weight_kg": r.weight_kg,
            "bmi": r.bmi,
            "bp": {
                "systolic": r.bp_systolic,
                "diastolic": r.bp_diastolic,
            }
        },

        "clinical": {
            "symptoms": r.symptoms,
            "medicines": safe_json(r.medicines),
            "tests": r.tests,
        },

        "predictions": []
    }

    # ------------------------------
    # DISEASE PREDICTIONS
    # ------------------------------
    DISEASES = [
        ("obesity", "Obesity"),
        ("diabetes", "Diabetes"),
        ("liver", "Liver Disease"),
        ("cardiovascular", "Cardiovascular Risk"),
    ]

    for key, label in DISEASES:
        result = getattr(r, f"{key}_prediction_result")
        if result is None or result == -1:
            continue

        visit["predictions"].append({
            "disease": key,
            "label": label,
            "result": int(result),
            "confidence": (
                float(getattr(r, f"{key}_confidence_score"))
                if getattr(r, f"{key}_confidence_score") is not None else None
            ),
            "risk": (
                float(getattr(r, f"{key}_risk_score"))
                if getattr(r, f"{key}_risk_score") is not None else None
            ),
            "features_json": safe_json(
                getattr(r, f"{key}_features_json")
            )
        })

    visit["predictions"].sort(
        key=lambda x: x["risk"] if x["risk"] is not None else -1,
        reverse=True
    )

    # ------------------------------
    # SYMPTOM CDSS
    # ------------------------------
    symptom_cdss = safe_json(r.symptom_predictions_json)

    if symptom_cdss:
        visit["symptom_cdss"] = {
            "diseases_detected": len(symptom_cdss),
            "has_high_probability": any(
                p.get("probability", 0) >= 70
                for p in symptom_cdss
            ),
            "top_probability": max(
                (p.get("probability", 0) for p in symptom_cdss),
                default=0
            ),
            "predictions": symptom_cdss
        }
    else:
        visit["symptom_cdss"] = None

    # ------------------------------
    # SUMMARY
    # ------------------------------
    visit["summary"] = {
        "diseases_detected": len(visit["predictions"]),
        "has_high_risk": any(
            p["risk"] is not None and p["risk"] >= 70
            for p in visit["predictions"]
        ),
        "max_risk": float(r.max_risk) if r.max_risk is not None else 0
    }

    return visit

@app.get("/history/cursor")
def history_cursor(
    limit: int = Query(10, ge=1, le=50),
    cursor: str | None = Query(None),
    patient_id: int = Depends(get_current_patient)
):
    with engine.begin() as conn:
        rows = conn.execute(
            text("""
                SELECT prescription_serial, created_at
                FROM prescriptions
                WHERE patient_id = (
                    SELECT patient_id FROM patient_login WHERE id = :id
                )
                AND (:cursor IS NULL OR created_at < :cursor)
                ORDER BY created_at DESC
                LIMIT :limit
            """),
            {
                "id": patient_id,
                "cursor": cursor,
                "limit": limit
            }
        ).fetchall()

    next_cursor = rows[-1].created_at if rows else None

    return {
        "next_cursor": next_cursor,
        "data": [dict(r._mapping) for r in rows]
    }

@app.get("/history/export/raw")
def export_raw_history(patient_id: int = Depends(get_current_patient)):
    data = patient_history(
        page=1,
        limit=1000,
        patient_id=patient_id
    )
    return data

@app.get("/history/summary")
def history_summary(patient_id: int = Depends(get_current_patient)):
    with engine.begin() as conn:
        row = conn.execute(
            text("""
                SELECT
                    COUNT(*) AS total_visits,

                    SUM(CASE WHEN obesity_prediction_result = 1 THEN 1 ELSE 0 END) AS obesity_positive,
                    SUM(CASE WHEN diabetes_prediction_result = 1 THEN 1 ELSE 0 END) AS diabetes_positive,
                    SUM(CASE WHEN liver_prediction_result = 1 THEN 1 ELSE 0 END) AS liver_positive,
                    SUM(CASE WHEN cardiovascular_prediction_result = 1 THEN 1 ELSE 0 END) AS cardiovascular_positive

                FROM disease_prediction dp
                JOIN prescriptions p
                    ON p.prescription_serial = dp.prescription_serial
                WHERE p.patient_id = (
                    SELECT patient_id FROM patient_login WHERE id = :id
                )
            """),
            {"id": patient_id}
        ).fetchone()

    return dict(row._mapping)

    
@app.post("/forgot_password")
def forgot_password(data: ForgotPasswordRequest):
    identifier = data.identifier
    with engine.begin() as conn:
        patient = conn.execute(
            text("""
                SELECT id, email, name FROM patient_login
                WHERE email=:id OR phone=:id
            """), {"id": identifier}
        ).fetchone()

        if not patient:
            # Security: don’t reveal existence
            return {"message": "If the account exists, a reset link has been sent!"}

        # Create reset token (expires in 15 minutes)
        RESET_TOKEN_EXPIRE_MINUTES = 15
        expire = datetime.utcnow() + timedelta(minutes=RESET_TOKEN_EXPIRE_MINUTES)
        token_data = {"id": patient.id, "exp": expire}
        RESET_SECRET = os.getenv("JWT_PATIENT_RESET_SECRET_KEY")
        reset_token = jwt.encode(token_data, RESET_SECRET, algorithm=ALGORITHM)

        # Send email with reset link
        try:
            msg = EmailMessage()
            msg["Subject"] = "MedAI Password Reset"
            msg["From"] = os.getenv("SMTP_FROM_NAME", "MedAI Hospital") + f" <{SMTP_USER}>"
            msg["To"] = patient.email
            reset_link = f"http://localhost:5173/patient/reset_password?token={reset_token}"
            msg.set_content(f"""
Hi {patient.name},

Click the link below to reset your password (expires in 15 minutes):

{reset_link}

If you did not request this, ignore this email.

Regards,
MedAI Hospital
""")
            with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT) as smtp:
                
                if not SMTP_USER or not SMTP_PASS:
                    raise RuntimeError("SMTP credentials not configured")

                smtp.login(SMTP_USER, SMTP_PASS)
                smtp.send_message(msg)
                print("Password reset email sent")
        except Exception as e:
            print("Email error:", e)

    return {"message": "If the account exists, a reset link has been sent!"}

@app.post("/reset_password")
def reset_password(data: ResetPasswordRequest):
    try:
        RESET_SECRET = os.getenv("JWT_PATIENT_RESET_SECRET_KEY")
        payload = jwt.decode(data.token, RESET_SECRET, algorithms=[ALGORITHM])

        patient_id = payload.get("id")
    except JWTError:
        raise HTTPException(400, "Invalid or expired token")

    if not patient_id:
        raise HTTPException(400, "Invalid token")

    with engine.begin() as conn:
        conn.execute(
            text("UPDATE patient_login SET password=:p WHERE id=:i"),
            {"p": pwd_context.hash(data.new_password), "i": patient_id}
        )

    return {"message": "Password has been reset successfully!"}


@app.get("/ping")
def ping():
    return {"status": "ok", "service": "patient"}

@app.get("/health-summary")
def my_health_summary(
    patient_internal_id: int = Depends(get_current_patient)
):
    with engine.begin() as conn:
        row = conn.execute(
            text("SELECT patient_id FROM patient_login WHERE id = :i"),
            {"i": patient_internal_id}
        ).fetchone()

    if not row:
        raise HTTPException(404, "Patient not found")

    patient_code = row.patient_id  # e.g. P1006

    summary = get_patient_health_summary(engine, patient_code)

    if not summary:
        raise HTTPException(
            status_code=404,
            detail="Health summary not available yet"
        )

    return summary
