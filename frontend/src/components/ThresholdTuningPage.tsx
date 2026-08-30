import React, { useState, useEffect } from 'react';
import { Sliders, RefreshCw, CheckCircle2, AlertTriangle, ShieldCheck, Activity, Home } from 'lucide-react';
import { NavigationRole } from '../types';
import { ThemeToggle } from './ThemeToggle';
import { apiFetch } from '../config/api';

interface Props {
  onNavigate: (role: NavigationRole) => void;
}

export const ThresholdTuningPage: React.FC<Props> = ({ onNavigate }) => {
  const [warningThreshold, setWarningThreshold] = useState<number>(2.0);
  const [criticalThreshold, setCriticalThreshold] = useState<number>(5.0);
  const [delayThreshold, setDelayThreshold] = useState<number>(60);
  
  const [tuningResults, setTuningResults] = useState<any>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  useEffect(() => {
    runTuningExperiment(2.0, 5.0, 60);
  }, []);

  const runTuningExperiment = async (w: number, c: number, d: number) => {
    setIsCalculating(true);
    try {
      const res = await apiFetch('/experiments/threshold-tuning', {
        method: 'POST',
        body: JSON.stringify({
          temp_warning_threshold: w,
          temp_critical_threshold: c,
          max_allowed_delay_mins: d
        })
      });
      setTuningResults(res);
    } catch (err) {
      console.error("Tuning experiment error", err);
    } finally {
      setIsCalculating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 flex flex-col transition-colors duration-300 relative overflow-hidden select-none">
      
      {/* Liquid Glass Ambient Glows */}
      <div className="absolute top-10 right-1/4 w-96 h-96 bg-amber-500/10 dark:bg-amber-500/15 rounded-full blur-[100px] pointer-events-none pulse-glow" />
      <div className="absolute bottom-10 left-1/4 w-96 h-96 bg-cyan-500/10 dark:bg-cyan-500/15 rounded-full blur-[100px] pointer-events-none pulse-glow" style={{ animationDelay: '3s' }} />

      {/* Header */}
      <header className="bg-white/90 dark:bg-slate-900/80 border-b border-slate-200/80 dark:border-slate-800/80 sticky top-0 z-30 backdrop-blur-xl shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => onNavigate('LANDING')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/90 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer text-xs font-bold shadow-xs"
            >
              <Home className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>← Back to Home</span>
            </button>
            <div>
              <h1 className="text-lg font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                ALERT THRESHOLD TUNING & CONFUSION MATRIX
                <span className="px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-xs font-black border border-amber-300 dark:border-amber-500/30">
                  Precision / Recall Optimization
                </span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Dynamically recalibrate compliance alert sensitivity and evaluate F1 score</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button
              onClick={() => onNavigate('COMPLIANCE')}
              className="px-3.5 py-1.5 bg-emerald-50 dark:bg-emerald-600/20 hover:bg-emerald-100 dark:hover:bg-emerald-600/30 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/40 rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-xs"
            >
              ← Compliance Hub
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto w-full p-4 sm:p-6 flex-1 space-y-6 z-10 anim-fade-up">
        
        {/* Sliders Control Panel */}
        <div className="glass-card p-6 sm:p-8 rounded-2xl border border-amber-500/30 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Sliders className="w-5 h-5 text-amber-500" />
              CONFIGURABLE COMPLIANCE THRESHOLDS
            </h2>
            {isCalculating && (
              <span className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5 font-bold">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Recalculating...
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Warning Temp Slider */}
            <div className="space-y-2.5 bg-slate-100/80 dark:bg-slate-900/80 p-5 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-700 dark:text-slate-300">Warning Temp Offset:</span>
                <span className="text-amber-700 dark:text-amber-400 font-mono text-sm">+{warningThreshold.toFixed(1)}°C</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="5.0"
                step="0.1"
                value={warningThreshold}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setWarningThreshold(val);
                  runTuningExperiment(val, criticalThreshold, delayThreshold);
                }}
                className="w-full accent-amber-500 cursor-pointer"
              />
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Triggers WARNING status above product max temp</p>
            </div>

            {/* Critical Temp Slider */}
            <div className="space-y-2.5 bg-slate-100/80 dark:bg-slate-900/80 p-5 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-700 dark:text-slate-300">Critical Breach Offset:</span>
                <span className="text-rose-700 dark:text-rose-400 font-mono text-sm">+{criticalThreshold.toFixed(1)}°C</span>
              </div>
              <input
                type="range"
                min="2.0"
                max="10.0"
                step="0.5"
                value={criticalThreshold}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setCriticalThreshold(val);
                  runTuningExperiment(warningThreshold, val, delayThreshold);
                }}
                className="w-full accent-rose-500 cursor-pointer"
              />
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Triggers CRITICAL status and physical audit quarantine</p>
            </div>

            {/* Delay Threshold */}
            <div className="space-y-2.5 bg-slate-100/80 dark:bg-slate-900/80 p-5 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-700 dark:text-slate-300">Max Allowed Route Delay:</span>
                <span className="text-cyan-700 dark:text-cyan-400 font-mono text-sm">{delayThreshold} mins</span>
              </div>
              <input
                type="range"
                min="15"
                max="180"
                step="15"
                value={delayThreshold}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  setDelayThreshold(val);
                  runTuningExperiment(warningThreshold, criticalThreshold, val);
                }}
                className="w-full accent-cyan-500 cursor-pointer"
              />
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Triggers route exception alert if delay exceeds threshold</p>
            </div>
          </div>
        </div>

        {/* Experiment Results: Default vs Tuned Metrics Comparison */}
        {tuningResults && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* DEFAULT THRESHOLD */}
            <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
              <h3 className="text-sm font-black text-slate-700 dark:text-slate-400 uppercase tracking-wider">
                DEFAULT THRESHOLD METRICS (STRICT +0.5°C)
              </h3>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-100 dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800"><span className="text-slate-500 dark:text-slate-400 block font-medium">False Positives (FP):</span> <span className="font-black text-rose-700 dark:text-rose-400 text-lg">{tuningResults.default_threshold.fp}</span></div>
                <div className="bg-slate-100 dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800"><span className="text-slate-500 dark:text-slate-400 block font-medium">False Negatives (FN):</span> <span className="font-black text-rose-700 dark:text-rose-400 text-lg">{tuningResults.default_threshold.fn}</span></div>
                <div className="bg-slate-100 dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800"><span className="text-slate-500 dark:text-slate-400 block font-medium">Precision:</span> <span className="font-mono text-cyan-700 dark:text-cyan-300 text-lg font-bold">{(tuningResults.default_threshold.precision * 100).toFixed(1)}%</span></div>
                <div className="bg-slate-100 dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800"><span className="text-slate-500 dark:text-slate-400 block font-medium">Recall:</span> <span className="font-mono text-cyan-700 dark:text-cyan-300 text-lg font-bold">{(tuningResults.default_threshold.recall * 100).toFixed(1)}%</span></div>
                <div className="bg-slate-100 dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 col-span-2"><span className="text-slate-500 dark:text-slate-400 block font-medium">F1 Score:</span> <span className="font-black text-amber-700 dark:text-amber-300 text-xl">{tuningResults.default_threshold.f1_score.toFixed(3)}</span></div>
              </div>
            </div>

            {/* TUNED THRESHOLD */}
            <div className="glass-panel p-6 rounded-2xl border-2 border-amber-500/40 space-y-4 shadow-lg">
              <h3 className="text-sm font-black text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                TUNED THRESHOLD METRICS (DYNAMIC OFFSETS)
              </h3>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-100 dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800"><span className="text-slate-500 dark:text-slate-400 block font-medium">False Positives (FP):</span> <span className="font-black text-emerald-700 dark:text-emerald-400 text-lg">{tuningResults.tuned_threshold.fp}</span></div>
                <div className="bg-slate-100 dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800"><span className="text-slate-500 dark:text-slate-400 block font-medium">False Negatives (FN):</span> <span className="font-black text-emerald-700 dark:text-emerald-400 text-lg">{tuningResults.tuned_threshold.fn}</span></div>
                <div className="bg-slate-100 dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800"><span className="text-slate-500 dark:text-slate-400 block font-medium">Precision:</span> <span className="font-mono text-emerald-700 dark:text-emerald-300 text-lg font-bold">{(tuningResults.tuned_threshold.precision * 100).toFixed(1)}%</span></div>
                <div className="bg-slate-100 dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800"><span className="text-slate-500 dark:text-slate-400 block font-medium">Recall:</span> <span className="font-mono text-emerald-700 dark:text-emerald-300 text-lg font-bold">{(tuningResults.tuned_threshold.recall * 100).toFixed(1)}%</span></div>
                <div className="bg-slate-100 dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 col-span-2"><span className="text-slate-500 dark:text-slate-400 block font-medium">F1 Score:</span> <span className="font-black text-emerald-700 dark:text-emerald-400 text-xl">{tuningResults.tuned_threshold.f1_score.toFixed(3)}</span></div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
