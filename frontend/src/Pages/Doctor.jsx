import React, { useState, useEffect } from "react";
import axios from "axios";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import PatientHealthSummary from "../components/PatientHealthSummary";
import { 
  Stethoscope, Search, User, LogOut, Save, 
  History, Activity, Phone, Hash, Eye, 
  EyeOff, UserCheck, LayoutDashboard, Settings,
  ChevronRight, Database, ClipboardList, Mail, Lock,
  X, Zap, ShieldCheck, Cpu, Layers,
  List,
  Table as TableIcon,
  Plus,        
  Minus,
  Trash2, 
  Pill, TestTube, CheckCircle2, XCircle
} from "lucide-react";

// ---------- GLOBAL NAVBAR ----------
const Navbar = () => {
  const location = useLocation();
  
  const menu = ["Home", "Admin", "Receptionist", "Lab", "Doctor", "Patient"].map(name => ({
    name,
    path: `/${name.toLowerCase()}`
  }));

  return (
    <nav className="fixed w-full top-0 left-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
      <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-200">
                <span className="text-white font-bold text-xl">M</span>
            </div>
            <div className="text-xl font-bold text-slate-900 tracking-tighter uppercase">MedAI</div>
        </div>
        <div className="hidden md:flex gap-8 items-center">
          {menu.map((m) => (
            <Link key={m.path} to={m.path} className={`text-sm font-bold transition-all ${location.pathname.startsWith(m.path) ? "text-blue-600" : "text-slate-500 hover:text-blue-600"}`}>
              {m.name}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
};

// ---------- GLOBAL FOOTER ----------
const Footer = () => (
  <footer className="bg-slate-950 text-slate-400 py-16 border-t border-slate-900">
    <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
      <div className="text-center md:text-left">
        <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xl">M</span>
          </div>
          <h2 className="text-white text-2xl font-bold tracking-tighter">MedAI</h2>
        </div>
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500 font-semibold">Intelligence for modern healthcare</p>
      </div>
      <div className="text-sm text-slate-500 font-medium">
        &copy; {new Date().getFullYear()} MedAI Research Lab. All rights reserved.
      </div>
    </div>
  </footer>
);

/* =========================
    LABEL HELPERS
   ========================= */
const obesityLabel = (p) => {
  if (p === -1) return "Insufficient Data";
  if (p === 0) return "Normal weight";
  if (p === 1) return "Obese";
  if (p === 2) return "Overweight";
  if (p === 3) return "Underweight";
  return "Unknown";
};

const liverLabel = (p) => {
  if (p === -1) return "Insufficient Data";
  if (p === 1) return "Liver Disease Detected";
  if (p === 0) return "No Liver Disease";
  return "Unknown";
};

const cardiovascularLabel = (p) => {
  if (p === -1) return "Insufficient Data";
  if (p === 1) return "High Cardiovascular Risk";
  if (p === 0) return "Low Cardiovascular Risk";
  return "Unknown";
};

const diabetesLabel = (p) => {
  if (p === -1) return "Insufficient Data";
  if (p === 1) return "Diabetes Detected";
  if (p === 0) return "No Diabetes";
  return "Unknown";
};

const diseaseLabelMap = {
  obesity: obesityLabel,
  liver: liverLabel,
  cardiovascular: cardiovascularLabel,
  diabetes: diabetesLabel
};

const formatGender = (g) => {
  if (g === null || g === undefined) return "N/A";
  if (g === "0") return "Male";
  if (g === "1") return "Female";
  if (typeof g === "number") {
    if (g === 0) return "Male";
    if (g === 1) return "Female";
  }
  if (typeof g === "string") {
    const v = g.toLowerCase().trim();
    if (v.startsWith("m")) return "Male";
    if (v.startsWith("f")) return "Female";
    return "Other";
  }
  return "Other";
};

const normalizeDiseaseKey = (d) => {
  if (!d) return "";
  const v = d.toLowerCase();
  if (v.includes("obes")) return "obesity";
  if (v.includes("liver")) return "liver";
  if (v.includes("cardio")) return "cardiovascular";
  if (v.includes("diab")) return "diabetes";
  return v;
};

const buildDiseaseReport = (disease, featuresJson) => {
  if (!featuresJson?.features) return null;

  const diseaseNames = {
    diabetes: "Diabetes Lab Panel",
    liver: "Liver Function Panel",
    cardiovascular: "Cardiovascular Risk Panel",
    obesity: "Obesity Assessment Panel"
  };

  return {
    test_name: diseaseNames[disease] || "Clinical Lab Report",
    submitted_by: "MedAI Lab System",
    values: featuresJson.features
  };
};


/* ================= TIMELINE VIEW ================= */
const TimelineView = ({ history, onBack, openFeatures }) => {
  if (!Array.isArray(history) || history.length === 0) {
    return (
      <div className="text-center text-slate-400 italic">
        No medical history found.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 🔙 BACK BUTTON */}
      {onBack && (
        <motion.button
          whileHover={{ x: -4 }}
          whileTap={{ scale: 0.98 }}
          onClick={onBack}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
        >
          ← Back to Vault
        </motion.button>
      )}
      <div className="space-y-12">
        {history.map((rx, idx) => {
          const validPredictions = Array.isArray(rx.predictions)
            ? rx.predictions
            : [];

          return (
            <motion.div
              key={rx.prescription_serial}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm relative"
            >
              {/* Date Badge */}
              <div className="absolute top-0 right-10 -translate-y-1/2 px-6 py-2 bg-slate-950 text-white rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-xl">
                Recorded: {new Date(rx.created_at).toDateString()}
              </div>

              {/* Header */}
              <div className="flex items-center gap-4 mb-10">
                <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center border border-blue-100 shadow-inner">
                  <ClipboardList size={24} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900">
                    Prescription — {rx.prescription_serial}
                  </h3>
                  <p className="text-sm font-bold text-slate-400">
                    MedAI Diagnostic Archive
                  </p>
                </div>
              </div>

              {/* Vitals */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10 p-6 bg-slate-50/30 rounded-4xl border border-slate-100/50">
                <VitalBadge label="Patient ID" value={rx.patient?.patient_id} />
                <VitalBadge label="Full Name" value={rx.patient?.name} />
                <VitalBadge label="Age" value={rx.patient?.age} />
                <VitalBadge label="Gender" value={formatGender(rx.patient?.gender)} />
                <VitalBadge label="Height (cm)" value={rx.vitals?.height_cm} />
                <VitalBadge label="Weight (kg)" value={rx.vitals?.weight_kg} />
                <VitalBadge label="BMI" value={rx.vitals?.bmi} />
                <VitalBadge
                  label="Blood Pressure"
                  value={
                    rx.vitals?.bp?.systolic
                      ? `${rx.vitals.bp.systolic}/${rx.vitals.bp.diastolic}`
                      : "—"
                  }
                />
              </div>

              {/* Clinical */}
              <div className="grid md:grid-cols-3 gap-8 p-8 bg-slate-50 rounded-[2rem] border border-slate-100 mb-10">
                <MetadataItem label="Symptoms" value={rx.clinical?.symptoms} />
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-500">
                    Medicines
                  </p>

                  {Array.isArray(rx.clinical?.medicines) &&
                  rx.clinical.medicines.length > 0 ? (
                    <ul className="mt-2 space-y-1 text-sm font-mono">
                      {rx.clinical.medicines.map((m, i) => (
                        <li key={i}>
                          • {m.name} — {m.dosage} — {m.duration}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm italic text-slate-400">—</p>
                  )}
                </div>
                <MetadataItem label="Tests" value={rx.clinical?.tests} />
              </div>

              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="h-px grow bg-slate-100" />
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">AI Biometric Analysis</p>
                  <div className="h-px grow bg-slate-100" />
                </div>

                {/* Predictions */}
                                {validPredictions.length === 0 ? (
                                  <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                    <p className="italic text-slate-400 text-sm font-medium tracking-tigh">
                                      No AI predictions available for this visit.
                                    </p>
                                  </div>
                                ) : (
                                  <div className="grid md:grid-cols-2 gap-4">
                                    {validPredictions.map((p, i) => {
                                      const riskPct =
                                        p.risk !== null && !isNaN(p.risk)
                                          ? Math.round(p.risk * 100)
                                          : null;
                
                                      const isHighRisk = riskPct !== null && riskPct >= 50;
                
                                      let label = "Unknown";
                                      if (p.disease === "obesity") label = obesityLabel(p.result);
                                      if (p.disease === "diabetes") label = diabetesLabel(p.result);
                                      if (p.disease === "cardiovascular") label = cardiovascularLabel(p.result);
                                      if (p.disease === "liver") label = liverLabel(p.result);
                
                                      const isAlarming = p.result >= 1;
                
                                      return (
                                        <div key={i} className="space-y-3">
                
                                          {/* ORIGINAL CARD */}
                                          <div className="p-6 bg-white border border-slate-100 rounded-3xl shadow-sm flex items-center justify-between group/pred hover:border-blue-200 transition-all">
                                            <div className="flex items-center gap-4">
                                              <div
                                                className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                                                  isAlarming
                                                    ? "bg-red-50 text-red-500 shadow-sm"
                                                    : "bg-emerald-50 text-emerald-500 shadow-sm"
                                                }`}
                                              >
                                                <Activity size={20} />
                                              </div>
                
                                              <div>
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                                                  {p.disease}
                                                </p>
                
                                                <p
                                                  className={`text-sm font-black ${
                                                    isAlarming ? "text-red-600" : "text-slate-900"
                                                  }`}
                                                >
                                                  {label}
                                                </p>
                
                                                <p className="text-xs font-bold pt-1.5">
                                                  {safePercent(p.confidence)} Confidence
                                                </p>
                                              </div>
                                            </div>
                
                                            <div className="text-right text-xs font-bold">
                                              <p>Health</p>
                                              <p>Risk: {safePercent(p.risk)}</p>
                                            </div>
                                          </div>
                
                                          {/* REPORT BUTTON */}
                                          {p.features_json && (
                                            <div className="flex justify-end">
                                              <motion.button
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                                onClick={() => {
                                                  const report = buildDiseaseReport(
                                                    p.disease,
                                                    p.features_json
                                                  );
                
                                                  openFeatures(
                                                    p.disease,
                                                    report,
                                                    "report"
                                                  );
                                                }}
                                                className="px-5 py-2 bg-purple-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md hover:bg-purple-700 transition-all"
                                              >
                                                View Lab Report
                                              </motion.button>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}

                {/* ================= SYMPTOM CDSS ================= */}
                {rx.symptom_cdss?.predictions?.length > 0 && (
                  <div className="mt-10 space-y-6">
                    <div className="flex items-center gap-3">
                      <div className="h-px grow bg-slate-100" />
                      <p className="text-[10px] font-black text-purple-400 uppercase tracking-[0.3em]">
                        Symptom Intelligence Engine
                      </p>
                      <div className="h-px grow bg-slate-100" />
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      {rx.symptom_cdss.predictions.map((p, i) => {
                        const prob = Math.round(p.probability);
                        const isHigh = prob >= 70;

                        return (
                          <div
                            key={i}
                            className="p-6 bg-white border border-slate-100 rounded-3xl shadow-sm flex items-center justify-between hover:border-purple-200 transition-all"
                          >
                            <div className="flex items-center gap-4">
                              <div
                                className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                                  isHigh
                                    ? "bg-red-50 text-red-500"
                                    : "bg-purple-50 text-purple-600"
                                }`}
                              >
                                <Cpu size={20} />
                              </div>

                              <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                                  {p.disease}
                                </p>
                                <p
                                  className={`text-sm font-black ${
                                    isHigh ? "text-red-600" : "text-slate-900"
                                  }`}
                                >
                                  {prob}%
                                </p>
                              </div>
                            </div>

                            <div className="text-xs font-bold text-slate-500">
                              Probability
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

/* ================= TABLE VIEW ================= */
const TableView = ({ 
  history, 
  openFeatures, 
  setSelectedRx, 
  setViewMode,
  setEditingRx,
  setActiveView
}) => (
  <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead className="bg-slate-50/50 text-[10px] font-black uppercase text-slate-400 tracking-widest">
          <tr>
            <th className="p-6">Date</th>
            <th className="p-6">Prescription</th>
            <th className="p-6">Report</th>

            {/* ✅ PATIENT CORE */}
            <th className="p-6">Patient ID</th>
            <th className="p-6">Name</th>
            <th className="p-6">Phone</th>

            <th className="p-6">Age</th>
            <th className="p-6">Gender</th>
            <th className="p-6">BMI</th>
            <th className="p-6">BP</th>

            {/* ===== OBESITY ===== */}
            <th className="p-6">Obesity Result</th>
            <th className="p-6">Obesity Risk</th>
            <th className="p-6">Obesity Factors</th>

            {/* ===== DIABETES ===== */}
            <th className="p-6">Diabetes Result</th>
            <th className="p-6">Diabetes Risk</th>
            <th className="p-6">Diabetes Factors</th>

            {/* =====CARDIOVASCULAR ===== */}
            <th className="p-6">Cardiovascular Result</th>
            <th className="p-6">Cardiovascular Risk</th>
            <th className="p-6">Cardiovascular Factors</th>

            {/* ===== LIVER ===== */}
            <th className="p-6">Liver Result</th>
            <th className="p-6">Liver Risk</th>
            <th className="p-6">Liver Factors</th>

            {/* ===== SYMPTOMS ===== */}
            <th className="p-6">Symptom Top Disease</th>
            <th className="p-6">Symptom Probability</th>
            <th className="p-6">Symptom Count</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-50 text-sm font-medium text-slate-700">
          {history.map(rx => {
            const map = {};
            const symptomTop = rx.symptom_cdss?.predictions?.[0];
            (Array.isArray(rx.predictions) ? rx.predictions : []).forEach(p => {
              map[p.disease] = p;
            });

            return (
              <tr key={rx.prescription_serial} className="hover:bg-blue-50/30">
                <td className="p-6">
                  {new Date(rx.created_at).toLocaleDateString()}
                </td>

                <td className="p-6 space-y-2">
                  <motion.button
                    whileHover={{ y: -2, scale: 1.02 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setSelectedRx(rx);
                      setViewMode("timeline");
                    }}
                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-black text-[11px]"
                  >
                    {rx.prescription_serial}
                  </motion.button>

                  {rx.status === "DRAFT" && (
                    <button
                      onClick={() => {
                        setActiveView("edit-prescription");
                        setEditingRx(rx);
                      }}
                      className="w-full text-[10px] px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg font-black uppercase"
                    >
                      Edit
                    </button>
                  )}
                </td>

                <td className="p-6">
                  {map.diabetes?.features_json ||
                  map.liver?.features_json ||
                  map.cardiovascular?.features_json ? (

                    <motion.button
                      whileHover={{ y: -2, scale: 1.02 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        const disease =
                          map.diabetes?.features_json ? "diabetes" :
                          map.liver?.features_json ? "liver" :
                          map.cardiovascular?.features_json ? "cardiovascular" :
                          null;

                        const data =
                          map[disease]?.features_json;

                        const report = buildDiseaseReport(disease, data);

                        openFeatures("Clinical Report", report, "report");
                      }}
                      className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white rounded-xl shadow-md hover:bg-purple-700 transition-all"
                    >
                      <span className="text-[10px] font-black uppercase tracking-[0.15em]">
                        View Report
                      </span>
                    </motion.button>

                  ) : "No Report"}
                </td>

                {/* ✅ PATIENT CORE */}
                <td className="p-6">{safeText(rx.patient?.patient_id)}</td>
                <td className="p-6">{safeText(rx.patient?.name)}</td>
                <td className="p-6">{safeText(rx.patient?.phone)}</td>

                <td className="p-6">{safeText(rx.patient?.age)}</td>
                <td className="p-6">{formatGender(rx.patient?.gender)}</td>
                <td className="p-6">{safeText(rx.vitals?.bmi)}</td>
                <td className="p-6">
                  {rx.vitals?.bp?.systolic
                    ? `${rx.vitals.bp.systolic}/${rx.vitals.bp.diastolic}`
                    : "No data"}
                </td>

                {/* ===== OBESITY ===== */}
                <td className="p-6">{safeText(obesityLabel(map.obesity?.result))}</td>
                <td className="p-6">{safePercent(map.obesity?.risk)}</td>
                <td className="p-6">
                  {map.obesity?.features_json ? (
                    <motion.button
                      whileHover={{ y: -2, scale: 1.02 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => openFeatures("Obesity", map.obesity.features_json)}
                      className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl border border-transparent hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors duration-300 ease-in-out shadow-md hover:shadow-lg active:shadow-sm group"
                    >
                      <span className="text-[10px] font-black uppercase tracking-[0.15em]">
                        View Factors
                      </span>
                    </motion.button>
                  ) : "No data"}
                </td>

                {/* ===== DIABETES ===== */}
                <td className="p-6">{safeText(diabetesLabel(map.diabetes?.result))}</td>
                <td className="p-6">{safePercent(map.diabetes?.risk)}</td>
                <td className="p-6">
                  {map.diabetes?.features_json ? (
                    <motion.button
                      whileHover={{ y: -2, scale: 1.02 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => openFeatures("Diabetes", map.diabetes.features_json)}
                      className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl border border-transparent hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors duration-300 ease-in-out shadow-md hover:shadow-lg active:shadow-sm group"
                    >
                      <span className="text-[10px] font-black uppercase tracking-[0.15em]">
                        View Factors
                      </span>
                    </motion.button>
                  ) : "No data"}
                </td>

                {/* ===== Cardiovascular ===== */}
                <td className="p-6">{safeText(cardiovascularLabel(map.cardiovascular?.result))}</td>
                <td className="p-6">{safePercent(map.cardiovascular?.risk)}</td>
                <td className="p-6">
                  {map.cardiovascular?.features_json ? (
                    <motion.button
                      whileHover={{ y: -2, scale: 1.02 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => openFeatures("Cardiovascular", map.cardiovascular.features_json)}
                      className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl border border-transparent hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors duration-300 ease-in-out shadow-md hover:shadow-lg active:shadow-sm group"
                    >
                      <span className="text-[10px] font-black uppercase tracking-[0.15em]">
                        View Factors
                      </span>
                    </motion.button>
                  ) : "No data"}
                </td>

                {/* ===== LIVER ===== */}
                <td className="p-6">{safeText(liverLabel(map.liver?.result))}</td>
                <td className="p-6">{safePercent(map.liver?.risk)}</td>
                <td className="p-6">
                  {map.liver?.features_json ? (
                    <motion.button
                      whileHover={{ y: -2, scale: 1.02 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => openFeatures("Liver", map.liver.features_json)}
                      className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl border border-transparent hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors duration-300 ease-in-out shadow-md hover:shadow-lg active:shadow-sm group"
                    >
                      <span className="text-[10px] font-black uppercase tracking-[0.15em]">
                        View Factors
                      </span>
                    </motion.button>
                  ) : "No data"}
                </td>

                {/* ===== SYMPTOM CDSS ===== */}
                <td className="p-6">
                  {symptomTop ? symptomTop.disease : "—"}
                </td>

                <td className="p-6">
                  {symptomTop ? safePercent(symptomTop.probability) : "—"}
                </td>

                <td className="p-6">
                  {rx.symptom_cdss
                    ? rx.symptom_cdss.diseases_detected
                    : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </div>
);

// ---------- DOCTOR PORTAL ----------
export default function DoctorPortal() {
  const [view, setView] = useState("login"); 
  const [activeTab, setActiveTab] = useState("dashboard");
  const [activeView, setActiveView] = useState("dashboard");
  const [doctor, setDoctor] = useState(null);
  const [searchId, setSearchId] = useState("");
  const [searched, setSearched] = useState(false);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [viewMode, setViewMode] = useState("table");
  const [selectedRx, setSelectedRx] = useState(null);
  const [editingRx, setEditingRx] = useState(null); 

  const [loginData, setLoginData] = useState({ username: "", password: "" });
  const [regData, setRegData] = useState({ username: "", password: "", full_name: "", specialization: "", email: "" });
  const [editProfile, setEditProfile] = useState({ full_name: "", specialization: "", email: "" });

  const AUTO_LOGOUT_MINUTES = 15; // 🔐 change as needed
  const AUTO_LOGOUT_TIME = AUTO_LOGOUT_MINUTES * 60 * 1000;
  
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total_pages: 1, total_records: 0, has_next: false, has_prev: false });
  const [healthSummary, setHealthSummary] = useState(null);


  const API = "http://localhost:8000/api/doctor";

  const [featureModal, setFeatureModal] = useState({
    open: false,
    disease: "",
    data: null,
    type: "features" // "features" | "report"
  });
  
  const openFeatures = (disease, data, type = "features") =>
    setFeatureModal({ open: true, disease, data, type });
  
  const closeFeatures = () =>
    setFeatureModal({ open: false, disease: "", data: null, type: "features" });

  useEffect(() => {
    const token = localStorage.getItem("doctor_token");
    if (token) fetchProfile(token);
  }, []);

  useEffect(() => {
    if (view !== "workspace") return;

    let logoutTimer;

    const resetTimer = () => {
      clearTimeout(logoutTimer);
      logoutTimer = setTimeout(() => {
        alert("Session expired due to inactivity.");
        forceLogout();
      }, AUTO_LOGOUT_TIME);
    };

    const events = ["mousemove", "mousedown", "keydown", "scroll", "touchstart"];
    events.forEach(e => window.addEventListener(e, resetTimer));

    resetTimer();

    return () => {
      clearTimeout(logoutTimer);
      events.forEach(e => window.removeEventListener(e, resetTimer));
    };
  }, [view]);

  const handleFinalize = async (finalRx) => {
    try {
      const token = localStorage.getItem("doctor_token");

      await axios.put(
        `${API}/prescriptions/${finalRx.prescription_serial}`,
        {
          symptoms: finalRx.clinical.symptoms,
          diagnosis: finalRx.clinical.diagnosis,
          pregnancies: finalRx.vitals?.pregnancies ?? 0,
          medicines: finalRx.clinical.medicines,
          tests: finalRx.clinical.tests         
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert("Prescription finalized");
      setEditingRx(null);
      setActiveView("dashboard");
      fetchPatientHistory();
    } catch {
      alert("Failed to finalize prescription");
    }
  };

  const fetchProfile = async (token) => {
    if (!token) return;
    try {
      const res = await axios.get(`${API}/me`, { headers: { Authorization: `Bearer ${token}` } });
      setDoctor(res.data);
      setEditProfile({ full_name: res.data.full_name, specialization: res.data.specialization, email: res.data.email });
      setView("workspace");
    } catch { localStorage.removeItem("doctor_token"); setView("login"); }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const form = new URLSearchParams();
      form.append("username", loginData.username);
      form.append("password", loginData.password);
      const res = await axios.post(`${API}/login`, form);
      localStorage.setItem("doctor_token", res.data.access_token);
      await fetchProfile(res.data.access_token);
    } catch (err) { alert("Authorization failed."); } finally { setLoading(false); }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(`${API}/register`, regData);
      alert("Registration submitted! Wait for approval.");
      setView("login");
    } catch { alert("Registration failed."); } finally { setLoading(false); }
  };

  const forceLogout = () => {
    localStorage.removeItem("doctor_token");
    setDoctor(null);
    setHistory([]);
    setSearched(false);
    setSelectedRx(null);
    setView("login");
  };

  const handleLogout = () => {
    forceLogout();
  };


  const fetchPatientHistory = async () => {
    if (!searchId) return;

    setSearched(true);
    setLoading(true);

    try {
      const token = localStorage.getItem("doctor_token");

      // 1️⃣ Fetch history
      const res = await axios.get(`${API}/patients/history`, { 
        headers: { Authorization: `Bearer ${token}` },
        params: { q: searchId, page: pagination.page, limit: pagination.limit }
      });

      setHistory(res.data.data);
      setPagination({
        page: res.data.page,
        limit: res.data.limit,
        total_pages: res.data.total_pages,
        total_records: res.data.total_records,
        has_next: res.data.has_next,
        has_prev: res.data.has_prev
      });

      // 2️⃣ 🔥 Fetch health summary
      try {
        const summaryRes = await axios.get(
          `${API}/patients/${searchId}/health-summary`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setHealthSummary(summaryRes.data);
      } catch {
        setHealthSummary(null);
      }

    } catch {
      alert("Records retrieval failed.");
      setHistory([]);
      setHealthSummary(null);
    } finally {
      setLoading(false);
    }
  };

  if (view === "login" || view === "register") {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
        <Navbar />
        <div className="grow flex items-center justify-center p-6 pt-24">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
            <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl border border-slate-100 mb-4">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-blue-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl"><Stethoscope size={32} /></div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-none mb-2">{view === "login" ? "Physician Login" : "Join Network"}</h2>
              </div>
              <form onSubmit={view === "login" ? handleLogin : handleRegister} className="space-y-4">
                {view === "register" && <AuthInput icon={<UserCheck size={18} />} placeholder="Full Name" value={regData.full_name} onChange={(v) => setRegData({...regData, full_name: v})} />}
                <AuthInput icon={<User size={18} />} placeholder="Username" value={view === "login" ? loginData.username : regData.username} onChange={(v) => view === "login" ? setLoginData({...loginData, username: v}) : setRegData({...regData, username: v})} />
                <div className="relative">
                  <AuthInput icon={<Lock size={18} />} type={showPassword ? "text" : "password"} placeholder="Password" value={view === "login" ? loginData.password : regData.password} onChange={(v) => view === "login" ? setLoginData({...loginData, password: v}) : setRegData({...regData, password: v})} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors">{showPassword ? <Eye size={18} /> : <EyeOff size={18} />}</button>                  
                </div>
                {view === "register" && (
                  <>
                    <AuthInput icon={<Activity size={18} />} placeholder="Specialization" value={regData.specialization} onChange={(v) => setRegData({...regData, specialization: v})} />
                    <AuthInput icon={<Mail size={18} />} type="email" placeholder="Email" value={regData.email} onChange={(v) => setRegData({...regData, email: v})} />
                  </>                  
                )}  
                <button type="submit" disabled={loading} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black shadow-xl hover:bg-blue-600 transition-all flex items-center justify-center gap-2 mt-2 active:scale-95">{loading ? <Activity className="animate-spin" size={20} /> : "Authorize Entry"}</button>             
              </form>
              <div className="mt-8 text-center text-sm font-medium">
                <span className="text-slate-400">{view === "login" ? "New Doctor?" : "Already registered?"}</span>
                <button onClick={() => setView(view === "login" ? "register" : "login")} className="ml-2 text-blue-600 font-bold hover:underline tracking-tight uppercase tracking-[0.05em] text-[11px]">{view === "login" ? "Register new account" : "Login"}</button>
              </div>
            </div>
          </motion.div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-blue-100">
      <Navbar />
      <div className="flex grow pt-16">
        <aside className="w-72 bg-slate-950 text-slate-400 border-r border-slate-900 sticky top-16 max-h-[calc(100vh-64px)] flex flex-col overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700">
          <div className="mb-10 px-2 pt-6">
             <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500 mb-1">Authenticated</p>
             <h2 className="text-white text-xl font-bold tracking-tight leading-none uppercase tracking-tighter">Physician Hub</h2>
          </div>
          <nav className="flex-1 space-y-2">
            <SidebarLink icon={<LayoutDashboard size={20} />} label="Diagnostic History" active={activeTab === "dashboard"} onClick={() => setActiveTab("dashboard")} />
            <SidebarLink icon={<Settings size={20} />} label="Identity Settings" active={activeTab === "profile"} onClick={() => setActiveTab("profile")} />
          </nav>
          <div className="mt-auto pt-6 pb-4 border-t border-slate-900/50">
            <button onClick={handleLogout} className="w-full flex items-center gap-3 p-4 bg-red-500/10 text-red-400 rounded-2xl font-bold hover:bg-red-500 hover:text-white transition-all group shadow-inner active:scale-95"><LogOut size={20} className="group-hover:-translate-x-1 transition-transform" /><span>Logout Session</span></button>
          </div>
        </aside>
        <main className="flex-1 flex flex-col min-h-[calc(100vh-64px)] overflow-y-auto">
          <div className="p-12 flex-1">
            <AnimatePresence mode="wait">
                {/* ================= DASHBOARD ================= */}
                {activeView === "dashboard" && (
                  <motion.div
                    key="dashboard"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-10"
                  >
                    <div className="flex justify-between items-end">
                        <div className="space-y-1">
                            <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-none uppercase tracking-tighter">Records Vault</h1>
                            <p className="text-slate-500 italic font-bold text-xs uppercase tracking-widest opacity-60">Cross-system diagnostic synchronizer</p>
                        </div>
                        <div className="text-right hidden md:block border-l pl-6 border-slate-200">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Authenticated User</p>
                            <p className="font-black text-slate-900 text-lg uppercase tracking-tighter">Dr. {doctor?.full_name}</p>
                        </div>
                    </div>
                    <div className="bg-white p-3 rounded-[2.5rem] shadow-xl shadow-slate-200/60 border border-slate-100 flex flex-col sm:flex-row gap-3">
                        <div className="grow relative">
                            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={22} />
                            <input className="w-full pl-16 pr-6 py-5 bg-transparent outline-none font-bold text-slate-700 placeholder:text-slate-200 text-lg tracking-tight italic" placeholder="Query ID or Phone..." value={searchId} onChange={(e) => {
                              const v = e.target.value;
                              setSearchId(v);

                              if (v.trim() === "") {
                                setSearched(false);
                                setHistory([]);
                                setSelectedRx(null);
                                setViewMode("table");
                              }
                            }} />
                        </div>
                        <button onClick={fetchPatientHistory} className="px-14 py-5 bg-blue-600 text-white rounded-3xl font-black text-xs uppercase tracking-widest hover:bg-slate-950 transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2">{loading ? <Activity className="animate-spin" size={20} /> : <Database size={16} />} Search</button>
                    </div>
                    <div className="relative group">
                      <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/20 to-indigo-500/20 rounded-[3rem] blur opacity-25" />
                      <div className="relative bg-white/80 backdrop-blur-xl rounded-[2.5rem] border border-white shadow-sm overflow-hidden min-h-[400px]">
                        {history.length > 0 && (
                          <div className="p-8 border-b border-slate-100 bg-slate-50/30 flex justify-between items-center">
                            <div className="space-y-1">
                              <h3 className="font-black text-slate-800 flex items-center gap-3 uppercase text-[11px] tracking-[0.2em] leading-none"><div className="p-2 bg-blue-500 rounded-lg shadow-lg shadow-blue-200"><ClipboardList size={16} className="text-white" /></div>Diagnostic Intelligence Log</h3>
                              <p className="text-[10px] text-slate-400 font-black ml-11 uppercase tracking-widest leading-none">Real-time Biometric History</p>
                            </div>
                            <div className="flex bg-white p-1 rounded-xl border border-slate-100 shadow-inner">
                              <motion.div 
                                layout // 1. Tells the container to animate its size changes smoothly
                                className="flex bg-white p-1 rounded-xl border border-slate-100 shadow-inner w-fit overflow-hidden"
                              >                             
                                {/* 🟦 TABULAR button */}
                                <ViewToggleButton
                                  active={viewMode === "table"}
                                  onClick={() => {
                                    setViewMode("table");
                                    setSelectedRx(null);
                                  }}
                                  icon={<TableIcon size={12} />}
                                  label="Tabular"
                                />

                                {/* 🟣 TIMELINE button — Slides in smoothly */}
                                <AnimatePresence mode="popLayout">
                                  {selectedRx && (
                                    <motion.div
                                      initial={{ opacity: 0, width: 0, scale: 0.8 }}
                                      animate={{ opacity: 1, width: "auto", scale: 1 }}
                                      exit={{ opacity: 0, width: 0, scale: 0.8 }}
                                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                    >
                                      <ViewToggleButton
                                        active={viewMode === "timeline"}
                                        onClick={() => setViewMode("timeline")}
                                        icon={<List size={12} />}
                                        label="Timeline"
                                      />
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </motion.div>
                            </div>
                          </div>
                        )}
                        <div className="p-8">
                          {/* 🔄 Loading */}
                          {loading && (
                            <div className="p-20 text-center text-slate-400 font-bold">
                              Loading records...
                            </div>
                          )}

                          {/* 💤 Idle state (no search yet) */}
                          {!loading && !searched && (
                            <IdleSearchState />
                          )}

                          {/* ❌ Search done but no results */}
                          {!loading && searched && history.length === 0 && (
                            <EmptySearchState />
                          )}

                          {/* ✅ Data available */}
                          {healthSummary && (
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm mb-8 overflow-hidden">
                              {/* Header Section */}
                              <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
                                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">
                                  Patient Health Summary
                                </h3>
                              </div>

                              {/* Content Section */}
                              <div className="p-6 grid md:grid-cols-2 gap-8">
                                
                                {/* Left Column: Overall Metrics */}
                                <div className="flex flex-col gap-4">
                                  <div className="bg-blue-50/50 p-5 rounded-xl border border-blue-100">
                                    <span className="block text-sm font-semibold text-blue-600/80 mb-1">
                                      Overall Status
                                    </span>
                                    <span className="text-xl font-bold text-slate-800 capitalize">
                                      {healthSummary.overall_status}
                                    </span>
                                  </div>
                                  
                                  <div className="bg-slate-50 p-5 rounded-xl border border-slate-100">
                                    <span className="block text-sm font-semibold text-slate-500 mb-1">
                                      Overall Risk
                                    </span>
                                    <span className="text-xl font-bold text-slate-800">
                                      {safePercent(healthSummary.max_risk)}
                                    </span>
                                  </div>
                                </div>

                                {/* Right Column: Disease Breakdown */}
                                <div>
                                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
                                    Risk Breakdown
                                  </h4>
                                  <div className="space-y-3">
                                    {Array.isArray(healthSummary.diseases) &&
                                      healthSummary.diseases.map((d, i) => (
                                        <div 
                                          key={i} 
                                          className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-white hover:border-slate-300 transition-colors shadow-sm"
                                        >
                                          <span className="font-medium text-slate-700 capitalize text-sm">
                                            {d.disease}
                                          </span>
                                          <span className="font-bold text-slate-800 text-xs bg-slate-100 px-3 py-1 rounded-full">
                                            {safePercent(d.current_risk)}
                                          </span>
                                        </div>
                                      ))}
                                  </div>
                                </div>
                                
                              </div>
                            </div>
                          )}

                          {!loading && history.length > 0 && (
                            viewMode === "timeline" && selectedRx ? (
                              <TimelineView
                                history={[selectedRx]}
                                onBack={() => {
                                  setSelectedRx(null);
                                  setViewMode("table");
                                }}
                                openFeatures={openFeatures}
                              />
                            ) : (
                              <TableView
                                history={history}
                                openFeatures={openFeatures}
                                setSelectedRx={setSelectedRx}
                                setViewMode={setViewMode}
                                setEditingRx={setEditingRx}
                                setActiveView={setActiveView}
                              />
                            )
                          )}
                        </div>
                      </div>
                    </div>
                </motion.div>
                )}

                {/* ================= PROFILE ================= */}
                {activeView === "profile" && (
                  <motion.div
                    key="profile"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.25 }}
                    className="max-w-2xl mx-auto"
                  >
                    <div className="bg-white p-12 rounded-[3rem] border border-slate-100 shadow-sm">
                        <div className="mb-10 text-center">
                            <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-blue-100 shadow-inner"><User size={40} /></div>
                            <h3 className="text-2xl font-black text-slate-900 tracking-tight uppercase tracking-tighter">Identity Calibration</h3>
                            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Cross-system Clinical Identity</p>
                        </div>
                        <div className="space-y-6">
                            <ProfileInput icon={<UserCheck size={18} />} label="Official Full Name" value={editProfile.full_name} onChange={(v) => setEditProfile({...editProfile, full_name: v})} />
                            <ProfileInput icon={<Stethoscope size={18} />} label="Clinical Specialization" value={editProfile.specialization} onChange={(v) => setEditProfile({...editProfile, specialization: v})} />
                            <ProfileInput icon={<Mail size={18} />} label="Institutional Email" value={editProfile.email} onChange={(v) => setEditProfile({...editProfile, email: v})} />
                            <hr className="border-slate-100 my-8" />
                            <button className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:bg-blue-600 transition-all shadow-xl active:scale-95"><Save size={16} /> Commit Profile Updates</button>
                        </div>
                    </div>
                  </motion.div>
                )}
               
                {/* ================= EDIT PRESCRIPTION ================= */}
                {activeView === "edit-prescription" && editingRx && (
                  <motion.div
                    key="edit-prescription"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                    className="max-w-5xl mx-auto"
                  >
                    {/* 🔽 FULL SCREEN EDIT VIEW */}
                    <EditPrescriptionView
                      rx={editingRx}
                      doctor={doctor}
                      onCancel={() => {
                        setEditingRx(null);
                        setActiveView("dashboard");
                      }}
                      onFinalize={handleFinalize}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
        </main>
      </div>

      {/* ================= FEATURE MODAL ================= */}
      <AnimatePresence>
        {featureModal.open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-lg rounded-4xl p-8 shadow-2xl relative"
            >

              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <h3 className="text-xl font-black text-slate-900 mb-4">
                    {featureModal.disease} – AI Decision Factors
                  </h3>
                </div>
                <button onClick={closeFeatures} className="p-2 bg-slate-50 text-slate-400 hover:text-red-500 rounded-xl transition-all border border-slate-100">
                  <X size={20} />
                </button>
              </div>

              <div className="mt-6 space-y-4 max-h-[60vh] overflow-y-auto pr-2">

                {/* ================= REPORT VIEW ================= */}
                {featureModal.type === "report" && featureModal.data && (
                  <div className="space-y-6">

                    <div className="border-b pb-4">
                      <h3 className="text-lg font-black text-purple-700">
                        {featureModal.data.test_name}
                      </h3>
                      <p className="text-xs text-slate-500">
                        Submitted by: {featureModal.data.submitted_by}
                      </p>
                    </div>

                    <div className="space-y-3">
                      {Object.entries(featureModal.data.values || {}).map(([k, v]) => (
                        <div
                          key={k}
                          className="flex justify-between bg-purple-50 p-4 rounded-xl border border-purple-100"
                        >
                          <span className="font-semibold capitalize text-purple-700">
                            {k.replace(/_/g, " ")}
                          </span>
                          <span className="font-black text-slate-900">
                            {v ?? "N/A"}
                          </span>
                        </div>
                      ))}
                    </div>

                  </div>
                )}

                {/* ================= FEATURE VIEW ================= */}
                {featureModal.type === "features" && featureModal.data && (
                  <div className="space-y-2 text-sm">
                    {Object.entries(featureModal.data || {}).map(([k, v]) => (
                      <div
                        key={k}
                        className="flex justify-between bg-slate-50 p-3 rounded-xl"
                      >
                        <span className="font-semibold capitalize">
                          {k.replace(/_/g, " ")}
                        </span>

                        <span className="font-bold text-slate-700">
                          {typeof v === "object"
                            ? JSON.stringify(v, null, 2)
                            : String(v)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <Footer />
    </div>
  );
}

// --- SUB-COMPONENTS ---
const AuthInput = ({ icon, type = "text", placeholder, value, onChange }) => (
  <div className="relative group">
    <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors">{icon}</div>
    <input type={type} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white font-medium transition-all" required />
  </div>
);

const SidebarLink = ({ icon, label, active, onClick }) => (
  <button onClick={onClick} className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all group ${active ? "bg-blue-600 text-white shadow-xl shadow-blue-900/40" : "hover:bg-slate-900 hover:text-white"}`}><div className="flex items-center gap-4 font-bold text-sm">{icon}{label}</div><ChevronRight size={14} className={`${active ? "opacity-100" : "opacity-0 group-hover:opacity-100 transition-opacity"}`} /></button>
);

const ProfileInput = ({ icon, label, value, onChange }) => (
  <div className="space-y-1">
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">{label}</label>
      <div className="relative group">
          <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors">{icon}</div>
          <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white font-bold text-slate-800 transition-all shadow-inner" />
      </div>
  </div>
);

const safeText = (v) => (v === null || v === undefined || v === -1) ? "—" : v;

const safePercent = (v) => (v === null || v === undefined || isNaN(v)) ? "—" : (v > 1 ? `${Math.round(v)}%` : `${Math.round(v * 100)}%`);

const ViewToggleButton = ({ active, onClick, icon, label }) => (
  <button
    onClick={onClick}
    className={`
      relative flex items-center gap-2 px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-colors duration-200
      ${active ? "text-white" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"}
    `}
  >
    {/* 2. The Sliding Background Magic */}
    {active && (
      <motion.div
        layoutId="active-pill" // This ID connects the two buttons, creating the sliding effect
        className="absolute inset-0 bg-blue-600 rounded-lg shadow-md shadow-blue-500/20"
        transition={{ type: "spring", duration: 0.5 }}
      />
    )}
    
    {/* 3. Content needs z-index to sit on top of the sliding background */}
    <span className="relative z-10 flex items-center gap-2">
      {icon}
      {label}
    </span>
  </button>
);

const VitalBadge = ({ label, value }) => (
  <div className="flex flex-col gap-1 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm"><p className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-400">{label}</p><p className="text-xs font-black text-slate-900 tracking-tight uppercase tracking-tighter">{safeText(value)}</p></div>
);

const MetadataItem = ({ label, value }) => (
  <div className="space-y-2"><p className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-500 leading-none">{label}</p><p className="text-sm font-bold text-slate-700 leading-relaxed font-mono italic tracking-tighter">{safeText(value)}</p></div>
);

const EmptySearchState = () => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="p-20 text-center flex flex-col items-center gap-6"
  >
    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 border border-slate-100">
      <Search size={28} />
    </div>

    <div className="space-y-2">
      <p className="text-slate-500 font-black uppercase tracking-widest text-[11px]">
        No Records Found
      </p>
      <p className="text-slate-400 text-sm font-medium">
        Try searching with a valid Patient ID or Phone number
      </p>
    </div>
  </motion.div>
);

const IdleSearchState = () => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="p-20 text-center flex flex-col items-center gap-6"
  >
    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 border border-slate-100">
      <Database size={28} />
    </div>

    <div className="space-y-2">
      <p className="text-slate-400 font-black uppercase tracking-widest text-[11px]">
        No Search Initiated
      </p>
      <p className="text-slate-300 text-sm font-medium">
        Search by Patient ID or Phone number to view records
      </p>
    </div>
  </motion.div>
);

const Field = ({ label, value }) => (
  <div>
    <p className="text-[10px] font-black uppercase text-slate-400">{label}</p>
    <p className="font-bold text-slate-800">{value || "—"}</p>
  </div>
);

const PrescriptionHeader = ({ rx, doctor }) => {
  return (
    <div className="mb-8 font-sans text-sm">

      {/* ===== SERIAL + DATE ===== */}
      <div className="flex justify-between mb-2">
        <p>
          <b>Serial No:</b>{" "}
          <span className="text-blue-600 font-bold">
            {rx.prescription_serial}
          </span>
        </p>
        <p>
          <b>Date:</b>{" "}
          {new Date(rx.created_at).toLocaleDateString()}
        </p>
      </div>

      {/* ===== MAIN INFO TABLE ===== */}
      <table className="w-full border border-black border-collapse">
        <tbody>
          <tr>
            <td className="border border-black p-2">
              <b>Patient ID:</b> {rx.patient?.patient_id}
            </td>
            <td className="border border-black p-2">
              <b>Phone:</b> {rx.patient?.phone}
            </td>
            <td className="border border-black p-2">
              <b>Name:</b> {rx.patient?.name}
            </td>
          </tr>

          <tr>
            <td className="border border-black p-2">
              <b>Gender:</b>{" "}
              {formatGender(rx.patient?.gender)}
            </td>
            <td className="border border-black p-2">
              <b>Age:</b> {rx.patient?.age}
            </td>
            <td className="border border-black p-2">
              <b>Height:</b> {rx.vitals?.height_cm} cm
            </td>
          </tr>

          <tr>
            <td className="border border-black p-2">
              <b>Weight:</b> {rx.vitals?.weight_kg}
            </td>
            <td className="border border-black p-2">
              <b>BP:</b>{" "}
              {rx.vitals?.bp?.systolic}/{rx.vitals?.bp?.diastolic}
            </td>
            <td className="border border-black p-2">
              <b>Department:</b> {doctor?.specialization}
            </td>
          </tr>

          <tr>
            <td className="border border-black p-2">
              <b>Doctor ID:</b> {doctor?.id || "—"}
            </td>
            <td className="border border-black p-2">
              <b>Doctor Name:</b> {doctor?.full_name}
            </td>
            <td className="border border-black p-2"></td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

const EditPrescriptionView = ({ rx, doctor, onCancel, onFinalize }) => {
  const [localRx, setLocalRx] = useState(rx);
  const [pregnancies, setPregnancies] = useState(
    rx.vitals?.pregnancies ?? 0
  );

  const [medicines, setMedicines] = useState(
    Array.isArray(rx.clinical?.medicines)
      ? rx.clinical.medicines
      : [{ name: "", dosage: "", duration: "" }]
  );

  const [tests, setTests] = useState(
    rx.clinical?.tests
      ? rx.clinical.tests.split(",").map(t => t.trim())
      : [""]
  );

  return (
    <div className="w-full bg-gradient-to-br from-slate-50 to-white p-12 rounded-[3rem] shadow-2xl border border-slate-100">

      {/* ================= HEADER ================= */}
      <div className="mb-10">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">
          Edit Prescription
        </h1>
      </div>

      <PrescriptionHeader rx={rx} doctor={doctor} />

      {/* ================= SYMPTOMS ================= */}
      <div className="space-y-3 mb-6">
        <label className="text-lg font-black text-slate-900 mb-4 uppercase tracking-tight">
          Symptoms
        </label>
        <textarea
          className="w-full p-4 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-medium shadow-sm transition-all"
          placeholder="Enter symptoms..."
          value={localRx.clinical?.symptoms || ""}
          onChange={(e) =>
            setLocalRx({
              ...localRx,
              clinical: { ...localRx.clinical, symptoms: e.target.value }
            })
          }
        />
      </div>

      {/* ================= DIAGNOSIS ================= */}
      <div className="space-y-3 mb-8">
        <label className="text-lg font-black text-slate-900 mb-4 uppercase tracking-tight">
          Diagnosis
        </label>
        <textarea
          className="w-full p-4 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-medium shadow-sm transition-all"
          placeholder="Enter diagnosis..."
          value={localRx.clinical?.diagnosis || ""}
          onChange={(e) =>
            setLocalRx({
              ...localRx,
              clinical: { ...localRx.clinical, diagnosis: e.target.value }
            })
          }
        />
      </div>

      {/* ================= PREGNANCIES ================= */}
      <div className="w-full md:w-72 mb-10 space-y-2 group">
        <label className="text-[9px] font-black text-slate-900 uppercase tracking-[0.25em]">
          Pregnancies Index
        </label>

        <div className="flex items-center justify-between p-2 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-all">

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="button"
            onClick={() => setPregnancies(prev => Math.max(0, prev - 1))}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 text-slate-500 hover:text-red-500 hover:bg-red-50 transition-all"
          >
            <Minus size={16} strokeWidth={3} />
          </motion.button>

          <div className="px-6 select-none">
            <AnimatePresence mode="wait">
              <motion.span
                key={pregnancies}
                initial={{ y: 6, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -6, opacity: 0 }}
                className="text-1xl font-black text-slate-900 font-mono tracking-tight"
              >
                {pregnancies.toString().padStart(2, "0")}
              </motion.span>
            </AnimatePresence>
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="button"
            onClick={() => setPregnancies(prev => prev + 1)}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-blue-600 text-white shadow-md hover:bg-slate-900 transition-all"
          >
            <Plus size={16} strokeWidth={3} />
          </motion.button>
        </div>
      </div>

      {/* ================= MEDICINES ================= */}
      <h3 className="text-lg font-black text-slate-900 mb-4 uppercase tracking-tight">
        Medicines
      </h3>

      <div className="rounded-2xl overflow-hidden border border-slate-100 shadow-sm mb-4">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-widest font-black">
            <tr>
              <th className="p-4 text-left">Name</th>
              <th className="p-4 text-left">Dosage</th>
              <th className="p-4 text-left">Duration</th>
              <th className="p-4"></th>
            </tr>
          </thead>
          <tbody>
            {medicines.map((m, i) => (
              <tr key={i} className="border-t border-slate-100">
                <td className="p-3">
                  <input
                    className="w-full p-2 bg-slate-50 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={m.name}
                    onChange={e => {
                      const c = [...medicines];
                      c[i].name = e.target.value;
                      setMedicines(c);
                    }}
                  />
                </td>
                <td className="p-3">
                  <input
                    className="w-full p-2 bg-slate-50 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={m.dosage}
                    onChange={e => {
                      const c = [...medicines];
                      c[i].dosage = e.target.value;
                      setMedicines(c);
                    }}
                  />
                </td>
                <td className="p-3">
                  <input
                    className="w-full p-2 bg-slate-50 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={m.duration}
                    onChange={e => {
                      const c = [...medicines];
                      c[i].duration = e.target.value;
                      setMedicines(c);
                    }}
                  />
                </td>
                <td className="p-3 text-center">
                  <button
                    onClick={() => setMedicines(medicines.filter((_, x) => x !== i))}
                    className="px-4 rounded-xl bg-red-50 text-red-600 font-black hover:bg-red-600 hover:text-white transition-all"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        className="mb-10 px-5 py-2 bg-blue-50 text-blue-600 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all"
        onClick={() => setMedicines([...medicines, { name: "", dosage: "", duration: "" }])}
      >
        + Add Medicine
      </button>

      {/* ================= TESTS ================= */}
      <h3 className="text-lg font-black text-slate-900 mb-4 uppercase tracking-tight">
        Tests
      </h3>

      <div className="space-y-3 mb-6">
        {tests.map((t, i) => (
          <div key={i} className="flex gap-3">
            <input
              className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="e.g. CBC, ESR, X-Ray Chest"
              value={t}
              onChange={e => {
                const c = [...tests];
                c[i] = e.target.value;
                setTests(c);
              }}
            />
            <button
              onClick={() => setTests(tests.filter((_, x) => x !== i))}
              className="px-4 rounded-xl bg-red-50 text-red-600 font-black hover:bg-red-600 hover:text-white transition-all"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <button
        className="mb-12 px-5 py-2 bg-blue-50 text-blue-600 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all"
        onClick={() => setTests([...tests, ""])}
      >
        + Add Test
      </button>

      {/* ================= ACTIONS ================= */}
      <div className="flex gap-6">
        <button
          className="px-10 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs hover:bg-slate-900 transition-all shadow-lg active:scale-95"
          onClick={() =>
            onFinalize({
              ...localRx,
              vitals: {
                ...localRx.vitals,
                pregnancies
              },
              clinical: {
                ...localRx.clinical,
                medicines,
                tests: tests
                  .map(t => t.trim())
                  .filter(Boolean)
                  .join(", ")
              }
            })
          }
        >
          Finalize & Submit
        </button>

        <button
          onClick={onCancel}
          className="px-8 py-4 bg-slate-100 text-slate-700 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-200 transition-all"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

const PrescriptionPreview = ({ rx, doctor }) => {
  if (!rx) return null;

  const meds = Array.isArray(rx.clinical?.medicines)
    ? rx.clinical.medicines
    : [];

  return (
    <div className="bg-white border p-10 rounded-xl shadow-inner font-serif">
      <h2 className="text-center font-bold text-lg mb-1">
        Gonoshasthaya Samaj Vittik Medical College
      </h2>
      <p className="text-center text-xs mb-6">
        Mirzanagar, Ashulia, Savar, Dhaka-1344, Bangladesh
      </p>

      <div className="flex justify-between text-sm mb-4">
        <span>Serial No: {rx.prescription_serial}</span>
        <span>Date: {new Date(rx.created_at).toLocaleDateString()}</span>
      </div>

      <table className="w-full border text-sm mb-6">
        <tbody>
          <tr>
            <td className="border p-2">Patient ID</td>
            <td className="border p-2">{rx.patient?.patient_id}</td>
            <td className="border p-2">Name</td>
            <td className="border p-2">{rx.patient?.name}</td>
          </tr>
          <tr>
            <td className="border p-2">Age</td>
            <td className="border p-2">{rx.patient?.age}</td>
            <td className="border p-2">Gender</td>
            <td className="border p-2">{formatGender(rx.patient?.gender)}</td>
          </tr>
        </tbody>
      </table>

      <p className="mb-2"><b>Symptoms:</b> {rx.clinical?.symptoms}</p>
      <p className="mb-4"><b>Diagnosis:</b> {rx.clinical?.diagnosis}</p>

      <h4 className="font-bold mb-2">Medicines</h4>
      <table className="w-full border text-sm mb-4">
        <thead>
          <tr>
            <th className="border p-2">Name</th>
            <th className="border p-2">Dosage</th>
            <th className="border p-2">Duration</th>
          </tr>
        </thead>
        <tbody>
          {meds.map((m, i) => (
            <tr key={i}>
              <td className="border p-2">{m.name}</td>
              <td className="border p-2">{m.dosage}</td>
              <td className="border p-2">{m.duration}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p><b>Doctor:</b> Dr. {doctor?.full_name}</p>
      <p><b>Department:</b> {doctor?.specialization}</p>
    </div>
  );
};
