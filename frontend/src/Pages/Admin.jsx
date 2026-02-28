import React, { useState, useEffect } from "react";
import axios from "axios";
import { useMemo } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  UserPlus, CheckCircle, XCircle, ClipboardList, 
  LayoutDashboard, LogOut, Settings, UserCog, 
  ShieldCheck, Activity, Users, Mail, Lock, Eye, EyeOff
} from "lucide-react";

// ---------- SHARED NAVBAR (Matching Home Design) ----------
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
            <Link
              key={m.path}
              to={m.path}
              className={`text-sm font-bold transition-all ${
                location.pathname.startsWith(m.path)
                  ? "text-blue-600"
                  : "text-slate-500 hover:text-blue-600"
              }`}
            >
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
    <div className="max-w-7xl mx-auto px-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">M</span>
            </div>
            <h2 className="text-white text-2xl font-bold tracking-tighter">MedAI</h2>
          </div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500 font-semibold">
            Intelligence for modern healthcare
          </p>
        </div>

        <div className="text-sm text-slate-500 font-medium">
          &copy; {new Date().getFullYear()} MedAI Research Lab.
        </div>
      </div>
    </div>
  </footer>
);

// ---------- ADMIN PORTAL ----------
export default function Admin() {
  // Auth State
  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Portal State
  const [activeTab, setActiveTab] = useState("dashboard");
  const [stats, setStats] = useState({ active_receptionists: 0, active_labs: 0, active_doctors: 0, active_patients: 0 });
  const [pending, setPending] = useState({ receptionists: [], labs: [], doctors: [], patients: [] });
  const [auditLogs, setAuditLogs] = useState([]);
  const [portalLoading, setPortalLoading] = useState(true);

  // Profile Edit State
  const [adminProfile, setAdminProfile] = useState({ email: "admin@medai.com", fullName: "System Administrator" });

  const navigate = useNavigate();
  const API = "http://localhost:8000/api/admin";
  const token = localStorage.getItem("admin_token");
  const headers = { Authorization: `Bearer ${token}` };

  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    setIsLoggedIn(false);
    navigate("/admin");
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post(`${API}/login`, { username: usernameOrEmail, password });
      localStorage.setItem("admin_token", res.data.access_token);
      setIsLoggedIn(true);
    } catch (err) {
      alert(err.response?.data?.detail || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const fetchAll = async () => {
    try {
      const [s, p, a] = await Promise.all([
        axios.get(`${API}/system_stats`, { headers }),
        axios.get(`${API}/pending`, { headers }),
        axios.get(`${API}/audit`, { headers }),
      ]);
      setStats(s.data);
      setPending(p.data);
      setAuditLogs(a.data);
      setPortalLoading(false);
    } catch (err) {
      if (err.response?.status === 401) {
        handleLogout();
      }
    }
  };

  useEffect(() => { if (token) setIsLoggedIn(true); }, [token]);
  useEffect(() => { if (isLoggedIn) fetchAll(); }, [isLoggedIn]);

  const handleApproval = async (userId, type, approve) => {
    try {
      const url = approve ? `/approve_${type}` : `/reject_${type}`;
      await axios.post(`${API}${url}`, { user_id: userId }, { headers });
      setPending(prev => ({
        ...prev,
        [type + "s"]: prev[type + "s"].filter(u => u.id !== userId)
      }));
      const s = await axios.get(`${API}/system_stats`, { headers });
      setStats(s.data);
    } catch (err) {
      alert("Action failed");
    }
  };

  
  const totalPending = useMemo(() => {
    return (
      (pending.receptionists?.length || 0) +
      (pending.doctors?.length || 0) +
      (pending.patients?.length || 0) +
      (pending.labs?.length || 0)
    );
  }, [pending]);


  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-50 font-sans">
        <Navbar />
        <div className="flex items-center justify-center min-h-screen pt-20 px-6">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md">
            <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl shadow-slate-200 border border-slate-100">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <ShieldCheck size={32} />
                </div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">Admin Access</h2>
                <p className="text-slate-500 text-sm mt-2">Enter credentials to manage MedAI</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1">
                  <div className="relative">
                    <UserCog className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="text"
                      placeholder="Username"
                      value={usernameOrEmail}
                      onChange={(e) => setUsernameOrEmail(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-12 pr-12 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                      required
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600">
                      {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-slate-900 hover:bg-blue-600 text-white rounded-2xl font-bold shadow-xl transition-all flex items-center justify-center gap-2 mt-4"
                >
                  {loading ? <Activity className="animate-spin" /> : "Login"}
                </button>
              </form>
            </div>
          </motion.div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar />
      <div className="flex grow pt-16">
        {/* SIDEBAR */}
        <aside className="w-72 bg-slate-950 text-slate-400 border-r border-slate-900 sticky top-16 max-h-[calc(100vh-64px)] flex flex-col overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700">
          <div className="mb-10 px-2 pt-4">
             <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500 mb-1">Secure Environment</p>
             <h2 className="text-white text-xl font-bold">Control Panel</h2>
          </div>

          <nav className="flex-1 space-y-2">
            <SidebarItem icon={<LayoutDashboard size={20} />} label="Dashboard" active={activeTab === "dashboard"} onClick={() => setActiveTab("dashboard")} />
            <SidebarItem 
              icon={<UserPlus size={20} />} 
              label="Pending Requests" 
              active={activeTab === "pending"} 
              onClick={() => setActiveTab("pending")}
              badge={totalPending}
            />
            <SidebarItem icon={<ClipboardList size={20} />} label="Audit Logs" active={activeTab === "audit"} onClick={() => setActiveTab("audit")} />
            <SidebarItem icon={<Settings size={20} />} label="Admin Profile" active={activeTab === "profile"} onClick={() => setActiveTab("profile")} />
          </nav>

          <div className="mt-auto pt-6 pb-4 border-t border-slate-900/50">
            <button 
              onClick={handleLogout}
              className="w-full flex items-center gap-3 p-4 bg-red-500/10 text-red-400 rounded-2xl font-bold hover:bg-red-500 hover:text-white transition-all group shadow-inner"
            >
              <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
              Logout Session
            </button>
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <main className="grow p-10 overflow-y-auto">
          <AnimatePresence mode="wait">
            {portalLoading ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 animate-pulse">
                <Activity size={40} className="mb-4" />
                <p className="font-bold tracking-widest uppercase text-xs">Synchronizing Core...</p>
              </div>
            ) : (
              <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                {/* Header Section */}
                <div className="mb-12 flex justify-between items-end">
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tight capitalize">{activeTab}</h1>
                        <p className="text-slate-500 mt-1">Management overview for MedAI systems.</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Admin Identity</p>
                        <p className="font-bold text-slate-900">{adminProfile.fullName}</p>
                    </div>
                </div>

                {activeTab === "dashboard" && (
                  <div className="space-y-10">
                    <div className="grid md:grid-cols-4 gap-8">
                      <StatCard title="Active Receptionists" value={stats.active_receptionists} icon={<Users className="text-blue-500" />} />
                      <StatCard 
                        title="Active Labs" 
                        value={stats.active_labs} 
                        icon={<ShieldCheck className="text-purple-500" />} 
                      />
                      <StatCard title="Active Doctors" value={stats.active_doctors} icon={<Activity className="text-indigo-500" />} />
                      <StatCard title="Active Patients" value={stats.active_patients} icon={<UserPlus className="text-emerald-500" />} />
                    </div>
                    <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-6">
                        <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
                            <ShieldCheck size={32} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-900">System Integrity: 100%</h3>
                            <p className="text-slate-500 text-sm">All medical nodes are operating within secure parameters.</p>
                        </div>
                    </div>
                  </div>
                )}

                {activeTab === "pending" && (
                  <div className="space-y-8">
                    <ApprovalSection title="Receptionist Queue" data={pending.receptionists} type="receptionist" onAction={handleApproval} />
                    <ApprovalSection 
                      title="Laboratory Assistants Queue" 
                      data={pending.labs} 
                      type="lab" 
                      onAction={handleApproval} 
                    />
                    <ApprovalSection title="Medical Doctors Queue" data={pending.doctors} type="doctor" onAction={handleApproval} />
                    <ApprovalSection title="Patient Onboarding" data={pending.patients} type="patient" onAction={handleApproval} />
                  </div>
                )}

                {activeTab === "audit" && <AuditTable logs={auditLogs} />}

                {activeTab === "profile" && (
                  <div className="max-w-2xl bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm">
                    <h3 className="text-2xl font-bold mb-8 flex items-center gap-3">
                        <Settings className="text-blue-600" />
                        Account Settings
                    </h3>
                    <div className="space-y-6">
                        <ProfileInput icon={<UserCog />} label="Full Name" value={adminProfile.fullName} onChange={(val) => setAdminProfile({...adminProfile, fullName: val})} />
                        <ProfileInput icon={<Mail />} label="Admin Email" value={adminProfile.email} onChange={(val) => setAdminProfile({...adminProfile, email: val})} />
                        <hr className="border-slate-100 my-8" />
                        <button className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl transition-all shadow-lg shadow-blue-100">
                            Save Changes
                        </button>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
      <Footer />
    </div>
  );
}

// ---------- HELPER COMPONENTS ----------

const SidebarItem = ({ icon, label, active, onClick, badge = 0 }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center justify-between px-4 py-4 rounded-2xl font-bold transition-all ${
      active 
        ? "bg-blue-600 text-white shadow-lg shadow-blue-900/40" 
        : "hover:bg-slate-900 hover:text-white"
    }`}
  >
    <div className="flex items-center gap-4">
      {icon}
      <span className="text-sm">{label}</span>
    </div>

    {badge > 0 && (
      <span className="min-w-[20px] h-5 px-2 flex items-center justify-center text-[10px] bg-red-500 text-white rounded-full font-black">
        {badge}
      </span>
    )}
  </button>
);

const StatCard = ({ title, value, icon }) => (
  <div className="bg-white p-8 rounded-4xl shadow-sm border border-slate-100 relative overflow-hidden group">
    <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform">
        {React.cloneElement(icon, { size: 60 })}
    </div>
    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{title}</p>
    <p className="text-4xl font-black text-slate-900">{value}</p>
  </div>
);

const ApprovalSection = ({ title, data, type, onAction }) => (
  <div className="bg-white rounded-4xl border border-slate-100 shadow-sm overflow-hidden">
    <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
        <h4 className="font-bold text-slate-800">{title}</h4>
        <span className="px-3 py-1 bg-white rounded-full text-[10px] font-black text-blue-600 border border-slate-200 uppercase">
            {data?.length || 0} Pending
        </span>
    </div>
    <div className="divide-y divide-slate-50">
      {(data || []).map((u) => (
        <div key={u.id} className="flex justify-between items-center p-6 hover:bg-slate-50/50 transition-colors">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 font-bold uppercase">
                {u.full_name?.charAt(0)}
            </div>
            <div>
              <p className="font-bold text-slate-900 leading-none">{u.full_name}</p>
              <p className="text-xs text-slate-400 mt-1 font-mono tracking-tighter">@{u.username}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => onAction(u.id, type, true)} className="p-3 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm">
              <CheckCircle size={20} />
            </button>
            <button onClick={() => onAction(u.id, type, false)} className="p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all shadow-sm">
              <XCircle size={20} />
            </button>
          </div>
        </div>
      ))}
      {data?.length === 0 && <div className="p-10 text-slate-400 text-center text-sm font-medium italic">All caught up! No requests.</div>}
    </div>
  </div>
);

const AuditTable = ({ logs }) => (
  <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
    <div className="p-6 border-b border-slate-100 font-bold text-slate-800 flex items-center gap-2">
        <ClipboardList size={18} className="text-blue-500" />
        Full Audit Trail
    </div>
    <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-widest">
            <tr>
                <th className="p-6">Timestamp</th>
                <th className="p-6">Action</th>
                <th className="p-6">Entity Details</th>
            </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
            {(logs || []).map((l, i) => (
            <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                <td className="p-6 text-slate-500 font-mono text-xs">{new Date(l.created_at).toLocaleString()}</td>
                <td className="p-6">
                    <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-lg text-[10px] font-bold uppercase tracking-tight">
                        {l.action_type}
                    </span>
                </td>
                <td className="p-6 font-medium text-slate-900">{renderEntityDetails(l)}</td>
            </tr>
            ))}
        </tbody>
        </table>
    </div>
  </div>
);

const ProfileInput = ({ icon, label, value, onChange }) => (
    <div className="space-y-2">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
        <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300">
                {icon}
            </div>
            <input 
                type="text" 
                value={value} 
                onChange={(e) => onChange(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-800"
            />
        </div>
    </div>
)

const renderEntityDetails = (log) => {
  if (log.target_role && log.target_id) {
    return `${log.target_role.toUpperCase()} #${log.target_id}`;
  }
  return log.action_details || "—";
};
