#!/usr/bin/env python
# coding: utf-8

# In[ ]:


import numpy as np
import joblib
import pandas as pd

# ==================================================
# LOAD MODELS
# ==================================================
MODELS = {
    "obesity": {
        "model": joblib.load(
            r"D:/E/Frontend/models/obesity/final_tuned_xgboost_model.pkl"
        ),
        "scaler": joblib.load(
            r"D:/E/Frontend/models/obesity/scaler.pkl"
        ),
        "features": ["age", "gender", "height_cm", "weight_kg", "bmi"]
    },

    "liver": {
        "model": joblib.load(
            r"D:/E/Frontend/models/liver/cld_xgboost_model.pkl"
        ),
        "scaler": joblib.load(
            r"D:/E/Frontend/models/liver/cld_scaler.pkl"
        ),
        "features": [
            "age_of_the_patient",
            "gender_of_the_patient",
            "total_bilirubin",
            "direct_bilirubin",
            "alkphos_alkaline_phosphotase",
            "sgpt_alamine_aminotransferase",
            "sgot_aspartate_aminotransferase",
            "total_protiens",
            "alb_albumin",
            "a/g_ratio_albumin_and_globulin_ratio"
        ]
    },

    "cardiovascular": {
        "model": joblib.load(
            r"D:/E/Frontend/models/hypertension/hypertension_xgboost_model.pkl"
        ),
        "scaler": joblib.load(
            r"D:/E/Frontend/models/hypertension/hypertension_scaler.pkl"
        ),
        "features": [
            "age",
            "gender",
            "height_cm",
            "weight_kg",
            "ap_hi",
            "ap_lo",
            "cholesterol",
            "gluc",
            "smoke",
            "alco",
            "active",
            "bmi",
            "pulse_pressure",
            "map"
        ]
    },

    "diabetes": {
        "model": joblib.load(
            r"D:/E/Frontend/models/diabetes/diabetes_model_rf_smote.pkl"
        ),
        "features": [
            "pregnancies",
            "glucose",
            "ap_lo",
            "skin_thickness",
            "insulin",
            "bmi",
            "dpf",
            "age"
        ]
    }
}

DISEASE_THRESHOLDS = {
    "obesity": 1.0,
    "diabetes": 0.875,
    "liver": 0.8,
    "cardiovascular": 0.75
}

DISEASE_MEANS = {
    "diabetes": {
        "pregnancies": 3.8,
        "glucose": 120,
        "ap_lo": 72,
        "skin_thickness": 29,
        "insulin": 80,
        "bmi": 32,
        "dpf": 0.47,
        "age": 33
    },
    "liver": {
        "age_of_the_patient": 45,
        "gender_of_the_patient": 1,  # 0=male, 1=female (dataset dependent)
        "total_bilirubin": 1.0,
        "direct_bilirubin": 0.3,
        "alkphos_alkaline_phosphotase": 200,
        "sgpt_alamine_aminotransferase": 35,
        "sgot_aspartate_aminotransferase": 32,
        "total_protiens": 6.8,
        "alb_albumin": 3.5,
        "a/g_ratio_albumin_and_globulin_ratio": 1.0
    },
    "cardiovascular": {
        "age": 50,
        "gender": 0,
        "height_cm": 165,
        "weight_kg": 70,
        "ap_hi": 120,
        "ap_lo": 80,
        "cholesterol": 1,
        "gluc": 1,
        "smoke": 0,
        "alco": 0,
        "active": 1,
        "bmi": 26,
        "pulse_pressure": 40,
        "map": 93
    }
}

# ==================================================
# FEATURE AVAILABILITY CHECK
# ==================================================
def apply_confidence_penalty(confidence, imputed, total):
    missing_ratio = imputed / total

    if missing_ratio == 0:
        return confidence
    elif missing_ratio <= 0.1:
        return confidence * 0.95
    elif missing_ratio <= 0.2:
        return confidence * 0.9
    elif missing_ratio <= 0.3:
        return confidence * 0.8
    else:
        return confidence * 0.6

