import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  UserCheck,
  Mail,
  User,
  Lock,
  Eye,
  EyeOff,
  Activity,
  LogOut,
  LayoutDashboard,
  Settings,
  ChevronRight,
  Database,
  FlaskConical,
  ClipboardList,
  Fingerprint,
  RefreshCw,
  Bell
} from "lucide-react";

const BASE = "http://localhost:8000/api/lab";

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
          <div className="text-xl font-bold text-slate-900 tracking-tighter uppercase">
            MedAI
          </div>
        </div>

        <div className="hidden md:flex gap-8 items-center">
          {menu.map((m) => {
            const isActive = location.pathname === m.path || (m.path !== "/" && location.pathname.startsWith(m.path));
            return (
              <Link key={m.path} to={m.path} className={`text-sm font-bold transition-all ${isActive ? "text-blue-600" : "text-slate-500 hover:text-blue-600"}`}>
                {m.name}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

// ---------- GLOBAL FOOTER ----------
const Footer = () => (
  <footer className="bg-slate-950 text-slate-500 py-16 border-t border-slate-900 mt-auto">
    <div className="max-w-7xl mx-auto px-10 flex flex-col md:flex-row justify-between items-center gap-8">
      <div>
        <div className="flex items-center gap-2 mb-2 text-white">
            <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center font-bold text-[10px]">M</div>
            <h2 className="text-lg font-bold tracking-tighter">MedAI</h2>
        </div>
        <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-600">Clinical Intelligence Network</p>
      </div>
      <div className="text-xs font-medium italic">&copy; {new Date().getFullYear()} MedAI Research Lab. All rights reserved.</div>
    </div>
  </footer>
);

const DISEASE_FEATURES = {
  diabetes: [
    "glucose",
    "insulin",
    "skin_thickness",
    "dpf"
  ],

  liver: [
    "total_bilirubin",
    "direct_bilirubin",
    "sgpt",
    "sgot"
  ],

  cardiovascular: [
    "cholesterol"
  ]
};


const formatFeatureLabel = (key) => {
  const labels = {
    glucose: "Glucose (mg/dL)",
    insulin: "Insulin (µU/mL)",
    cholesterol: "Cholesterol (mg/dL)",
    total_bilirubin: "Total Bilirubin (mg/dL)",
    direct_bilirubin: "Direct Bilirubin (mg/dL)",
    sgpt: "SGPT (ALT)",
    sgot: "SGOT (AST)"
  };

  return labels[key] || key.replace(/_/g, " ");
};

/* ================= MAIN COMPONENT ================= */
export default function LabPortal() {
  const [view, setView] = useState("login");
  const [labUser, setLabUser] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [loginData, setLoginData] = useState({ username: "", password: "" });
  const [regData, setRegData] = useState({ username: "", name: "", email: "", password: "" });
  const [reportData, setReportData] = useState({ prescription_serial: "", disease: "" });

  /* ================= AUTO LOGIN ================= */
  useEffect(() => {
    const token = localStorage.getItem("lab_token");
    if (token) fetchMe(token);
  }, []);

  const fetchMe = async (token) => {
    try {
      const res = await axios.get(`${BASE}/me`, { headers: { Authorization: `Bearer ${token}` } });
      setLabUser(res.data);
      setView("dashboard");
    } catch { localStorage.removeItem("lab_token"); }
  };

  /* ================= REGISTER ================= */
  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(`${BASE}/register`, regData);
      alert("Registration submitted. Wait for admin approval.");
      setView("login");
    } catch (err) { alert(err.response?.data?.detail || "Registration failed"); } finally { setLoading(false); }
  };

  /* ================= LOGIN ================= */
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const form = new URLSearchParams();
      form.append("username", loginData.username);
      form.append("password", loginData.password);
      const res = await axios.post(`${BASE}/login`, form);
      localStorage.setItem("lab_token", res.data.access_token);
      fetchMe(res.data.access_token);
    } catch (err) { alert(err.response?.data?.detail || "Login failed"); } finally { setLoading(false); }
  };

  /* ================= SUBMIT REPORT ================= */
  const handleSubmitReport = async () => {
    try {
        setLoading(true);

        const token = localStorage.getItem("lab_token");

        if (!reportData.prescription_serial) {
        alert("Please enter prescription serial");
        return;
        }

        if (!reportData.disease) {
        alert("Please select a disease");
        return;
        }

        const selectedFeatures = DISEASE_FEATURES[reportData.disease];

        if (!selectedFeatures) {
        alert("Invalid disease selected");
        return;
        }

        const payload = { disease: reportData.disease };

        selectedFeatures.forEach((feature) => {
        const value = reportData[feature];
        payload[feature] =
            value !== undefined && value !== "" ? Number(value) : null;
        });

        const res = await axios.post(
        `${BASE}/submit-report/${reportData.prescription_serial}`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
        );

        setAnalysisResult(res.data);
        alert("Report Submitted Successfully");
    } catch (err) {
        alert(err.response?.data?.detail || "Submission failed");
    } finally {
        setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("lab_token");
    setLabUser(null);
    setView("login");
  };

  /* ================= LOGIN / REGISTER PAGE ================= */
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
                        <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-none mb-2">
                            {view === "login" ? "Lab Login" : "Join Network"}
                        </h2>
                        <p className="text-slate-500 text-sm tracking-tight opacity-70 font-medium">Laboratory Access Terminal</p>
                    </div>

                    <form onSubmit={view === "login" ? handleLogin : handleRegister} className="space-y-4">
                        {view === "register" && (
                            <AuthInput icon={<UserCheck size={18} />} placeholder="Full Name" onChange={(v) => setRegData({ ...regData, name: v })} />
                        )}
                        <AuthInput icon={<Fingerprint size={18} />} placeholder="Username" value={view === "login" ? loginData.username : regData.username} onChange={(v) => view === "login" ? setLoginData({ ...loginData, username: v }) : setRegData({ ...regData, username: v })} />
                        
                        {view === "register" && (
                            <AuthInput icon={<Mail size={18} />} type="email" placeholder="Official Email" onChange={(v) => setRegData({ ...regData, email: v })} />
                        )}

                        <div className="relative group">
                            <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={18} />
                            <input type={showPassword ? "text" : "password"} className="w-full pl-14 pr-14 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-medium transition-all" placeholder="Security Password" onChange={(e) => view === "login" ? setLoginData({...loginData, password: e.target.value}) : setRegData({...regData, password: e.target.value})} required />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600">
                                {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                            </button>
                        </div>

                        <button className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black shadow-xl hover:bg-blue-600 transition-all mt-4 flex items-center justify-center gap-2 active:scale-95">
                            {loading ? <Activity className="animate-spin" size={20} /> : view === "login" ? "Authorize Entry" : "Register Node"}
                        </button>
                    </form>

                    <div className="mt-8 text-center text-sm font-medium">
                        <span className="text-slate-400">{view === "login" ? "New laboratory?" : "Already registered?"}</span>
                        <button className="ml-2 text-blue-600 font-bold hover:underline" onClick={() => setView(view === "login" ? "register" : "login")}>
                            {view === "login" ? "Apply for access" : "Login terminal"}
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
        <Footer />
      </div>
    );
  }

  /* ================= DASHBOARD ================= */
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-blue-100">
      <Navbar />
      <div className="flex grow pt-16">
        <aside className="w-72 bg-slate-950 text-slate-400 p-6 flex flex-col fixed h-[calc(100vh-64px)] z-40 border-r border-slate-900 shadow-2xl">
          <div className="mb-10 px-2 pt-6">
             <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500 mb-1">Authenticated</p>
             <h2 className="text-white text-xl font-bold tracking-tight uppercase tracking-tighter">Lab Terminal</h2>
          </div>
          <nav className="flex-1 space-y-2">
            <SidebarLink icon={<LayoutDashboard size={20} />} label="Analysis Entry" active={true} onClick={() => {}} />
            <SidebarLink icon={<Settings size={20} />} label="Node Settings" active={false} onClick={() => {}} />
          </nav>
          <div className="mt-auto pt-6 border-t border-slate-900/50">
            <button onClick={logout} className="w-full flex items-center gap-3 p-4 bg-red-500/10 text-red-400 rounded-2xl font-bold hover:bg-red-500 hover:text-white transition-all group active:scale-95 shadow-inner">
                <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
                <span>Logout Session</span>
            </button>
          </div>
        </aside>

        <main className="flex-1 ml-72 flex flex-col min-h-[calc(100vh-64px)] overflow-y-auto">
            <div className="p-12 flex-1 space-y-10">
                <div className="flex justify-between items-end">
                    <div className="space-y-1">
                        <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-none uppercase tracking-tighter">Report Entry</h1>
                        <p className="text-slate-500 italic font-bold text-xs uppercase tracking-widest opacity-60">Biometric Clinical Analysis Interface</p>
                    </div>
                    <div className="text-right hidden md:block border-l pl-6 border-slate-200">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Active Specialist</p>
                        <p className="font-black text-slate-900 text-lg uppercase tracking-tighter">{labUser?.name}</p>
                    </div>
                </div>

                <div className="bg-white p-12 rounded-[3rem] shadow-sm border border-slate-100 max-w-5xl relative overflow-hidden group">
                    <div className="flex items-center gap-4 mb-10">
                        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-inner border border-blue-100">
                            <FlaskConical size={24} />
                        </div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Biometric Payload</h2>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Target Pathology</label>
                            <select className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-800 transition-all appearance-none cursor-pointer" value={reportData.disease} onChange={(e) => setReportData({ ...reportData, disease: e.target.value })}>
                                <option value="">Select diagnostic node</option>
                                <option value="diabetes">Diabetes Node</option>
                                <option value="liver">Liver Pathology</option>
                                <option value="cardiovascular">Cardiovascular Node</option>
                            </select>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Prescription Reference</label>
                            <input placeholder="Ex: RX-1002" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-800 transition-all" onChange={(e) => setReportData({ ...reportData, prescription_serial: e.target.value })} />
                        </div>
                    </div>

                    {reportData.disease && DISEASE_FEATURES[reportData.disease] && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-10 p-10 bg-slate-50/50 rounded-[2.5rem] border border-slate-100">
                            <div className="flex items-center gap-3 mb-8">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Required Vector Inputs</p>
                                <div className="h-px grow bg-slate-200" />
                            </div>
                            {/* --- UPDATED DYNAMIC INPUT GRID --- */}
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {DISEASE_FEATURES[reportData.disease].map((feature) => (
                                <div key={feature} className="space-y-1">
                                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                                    {formatFeatureLabel(feature)} {/* ✅ Changed from feature.replace */}
                                </label>
                                <input 
                                    placeholder={`Enter ${formatFeatureLabel(feature)}`} 
                                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm font-bold text-slate-700 transition-all shadow-sm" 
                                    onChange={(e) => setReportData({ ...reportData, [feature]: e.target.value })} 
                                />
                                </div>
                            ))}
                            </div>
                        </motion.div>
                    )}

                    <button onClick={handleSubmitReport} className="mt-12 w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:bg-blue-600 transition-all shadow-xl active:scale-95">
                        <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                        Compute Biometric Analysis
                    </button>
                </div>

                <AnimatePresence>
                {analysisResult && (
                    <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-12 max-w-4xl"
                    >
                    <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm relative overflow-hidden">

                        <div className="flex justify-between items-start mb-8">
                        <div>
                            <span className="px-3 py-1 text-[9px] font-black rounded-full border uppercase tracking-widest bg-blue-50 text-blue-600 border-blue-100">
                            Diagnostic Insight
                            </span>

                            <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter mt-3">
                            {analysisResult.disease}
                            </h3>
                        </div>

                        <div className="text-right">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                            Confidence Score
                            </p>
                            <p className="text-4xl font-black text-blue-600 font-mono tracking-tighter">
                            {analysisResult.prediction.confidence}%
                            </p>
                        </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                        <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
                            Neural Prediction
                            </p>
                            <p className="font-bold text-xl text-slate-800 flex items-center gap-2">
                            <ShieldCheck size={18} className="text-blue-500" />
                            {analysisResult.prediction.prediction}
                            </p>
                        </div>

                        <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
                            Future Risk Index
                            </p>
                            <p className="font-bold text-xl text-slate-800 flex items-center gap-2">
                            <Activity size={18} className="text-orange-500" />
                            {analysisResult.prediction.future_risk}%
                            </p>
                        </div>
                        </div>

                        <Database
                        size={160}
                        className="absolute -right-10 -bottom-10 opacity-[0.03] text-slate-900"
                        />
                    </div>
                    </motion.div>
                )}
                </AnimatePresence>
            </div>
            <Footer />
        </main>
      </div>
    </div>
  );
}

// --- REFINED SUB-COMPONENTS ---
const AuthInput = ({ icon, type = "text", placeholder, value, onChange }) => (
    <div className="relative group">
        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors">{icon}</div>
        <input type={type} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white font-medium transition-all shadow-inner" required />
    </div>
);

const SidebarLink = ({ icon, label, active, onClick }) => (
    <button onClick={onClick} className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all group ${active ? "bg-blue-600 text-white shadow-xl shadow-blue-900/40" : "hover:bg-slate-900 hover:text-white"}`}>
        <div className="flex items-center gap-4 font-bold text-sm">{icon}{label}</div>
        <ChevronRight size={14} className={`${active ? "opacity-100" : "opacity-0 group-hover:opacity-100 transition-opacity"}`} />
    </button>
);