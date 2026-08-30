import React, { useState, useEffect } from 'react';
import { AlertTriangle, ShieldAlert, Cpu, Activity, BarChart3, CheckCircle2, Home } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { NavigationRole } from '../types';
import { ThemeToggle } from './ThemeToggle';
import { useTheme } from '../context/ThemeContext';
import { apiFetch } from '../config/api';

interface Props {
  onNavigate: (role: NavigationRole) => void;
}

export const ErrorAnalysisPage: React.FC<Props> = ({ onNavigate }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const gridColor = isDark ? '#334155' : '#cbd5e1';
  const axisColor = isDark ? '#94a3b8' : '#475569';
  const tooltipStyle = {
    backgroundColor: isDark ? '#0f172a' : '#ffffff',
    borderColor: isDark ? '#334155' : '#cbd5e1',
    color: isDark ? '#f8fafc' : '#0f172a',
    borderRadius: '12px',
    boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
    fontWeight: 600
  };
  const [errorData, setErrorData] = useState<any>(null);

  useEffect(() => {
    apiFetch('/error-analysis')
      .then(data => setErrorData(data))
      .catch(err => console.error("Error analysis fetch error", err));
  }, []);

  const chartData = errorData ? [
    { category: 'Missing Records', count: errorData.data_quality_issues.missing_sensor_records },
    { category: 'Imputed Records', count: errorData.data_quality_issues.imputed_records },
    { category: 'Noisy Obs', count: errorData.data_quality_issues.noisy_sensor_observations },
    { category: 'Expired Calib', count: errorData.operational_errors.expired_calibrations },
    { category: 'Route Delays', count: errorData.operational_errors.route_delays },
    { category: 'Unsafe Workloads', count: errorData.operational_errors.unsafe_worker_workloads },
  ] : [];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 flex flex-col transition-colors duration-300 relative overflow-hidden select-none">
      
      {/* Liquid Glass Ambient Glows */}
      <div className="absolute top-10 left-1/4 w-96 h-96 bg-rose-500/10 dark:bg-rose-500/15 rounded-full blur-[100px] pointer-events-none pulse-glow" />
      <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-cyan-500/10 dark:bg-cyan-500/15 rounded-full blur-[100px] pointer-events-none pulse-glow" style={{ animationDelay: '3s' }} />

      {/* Header */}
      <header className="bg-white/90 dark:bg-slate-900/80 border-b border-slate-200/80 dark:border-slate-800/80 sticky top-0 z-30 backdrop-blur-xl shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => onNavigate('LANDING')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/90 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer text-xs font-bold shadow-xs"
            >
              <Home className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
              <span>← Back to Home</span>
            </button>
            <div>
              <h1 className="text-lg font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                ERROR ANALYSIS & ANOMALY BREAKDOWN
                <span className="px-2.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 text-xs font-black border border-rose-300 dark:border-rose-500/30">
                  Data Quality & Edge Cases
                </span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Quantitative breakdown of false alerts, imputed records, and operational exceptions</p>
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
        
        {/* Error Category Breakdown Chart */}
        {errorData && (
          <div className="glass-panel p-6 sm:p-8 rounded-2xl space-y-4 shadow-xl">
            <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-rose-500" />
              SYSTEM ERROR & DATA EXCEPTION DISTRIBUTION
            </h2>

            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                  <XAxis dataKey="category" stroke={axisColor} fontSize={11} fontWeight={600} />
                  <YAxis stroke={axisColor} fontSize={11} fontWeight={600} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="count" fill="#be123c" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Detailed Metrics Tables */}
        {errorData && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
            
            {/* Data Quality */}
            <div className="glass-panel p-6 rounded-2xl space-y-3 shadow-md">
              <h3 className="font-black text-cyan-700 dark:text-cyan-400 uppercase tracking-wider text-sm">Telemetry Data Quality</h3>
              <div className="space-y-2.5 font-medium">
                <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Missing Records:</span> <span className="font-mono text-cyan-700 dark:text-cyan-300 font-bold">{errorData.data_quality_issues.missing_sensor_records}</span></div>
                <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Imputed Logs:</span> <span className="font-mono text-cyan-700 dark:text-cyan-300 font-bold">{errorData.data_quality_issues.imputed_records}</span></div>
                <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Noisy Obs:</span> <span className="font-mono text-amber-700 dark:text-amber-300 font-bold">{errorData.data_quality_issues.noisy_sensor_observations}</span></div>
              </div>
            </div>

            {/* Operational Errors */}
            <div className="glass-panel p-6 rounded-2xl space-y-3 shadow-md">
              <h3 className="font-black text-amber-700 dark:text-amber-400 uppercase tracking-wider text-sm">Operational & Safety Errors</h3>
              <div className="space-y-2.5 font-medium">
                <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Expired Calibrations:</span> <span className="font-mono text-amber-700 dark:text-amber-300 font-bold">{errorData.operational_errors.expired_calibrations}</span></div>
                <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Route Checkpoint Delays:</span> <span className="font-mono text-amber-700 dark:text-amber-300 font-bold">{errorData.operational_errors.route_delays}</span></div>
                <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Unsafe Driver Workloads:</span> <span className="font-mono text-rose-700 dark:text-rose-400 font-bold">{errorData.operational_errors.unsafe_worker_workloads}</span></div>
              </div>
            </div>

            {/* ML Classification Errors */}
            <div className="glass-panel p-6 rounded-2xl space-y-3 shadow-md">
              <h3 className="font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-wider text-sm">ML Classification Evaluation</h3>
              <div className="space-y-2.5 font-medium">
                <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">False Positives (FP):</span> <span className="font-mono text-emerald-700 dark:text-emerald-400 font-bold">{errorData.ml_confusion_matrix.false_positives}</span></div>
                <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">False Negatives (FN):</span> <span className="font-mono text-emerald-700 dark:text-emerald-400 font-bold">{errorData.ml_confusion_matrix.false_negatives}</span></div>
                <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Overall F1 Score:</span> <span className="font-mono font-black text-emerald-700 dark:text-emerald-300 text-sm">{errorData.ml_confusion_matrix.f1_score}</span></div>
              </div>
            </div>

          </div>
        )}
      </main>
    </div>
  );
};