# ==================================================
# BEST REALISTIC FUTURE RISK (RULE-BASED)
# ==================================================
def calculate_future_risk(data, disease=None, prediction=None):
    risk = 0

    def v(key):
        val = data.get(key)
        return val if isinstance(val, (int, float)) else 0

    # AGE
    age = v("age")
    if age >= 60: risk += 25
    elif age >= 45: risk += 18
    elif age >= 30: risk += 10

    # BMI
    bmi = v("bmi")
    if bmi >= 35: risk += 25
    elif bmi >= 30: risk += 18
    elif bmi >= 25: risk += 10

    # GLUCOSE
    glucose = v("glucose")
    if glucose >= 140: risk += 25
    elif glucose >= 126: risk += 18
    elif glucose >= 100: risk += 10

    # DIASTOLIC BP
    dbp = v("ap_lo")
    if dbp >= 100: risk += 25
    elif dbp >= 90: risk += 18
    elif dbp >= 85: risk += 10

    # 🔴 KEY FIX: disease baseline
    if prediction == 1:
        if disease == "diabetes":
            risk = max(risk, 40)
        elif disease == "cardiovascular":
            risk = max(risk, 35)
        elif disease == "liver":
            risk = max(risk, 30)
        elif disease == "obesity":
            risk = max(risk, 25)

    return min(risk, 100)

def prepare_features(cfg, data, disease_name):
    values = []
    imputed = 0
    total = len(cfg["features"])

    for f in cfg["features"]:
        val = data.get(f)

        if val is None:
            mean_val = DISEASE_MEANS.get(disease_name, {}).get(f)

            if mean_val is None:
                return None, None, None   # signal skip

            val = mean_val
            imputed += 1

        values.append(val)

    return values, imputed, total

# ==================================================
# RUN SINGLE MODEL
# ==================================================
def run_model(cfg, data, disease_name):

    values, imputed, total = prepare_features(cfg, data, disease_name)

    # ✅ SAFE GUARD HERE
    if values is None:
        return {
            "prediction": -1,
            "confidence": 0,
            "future_risk": 0,
            "reason": "Missing mean values"
        }

    X = np.array([values])

    if "scaler" in cfg:
        X = cfg["scaler"].transform(X)

    model = cfg["model"]

    pred = int(model.predict(X)[0])

    if hasattr(model, "predict_proba"):
        proba = model.predict_proba(X)[0]
        confidence = float(np.max(proba)) * 100
    else:
        confidence = 100.0

    confidence = apply_confidence_penalty(confidence, imputed, total)

    features_used = {
        f: data.get(f)
        for f in cfg["features"]
        if data.get(f) is not None
    }

    return {
        "prediction": pred,
        "confidence": round(confidence, 2),
        "future_risk": calculate_future_risk(
            data,
            disease=disease_name,
            prediction=pred
        ),
        "features_used": features_used,
        "imputed_features": imputed,
        "feature_coverage_percent": round(
            ((total - imputed) / total) * 100, 2
        )
    }

# ==================================================
# AUTO MULTI-DISEASE ENGINE
# ==================================================
def multi_disease_screening(data):
    results = {}

    for name, cfg in MODELS.items():

        total = len(cfg["features"])
        available = sum(
            1 for f in cfg["features"]
            if data.get(f) is not None
        )

        ratio = available / total
        threshold = DISEASE_THRESHOLDS.get(name, 0.8)

        if ratio >= threshold:
            results[name] = run_model(cfg, data, name)
        else:
            results[name] = {
                "prediction": -1,
                "confidence": 0,
                "future_risk": 0,
                "reason": "Insufficient feature coverage"
            }

    return results


DISEASE_FEATURE_MAP = {
    name: cfg["features"]
    for name, cfg in MODELS.items()
}

DISEASE_MAP = {
    "obesity": 1,
    "diabetes": 2,
    "liver": 3,
    "cardiovascular": 4
}
