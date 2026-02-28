#!/usr/bin/env python
# coding: utf-8

# In[ ]:


#!/usr/bin/env python
# coding: utf-8

import numpy as np
import joblib
import os

# ==================================================
# MODEL PATH
# ==================================================
BASE_PATH = r"D:\E\Frontend\models\symptoms"

MODEL_PATH = os.path.join(BASE_PATH, "cdss_xgboost_model.pkl")
FEATURE_PATH = os.path.join(BASE_PATH, "feature_columns.pkl")
LABEL_PATH = os.path.join(BASE_PATH, "disease_labels.pkl")

# ==================================================
# LOAD MODEL
# ==================================================
MODEL = joblib.load(MODEL_PATH)
FEATURE_COLUMNS = joblib.load(FEATURE_PATH)
DISEASE_LABELS = joblib.load(LABEL_PATH)

# ==================================================
# BUILD SYMPTOM VECTOR
# ==================================================
def build_symptom_vector(data: dict):
    """
    Convert symptom dictionary into model-ready vector.
    Missing symptoms default to 0.
    """
    values = [
        1 if data.get(feature) in [1, True, "1", "true", "True"] else 0
        for feature in FEATURE_COLUMNS
    ]

    return np.array(values).reshape(1, -1)

# ==================================================
# RUN SYMPTOM CDSS MODEL
# ==================================================
def run_symptom_cdss(data: dict):
    """
    Returns Top 3 disease probabilities
    """

    X = build_symptom_vector(data)

    prob_list = MODEL.predict_proba(X)

    # Handle OneVsRestClassifier output
    if isinstance(prob_list, list):
        probs = [p[0][1] for p in prob_list]
    else:
        probs = prob_list[0]

    results = []

    for i, disease in enumerate(DISEASE_LABELS):
        results.append({
            "disease": disease,
            "probability": round(float(probs[i]) * 100, 2)
        })

    results.sort(key=lambda x: x["probability"], reverse=True)

    # ----------------------------
    # SAFETY RULES
    # ----------------------------
    top_prob = results[0]["probability"]

    warning = None
    if top_prob < 45:
        warning = "Low confidence prediction"

    if len(results) > 1 and results[1]["probability"] > 60:
        warning = "Possible comorbidity detected"

    return {
        "top_3_predictions": results[:3],
        "warning": warning
    }

# ==================================================
# FEATURE MAP (FOR UI / DEBUG)
# ==================================================
SYMPTOM_FEATURE_MAP = FEATURE_COLUMNS

