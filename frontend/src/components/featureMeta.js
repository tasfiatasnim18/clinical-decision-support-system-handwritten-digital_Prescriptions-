export const FEATURE_META = {
  // ---------- COMMON ----------
  age: { label: "Age", unit: "years", order: 1 },
  gender: { label: "Gender", order: 2 },

  height_cm: { label: "Height", unit: "cm", order: 3 },
  weight_kg: { label: "Weight", unit: "kg", order: 4 },
  bmi: { label: "BMI", order: 5 },

  // ---------- BLOOD PRESSURE ----------
  ap_hi: { label: "Systolic BP", unit: "mmHg", order: 6 },
  ap_lo: { label: "Diastolic BP", unit: "mmHg", order: 7 },
  pulse_pressure: { label: "Pulse Pressure", unit: "mmHg", order: 8 },
  map: { label: "Mean Arterial Pressure", order: 9 },

  // ---------- DIABETES ----------
  glucose: { label: "Glucose", unit: "mg/dL", order: 10 },
  insulin: { label: "Insulin", unit: "µIU/mL", order: 11 },
  pregnancies: { label: "Pregnancies", order: 12 },
  skin_thickness: { label: "Skin Thickness", unit: "mm", order: 13 },
  dpf: { label: "Diabetes Pedigree Function", order: 14 },

  // ---------- LIVER ----------
  total_bilirubin: { label: "Total Bilirubin", unit: "mg/dL", order: 20 },
  direct_bilirubin: { label: "Direct Bilirubin", unit: "mg/dL", order: 21 },
  alkphos_alkaline_phosphotase: {
    label: "Alkaline Phosphatase",
    unit: "U/L",
    order: 22
  },
  sgpt_alamine_aminotransferase: {
    label: "SGPT (ALT)",
    unit: "U/L",
    order: 23
  },
  sgot_aspartate_aminotransferase: {
    label: "SGOT (AST)",
    unit: "U/L",
    order: 24
  },
  total_protiens: { label: "Total Proteins", unit: "g/dL", order: 25 },
  alb_albumin: { label: "Albumin", unit: "g/dL", order: 26 },
  "a/g_ratio_albumin_and_globulin_ratio": {
    label: "A/G Ratio",
    order: 27
  },

  // ---------- LIFESTYLE ----------
  cholesterol: { label: "Cholesterol", order: 30 },
  smoke: { label: "Smoking Status", order: 31 },
  alco: { label: "Alcohol Intake", order: 32 },
  active: { label: "Physical Activity", order: 33 }
};
