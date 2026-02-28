import React, { useState, useEffect } from "react";
import axios from "axios";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import PatientHealthSummary from "../components/PatientHealthSummary";
import {
  User, Mail, Phone, Lock, Eye, EyeOff,
  LayoutDashboard, Settings, LogOut,
  ChevronRight, ClipboardList, Activity,
  ShieldCheck, Calendar, Hash, Zap, IdCard, 
  Table as TableIcon, List, UserCheck, Search, Bell,
  Database, Scale, Droplets, HeartPulse, Dna, X
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

// ---------- DASHBOARD HEADER ----------
const DashboardHeader = ({ user }) => (
  <header className="flex items-center justify-between mb-10 bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm">
    <div className="flex items-center gap-4 flex-1">
       <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center border border-blue-100 shadow-inner">
          <User size={20} />
       </div>
       <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Authenticated Identity</p>
          <p className="text-lg font-black text-slate-900 leading-none">{user?.name || "Patient Profile"}</p>
       </div>
    </div>
    <div className="flex items-center gap-3">
       <div className="hidden sm:flex flex-col text-right">
          <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest leading-none mb-1">Status: Active</p>
          <p className="text-xs font-bold text-slate-400 tracking-tight">MedAI Intelligence Node</p>
       </div>
       <button className="p-3 bg-slate-50 text-slate-400 hover:text-blue-600 rounded-2xl transition-all"><Bell size={18} /></button>
    </div>
  </header>
);

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

/* ================= LABEL HELPERS ================= */
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

const formatGender = g => {
  if (g === 0 || g === "0") return "Male";
  if (g === 1 || g === "1") return "Female";
  if (typeof g === "string") {
    const v = g.toLowerCase().trim();
    if (v.startsWith("m")) return "Male";
    if (v.startsWith("f")) return "Female";
  }
  return "N/A";
};

const buildDiseaseReport = (disease, featuresJson) => {
  if (!featuresJson?.features) return null;

  const diseaseNames = {
    diabetes: "Diabetes Lab Panel",
    liver: "Liver Function Panel",
    cardiovascular: "Cardiovascular Risk Panel"
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
                <MetadataItem label="Medicines" value={rx.clinical?.medicines} />
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
                {rx.symptom_cdss && Array.isArray(rx.symptom_cdss.predictions) && (
                  <div className="mt-8 space-y-6">
                    <div className="flex items-center gap-3">
                      <div className="h-px grow bg-slate-100" />
                      <p className="text-[10px] font-black text-purple-500 uppercase tracking-[0.3em]">
                        Symptom Intelligence (CDSS)
                      </p>
                      <div className="h-px grow bg-slate-100" />
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      {rx.symptom_cdss.predictions.map((p, i) => {
                        const prob = typeof p.probability === "number"
                          ? Math.round(p.probability)
                          : null;

                        const isHigh = prob !== null && prob >= 70;

                        return (
                          <div
                            key={i}
                            className="p-6 bg-white border border-slate-100 rounded-3xl shadow-sm flex items-center justify-between hover:border-purple-200 transition-all"
                          >
                            <div className="flex items-center gap-4">
                              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${
                                isHigh
                                  ? "bg-red-50 text-red-500"
                                  : "bg-purple-50 text-purple-600"
                              }`}>
                                <Zap size={20} />
                              </div>

                              <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                                  Predicted Disease
                                </p>
                                <p className={`text-sm font-black ${
                                  isHigh ? "text-red-600" : "text-slate-900"
                                }`}>
                                  {p.disease}
                                </p>
                                <p className="text-xs font-bold pt-1">
                                  Probability: {prob !== null ? `${prob}%` : "—"}
                                </p>
                              </div>
                            </div>

                            <div className="text-right text-xs font-bold">
                              <p>Clinical</p>
                              <p>Signal: {prob !== null ? `${prob}%` : "—"}</p>
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
  setViewMode 
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

            {/* ===== CARDIOVASCULAR ===== */}
            <th className="p-6">Cardiovascular Result</th>
            <th className="p-6">Cardiovascular Risk</th>
            <th className="p-6">Cardiovascular Factors</th>

            {/* ===== LIVER ===== */}
            <th className="p-6">Liver Result</th>
            <th className="p-6">Liver Risk</th>
            <th className="p-6">Liver Factors</th>

            {/* ===== SUMPTOMS ===== */}
            <th className="p-6">Symptom CDSS (RISK)</th>
          </tr>

        </thead>

        <tbody className="divide-y divide-slate-50 text-sm font-medium text-slate-700">
          {history.map(rx => {
            const map = {};
            (Array.isArray(rx.predictions) ? rx.predictions : []).forEach(p => {
              map[p.disease] = p;
            });

            return (
              <tr key={rx.prescription_serial} className="hover:bg-blue-50/30">
                <td className="p-6">
                  {new Date(rx.created_at).toLocaleDateString()}
                </td>

                <td className="p-6">
                  <motion.button
                    whileHover={{ y: -2, scale: 1.02 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setSelectedRx(rx);
                      setViewMode("timeline");
                    }}
                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl border border-transparent hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors duration-300 ease-in-out shadow-md hover:shadow-lg active:shadow-sm group"
                  >
                    <span className="text-[11px] font-black tracking-[0.15em]">
                      {rx.prescription_serial}
                    </span>
                  </motion.button>
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
                      onClick={() => openFeatures("Obesity", map.obesity.features_json, "features")}
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
                      onClick={() => openFeatures("Diabetes", map.diabetes.features_json, "features")}
                      className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl border border-transparent hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors duration-300 ease-in-out shadow-md hover:shadow-lg active:shadow-sm group"
                    >
                      <span className="text-[10px] font-black uppercase tracking-[0.15em]">
                        View Factors
                      </span>
                    </motion.button>
                  ) : "No data"}
                </td>

                {/* ===== CARDIOVASCULAR ===== */}
                <td className="p-6">{safeText(cardiovascularLabel(map.cardiovascular?.result))}</td>
                <td className="p-6">{safePercent(map.cardiovascular?.risk)}</td>
                <td className="p-6">
                  {map.cardiovascular?.features_json ? (
                    <motion.button
                      whileHover={{ y: -2, scale: 1.02 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => openFeatures("Cardiovascular", map.cardiovascular.features_json, "features")}
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
                      onClick={() => openFeatures("Liver", map.liver.features_json, "features")}
                      className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl border border-transparent hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors duration-300 ease-in-out shadow-md hover:shadow-lg active:shadow-sm group"
                    >
                      <span className="text-[10px] font-black uppercase tracking-[0.15em]">
                        View Factors
                      </span>
                    </motion.button>
                  ) : "No data"}
                </td>

                {/* ===== SYMPTOMS ===== */}
                <td className="p-6">
                  {rx.symptom_cdss?.top_probability
                    ? `${Math.round(rx.symptom_cdss.top_probability)}%`
                    : "No data"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </div>
);


/* ================= MAIN COMPONENT ================= */
export default function PatientPortal() {
  const [view, setView] = useState("login");
  const [activeTab, setActiveTab] = useState("dashboard");
  const [viewMode, setViewMode] = useState("table");
  const [selectedRx, setSelectedRx] = useState(null);
  const [patient, setPatient] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginData, setLoginData] = useState({ patient_id: "", password: "" });
  const [regData, setRegData] = useState({ patient_id: "", name: "", email: "", phone: "", password: "" });
  
  const API = "http://localhost:8000/api/patient";

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

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total_pages: 1,
    total_records: 0,
    has_next: false,
    has_prev: false
  });


  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    axios.get(`${API}/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => {
        setPatient(res.data);
        setView("workspace");
        fetchHistory(token, 1, 10);
      }).catch(() => localStorage.removeItem("token"));
  }, []);

  const handleLogin = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      const form = new URLSearchParams();
      form.append("username", loginData.patient_id);
      form.append("password", loginData.password);
      const res = await axios.post(`${API}/login`, form, { headers: { "Content-Type": "application/x-www-form-urlencoded" } });
      localStorage.setItem("token", res.data.access_token);
      const profile = await axios.get(`${API}/me`, { headers: { Authorization: `Bearer ${res.data.access_token}` } });
      setPatient(profile.data);
      setView("workspace");
      fetchHistory(res.data.access_token, 1, 10);
    } catch { alert("Access Denied: Invalid credentials or pending approval"); } finally { setLoading(false); }
  };

  const fetchHistory = async (token, page = 1, limit = 10) => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/history`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { page, limit }
      });

      setHistory(res.data.data || []);

      setPagination({
        page: res.data.page,
        limit: res.data.limit,
        total_pages: res.data.total_pages,
        total_records: res.data.total_records,
        has_next: res.data.has_next,
        has_prev: res.data.has_prev
      });
    } catch (err) {
      console.error("History fetch failed", err);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    setView("login");
    setPatient(null);
    setHistory([]);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(`${API}/register`, {
        patient_id: regData.patient_id,
        name: regData.name,
        password: regData.password,
        email: regData.email || null,
        phone: regData.phone || null
      });
      alert("Registration successful. Wait for admin approval.");
      setView("login");
    } catch (err) { alert(err.response?.data?.detail || "Registration failed"); } finally { setLoading(false); }
  };

  if (view === "login" || view === "register") {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
        <Navbar />
        <div className="grow flex items-center justify-center pt-24 px-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
            <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl border border-slate-100 mb-10">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-blue-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-blue-200">
                   <ShieldCheck size={32} />
                </div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">{view === "login" ? "Patient Login" : "Patient Registry"}</h2>
              </div>

              <form onSubmit={view === "login" ? handleLogin : handleRegister} className="space-y-4">
                {view === "register" && (
                    <div className="relative">
                      <UserCheck className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                      <input className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-medium transition-all" placeholder="Full Name" onChange={(e) => setRegData({...regData, name: e.target.value})} required />
                    </div>
                )}
                
                <div className="relative">
                  <IdCard className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-medium transition-all" placeholder="Patient ID (e.g. P1001)" value={view === "login" ? loginData.patient_id : regData.patient_id} onChange={e => view === "login" ? setLoginData({ ...loginData, patient_id: e.target.value }) : setRegData({ ...regData, patient_id: e.target.value })} required />
                </div>

                {view === "register" && (
                  <>
                    <div className="relative">
                      <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                      <input className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-medium transition-all" placeholder="Email Address (Optional)" onChange={(e) => setRegData({...regData, email: e.target.value})} />
                    </div>
                    <div className="relative">
                      <Phone className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                      <input 
                      className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-medium transition-all" placeholder="Phone Number" onChange={(e) => setRegData({...regData, phone: e.target.value})} required />
                    </div>
                  </>
                )}

                <div className="relative">
                  <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input type={showPassword ? "text" : "password"} className="w-full pl-14 pr-14 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-medium transition-all" placeholder="Password" onChange={e => view === "login" ? setLoginData({ ...loginData, password: e.target.value }) : setRegData({ ...regData, password: e.target.value })} required />
                  <button type="button" className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                  </button>
                </div>

                <button className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black shadow-xl hover:bg-blue-600 transition-all flex items-center justify-center gap-2 active:scale-95">
                  {loading ? <Activity className="animate-spin" size={20} /> : view === "login" ? "Login" : "Register"}
                </button>
              </form>

              <div className="mt-8 text-center text-sm font-medium">
                <span className="text-slate-400">{view === "login" ? "New user?" : "Already have an account?"}</span>
                <button onClick={() => setView(view === "login" ? "register" : "login")} className="ml-2 text-blue-600 hover:underline">{view === "login" ? "Register new account" : "Login"}</button>
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
      <div className="flex flex-1 pt-16">
        <aside className="w-72 bg-slate-950 text-slate-400 border-r border-slate-900 sticky top-16 max-h-[calc(100vh-64px)] flex flex-col overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700">
          <div className="mb-10 px-2 pt-6">
             <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500 mb-1">Authenticated</p>
             <h2 className="text-white text-xl font-bold tracking-tight">Patient Hub</h2>
          </div>
          <nav className="flex-1 space-y-2">
            <SidebarLink icon={<LayoutDashboard size={20} />} label="Medical Archive" active={activeTab === "dashboard"} onClick={() => setActiveTab("dashboard")} />
            <SidebarLink icon={<Settings size={20} />} label="Security Settings" active={activeTab === "profile"} onClick={() => setActiveTab("profile")} />
          </nav>
          <div className="mt-auto pt-6 pb-4 border-t border-slate-900/50">
            <button onClick={handleLogout} className="w-full flex items-center gap-3 p-4 bg-red-500/10 text-red-400 rounded-2xl font-bold hover:bg-red-500 hover:text-white transition-all group shadow-inner">
                <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
                <span>Logout Session</span>
            </button>
          </div>
        </aside>

        <main className="flex-1 flex flex-col min-h-[calc(100vh-64px)] overflow-y-auto">
          <div className="p-12 flex-1">
            <DashboardHeader user={patient} />
            {/* ================= PATIENT HEALTH SUMMARY ================= */}
            {patient && (
              <div className="mb-12">
                <PatientHealthSummary
                  token={localStorage.getItem("token")}
                />
              </div>
            )}

            <AnimatePresence mode="wait">
                {activeTab === "dashboard" ? (
                <motion.div key="dash" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-10">
                    <div className="flex flex-col md:flex-row justify-between items-end gap-6">
                        <div className="space-y-1">
                            <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-none">Health Timeline</h1>
                            <p className="text-slate-500 italic leading-relaxed">Archive of historical clinical encounters and neural assessments.</p>
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
                    {viewMode === "timeline" && selectedRx 
                      ? <TimelineView
                          history={[selectedRx]}
                          onBack={() => {
                            setSelectedRx(null);
                            setViewMode("table");
                          }}
                          openFeatures={openFeatures}
                        />
                      : <TableView
                          history={history}
                          openFeatures={openFeatures}
                          setSelectedRx={setSelectedRx}
                          setViewMode={setViewMode}
                        />
                    }
                </motion.div>
                ) : (
                <motion.div key="profile" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto bg-white p-12 rounded-[3rem] border border-slate-100 shadow-sm">
                    <div className="mb-10 text-center">
                        <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-blue-100 shadow-inner"><User size={40} /></div>
                        <h3 className="text-2xl font-black text-slate-900 uppercase">Registered Identity</h3>
                        <p className="font-bold text-slate-400 uppercase tracking-[0.2em] text-[10px] mt-2 leading-none">Patient Registry: {patient?.patient_id}</p>
                    </div>
                    <div className="space-y-4">
                        <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                             <p className="text-[9px] font-black text-slate-400 uppercase mb-2 tracking-widest leading-none">Protocol Details</p>
                             <p className="text-sm font-bold text-slate-700 italic">All diagnostic data is encrypted and synchronized with the MedAI CDSS Node.</p>
                        </div>
                        <button className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black hover:bg-blue-600 transition-all shadow-xl">Synchronize Clinical Cloud</button>
                    </div>
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
            className="bg-white w-full max-w-lg max-h-[80vh] rounded-4xl p-8 shadow-2xl relative overflow-hidden flex flex-col"

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
   
            {/* ================= REPORT VIEW ================= */}
            {/* Scroll Area */}
            <div className="overflow-y-auto mt-6 pr-2 space-y-4">
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

// --- SUB COMPONENTS ---
const SidebarLink = ({ icon, label, active, onClick }) => (
  <button onClick={onClick} className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all group ${active ? "bg-blue-600 text-white shadow-xl shadow-blue-900/40" : "hover:bg-slate-900 hover:text-white"}`}>
    <div className="flex items-center gap-4 font-bold text-sm">{icon}{label}</div>
    <ChevronRight size={14} className={`${active ? "opacity-100" : "opacity-0 group-hover:opacity-100 transition-opacity"}`} />
  </button>
);

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
  <div className="space-y-2">
    <p className="text-[9px] font-black text-blue-500 uppercase tracking-[0.2em] leading-none">{label}</p>
    <p className="text-sm font-bold text-slate-700 leading-relaxed font-mono italic">{value || "—"}</p>
  </div>
);

const safeText = (v) => {
  if (v === null || v === undefined || v === -1) return "No data";
  return v;
};

const safePercent = (v) => {
  if (v === null || v === undefined) return "No data";
  if (typeof v !== "number" || isNaN(v)) return "No data";

  // assume backend sends 0–100
  return `${Math.round(v)}%`;
};
