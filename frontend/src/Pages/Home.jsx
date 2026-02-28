import React, { useRef } from "react";
import { motion } from "framer-motion";
import { 
  ShieldCheck, 
  BookOpen, 
  CheckCircle2, 
  Lock, 
  ArrowDownCircle 
} from "lucide-react";

import Prescription4all from "../components/Prescription4all";
import Navbar from "../components/Navbar";
import HeroSlider from "../components/HeroSlider";

export default function Home() {
  const uploadRef = useRef(null);

  const scrollToUpload = () => {
    uploadRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* Navigation Bar */}
      <Navbar />

      {/* Hero Slider */}
      <HeroSlider onAnalyzeClick={scrollToUpload} />

      {/* Main Content Area */}
      <main
        ref={uploadRef}
        className="grow container mx-auto px-6 pt-24 pb-32"
      >
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="flex flex-col lg:flex-row gap-12"
        >
          {/* Main Upload Column */}
          <div className="lg:w-3/4">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
                <span className="w-1.5 h-8 bg-blue-600 rounded-full" />
                Prescription Analysis Engine
              </h2>
              <p className="text-slate-500 mt-2 text-lg">
                Upload your medical documents for instant digitization and risk assessment.
              </p>
            </div>
            
            <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-100 overflow-hidden">
              <Prescription4all />
            </div>
          </div>

          {/* Sidebar / Quick Instructions */}
          <div className="lg:w-1/4 space-y-8">
            {/* Guide Card */}
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <BookOpen size={80} />
              </div>
              
              <h4 className="font-bold text-slate-800 mb-6 flex items-center gap-3">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                  <BookOpen size={20} />
                </div>
                Usage Guide
              </h4>

              <ul className="space-y-5">
                {[
                  { id: "01", text: "Upload a high-resolution scan or photo." },
                  { id: "02", text: "Ensure vitals (BP, Glucose) are visible." },
                  { id: "03", text: "Review extracted data for accuracy." }
                ].map((step) => (
                  <li key={step.id} className="flex gap-4 items-start">
                    <span className="text-xs font-black text-blue-200 mt-1">{step.id}</span>
                    <p className="text-sm text-slate-600 leading-relaxed font-medium">
                      {step.text}
                    </p>
                  </li>
                ))}
              </ul>
            </div>

            {/* Privacy Card */}
            <div className="bg-slate-900 p-8 rounded-3xl shadow-2xl relative overflow-hidden">
                {/* Decorative Glow */}
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500/20 blur-[80px]" />
              
              <h4 className="font-bold text-white mb-4 flex items-center gap-3">
                <ShieldCheck size={20} className="text-blue-400" />
                Secure Processing
              </h4>
              <p className="text-sm text-slate-400 leading-relaxed mb-6">
                Your health data is protected by industry-standard encryption. We utilize a secure MySQL environment for local record tracking.
              </p>
              
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-blue-400 bg-blue-400/10 w-fit px-3 py-1 rounded-full border border-blue-400/20">
                <Lock size={12} />
                HIPAA Compliant Protocol
              </div>
            </div>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
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
    </div>
  );
}