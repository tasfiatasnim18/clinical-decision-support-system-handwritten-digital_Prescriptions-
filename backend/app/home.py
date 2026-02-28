#!/usr/bin/env python
# coding: utf-8

import re
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from google.cloud import vision
from pathlib import Path
#from services.multi_disease_engine import multi_disease_screening
from services.recep_multi_disease_engine import (
    multi_disease_screening,
    DISEASE_FEATURE_MAP,
    DISEASE_MAP
)
# --------------------------------------------------
# CONFIG
# --------------------------------------------------
BASE_DIR = Path(r"D:/E/Frontend")
GOOGLE_CREDS = BASE_DIR / "GoogleCloudAPI" / "handwritingocr-481216-593bc8379de9.json"

vision_client = vision.ImageAnnotatorClient.from_service_account_file(
    str(GOOGLE_CREDS)
)

app = FastAPI(title="MedAI Home API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --------------------------------------------------
# HELPERS
# --------------------------------------------------
def num(pattern, text, cast=float):
    m = re.search(pattern, text, re.I)
    return cast(m.group(1)) if m else None

# --------------------------------------------------
# FEATURE EXTRACTION (SINGLE SOURCE OF TRUTH)
# --------------------------------------------------
def extract_vitals(text: str):
    # =========================
    # BASE DICTIONARY
    # =========================
    d = {
        # OBESITY FEATURES
        "age": num(r"Age[:\- ]*(\d+)", text, int),
        "gender": None,
        "height_cm": num(r"Height[:\- ]*(\d+\.?\d*)", text),
        "weight_kg": num(r"Weight[:\- ]*(\d+\.?\d*)", text),
        "bmi": None,

        # LIVER FEATURES (INITIAL)
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

        # HYPERTENSION FEATURES
        "ap_hi": None,
        "ap_lo": None,
        "cholesterol": None,
        "gluc": None,
        "smoke": None,
        "alco": None,
        "active": None,
        "pulse_pressure": None,
        "map": None,

        # DIABETES FEATURES
        "pregnancies": None,
        "skin_thickness": None,
        "insulin": None,
        "dpf": None,

    }

    # =========================
    # LIVER FEATURE EXTRACTION (FIXED REGEX)
    # =========================
    d.update({
        "total_bilirubin": num(
            r"Total Bilirubin[:\- ]*(\d+\.?\d*)", text
        ),

        "direct_bilirubin": num(
            r"Direct Bilirubin[:\- ]*(\d+\.?\d*)", text
        ),

        "alkphos_alkaline_phosphotase": num(
            r"(?:ALP|Alkaline Phosphatase)[:\- ]*(\d+\.?\d*)",
            text
        ),

        "sgpt_alamine_aminotransferase": num(
            r"SGPT(?:\s*\(ALT\))?[:\- ]*(\d+\.?\d*)",
            text
        ),

        "sgot_aspartate_aminotransferase": num(
            r"SGOT(?:\s*\(AST\))?[:\- ]*(\d+\.?\d*)",
            text
        ),

        "total_protiens": num(
            r"(?:Total Protein|Total Proteins)[:\- ]*(\d+\.?\d*)",
            text
        ),

        "alb_albumin": num(
            r"(?:Albumin|ALB)[:\- ]*(\d+\.?\d*)",
            text
        ),

        "a/g_ratio_albumin_and_globulin_ratio": num(
            r"(?:A/G Ratio|Albumin/Globulin Ratio)[:\- ]*(\d+\.?\d*)",
            text
        ),
    })

    # =========================
    # HYPERTENTION FEATURE EXTRACTION (FIXED REGEX)
    # =========================
    d.update({
        "cholesterol": num(r"Cholesterol[:\- ]*(\d+)", text, int),
        "gluc": num(r"Glucose[:\- ]*(\d+)", text, int),
        "smoke": num(r"(?:Smoking|Smoke)[:\- ]*(\d+)", text, int),
        "alco": num(r"Alcohol[:\- ]*(\d+)", text, int),
        "active": num(r"(?:Physical Activity|Active)[:\- ]*(\d+)", text, int),
    })

    # Blood Pressure (BP or AP High / AP Low)
    bp = re.search(r"BP[:\- ]*(\d{2,3})\s*/\s*(\d{2,3})", text)
    ap = re.search(r"AP High[:\- ]*(\d{2,3}).*?AP Low[:\- ]*(\d{2,3})", text, re.I)
    
    if bp:
        d["ap_hi"] = int(bp.group(1))
        d["ap_lo"] = int(bp.group(2))
    elif ap:
        d["ap_hi"] = int(ap.group(1))
        d["ap_lo"] = int(ap.group(2))

    # Pulse Pressure & MAP (direct from OCR if available)
    d["pulse_pressure"] = num(r"Pulse Pressure[:\- ]*(\d+\.?\d*)", text)
    d["map"] = num(r"MAP[:\- ]*(\d+\.?\d*)", text)

    # Pulse Pressure & MAP
    if d["pulse_pressure"] is None and d["ap_hi"] is not None and d["ap_lo"] is not None:
        d["pulse_pressure"] = d["ap_hi"] - d["ap_lo"]
    
    if d["map"] is None and d["ap_hi"] is not None and d["ap_lo"] is not None:
        d["map"] = round(d["ap_lo"] + (d["pulse_pressure"] / 3), 2)

    # =========================
    # DIABETES FEATURE EXTRACTION
    # =========================
    d.update({
        "pregnancies": num(r"Pregnancies[:\- ]*(\d+)", text, int),
    
        "skin_thickness": num(
            r"(?:Skin Thickness|SkinFold)[:\- ]*(\d+\.?\d*)",
            text
        ),
    
        "insulin": num(
            r"Insulin[:\- ]*(\d+\.?\d*)",
            text
        ),
    
        "dpf": num(
            r"(?:DPF|Diabetes Pedigree Function)[:\- ]*(\d+\.?\d*)",
            text
        ),
    })

    # Map glucose (for diabetes)
    if d["gluc"] is not None:
        d["glucose"] = d["gluc"]
    else:
        d["glucose"] = None


    # =========================
    # GENDER (MATCHES KAGGLE)
    # =========================
    g = re.search(r"\b(Male|Female)\b", text, re.I)
    if g:
        gender_val = 0 if g.group(1).lower() == "male" else 1
        d["gender"] = gender_val
        d["gender_of_the_patient"] = gender_val

    # =========================
    # BMI CALCULATION
    # =========================
    if d["height_cm"] and d["weight_kg"]:
        d["bmi"] = round(
            d["weight_kg"] / ((d["height_cm"] / 100) ** 2),
            2
        )
        
    # =========================
    # UNIFIED AGE (FOR RISK CALCULATION)
    # =========================
    if d["age"] is None and d["age_of_the_patient"] is not None:
        d["age"] = d["age_of_the_patient"]
        
    return d

# --------------------------------------------------
# API
# --------------------------------------------------
@app.post("/analyze_prescription")
async def analyze_prescription(file: UploadFile = File(...)):
    try:
        image = vision.Image(content=await file.read())
        ocr = vision_client.document_text_detection(image=image)

        raw = ocr.full_text_annotation.text or ""
        clean = re.sub(r"\s+", " ", raw)

        data = extract_vitals(clean)
        diseases = multi_disease_screening(data)

        return {
            "clean_text": clean,
            "extracted_data": data,
            "diseases": diseases
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
