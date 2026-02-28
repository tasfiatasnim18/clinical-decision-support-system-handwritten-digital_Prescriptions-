import React, { useState } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { 
  UploadCloud, FileText, Activity, AlertCircle, CheckCircle, 
  BrainCircuit, Droplets, Scale, HeartPulse, Dna, ClipboardList, 
  Database, RefreshCw, Sparkles, Maximize2, X, Search, ShieldAlert
} from "lucide-react";

/* =========================
    LABEL HELPERS (Logic Untouched)
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

/* =========================
    COMPONENT
   ========================= */
export default function Prescription4all() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [isZoomed, setIsZoomed] = useState(false);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
      setError(null);
      setResult(null);
    }
  };

  const handleReset = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
  };

  const upload = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);

    try {
      const form = new FormData();
      form.append("file", file);

      const res = await axios.post(
        "http://localhost:8000/api/home/analyze_prescription",
        form,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      setResult(res.data);
    } catch (err) {
      setError("Failed to analyze prescription. Ensure server is active on port 8000.");
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-10 pb-20">
      
      {/* --- IMAGE ZOOM MODAL --- */}
      <AnimatePresence>
        {isZoomed && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-10 cursor-zoom-out"
            onClick={() => setIsZoomed(false)}
          >
            <button className="absolute top-10 right-10 text-white bg-white/10 p-3 rounded-full hover:bg-white/20 transition-all"><X size={24} /></button>
            <motion.img initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} src={preview} className="max-w-full max-h-full rounded-2xl shadow-2xl object-contain" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 1. UPLOAD SECTION */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row gap-10 items-center">
            <div className="relative w-full md:w-1/2 group">
                <label className={`relative flex flex-col items-center justify-center h-80 border-2 border-dashed rounded-3xl cursor-pointer transition-all overflow-hidden ${file ? 'border-blue-500 bg-slate-950' : 'border-slate-300 bg-slate-50/50 hover:bg-slate-100'}`}>
                    {!preview ? (
                        <div className="flex flex-col items-center p-5 text-center">
                            <UploadCloud className="w-12 h-12 text-slate-400 group-hover:text-blue-500 mb-4 transition-colors" />
                            <p className="text-sm text-slate-600 font-bold">Drop Prescription Image</p>
                            <p className="text-[10px] text-slate-400 uppercase mt-1 tracking-widest">Medical Scan Only</p>
                        </div>
                    ) : (
                        <motion.img initial={{ opacity: 0 }} animate={{ opacity: 1 }} src={preview} className="h-full w-full object-contain opacity-80 group-hover:opacity-100 transition-opacity" />
                    )}
                    <input type="file" className="hidden" onChange={handleFileChange} accept="image/*" />
                </label>
                {preview && (
                    <button onClick={() => setIsZoomed(true)} className="absolute bottom-6 right-6 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-2xl transition-all shadow-2xl shadow-blue-500/40 flex items-center gap-2 group/zoom border border-blue-400/30">
                        <Maximize2 size={20} className="group-hover/zoom:scale-110 transition-transform" />
                        <span className="text-[10px] font-black uppercase tracking-widest overflow-hidden max-w-0 group-hover/zoom:max-w-xs transition-all duration-300">Zoom</span>
                    </button>
                )}
            </div>

            <div className="w-full md:w-1/2 space-y-6">
                <div className="space-y-2">
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">Prescription Engine</h3>
                    <p className="text-slate-500 text-sm leading-relaxed">AI performs multi-disease screening for Obesity, Liver Condition, Cardiovascular, and Diabetes Risk based on vitals.</p>
                </div>
                
                <AnimatePresence mode="wait">
                    {!file ? (
                        <button onClick={() => document.querySelector('input[type="file"]').click()} className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black shadow-lg flex justify-center gap-2 hover:bg-blue-700 transition-all active:scale-95"><UploadCloud size={20}/> Select Document</button>
                    ) : loading ? (
                        <div className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black flex justify-center gap-3"><Activity className="animate-spin" size={20}/> Deep Scanning...</div>
                    ) : (
                    <div className="flex flex-col gap-3">
                        <button onClick={upload} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black shadow-xl hover:bg-blue-600 transition-all flex justify-center gap-2 active:scale-95"><Sparkles size={20}/> Run Analysis</button>
                        <button onClick={handleReset} className="text-slate-400 hover:text-red-500 text-xs font-bold transition-all uppercase tracking-widest text-center underline italic">Discard Image</button>
                    </div>
                    )}
                </AnimatePresence>
                {error && <p className="bg-red-50 text-red-500 p-4 rounded-xl text-xs font-bold flex items-center gap-2 border border-red-100"><ShieldAlert size={14}/> {error}</p>}
            </div>
        </div>
      </motion.div>

      {/* 2. RESULTS SECTION */}
      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-10">
            
            {/* Disease Prediction Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* OBESITY */}
              {result.diseases.obesity?.prediction !== -1 && (
                <DiseaseCard 
                  title="Obesity Screening" 
                  label={obesityLabel(result.diseases.obesity.prediction)} 
                  confidence={result.diseases.obesity.confidence} 
                  risk={result.diseases.obesity.future_risk}
                  icon={<Scale className="text-indigo-500" />}
                />
              )}

              {/* DIABETES */}
              {result.diseases.diabetes?.prediction !== -1 && (
                <DiseaseCard 
                  title="Diabetes Analysis" 
                  label={diabetesLabel(result.diseases.diabetes.prediction)} 
                  confidence={result.diseases.diabetes.confidence} 
                  risk={result.diseases.diabetes.future_risk}
                  icon={<Droplets className="text-blue-500" />}
                />
              )}

              {/* LIVER */}
              {result.diseases.liver?.prediction !== -1 && (
                <DiseaseCard 
                  title="Liver Pathology" 
                  label={liverLabel(result.diseases.liver.prediction)} 
                  confidence={result.diseases.liver.confidence} 
                  risk={result.diseases.liver.future_risk}
                  icon={<Activity className="text-emerald-500" />}
                />
              )}

              {/* CARDIOVASCULAR */}
              {result.diseases.cardiovascular?.prediction !== -1 && (
                <DiseaseCard 
                  title="Cardiovascular Risk" 
                  label={cardiovascularLabel(result.diseases.cardiovascular.prediction)} 
                  confidence={result.diseases.cardiovascular.confidence} 
                  risk={result.diseases.cardiovascular.future_risk}
                  icon={<HeartPulse className="text-red-500" />}
                />
              )}
            </div>

            {/* RAW OCR PANEL */}
            <div className="bg-slate-950 p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform"><Database size={100} className="text-white" /></div>
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-2"><FileText size={14} className="text-blue-500" /> Digital Transcript (OCR)</h4>
                <div className="h-48 overflow-y-auto pr-6 custom-scrollbar">
                    <p className="text-slate-400 text-sm leading-relaxed font-mono italic">
                        {result.clean_text || "No legible text found in document scan."}
                    </p>
                </div>
            </div>

            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center px-10">
              *AI Warning: Future risk represents automated health deterioration estimates and is not a clinical diagnosis.*
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- REUSABLE UI SUB-COMPONENTS ---

const DiseaseCard = ({ title, label, confidence, risk, icon }) => (
  <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6 relative overflow-hidden group">
    <div className="flex justify-between items-start relative z-10">
        <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{title}</p>
            <h4 className="text-xl font-black text-slate-900 leading-tight">{label}</h4>
        </div>
        <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100 group-hover:scale-110 transition-transform">
            {icon}
        </div>
    </div>

    <div className="space-y-4">
        <div className="space-y-1">
            <div className="flex justify-between text-[10px] font-bold uppercase tracking-tighter">
                <span className="text-slate-400">Confidence</span>
                <span className="text-blue-600">{confidence}%</span>
            </div>
            <div className="h-1.5 bg-slate-50 rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${confidence}%` }} className="h-full bg-blue-500 rounded-full" />
            </div>
        </div>

        <div className="space-y-1">
            <div className="flex justify-between text-[10px] font-bold uppercase tracking-tighter">
                <span className="text-slate-400">Future Risk</span>
                <span className="text-red-500">{risk}%</span>
            </div>
            <div className="h-1.5 bg-slate-50 rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${risk}%` }} className="h-full bg-red-500 rounded-full" />
            </div>
        </div>
    </div>
  </div>
);