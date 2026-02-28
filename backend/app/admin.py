import os
import smtplib
from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy import create_engine, text
from fastapi.middleware.cors import CORSMiddleware
from email.message import EmailMessage
from jose import jwt, JWTError
from datetime import datetime, timedelta
from passlib.context import CryptContext
from fastapi.security import OAuth2PasswordBearer
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="MedAI Admin")

# ===================== CORS =====================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
SECRET_KEY = os.getenv("JWT_ADMIN_SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError("JWT_ADMIN_SECRET_KEY not set")

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

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/admin/login")

def admin_required(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("role") != "admin":
            raise HTTPException(403, "Admin access only")
        return payload
    except JWTError:
        raise HTTPException(401, "Invalid admin token")

def audit_log(conn, *, actor_id, action, target_id, target_role, details):
    conn.execute(
        text("""
            INSERT INTO audit_logs
            (user_id, user_role, action_type, target_id, target_role, action_details)
            VALUES
            (:uid, 'admin', :act, :tid, :trole, :det)
        """),
        {
            "uid": actor_id,
            "act": action,
            "tid": target_id,
            "trole": target_role,
            "det": details
        }
    )

# ===================== SCHEMAS =====================
class ApprovalAction(BaseModel):
    user_id: int


class AdminLogin(BaseModel):
    username: str
    password: str


# ===================== ADMIN LOGIN =====================
@app.post("/login")
def admin_login(data: AdminLogin):
    with engine.connect() as conn:
        admin = conn.execute(
            text("SELECT * FROM admins WHERE username=:u OR email=:u"),
            {"u": data.username}  # the user can enter username or email
        ).first()

        if not admin or not pwd_context.verify(data.password, admin.password):
            raise HTTPException(status_code=401, detail="Invalid credentials")

        token = jwt.encode(
            {
                "id": admin.id,
                "role": "admin",
                "exp": datetime.utcnow() + timedelta(hours=6)
            },
            SECRET_KEY,
            algorithm=ALGORITHM
        )


        return {"access_token": token, "token_type": "bearer"}

# ===================== SYSTEM STATS =====================
@app.get("/system_stats", dependencies=[Depends(admin_required)])
def system_stats():
    with engine.connect() as conn:
        return {
            "active_receptionists": conn.execute(
                text("SELECT COUNT(*) FROM receptionists WHERE status='APPROVED'")
            ).scalar(),
            
            "active_labs": conn.execute(
                text("SELECT COUNT(*) FROM lab_users WHERE status='APPROVED'")
            ).scalar(),
            
            "active_doctors": conn.execute(
                text("SELECT COUNT(*) FROM doctors WHERE status='APPROVED'")
            ).scalar(),
            
            "active_patients": conn.execute(
                text("SELECT COUNT(*) FROM patient_login WHERE status='APPROVED'")
            ).scalar()
        }


# ===================== PENDING USERS =====================
@app.get("/pending", dependencies=[Depends(admin_required)])
def pending_users():
    with engine.connect() as conn:
        return {
            "receptionists": [
                dict(r._mapping) for r in conn.execute(
                    text("SELECT id, username, name AS full_name FROM receptionists WHERE status='PENDING'")
                )
            ],
            "labs": [
                dict(l._mapping) for l in conn.execute(
                    text("SELECT id, username, name AS full_name FROM lab_users WHERE status='PENDING'")
                )
            ],
            "doctors": [
                dict(d._mapping) for d in conn.execute(
                    text("SELECT id, username, full_name FROM doctors WHERE status='PENDING'")
                )
            ],
            "patients": [
                dict(p._mapping) for p in conn.execute(
                    text("SELECT id, patient_id, name AS full_name FROM patient_login WHERE status='PENDING'")
                )
            ]
        }


# ===================== APPROVE / REJECT =====================
@app.post("/approve_receptionist")
def approve_receptionist(a: ApprovalAction, payload=Depends(admin_required)):
    admin_id = payload["id"]

    with engine.begin() as conn:
        res = conn.execute(
            text("UPDATE receptionists SET status='APPROVED' WHERE id=:i"),
            {"i": a.user_id}
        )

        if res.rowcount == 0:
            raise HTTPException(404, "Receptionist not found")

        audit_log(
            conn,
            actor_id=admin_id,
            action="APPROVE",
            target_id=a.user_id,
            target_role="receptionist",
            details=f"Receptionist #{a.user_id} approved"
        )

    return {"status": "approved"}

@app.post("/reject_receptionist")
def reject_receptionist(a: ApprovalAction, payload=Depends(admin_required)):
    admin_id = payload["id"]

    with engine.begin() as conn:
        res = conn.execute(
            text("UPDATE receptionists SET status='REJECTED' WHERE id=:i"),
            {"i": a.user_id}
        )

        if res.rowcount == 0:
            raise HTTPException(404, "Receptionist not found")

        audit_log(
            conn,
            actor_id=admin_id,
            action="REJECT",
            target_id=a.user_id,
            target_role="receptionist",
            details=f"Receptionist #{a.user_id} rejected"
        )

    return {"status": "rejected"}

@app.post("/approve_lab")
def approve_lab(a: ApprovalAction, payload=Depends(admin_required)):
    admin_id = payload["id"]

    with engine.begin() as conn:
        lab = conn.execute(
            text("SELECT email, username FROM lab_users WHERE id=:i"),
            {"i": a.user_id}
        ).first()

        if not lab:
            raise HTTPException(404, "Lab assistant not found")

        conn.execute(
            text("UPDATE lab_users SET status='APPROVED' WHERE id=:i"),
            {"i": a.user_id}
        )

        audit_log(
            conn,
            actor_id=admin_id,
            action="APPROVE",
            target_id=a.user_id,
            target_role="lab",
            details=f"Lab assistant #{a.user_id} approved"
        )

        send_lab_approval_email(lab.email, lab.username)

    return {"status": "approved"}

@app.post("/reject_lab")
def reject_lab(a: ApprovalAction, payload=Depends(admin_required)):
    admin_id = payload["id"]

    with engine.begin() as conn:
        res = conn.execute(
            text("UPDATE lab_users SET status='REJECTED' WHERE id=:i"),
            {"i": a.user_id}
        )

        if res.rowcount == 0:
            raise HTTPException(404, "Lab assistant not found")

        audit_log(
            conn,
            actor_id=admin_id,
            action="REJECT",
            target_id=a.user_id,
            target_role="lab",
            details=f"Lab assistant #{a.user_id} rejected"
        )

    return {"status": "rejected"}


@app.post("/approve_doctor")
def approve_doctor(a: ApprovalAction, payload=Depends(admin_required)):
    admin_id = payload["id"]

    with engine.begin() as conn:
        doctor = conn.execute(
            text("SELECT email, username FROM doctors WHERE id=:i"),
            {"i": a.user_id}
        ).first()

        if not doctor:
            raise HTTPException(404, "Doctor not found")

        conn.execute(
            text("UPDATE doctors SET status='APPROVED' WHERE id=:i"),
            {"i": a.user_id}
        )

        audit_log(
            conn,
            actor_id=admin_id,
            action="APPROVE",
            target_id=a.user_id,
            target_role="doctor",
            details=f"Doctor #{a.user_id} approved"
        )

        send_doctor_approval_email(doctor.email, doctor.username)

    return {"status": "approved"}

@app.post("/reject_doctor")
def reject_doctor(a: ApprovalAction, payload=Depends(admin_required)):
    admin_id = payload["id"]

    with engine.begin() as conn:
        res = conn.execute(
            text("UPDATE doctors SET status='REJECTED' WHERE id=:i"),
            {"i": a.user_id}
        )

        if res.rowcount == 0:
            raise HTTPException(404, "Doctor not found")

        audit_log(
            conn,
            actor_id=admin_id,
            action="REJECT",
            target_id=a.user_id,
            target_role="doctor",
            details=f"Doctor #{a.user_id} rejected"
        )

    return {"status": "rejected"}

@app.post("/approve_patient")
def approve_patient(a: ApprovalAction, payload=Depends(admin_required)):
    admin_id = payload["id"]

    with engine.begin() as conn:
        patient = conn.execute(
            text("SELECT email, name FROM patient_login WHERE id=:i"),
            {"i": a.user_id}
        ).first()

        if not patient:
            raise HTTPException(404, "Patient not found")

        conn.execute(
            text("UPDATE patient_login SET status='APPROVED' WHERE id=:i"),
            {"i": a.user_id}
        )

        audit_log(
            conn,
            actor_id=admin_id,
            action="APPROVE",
            target_id=a.user_id,
            target_role="patient",
            details=f"Patient #{a.user_id} approved"
        )

        send_patient_approval_email(patient.email, patient.name)

    return {"status": "approved"}

@app.post("/reject_patient")
def reject_patient(a: ApprovalAction, payload=Depends(admin_required)):
    admin_id = payload["id"]

    with engine.begin() as conn:
        res = conn.execute(
            text("UPDATE patient_login SET status='REJECTED' WHERE id=:i"),
            {"i": a.user_id}
        )

        if res.rowcount == 0:
            raise HTTPException(404, "Patient not found")

        audit_log(
            conn,
            actor_id=admin_id,
            action="REJECT",
            target_id=a.user_id,
            target_role="patient",
            details=f"Patient #{a.user_id} rejected"
        )

    return {"status": "rejected"}

# ===================== AUDIT =====================
@app.get("/audit", dependencies=[Depends(admin_required)])
def audit_trail():
    with engine.connect() as conn:
        rows = conn.execute(
            text("""
                SELECT *
                FROM audit_logs
                WHERE target_role IS NOT NULL
                ORDER BY created_at DESC
                LIMIT 100
            """)
        ).fetchall()
        return [dict(r._mapping) for r in rows]
        
# ===================== EMAIL =====================
def send_lab_approval_email(email, username):
    try:
        msg = EmailMessage()
        msg["Subject"] = "Lab Account Approved"
        msg["From"] = os.getenv("SMTP_FROM_NAME", "MedAI Hospital") + f" <{SMTP_USER}>"
        msg["To"] = email
        msg.set_content(f"""
Hello {username},

Your Lab Assistant account has been APPROVED.

Login:
http://localhost:5173/lab
""")

        with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT) as smtp:

            if not SMTP_USER or not SMTP_PASS:
                raise RuntimeError("SMTP credentials not configured")

            smtp.login(SMTP_USER, SMTP_PASS)
            smtp.send_message(msg)
            print("Lab approval email sent")

    except Exception as e:
        print("Lab mail error:", e)

def send_doctor_approval_email(email, username):
    try:
        msg = EmailMessage()
        msg["Subject"] = "Doctor Account Approved"
        msg["From"] = os.getenv("SMTP_FROM_NAME", "MedAI Hospital") + f" <{SMTP_USER}>"
        msg["To"] = email
        msg.set_content(f"""
Hello Dr. {username},

Your account has been APPROVED.

Login:
http://localhost:5173/doctor
""")

        with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT) as smtp:

            if not SMTP_USER or not SMTP_PASS:
                raise RuntimeError("SMTP credentials not configured")

            smtp.login(SMTP_USER, SMTP_PASS)
            smtp.send_message(msg)
            print("Password reset email sent")

    except Exception as e:
        print("Doctor mail error:", e)


def send_patient_approval_email(email, name):
    try:
        msg = EmailMessage()
        msg["Subject"] = "Patient Account Approved"
        msg["From"] = os.getenv("SMTP_FROM_NAME", "MedAI Hospital") + f" <{SMTP_USER}>"
        msg["To"] = email
        msg.set_content(f"""
Hello {name},

Your account has been APPROVED.

Login:
http://localhost:5173/patient
""")

        with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT) as smtp:

            if not SMTP_USER or not SMTP_PASS:
                raise RuntimeError("SMTP credentials not configured")

            smtp.login(SMTP_USER, SMTP_PASS)
            smtp.send_message(msg)
            print("Password reset email sent")

    except Exception as e:
        print("Patient mail error:", e)
