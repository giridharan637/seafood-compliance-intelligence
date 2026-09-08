import React from 'react';
import { FileText, ShieldCheck, Cpu, Database, GitMerge, Activity, Server, Layers, Home, CheckCircle2 } from 'lucide-react';
import { NavigationRole } from '../types';
import { ThemeToggle } from './ThemeToggle';

interface Props {
  onNavigate: (role: NavigationRole) => void;
}

export const TechnicalDocsPage: React.FC<Props> = ({ onNavigate }) => {
  const sections = [
    { title: "1. Problem Statement", content: "Seafood cold-chain exporters currently aggregate disconnected manual logs across temperature sensors, ISO calibrations, batch logs, custody handovers, route checkpoints, and driver shifts. This causes high reporting effort, missing evidence, transcription errors, unflagged thermal anomalies, and audit delays." },
    { title: "2. System Objectives", content: "Automate joining of all 9 operational schema entities into a 1-click Evidence Pack and Audit Report, reduce report preparation effort by ≥60%, detect thermal anomalies via Scikit-Learn ML models, and enforce mandatory driver workload safety constraints." },
    { title: "3. System Architecture", content: "Frontend: React + TypeScript + Vite + Recharts + Tailwind CSS. Backend: Python FastAPI + Scikit-Learn (Isolation Forest & Random Forest). Database: SQLite relational database engine with 9 interconnected tables." },
    { title: "4. Data Flow Pipeline", content: "IoT Multi-Sensor Logs & Field Handovers → Preprocessing (Missing Fill & Rolling Noise Filter) → Isolation Forest Anomaly Scoring & Random Forest Risk Prediction → Relational Storage → 1-Click Evidence Pack Generator." },
    { title: "5. Relational Dataset Structure", content: "Contains 9 interconnected schema tables: product_batches, shipments, sensors, sensor_logs, sensor_calibrations, handover_records, route_events, worker_logs, compliance_events, ml_predictions, user_feedback." },
    { title: "6. ML Methodology", content: "Isolation Forest for unsupervised sensor log anomaly scoring based on temperature, rolling z-score, and battery status. Random Forest Classifier for shipment risk classification (LOW, MEDIUM, HIGH)." },
    { title: "7. Data Preprocessing", content: "Detects missing telemetry gaps, performs forward/backward-fill linear interpolation, flags is_imputed=1, and calculates rolling statistics Z-score to filter noise without deleting raw logs." },
    { title: "8. Missing Data Handling", content: "Missing sensor entries are imputed and preserved with original vs imputed temperature tracking. Never hides missing observations silently." },
    { title: "9. Noisy Data Handling", content: "Rolling Z-score outlier detection distinguishes true continuous thermal breaches from brief sensor communication electrical noise spikes." },
    { title: "10. Alert Threshold Tuning", content: "Provides configurable warning and critical temperature offsets, delay thresholds, and evaluates Precision, Recall, and F1 score across tuned vs default thresholds." },
    { title: "11. Store-and-Forward Fallback", content: "When network connection fails, system switches to OFFLINE mode, buffers new logs locally, and automatically syncs pending records upon network recovery." },
    { title: "12. Worker Safety Constraints", content: "Enforces max 8.0 driving hrs/day, min 10.0 hrs rest, and max 2 active assignments. Blocks unsafe driver assignments with banner 'UNSAFE ASSIGNMENT – REASSIGN REQUIRED'." },
    { title: "13. Failure Mode Analysis", content: "5 dedicated interactive test cases: Missing Sensor Telemetry, Sensor Noise / Spike, Network Failure & Store-and-Forward, Expired ISO Calibration, Unsafe Driver Assignment." },
    { title: "14. Experiment Methodology", content: "Baseline (Manual) vs Proposed System empirical study comparing report preparation time, manual steps, error rates, and completeness on active dataset." },
    { title: "15. Evaluation Metrics", content: "Empirically measured via /api/experiments endpoints: preparation time reduction vs manual baseline, dynamic evidence completeness score, dynamic confusion matrix (Precision, Recall, F1 score), and SHA-256 evidence integrity validation." },
    { title: "16. Limitations", content: "Current implementation uses SQLite; production scale out targets PostgreSQL with Kafka telemetry streaming." },
    { title: "17. Future Enhancements", content: "Integration with blockchain smart contracts for immutable customs evidence verification and satellite IoT mesh connectivity." },
    { title: "18. Project Evaluation Requirements", content: "Fully functional COE capstone project meeting all 20 evaluation criteria including 10,000+ generated records, ML pipeline, and audit report exporter." },
    { title: "19. Success Criteria", content: "Demonstrates that an automated ML-powered system can join disconnected seafood shipment records and produce complete audit reports with sub-second generation time while enforcing safety and store-and-forward resilience." },
    { title: "20. System Verification", content: "Empirically verified via FastAPI backend test endpoints and end-to-end user workflows." }
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 flex flex-col transition-colors duration-300 relative overflow-hidden select-none">
      
      {/* Liquid Glass Ambient Glows */}
      <div className="absolute top-10 right-1/4 w-96 h-96 bg-sky-500/10 dark:bg-sky-500/15 rounded-full blur-[100px] pointer-events-none pulse-glow" />
      <div className="absolute bottom-10 left-1/4 w-96 h-96 bg-cyan-500/10 dark:bg-cyan-500/15 rounded-full blur-[100px] pointer-events-none pulse-glow" style={{ animationDelay: '3s' }} />

      {/* Header */}
      <header className="bg-white/90 dark:bg-slate-900/80 border-b border-slate-200/80 dark:border-slate-800/80 sticky top-0 z-30 backdrop-blur-xl shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => onNavigate('LANDING')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/90 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer text-xs font-bold shadow-xs"
            >
              <Home className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
              <span>← Back to Home</span>
            </button>
            <div>
              <h1 className="text-lg font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                TECHNICAL SYSTEM DOCUMENTATION
                <span className="px-2.5 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 text-xs font-black border border-sky-300 dark:border-sky-500/30">
                  20-Point Specification
                </span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Complete System Architecture, Data Flow, ML Pipelines & Metrics</p>
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sections.map((sec, idx) => (
            <div key={idx} className="glass-panel p-5 sm:p-6 rounded-2xl space-y-2 hover:border-sky-500/50 transition-all shadow-md group hover:-translate-y-0.5">
              <h3 className="text-sm font-black text-sky-700 dark:text-sky-400 uppercase tracking-wider flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-sky-500 shrink-0" />
                <span>{sec.title}</span>
              </h3>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium pl-6">
                {sec.content}
              </p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};
