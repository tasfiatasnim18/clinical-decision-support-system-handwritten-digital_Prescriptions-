import React, { useState, useEffect } from "react";
import axios from "axios";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { FEATURE_META } from "../components/featureMeta";
import { 
  Stethoscope, Search, User, LogOut, Save, 
  History, Activity, Phone, Hash, Eye, 
  EyeOff, Lock, UserCheck, LayoutDashboard, Settings,
  ChevronRight, Database, ClipboardList, Mail,
  UploadCloud, FileText, BrainCircuit, Sparkles,
  RefreshCw, CheckCircle, AlertCircle, Droplets, Scale, HeartPulse, Dna, Calendar, Maximize2, X,
  ShieldCheck // ✅ Added missing icon
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

const formatGender = (g) => {
  if (g === null || g === undefined) return "N/A";
  if (typeof g === "string") {
    if (g.toLowerCase().startsWith("m")) return "Male";
    if (g.toLowerCase().startsWith("f")) return "Female";
    return g;
  }
  if (g === 0) return "Male";
  if (g === 1) return "Female";
  return "Other";
};

export default function ReceptionistPortal() {
  const [view, setView] = useState("login"); 
  const [activeTab, setActiveTab] = useState("intake");
  const [loading, setLoading] = useState(false);
  const [receptionist, setReceptionist] = useState(null);
  const navigate = useNavigate();
  
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [isZoomed, setIsZoomed] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [draftReady, setDraftReady] = useState(false);
  const [committedSerial, setCommittedSerial] = useState(null);
  const [printData, setPrintData] = useState(null);

  const [loginData, setLoginData] = useState({ username: "", password: "" });
  const [regData, setRegData] = useState({ username: "", name: "", email: "", password: "" });
  const [editProfile, setEditProfile] = useState({ name: "", email: "" });
  const [showPassword, setShowPassword] = useState(false);
  const BASE = "http://localhost:8000/api/receptionist";

  useEffect(() => {
    const fetchDraft = async () => {
      try {
        const token = localStorage.getItem("receptionist_token");

        const res = await axios.get(
          "http://localhost:8000/api/receptionist/latest-handwritten-draft",
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );

        if (res.data.prescription_serial) {
          setCommittedSerial(res.data.prescription_serial);
          setDraftReady(true);
        }
      } catch (err) {
        console.error("Draft fetch failed");
      }
    };

    if (activeTab === "handwritten") {
      fetchDraft();
    }
  }, [activeTab]);

  const fetchMe = async (token) => {
    try {
      const r = await axios.get(`${BASE}/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setReceptionist(r.data);
      setEditProfile({ name: r.data.name, email: r.data.email });
      setView("dashboard");

    } catch (err) {
        console.error("me failed", err);
      }
  };

  useEffect(() => {
    const token = localStorage.getItem("receptionist_token");
    if (token) fetchMe(token);
  }, []);

  // ✅ HANDLER: RESET (Fixes the ReferenceError)
  const handleReset = () => {
    setFile(null);
    setPreview(null);
    setAnalysisResult(null);
    setError("");
  };

  // ✅ HANDLER: LOGOUT
  const handleLogout = () => {
    localStorage.removeItem("receptionist_token");
    setReceptionist(null);
    setAnalysisResult(null);
    setPreview(null);
    setFile(null);
    setView("login");
    navigate("/receptionist");
  };

const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const form = new URLSearchParams();
      form.append("username", loginData.username);
      form.append("password", loginData.password);
      const r = await axios.post(`${BASE}/login`, form);
      if (r.data.status && r.data.status !== "APPROVED") {
          alert("Account pending admin approval");
          return;
      }
      localStorage.setItem("receptionist_token", r.data.access_token);
      fetchMe(r.data.access_token);
    } catch (err) { alert("Login failed"); } finally { setLoading(false); }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(`${BASE}/register`, regData);
      alert("Registration submitted! Please wait for admin approval.");
      setView("login");
    } catch (err) { alert(err.response?.data?.detail || "Registration failed"); } finally { setLoading(false); }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setPreview(URL.createObjectURL(selectedFile));
    setError("");
    setAnalysisResult(null);
  };


  const handleRunAnalysis = async () => {
    if (!file) {
      setError("Please select an image first");
      return;
    }

    if (!committedSerial) {
      setError("No draft found. Please create draft first.");
      return;
    }

    setLoading(true);
    setError("");
    setAnalysisResult(null);

    try {
      const token = localStorage.getItem("receptionist_token");

      const formData = new FormData();
      formData.append("prescription_serial", committedSerial);
      formData.append("file", file);

      const res = await axios.post(
        "http://localhost:8000/api/receptionist/analyze_and_store",
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setAnalysisResult(res.data);

      setCommittedSerial(null);
      setDraftReady(false);
      setFile(null);
      setPreview(null);

    } catch (err) {
      setError(
        err.response?.data?.detail ||
        err.response?.data?.message ||
        "Submission failed"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    try {
        await axios.put(`${BASE}/update_profile`, editProfile, {
            headers: { Authorization: `Bearer ${localStorage.getItem("receptionist_token")}` }
        });
        alert("Profile Updated Successfully!");
    } catch { alert("Update failed."); }
  };

    // ================== NEW INTAKE STATE ==================
  const [intake, setIntake] = useState({
    patient_id: null,
    is_new_patient: true,

    patient: {
      name: "",
      phone: "",
      age: "",
      gender: "",
      height_cm: "",
      weight_kg: "",
      bp_systolic: "",
      bp_diastolic: "",
      department: "",
      doctor_id: "",
      doctor_name: "",
    },

    visit: {
      type: "DIGITAL"
    }
  });

  const [generatedIds, setGeneratedIds] = useState({
    prescription_serial: null,
    patient_id: null,
  });

  const fetchNextIds = async () => {
    try {
      const token = localStorage.getItem("receptionist_token");

      const res = await axios.get(
        "http://localhost:8000/api/receptionist/next-ids",
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setGeneratedIds(res.data);

    } catch (err) {
      alert("Failed to fetch next serial");
    }
  };

  const resetIntakeForm = () => {
    setIntake({
      patient_id: null,
      is_new_patient: true,
      patient: {
        name: "",
        phone: "",
        age: "",
        gender: "",
        height_cm: "",
        weight_kg: "",
        bp_systolic: "",
        bp_diastolic: "",
        department: "",
        doctor_id: "",
        doctor_name: "",
      },
      visit: {
        type: "DIGITAL"
      }
    });
  };

  const fetchSavedPrescription = async (serial) => {
    try {
      const token = localStorage.getItem("receptionist_token");

      const res = await axios.get(
        `http://localhost:8000/api/receptionist/prescription/${serial}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setPrintData(res.data);

    } catch (err) {
      alert("Failed to load prescription for print");
    }
  };

  // ---------- AUTH VIEWS (LOGIN / REGISTER) ----------
if (view === "login" || view === "register") {
      return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
          <Navbar />
          <div className="grow flex items-center justify-center pt-24 px-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
                <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl border border-slate-100 mb-10">
                    <div className="text-center pb-5">
                        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <ShieldCheck size={32} />
                        </div>
                        <h2 className="text-3xl font-black text-slate-900 tracking-tight">
                          {view === "login" ? "Receptionist Login" : "Join Network"}
                        </h2>               
                    </div>
                    
                    <form onSubmit={view === "login" ? handleLogin : handleRegister} className="space-y-4">
                        {view === "register" && (
                          <div className="relative">
                            <UserCheck className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                            <input type="text" placeholder="Full Name" className="w-full pl-14 pr-14 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-medium transition-all" onChange={(e) => setRegData({...regData, name: e.target.value})} required />
                          </div>
                        )}
                          <div className="relative">
                            <User className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                            <input type="text" placeholder="Username" className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-medium transition-all" onChange={(e) => view === "login" ? setLoginData({...loginData, username: e.target.value}) : setRegData({...regData, username: e.target.value})} required />
                          </div>
                        {view === "register" && (
                          <>
                            <div className="relative">
                              <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                              <input type="email" placeholder="Email Address" className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-medium transition-all" onChange={(e) => setRegData({...regData, email: e.target.value})} required />
                            </div>
                          </>
                        )}
                        
                        {/* --- PASSWORD INPUT WITH EYE BUTTON --- */}
                        <div className="relative">
                          <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                          <input 
                            type={showPassword ? "text" : "password"} 
                            placeholder="Password" 
                            className="w-full pl-14 pr-14 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-medium transition-all" 
                            onChange={(e) => view === "login" ? setLoginData({...loginData, password: e.target.value}) : setRegData({...regData, password: e.target.value})} 
                            required 
                          />
                          <button 
                            type="button" 
                            onClick={() => setShowPassword(!showPassword)} 
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors p-2"
                          >
                            {showPassword ? <Eye size={20} /> : <EyeOff size={20} />}
                          </button>
                        </div>             

                        <button type="submit" disabled={loading} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold shadow-xl hover:bg-blue-600 transition-all mt-4">
                          {loading ? "Processing..." : view === "login" ? "Login" : "Register"}
                        </button>
                    </form>

                    <div className="mt-8 text-center text-sm">
                      <p className="text-slate-400 font-medium">
                        {view === "login" ? "New staff member?" : "Already have an account?"}
                        <button onClick={() => setView(view === "login" ? "register" : "login")} className="ml-2 text-blue-600 font-bold hover:underline">
                          {view === "login" ? "Register new account" : "Login"}
                        </button>
                      </p>
                    </div>
                    
                    {/* --- FORGOT PASSWORD LINK --- */}
                        {view === "login" && (
                          <div className="flex justify-center px-1 pt-3">
                            <button 
                              type="button" 
                              onClick={() => alert("Please contact the System Admin to reset your credentials.")}
                              className="text-xs font-bold text-slate-400 hover:text-blue-600 transition-colors tracking-widest"
                            >
                              Forgot Password?
                            </button>
                          </div>
                        )}
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
      <AnimatePresence>
        {isZoomed && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-100 bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-10 cursor-zoom-out"
            onClick={() => setIsZoomed(false)}
          >
            <button className="absolute top-10 right-10 text-white bg-white/10 p-3 rounded-full hover:bg-white/20 transition-all"><X size={24} /></button>
            <motion.img initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} src={preview} className="max-w-full max-h-full rounded-xl shadow-2xl object-contain" alt="Fullscreen" />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex grow pt-16">
        <aside className="w-72 bg-slate-950 text-slate-400 border-r border-slate-900 sticky top-16 max-h-[calc(100vh-64px)] flex flex-col overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700">
          <div className="mb-10 px-2 pt-6">
             <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500 mb-1">Secure Environment</p>
             <h2 className="text-white text-xl font-bold tracking-tight">Staff Hub</h2>
          </div>
          <nav className="flex-1 space-y-2">
            <SidebarLink icon={<LayoutDashboard size={20} />} label="Intake Analysis" active={activeTab === "analysis"} onClick={() => setActiveTab("intake")} />
            <SidebarLink icon={<Settings size={20} />} label="Personal Info" active={activeTab === "profile"} onClick={() => setActiveTab("profile")} />
          </nav>
          <div className="mt-auto pt-6 pb-4 border-t border-slate-900/50">
            <button onClick={handleLogout} className="w-full flex items-center gap-3 p-4 bg-red-500/10 text-red-400 rounded-2xl font-bold hover:bg-red-500 hover:text-white transition-all group shadow-inner">
                <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
                <span>Logout Session</span>
            </button>
          </div>
        </aside>

        <main className="flex-1 p-12 overflow-y-auto">
          <AnimatePresence mode="wait">
            {/* ================= INTAKE OPTIONS ================= */}
            {activeTab === "intake" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">                
                {/* 📝 Handwritten Prescription Analysis */}
                <motion.div
                  whileHover={{ y: -6 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={async () => {
                    setActiveTab("handwritten");
                    await fetchNextIds();

                    setIntake(prev => ({
                      ...prev,
                      visit: { type: "HANDWRITTEN" }
                    }));
                  }}
                  className="cursor-pointer bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group"
                >
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center group-hover:scale-110 transition-transform">
                      <ClipboardList size={32} />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-slate-900">
                        Upload Handwritten Prescription
                      </h3>
                      <p className="text-sm text-slate-500 mt-1">
                        OCR + AI analysis will run automatically
                      </p>
                    </div>
                  </div>
                </motion.div>

                {/* 💻 Digital & Handwritten Prescription Create */}
                <motion.div
                  whileHover={{ y: -6 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={async () => {
                    setActiveTab("digital");
                    await fetchNextIds();
                    setDraftReady(false);
                    setCommittedSerial(null);
                  }}
                  className="cursor-pointer bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group"
                >
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center group-hover:scale-110 transition-transform">
                      <FileText size={32} />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-slate-900">
                        Create Digital Prescription
                      </h3>
                      <p className="text-sm text-slate-500 mt-1">
                        Enter patient details & create draft prescription
                      </p>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}

            {activeTab === "handwritten" && ( 
              <motion.div key="analysis" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-10 max-w-5xl mx-auto"> 
                <button 
                  onClick={() => {
                    setActiveTab("intake");
                  }} 
                  className="text-sm font-bold text-blue-600 mb-4"> 
                  ← Back to Intake Options 
                </button>
                <div>
                  <h1 className="text-4xl font-black text-slate-900 tracking-tight">Patient Intake</h1>
                  <p className="text-slate-500 mt-2 italic">Intelligence for medical document extraction.</p>
                </div>

                <div className="flex flex-col gap-10">
                  <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm w-full">
                    <div className="flex flex-col md:flex-row gap-10 items-center">
                        <div className="relative w-full md:w-1/2 group">
                            <label className={`relative flex flex-col items-center justify-center h-80 border-2 border-dashed rounded-3xl cursor-pointer transition-all overflow-hidden ${file ? 'border-blue-500 bg-slate-950' : 'border-slate-300 bg-slate-50/50 hover:bg-slate-100'}`}>
                                {!preview ? (
                                    <div className="flex flex-col items-center p-5 text-center">
                                        <UploadCloud className="w-12 h-12 text-slate-400 group-hover:text-blue-500 mb-4 transition-colors" />
                                        <p className="text-sm text-slate-600 font-bold">Drop document here</p>
                                    </div>
                                ) : (
                                    <motion.img initial={{ opacity: 0 }} animate={{ opacity: 1 }} src={preview} className="h-full w-full object-contain opacity-80 group-hover:opacity-100 transition-opacity" />
                                )}
                                <input
                                  type="file"
                                  accept="image/png,image/jpeg"
                                  className="hidden"
                                  onChange={handleFileChange}
                                />
                            </label>
                            
                            {preview && (
                                <button onClick={() => setIsZoomed(true)} className="absolute bottom-6 right-6 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-2xl transition-all shadow-2xl shadow-blue-500/40 flex items-center gap-2 group/zoom">
                                    <Maximize2 size={20} className="group-hover/zoom:scale-110 transition-transform" />
                                    <span className="text-[10px] font-black uppercase tracking-widest overflow-hidden max-w-0 group-hover/zoom:max-w-xs transition-all duration-300">Zoom</span>
                                </button>
                            )}
                        </div>

                        <div className="w-full md:w-1/2 space-y-6">
                            <h3 className="text-xl font-bold text-slate-900">
                              Clinical Processor
                            </h3>
                            <p className="text-slate-500 text-sm leading-relaxed">
                              System performs OCR to read handwritten/printed text and NER to label clinical entities.
                            </p>
                            {!file ? (
                                <button onClick={() => document.querySelector('input[type="file"]').click()} className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black shadow-lg flex justify-center gap-2 hover:bg-blue-700 transition-all active:scale-95"><UploadCloud size={20}/> Select File</button>
                            ) : loading ? (
                                <div className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black flex justify-center gap-3"><Activity className="animate-spin" size={20}/> AI Synchronizing...</div>
                            ) : (
                            <div className="flex flex-col gap-3">
                                <button 
                                  onClick={handleRunAnalysis} 
                                  className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black shadow-xl hover:bg-blue-600 transition-all flex justify-center gap-2 active:scale-95">
                                  <Sparkles size={20}/> Start Extraction
                                </button>
                                <button onClick={handleReset} className="text-slate-400 hover:text-red-500 text-xs font-bold transition-all uppercase tracking-widest text-center underline italic">Discard Image</button>
                            </div>
                            )}
                        </div>
                    </div>
                  </div>
                  <div className="w-full">
                    <AnimatePresence>
                        {error && (
                          <div className="p-6 rounded-3xl border border-red-200 bg-red-50 flex gap-4">
                            <AlertCircle className="text-red-500 shrink-0" size={24} />
                            <div>
                              <h4 className="font-black text-red-700 uppercase text-xs">
                                Upload Failed
                              </h4>
                              <p className="text-sm text-red-600">{error}</p>
                            </div>
                          </div>
                        )}

                        {analysisResult && (
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 pb-20">
                            <div className="p-6 rounded-3xl border flex gap-4 bg-blue-50 border-blue-100 shadow-sm"><CheckCircle className="text-blue-600 shrink-0" size={24} /><div><h4 className="font-black text-blue-900 uppercase text-xs">Commit Successful</h4><p className="text-sm text-blue-700">Patient <b>{analysisResult.patient_id}</b> recorded into database.</p></div></div>

                            {/* Disease Prediction Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {/* OBESITY */}
                                {analysisResult.diseases.obesity?.prediction !== -1 && (
                                  <DiseaseCard 
                                    title="Obesity Screening" 
                                    label={obesityLabel(analysisResult.diseases.obesity.prediction)} 
                                    confidence={analysisResult.diseases.obesity.confidence || 0} 
                                    risk={analysisResult.diseases.obesity.future_risk || 0}
                                    icon={<Scale className="text-indigo-500" />}
                                  />
                                )}
                            
                              {/* DIABETES */}
                                {analysisResult.diseases.diabetes?.prediction !== -1 && (
                                  <DiseaseCard 
                                    title="Diabetes Analysis" 
                                    label={diabetesLabel(analysisResult.diseases.diabetes.prediction)} 
                                    confidence={analysisResult.diseases.diabetes.confidence || 0} 
                                    risk={analysisResult.diseases.diabetes.future_risk || 0}
                                    icon={<Droplets className="text-blue-500" />}
                                  />
                                )}
                            
                              {/* LIVER */}
                              {analysisResult.diseases.liver?.prediction !== -1 && (
                                <DiseaseCard 
                                  title="Liver Pathology" 
                                  label={liverLabel(analysisResult.diseases.liver.prediction)} 
                                  confidence={analysisResult.diseases.liver.confidence || 0} 
                                  risk={analysisResult.diseases.liver.future_risk || 0}
                                  icon={<Activity className="text-emerald-500" />}
                                />
                              )}
                            
                              {/* CARDIOVASCULAR */}
                              {analysisResult.diseases.cardiovascular?.prediction !== -1 && (
                                <DiseaseCard 
                                  title="Cardiovascular Risk" 
                                  label={cardiovascularLabel(analysisResult.diseases.cardiovascular.prediction)} 
                                  confidence={analysisResult.diseases.cardiovascular.confidence || 0} 
                                  risk={analysisResult.diseases.cardiovascular.future_risk || 0}
                                  icon={<HeartPulse className="text-red-500" />}
                                />
                              )}
                            </div>

                            {/* ================= SYMPTOM CDSS ================= */}
                            {analysisResult.symptom_cdss?.predictions?.length > 0 && (
                              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                                  <BrainCircuit size={14} className="text-purple-500" />
                                  Symptom Based CDSS
                                </h4>

                                <div className="space-y-4">
                                  {analysisResult.symptom_cdss.predictions.map((item, idx) => (
                                    <div key={idx} className="flex justify-between items-center">
                                      <span className="text-sm font-bold text-slate-800">
                                        {item.disease}
                                      </span>
                                      <span className="text-purple-600 font-bold">
                                        {item.probability}%
                                      </span>
                                    </div>
                                  ))}
                                </div>

                                {analysisResult.symptom_cdss.warning && (
                                  <div className="mt-6 text-xs font-bold text-red-500">
                                    ⚠ {analysisResult.symptom_cdss.warning}
                                  </div>
                                )}
                              </div>
                            )}
                            
                            <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm">
                              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-10 flex items-center gap-2">
                                <ClipboardList size={14} className="text-blue-500" />
                                Clinical Metadata (Extracted)
                              </h4>

                              {/* Identity – always */}
                              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-10 flex items-center gap-2">
                                <User size={14} className="text-blue-500" />
                                Patient Details
                              </h4>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-y-12 mb-14">
                                <VitalItem label="Patient ID" value={analysisResult.patient_id} />
                                <VitalItem label="Name" value={analysisResult.patient_identity?.name} />
                                <VitalItem label="Phone" value={analysisResult.patient_identity?.phone} />
                                {["age", "gender", "height_cm", "weight_kg", "bmi"].map((key) => {
                                  const meta = FEATURE_META[key];
                                  const raw = analysisResult.extracted_data?.[key];
                                  if (raw === undefined || raw === null) return null;

                                  const value = key === "gender" ? formatGender(raw) : raw;

                                  return (
                                    <div key={key} className="flex flex-col">
                                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">
                                        {meta.label}
                                      </span>
                                      <span className="text-sm font-bold text-slate-800">
                                        {value}
                                        {meta.unit ? ` ${meta.unit}` : ""}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Disease-wise extracted features */}
                              <div className="space-y-12">
                                {Object.entries(analysisResult.diseases).map(([disease, result]) => {
                                  const features = result.features_used;
                                  if (!features || Object.keys(features).length === 0) return null;

                                  const orderedFeatures = Object.entries(features).sort(
                                    ([a], [b]) =>
                                      (FEATURE_META[a]?.order ?? 99) -
                                      (FEATURE_META[b]?.order ?? 99)
                                  );

                                  return (
                                    <div key={disease}>
                                      <h5 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-6">
                                        {disease.toUpperCase()} MODEL FEATURES
                                      </h5>

                                      <div className="grid grid-cols-2 md:grid-cols-4 gap-y-10">
                                        {orderedFeatures.map(([key, value]) => {
                                          const meta = FEATURE_META[key] || { label: key };
                                          return (
                                            <div key={key} className="flex flex-col">
                                              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">
                                                {meta.label}
                                              </span>
                                              <span className="text-sm font-bold text-slate-800">
                                                {value}
                                                {meta.unit ? ` ${meta.unit}` : ""}
                                              </span>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="bg-slate-950 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
                                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-2"><FileText size={14} className="text-blue-500" /> Raw OCR Stream</h4>
                                    <div className="h-auto overflow-y-auto pr-4">
                                        <p className="text-slate-400 text-sm leading-relaxed font-mono italic">{analysisResult.clean_text || "No text available."}</p>
                                    </div>
                                </div>

                                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden group">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2"><BrainCircuit size={14} className="text-blue-500" /> Entity Labels (NER)</h4>
                                    <div className="flex flex-wrap gap-2 h-48 overflow-y-auto content-start">
                                        {analysisResult.ner_extracted &&
                                        Object.values(analysisResult.ner_extracted).some(v => v) ? (
                                          Object.entries(analysisResult.ner_extracted).map(([group, value]) =>
                                            value
                                              ? value.split(",").map((word, i) => (
                                                  <span
                                                    key={`${group}-${i}`}
                                                    className="px-3 py-1.5 bg-blue-50 text-blue-700 text-[10px] font-black rounded-lg"
                                                  >
                                                    {word.trim()}
                                                  </span>
                                                ))
                                              : null
                                          )
                                        ) : (
                                          <p className="text-slate-300 text-xs italic">
                                            Awaiting AI labeling...
                                          </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                        )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            )}
            {activeTab === "digital" && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="max-w-3xl mx-auto bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm"
              >
                <button
                  onClick={() => {
                    setActiveTab("intake");
                  }}
                  className="text-sm font-bold text-blue-600 mb-4"
                >
                  ← Back to Intake Options
                </button>

                <h2 className="text-2xl font-black text-slate-900 mb-8 text-center">
                  Create Prescription
                </h2>

                {printData ? (
                  <PrintablePrescription data={printData} />
                ) : generatedIds.prescription_serial ? (
                  <NewIntakeForm
                    intake={intake}
                    setIntake={setIntake}
                    generatedIds={generatedIds}
                  />
                ) : (
                  <div className="p-10 text-center font-bold text-slate-500">
                    Generating Serial & Patient ID…
                  </div>
                )}

                <div className="mt-12 flex justify-end items-center gap-4 pt-6 border-t border-gray-100">
                  <button
                    onClick={() => {
                      resetIntakeForm();
                      setPrintData(null);
                      setCommittedSerial(null);
                      setDraftReady(false);
                      setActiveTab("intake");
                    }}
                    className="px-8 py-3 rounded-xl font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 hover:shadow-sm active:scale-95 transition-all duration-300 ease-in-out"
                  >
                    Cancel
                  </button>

                  <button
                    onClick={async () => {
                      try {
                        const token = localStorage.getItem("receptionist_token");

                        const payload = {
                          is_new_patient: intake.is_new_patient,
                          patient_id: intake.is_new_patient
                            ? generatedIds.patient_id
                            : intake.patient_id,

                          name: intake.patient.name,
                          phone: intake.patient.phone,
                          age: intake.patient.age
                            ? Number(intake.patient.age)
                            : null,
                          gender: intake.patient.gender
                            ? intake.patient.gender.toUpperCase()
                            : null,

                          height_cm: intake.patient.height_cm
                            ? Number(intake.patient.height_cm)
                            : null,
                          weight_kg: intake.patient.weight_kg
                            ? Number(intake.patient.weight_kg)
                            : null,

                          bp_systolic: intake.patient.bp_systolic
                            ? Number(intake.patient.bp_systolic)
                            : null,
                          bp_diastolic: intake.patient.bp_diastolic
                            ? Number(intake.patient.bp_diastolic)
                            : null,

                          doctor_id: intake.patient.doctor_id
                            ? Number(intake.patient.doctor_id)
                            : null,
                          doctor_name: intake.patient.doctor_name || null,
                          department: intake.patient.department || null,

                          mode: intake.visit.type
                        };

                        const res = await axios.post(
                          "http://localhost:8000/api/receptionist/visit-intake",
                          payload,
                          {
                            headers: { Authorization: `Bearer ${token}` }
                          }
                        );

                        setCommittedSerial(res.data.prescription_serial);
                        setDraftReady(true);
                        setActiveTab("digital");

                        // 🔥 ONLY for HANDWRITTEN
                        if (intake.visit.type === "HANDWRITTEN") {
                          await fetchSavedPrescription(res.data.prescription_serial);
                        }

                        if (intake.visit.type === "DIGITAL") {
                          resetIntakeForm();
                        }

                      } catch (err) {
                        alert(
                          err.response?.data?.detail ||
                          "Failed to save draft"
                        );
                      }
                    }}
                    className="px-8 py-3 rounded-xl font-semibold text-white bg-blue-600 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/30 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-300 ease-in-out"
                  >
                    Save Draft
                  </button>
                </div>
                {printData && intake.visit.type === "HANDWRITTEN" && (
                  <div className="mt-8 flex justify-end">
                    <button
                      onClick={() => window.print()}
                      className="px-8 py-3 rounded-xl font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-all"
                    >
                      Print Prescription
                    </button>
                  </div>
                )}

              </motion.div>
            )}
            
            {activeTab === "profile" && (
              <motion.div key="profile" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="max-w-2xl mx-auto bg-white p-12 rounded-[3rem] border border-slate-100 shadow-sm">
                 <div className="mb-10 text-center">
                    <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-blue-100"><User size={40} /></div>
                    <h3 className="text-2xl font-black text-slate-900">Account Security</h3>
                    <p className="text-slate-500 text-sm mt-1">Manage staff credentials</p>
                 </div>
                 <div className="space-y-6">
                    <ProfileInput icon={<UserCheck size={18} />} label="Full Name" value={editProfile.name} onChange={(v) => setEditProfile({...editProfile, name: v})} />
                    <ProfileInput icon={<Mail size={18} />} label="Professional Email" value={editProfile.email} onChange={(v) => setEditProfile({...editProfile, email: v})} />
                    <hr className="border-slate-100 my-8" />
                    <button onClick={handleUpdateProfile} disabled={loading} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-blue-600 transition-all shadow-xl shadow-blue-100"><Save size={20} /> {loading ? "Updating..." : "Save Changes"}</button>
                 </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>     
      <Footer />
    </div>
  );
}

// --- SUB-COMPONENTS ---

const SidebarLink = ({ icon, label, active, onClick }) => (
  <button onClick={onClick} className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all group ${active ? "bg-blue-600 text-white shadow-xl shadow-blue-900/40" : "hover:bg-slate-900 hover:text-white"}`}>
    <div className="flex items-center gap-4 font-bold text-sm">{icon}{label}</div>
    <ChevronRight size={14} className={`${active ? "opacity-100" : "opacity-0 group-hover:opacity-100 transition-opacity"}`} />
  </button>
);

const VitalItem = ({ icon, label, value }) => (
  <div className="flex flex-col">
    <div className="flex items-center gap-2 mb-2 opacity-40">{icon}<span className="text-[9px] font-black uppercase tracking-widest">{label}</span></div>
    <span className="text-sm font-bold text-slate-800">{value || "N/A"}</span>
  </div>
);

const ProfileInput = ({ icon, label, value, onChange }) => (
  <div className="space-y-1">
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
      <div className="relative">
          <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300">{icon}</div>
          <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-800 transition-all" />
      </div>
  </div>
);

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

const TextInput = ({ label, value, onChange, readOnly=false }) => (
  <div className="space-y-1">
    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
      {label}
    </label>
    <input
      value={value}
      readOnly={readOnly}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full px-4 py-4 rounded-2xl font-bold border
        ${readOnly ? "bg-slate-100 cursor-not-allowed" : "bg-white"}
        focus:ring-2 focus:ring-blue-500`}
    />
  </div>
);

const NewIntakeForm = ({ intake, setIntake, generatedIds }) => {
  const today = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  return (
    <div className="bg-white p-8 max-w-4xl mx-auto font-sans text-black">
      {/* Header 
      <div className="text-center mb-10">
        <h1 className="text-2xl font-bold text-[#1f4e79] mb-1">
          Gonoshasthaya Samaj Vittik Medical College
        </h1>
        <p className="text-[15px]">
          Mirzanagar, Ashulia, Savar, Dhaka-1344, Bangladesh
        </p>
      </div>*/}

      {/* Meta Information */}
      <div className="flex justify-between items-center mb-2 text-[15px]">
        <div>
          Serial No: <span className="ml-1">{generatedIds.prescription_serial || "10000032"}</span>
        </div>
        <div>
          Date: <span className="ml-1">{today}</span>
        </div>
      </div>

      {/* Patient Details Table */}
      <table className="w-full border-collapse border border-black mb-10 text-[15px]">
        <tbody>
          {/* Row 1 */}
          <tr>
            <td className="border border-black px-2 py-1 w-1/3">
              <div className="flex">
                <span className="whitespace-nowrap mr-1">Patient ID:</span>
                <input
                  type="text"
                  className="w-full bg-transparent outline-none"
                  value={intake.is_new_patient ? generatedIds.patient_id || "" : intake.patient_id || ""}
                  readOnly={intake.is_new_patient}
                  onChange={(e) => setIntake(prev => ({ ...prev, patient_id: e.target.value }))}
                />
              </div>
            </td>
            <td className="border border-black px-2 py-1 w-1/3">
              <div className="flex">
                <span className="whitespace-nowrap mr-1">Phone:</span>
                <input
                  type="text"
                  className="w-full bg-transparent outline-none"
                  value={intake.patient.phone || ""}
                  onChange={(e) => setIntake(prev => ({ ...prev, patient: { ...prev.patient, phone: e.target.value } }))}
                />
              </div>
            </td>
            <td className="border border-black px-2 py-1 w-1/3">
              <div className="flex">
                <span className="whitespace-nowrap mr-1">Name:</span>
                <input
                  type="text"
                  className="w-full bg-transparent outline-none"
                  value={intake.patient.name || ""}
                  onChange={(e) => setIntake(prev => ({ ...prev, patient: { ...prev.patient, name: e.target.value } }))}
                />
              </div>
            </td>
          </tr>

          {/* Row 2 */}
          <tr>
            <td className="border border-black px-2 py-1">
              <div className="flex">
                <span className="whitespace-nowrap mr-1">Gender:</span>
                <select
                  className="w-full bg-transparent outline-none appearance-none"
                  value={intake.patient.gender || ""}
                  onChange={(e) => setIntake(prev => ({ ...prev, patient: { ...prev.patient, gender: e.target.value } }))}
                >
                  <option value=""></option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </td>
            <td className="border border-black px-2 py-1">
              <div className="flex">
                <span className="whitespace-nowrap mr-1">Age:</span>
                <input
                  type="text"
                  className="w-full bg-transparent outline-none"
                  value={intake.patient.age || ""}
                  onChange={(e) => setIntake(prev => ({ ...prev, patient: { ...prev.patient, age: e.target.value } }))}
                />
              </div>
            </td>
            <td className="border border-black px-2 py-1">
              <div className="flex">
                <span className="whitespace-nowrap mr-1">Height(cm):</span>
                <input
                  type="text"
                  className="w-full bg-transparent outline-none"
                  value={intake.patient.height_cm || ""}
                  onChange={(e) => setIntake(prev => ({ ...prev, patient: { ...prev.patient, height_cm: e.target.value } }))}
                />
              </div>
            </td>
          </tr>

          {/* Row 3 */}
          <tr>
            <td className="border border-black px-2 py-1">
              <div className="flex">
                <span className="whitespace-nowrap mr-1">Weight(kg):</span>
                <input
                  type="text"
                  className="w-full bg-transparent outline-none"
                  value={intake.patient.weight_kg || ""}
                  onChange={(e) => setIntake(prev => ({ ...prev, patient: { ...prev.patient, weight_kg: e.target.value } }))}
                />
              </div>
            </td>
            <td className="border border-black px-2 py-1">
              <div className="flex">
                <span className="whitespace-nowrap mr-1">BP:</span>
                <input
                  type="text"
                  className="bg-transparent outline-none w-8 text-center"
                  value={intake.patient.bp_systolic || ""}
                  onChange={(e) => setIntake(prev => ({ ...prev, patient: { ...prev.patient, bp_systolic: e.target.value } }))}
                />
                <span className="mx-0.5">/</span>
                <input
                  type="text"
                  className="bg-transparent outline-none w-8 text-center"
                  value={intake.patient.bp_diastolic || ""}
                  onChange={(e) => setIntake(prev => ({ ...prev, patient: { ...prev.patient, bp_diastolic: e.target.value } }))}
                />
              </div>
            </td>
            <td className="border border-black px-2 py-1">
              <div className="flex">
                <span className="whitespace-nowrap mr-1">Department:</span>
                <input
                  type="text"
                  className="w-full bg-transparent outline-none"
                  value={intake.patient.department || ""}
                  onChange={(e) => setIntake(prev => ({ ...prev, patient: { ...prev.patient, department: e.target.value } }))}
                />
              </div>
            </td>
          </tr>

          {/* Row 4 */}
          <tr>
            <td className="border border-black px-2 py-1">
              <div className="flex">
                <span className="whitespace-nowrap mr-1">Doctor ID:</span>
                <input
                  type="text"
                  className="w-full bg-transparent outline-none"
                  value={intake.patient.doctor_id || ""}
                  onChange={(e) => setIntake(prev => ({ ...prev, patient: { ...prev.patient, doctor_id: e.target.value } }))}
                />
              </div>
            </td>
            <td className="border border-black px-2 py-1">
              <div className="flex">
                <span className="whitespace-nowrap mr-1">Doctor Name:</span>
                <input
                  type="text"
                  className="w-full bg-transparent outline-none"
                  value={intake.patient.doctor_name || ""}
                  onChange={(e) => setIntake(prev => ({ ...prev, patient: { ...prev.patient, doctor_name: e.target.value } }))}
                />
              </div>
            </td>
            <td className="border border-black px-2 py-1">
              {/* Empty cell to match the image layout */}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Static Read-Only UI (Matches the Image Layout) */}
      <div className="space-y-12 text-[15px]">
        <div>
          Symptoms: 
        </div>

        <div>
          Diagnosis: 
        </div>

        <div>
          <div className="mb-2">Medicines:</div>
          <table className="w-full border-collapse border border-black text-center">
            <thead>
              <tr>
                <th className="border border-black font-normal py-1 w-1/3">Medicine Names</th>
                <th className="border border-black font-normal py-1 w-1/3">Dosage</th>
                <th className="border border-black font-normal py-1 w-1/3">Duration</th>
              </tr>
            </thead>
            <tbody>
              {/* 5 empty rows matching the image */}
              {[1, 2, 3, 4, 5].map((row) => (
                <tr key={row}>
                  <td className="border border-black py-3"></td>
                  <td className="border border-black py-3"></td>
                  <td className="border border-black py-3"></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div>
          Tests: 
        </div>
      </div>

      {/* --- Logic Maintenance (Hidden/Admin Controls) --- */}
      {/* Kept out of the main form to match the paper look, but ensures no logic is lost */}
      <div className="mt-20 pt-6 border-t border-dashed border-gray-300 flex justify-between items-center text-sm text-gray-500">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            className="accent-gray-500"
            checked={intake.is_new_patient}
            onChange={(e) => setIntake(prev => ({ ...prev, is_new_patient: e.target.checked }))}
          />
          New Patient Toggle
        </label>

        <div className="flex gap-4">
          <span>Visit Type:</span>
          {["HANDWRITTEN", "DIGITAL"].map(t => (
            <label key={t} className="flex items-center gap-1 cursor-pointer">
              <input
                type="radio"
                className="accent-gray-500"
                checked={intake.visit?.type === t}
                onChange={() => setIntake(prev => ({ ...prev, visit: { type: t } }))}
              />
              {t}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
};

//-------------Printable Prescription Layout---------------//
const PrintablePrescription = ({ data }) => {

  const today = new Date(data.created_at).toLocaleDateString("en-GB");

  return (
    <div className="print-area bg-white p-8 max-w-4xl mx-auto text-black">

      <div className="flex justify-between mb-4 text-[15px]">
        <div>Serial No: {data.prescription_serial}</div>
        <div>Date: {today}</div>
      </div>

      <table className="w-full border-collapse border border-black mb-10 text-[15px]">
        <tbody>
          <tr>
            <td className="border border-black px-2 py-1">
              Patient ID: {data.patient_id}
            </td>
            <td className="border border-black px-2 py-1">
              Phone: {data.phone}
            </td>
            <td className="border border-black px-2 py-1">
              Name: {data.name}
            </td>
          </tr>

          <tr>
            <td className="border border-black px-2 py-1">
              Gender: {data.gender}
            </td>
            <td className="border border-black px-2 py-1">
              Age: {data.age}
            </td>
            <td className="border border-black px-2 py-1">
              Height: {data.height_cm} cm
            </td>
          </tr>

          <tr>
            <td className="border border-black px-2 py-1">
              Weight: {data.weight_kg} kg
            </td>
            <td className="border border-black px-2 py-1">
              BP: {data.bp_systolic}/{data.bp_diastolic}
            </td>
            <td className="border border-black px-2 py-1">
              Department: {data.department}
            </td>
          </tr>
        </tbody>
      </table>

      <div className="space-y-6 text-[15px]">
        <div>Symptoms: </div>
        <div>Diagnosis: </div>
        <div>
          <div className="mb-2">Medicines:</div>
          <table className="w-full border-collapse border border-black text-center">
            <thead>
              <tr>
                <th className="border border-black font-normal py-1 w-1/3">Medicine Names</th>
                <th className="border border-black font-normal py-1 w-1/3">Dosage</th>
                <th className="border border-black font-normal py-1 w-1/3">Duration</th>
              </tr>
            </thead>
            <tbody>
              {/* 5 empty rows matching the image */}
              {[1, 2, 3, 4, 5].map((row) => (
                <tr key={row}>
                  <td className="border border-black py-3"></td>
                  <td className="border border-black py-3"></td>
                  <td className="border border-black py-3"></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div>Tests: </div>
      </div>

    </div>
  );
};