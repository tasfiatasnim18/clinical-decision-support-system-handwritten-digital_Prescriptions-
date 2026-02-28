import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, ArrowRight, Sparkles, Activity, ShieldCheck, Microscope } from "lucide-react";

const slides = [
  {
    title: "AI-Powered Prescription Analysis",
    subtitle: "Transform handwritten notes into structured digital data instantly using advanced OCR and Clinical NER.",
    cta: "Start Analysis",
    icon: <Sparkles className="w-6 h-6" />,
    color: "blue",
    bg: "from-slate-900 via-blue-900 to-slate-900",
  },
  {
    title: "Disease Risk Prediction",
    subtitle: "Leverage state-of-the-art machine learning models to analyze patient vitals and identify early risk factors.",
    cta: "Check Risk",
    icon: <Activity className="w-6 h-6" />,
    color: "indigo",
    bg: "from-slate-900 via-indigo-900 to-slate-900",
  },
  {
    title: "Secure Medical Intelligence",
    subtitle: "Enterprise-grade security for patient data, processed with end-to-end encryption and stored in protected systems.",
    cta: "Security Overview",
    icon: <ShieldCheck className="w-6 h-6" />,
    color: "sky",
    bg: "from-slate-900 via-sky-900 to-slate-900",
  },
  {
    title: "Built for Clinical Excellence",
    subtitle: "A specialized ecosystem designed to empower doctors, researchers, and modern healthcare institutions.",
    cta: "Explore Platform",
    icon: <Microscope className="w-6 h-6" />,
    color: "cyan",
    bg: "from-slate-900 via-cyan-900 to-slate-900",
  },
];

export default function HeroSlider({ onAnalyzeClick }) {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(0);

  const nextSlide = useCallback(() => {
    setDirection(1);
    setIndex((prev) => (prev + 1) % slides.length);
  }, []);

  const prevSlide = () => {
    setDirection(-1);
    setIndex((prev) => (prev - 1 + slides.length) % slides.length);
  };

  useEffect(() => {
    const timer = setInterval(nextSlide, 6000);
    return () => clearInterval(timer);
  }, [nextSlide]);

  return (
    <section className="relative h-130.5 w-full overflow-hidden bg-slate-950 mt-16">
      {/* Abstract Background Elements */}
      <div className="absolute inset-0 z-0 opacity-30">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/20 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-500/20 blur-[120px]" />
      </div>

      <AnimatePresence initial={false} custom={direction}>
        <motion.div
          key={index}
          custom={direction}
          initial={{ opacity: 0, x: direction > 0 ? 100 : -100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: direction > 0 ? -100 : 100 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          className={`absolute inset-0 bg-gradient-to-br ${slides[index].bg} flex items-center`}
        >
          {/* Content Container */}
          <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-12 items-center z-10">
            <div className="text-left pl-12">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-blue-200 text-sm font-medium mb-6 backdrop-blur-md"
              >
                {slides[index].icon}
                <span className="tracking-wide uppercase text-xs">Medical AI Platform</span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-5xl md:text-7xl font-bold text-white leading-tight tracking-tight mb-6"
              >
                {slides[index].title}
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-slate-300 text-lg md:text-xl max-w-xl mb-10 leading-relaxed"
              >
                {slides[index].subtitle}
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="flex flex-wrap gap-4"
              >
                <button
                  onClick={onAnalyzeClick}
                  className="group relative px-8 py-4 bg-white text-slate-900 font-bold rounded-xl flex items-center gap-2 overflow-hidden transition-all hover:scale-105 active:scale-95"
                >
                  <span className="relative z-10">{slides[index].cta}</span>
                  <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                </button>
                
                <button className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-xl border border-white/10 transition-all backdrop-blur-sm">
                  Documentation
                </button>
              </motion.div>
            </div>

            {/* Right side visual (Optional: Add a 3D element or Image here) */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4, duration: 0.8 }}
              className="hidden md:block relative"
            >
                <div className="w-full h-100 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl flex items-center justify-center shadow-2xl overflow-hidden">
                    {/* Visual Placeholder for AI Graphics */}
                    <div className="absolute inset-0 bg-grid-white/[0.02] bg-size-[40px_40px]" />
                    <div className="relative p-12 text-center">
                         <div className={`w-24 h-24 rounded-3xl bg-${slides[index].color}-500/20 flex items-center justify-center mb-6 mx-auto border border-${slides[index].color}-500/30`}>
                            {React.cloneElement(slides[index].icon, { className: `w-12 h-12 text-${slides[index].color}-400` })}
                         </div>
                         <div className="h-2 w-48 bg-white/10 rounded-full mx-auto mb-3" />
                         <div className="h-2 w-32 bg-white/10 rounded-full mx-auto" />
                    </div>
                </div>
            </motion.div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation Arrows */}
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-6 z-30 pointer-events-none">
        <button onClick={prevSlide} className="p-3 rounded-full bg-black/20 hover:bg-black/40 text-white backdrop-blur-md border border-white/5 transition pointer-events-auto">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <button onClick={nextSlide} className="p-3 rounded-full bg-black/20 hover:bg-black/40 text-white backdrop-blur-md border border-white/5 transition pointer-events-auto">
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      {/* Progress Indicators */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex gap-3 z-30">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => {
              setDirection(i > index ? 1 : -1);
              setIndex(i);
            }}
            className="group relative h-2 transition-all"
          >
            <div className={`h-full rounded-full transition-all duration-500 ${i === index ? "w-12 bg-white" : "w-3 bg-white/30 group-hover:bg-white/50"}`} />
          </button>
        ))}
      </div>
    </section>
  );
}