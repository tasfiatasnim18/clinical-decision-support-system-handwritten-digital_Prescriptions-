import React, { useEffect, useState } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";

const diseaseLabels = {
  obesity: "Obesity",
  diabetes: "Diabetes",
  liver: "Liver Disease",
  cardiovascular: "Cardiovascular Disease"
};

export default function PatientHealthSummary({ token }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (!token) return;

    const fetchSummary = async () => {
      try {
        setLoading(true);
        setMessage(null);

        const res = await axios.get(
          "http://localhost:8000/api/patient/health-summary",
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        setData(res.data);
      } catch (err) {
        const detail =
          err.response?.data?.detail ||
          err.response?.data?.message ||
          "";

        if (detail === "Health summary not available yet") {
          setMessage(
            "Your health summary will appear after first doctor visit"
          );
        } else {
          setMessage("Failed to load health summary");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, [token]);

  /* ================= LOADING ================= */
  if (loading) {
    return (
      <div className="animate-pulse p-8 rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="h-4 bg-slate-200 rounded w-48 mb-6"></div>
        <div className="h-12 bg-slate-100 rounded w-full mb-4"></div>
      </div>
    );
  }

  /* ================= MESSAGE ================= */
  if (message) {
    return (
      <div className="p-5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 shadow-sm">
        {message}
      </div>
    );
  }

  if (!data) return null;

  /* ================= RENDER ================= */
  return (
    <div className="space-y-6">

      {/* ================= SUMMARY CARD ================= */}
      <div className="relative">
        <Header 
          data={data} 
          showDetails={showDetails} 
          setShowDetails={setShowDetails}
        />
      </div>

      {/* ================= EXPANDABLE BREAKDOWN ================= */}
      <AnimatePresence>
        {showDetails && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 px-1">
                Condition Breakdown
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.diseases.map((disease) => (
                  <DiseaseCard
                    key={disease.disease}
                    diseaseKey={disease.disease}
                    disease={disease}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

/* ======================================================
   HEADER
====================================================== */
function Header({ data, showDetails, setShowDetails }) {
  const statusColor = {
    HEALTHY: "text-green-600",
    MONITOR: "text-yellow-600",
    NEEDS_ATTENTION: "text-orange-600",
    CRITICAL: "text-red-600",
  }[data.overall_status] || "text-gray-600";

  return (
    <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm">

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">

        {/* LEFT SIDE */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">
            Patient Health Status
          </h3>
          <div className={`text-3xl font-black tracking-tight capitalize ${statusColor}`}>
            {data.overall_status.replace("_", " ").toLowerCase()}
          </div>
        </div>

        {/* RIGHT SIDE */}
        <div className="bg-slate-50 px-5 py-3 rounded-xl border border-slate-100 flex flex-col items-start md:items-end">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Max Risk Score
          </span>
          <span className="text-xl font-bold text-slate-800">
            {data.max_risk}
          </span>
        </div>

      </div>

      {/* BUTTON INSIDE CARD */}
      <div className="mt-6 flex justify-center">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="px-8 py-3 bg-blue-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-blue-700 transition-all shadow-md"
        >
          {showDetails ? "Hide Details" : "See Details"}
        </button>
      </div>

    </div>
  );
}

/* ======================================================
   DISEASE CARD
====================================================== */
function DiseaseCard({ diseaseKey, disease }) {
  const trendIcon =
    disease.trend === "DOWN"
      ? "↓"
      : disease.trend === "UP"
      ? "↑"
      : "→";

  const statusColor = {
    NO_DISEASE: "bg-green-100 text-green-700 border-green-200",
    IMPROVING: "bg-blue-100 text-blue-700 border-blue-200",
    STABLE: "bg-slate-100 text-slate-700 border-slate-200",
    WORSENING: "bg-orange-100 text-orange-700 border-orange-200",
    CRITICAL: "bg-red-100 text-red-700 border-red-200",
  }[disease.status] || "bg-slate-100 text-slate-700 border-slate-200";

  return (
    <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-sm flex flex-col justify-between">

      <div className="flex justify-between items-start mb-4">
        <h3 className="font-bold text-slate-800 text-lg">
          {diseaseLabels[diseaseKey] || diseaseKey}
        </h3>

        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${statusColor}`}>
          {disease.status.replace("_", " ")}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3 pt-3 border-t border-slate-100 mt-auto">

        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase">Current</span>
          <div className="font-semibold text-slate-800 text-sm">
            {disease.current_risk} {trendIcon}
          </div>
        </div>

        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase">Previous</span>
          <div className="font-semibold text-slate-600 text-sm">
            {disease.previous_risk}
          </div>
        </div>

        <div className="text-right">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Shift</span>
          <div
            className={`font-semibold text-sm ${
              disease.improvement > 0
                ? "text-emerald-600"
                : disease.improvement < 0
                ? "text-rose-600"
                : "text-slate-400"
            }`}
          >
            {disease.improvement > 0 ? "+" : ""}
            {disease.improvement}%
          </div>
        </div>

      </div>
    </div>
  );
}
