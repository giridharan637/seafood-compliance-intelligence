import React, { useState } from 'react';
import { 
  ShieldAlert, WifiOff, Cpu, UserX, AlertTriangle, ArrowRight, 
  CheckCircle2, RefreshCw, Activity, Layers, Anchor, Home, Play,
  Database, FileCheck2, Clock, TrendingDown
} from 'lucide-react';
import { NavigationRole } from '../types';
import { ThemeToggle } from './ThemeToggle';
import { apiFetch } from '../config/api';

interface Props {
  onNavigate: (role: NavigationRole) => void;
}

export const FailureModesPage: React.FC<Props> = ({ onNavigate }) => {
  const [activeCase, setActiveCase] = useState<number>(1);
  const [simulationState, setSimulationState] = useState<string>('IDLE');
  const [simOutput, setSimOutput] = useState<any>(null);
  const [simError, setSimError] = useState<string | null>(null);

  const failureCases = [
    {
      id: 1,
      title: "Failure Case 1: Missing Sensor Telemetry Data",
      subtitle: "Detection → Imputation Flagging → Audit Evidence Inclusion",
      description: "Intermittent cellular coverage during ocean highway transit causes missing 15-minute sensor log entries.",
      expected: "System detects gap, calculates missing %, performs forward-fill imputation, sets is_imputed=1, and preserves raw audit evidence without silently dropping rows.",
      severity: "WARNING",
      icon: <WifiOff className="w-5 h-5" />,
      color: "amber"
    },
    {
      id: 2,
      title: "Failure Case 2: Sensor Noise & Sudden Thermal Spikes",
      subtitle: "Rolling Outlier Filter → Isolation Forest Anomaly → Thermal Breach Alert",
      description: "Compressor failure or sensor noise causes temperature to spike from 1.5°C to +8.4°C for 45 minutes.",
      expected: "Z-score rolling statistics flag noise vs true excursion, Isolation Forest generates anomaly score (0.94), and system issues CRITICAL compliance event alert.",
      severity: "CRITICAL",
      icon: <Activity className="w-5 h-5" />,
      color: "rose"
    },
    {
      id: 3,
      title: "Failure Case 3: Network Failure & Offline Fallback",
      subtitle: "Store-and-Forward Buffer → Zero Data Loss → Auto-Sync on Connection Recovery",
      description: "Complete port terminal cellular blackout disconnects IoT multi-sensor gateway from central API.",
      expected: "System switches to 'OFFLINE / Store-and-Forward' mode, buffers telemetry locally, and automatically synchronizes all pending records on reconnection.",
      severity: "BUFFERED",
      icon: <Database className="w-5 h-5" />,
      color: "cyan"
    },
    {
      id: 4,
      title: "Failure Case 4: Expired Sensor Calibration",
      subtitle: "ISO 17025 Validity Audit → Hardware Warning Alert → Quality Quarantine",
      description: "Sensor SNS-1004 exceeded its mandatory 90-day ISO calibration window prior to dispatch.",
      expected: "System flags sensor status as 'EXPIRED', generates hardware compliance warning, and flags entire batch for secondary physical quality audit.",
      severity: "ACTION_REQUIRED",
      icon: <Cpu className="w-5 h-5" />,
      color: "orange"
    },
    {
      id: 5,
      title: "Failure Case 5: Unsafe Driver Workload Assignment",
      subtitle: "Safety Constraint Engine → Hard Assignment Block → Reassignment Alert",
      description: "Operations staff attempts to assign driver DRV-103 who already worked 10.5 hours with only 5.5 hours rest.",
      expected: "System calculates workload score (0.95), displays banner 'UNSAFE ASSIGNMENT – REASSIGN REQUIRED', and blocks confirmation submission.",
      severity: "BLOCKED",
      icon: <UserX className="w-5 h-5" />,
      color: "red"
    }
  ];

  const handleRunSimulation = async (caseId: number) => {
    setSimulationState('RUNNING');
    setSimOutput(null);
    setSimError(null);

    try {
      const result = await apiFetch(`/failure-cases/${caseId}`, { method: 'POST' });
      setSimOutput(result);
      setSimulationState('COMPLETE');
    } catch (err: any) {
      setSimError(err?.message || 'Failed to execute failure case. Is the backend running?');
      setSimulationState('ERROR');
    }
  };

  const currentCase = failureCases.find(c => c.id === activeCase) || failureCases[0];

  const severityBadgeColors: Record<string, string> = {
    WARNING: 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-500/40',
    CRITICAL: 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-500/40',
    BUFFERED: 'bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-300 border-cyan-300 dark:border-cyan-500/40',
    ACTION_REQUIRED: 'bg-orange-100 dark:bg-orange-950 text-orange-800 dark:text-orange-300 border-orange-300 dark:border-orange-500/40',
    BLOCKED: 'bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300 border-red-300 dark:border-red-500/40',
  };

  // FMEA Matrix data
  const fmeaMatrix = [
    { case: 'Missing Telemetry', severity: 'HIGH', likelihood: 'MEDIUM', detection: 'AUTOMATED', mitigation: 'Forward-fill imputation', fallback: 'Audit flag + ISO tagging' },
    { case: 'Sensor Noise Spike', severity: 'CRITICAL', likelihood: 'MEDIUM', detection: 'AUTOMATED', mitigation: 'Rolling Z-score filter', fallback: 'Quarantine + physical inspection' },
    { case: 'Network Outage', severity: 'HIGH', likelihood: 'LOW', detection: 'AUTOMATED', mitigation: 'Store & Forward buffer', fallback: 'Zero data loss + sync on restore' },
    { case: 'Expired Calibration', severity: 'HIGH', likelihood: 'MEDIUM', detection: 'AUTOMATED', mitigation: 'Pre-dispatch ISO check', fallback: 'Mandatory sensor replacement' },
    { case: 'Unsafe Assignment', severity: 'CRITICAL', likelihood: 'MEDIUM', detection: 'AUTOMATED', mitigation: 'Workload safety engine', fallback: 'Hard block + reassignment alert' },
  ];

  const sevColor = (s: string) => s === 'CRITICAL' ? 'text-rose-600 dark:text-rose-400 font-black' : s === 'HIGH' ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-slate-500';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 flex flex-col transition-colors duration-300 relative overflow-hidden select-none">
      
      {/* Liquid Glass Ambient Glows */}
      <div className="absolute top-12 right-1/4 w-96 h-96 bg-rose-500/10 dark:bg-rose-500/15 rounded-full blur-[100px] pointer-events-none pulse-glow" />
      <div className="absolute bottom-12 left-1/4 w-96 h-96 bg-cyan-500/10 dark:bg-cyan-500/15 rounded-full blur-[100px] pointer-events-none pulse-glow" style={{ animationDelay: '3s' }} />

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
                FAILURE MODE ANALYSIS MODULE
                <span className="px-2.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 text-xs font-black border border-rose-300 dark:border-rose-500/30">
                  5 Mandatory Test Cases
                </span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">System Resilience & Automated Exception Handling Demonstrations • Live Backend Execution</p>
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

      {/* Main Container */}
      <main className="max-w-7xl mx-auto w-full p-4 sm:p-6 flex-1 space-y-6 z-10 anim-fade-up">
        
        {/* Case Navigation Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          {failureCases.map(c => (
            <button
              key={c.id}
              onClick={() => {
                setActiveCase(c.id);
                setSimulationState('IDLE');
                setSimOutput(null);
                setSimError(null);
              }}
              className={`p-4 rounded-xl text-left border transition-all duration-200 cursor-pointer shadow-xs ${
                activeCase === c.id 
                  ? 'bg-rose-500/15 dark:bg-rose-950/80 border-rose-500 text-slate-900 dark:text-white shadow-md shadow-rose-500/15 ring-2 ring-rose-400/40' 
                  : 'glass-panel hover:border-rose-400/40 text-slate-600 dark:text-slate-400 hover:-translate-y-0.5'
              }`}
            >
              <div className="text-[10px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400 mb-1">
                Scenario #{c.id}
              </div>
              <div className="text-xs font-bold line-clamp-2">
                {c.title.split(':')[1]}
              </div>
              <div className={`mt-1.5 px-1.5 py-0.5 rounded text-[9px] font-black inline-block border ${severityBadgeColors[c.severity] || ''}`}>
                {c.severity}
              </div>
            </button>
          ))}
        </div>

        {/* Selected Case Breakdown Card */}
        <div className="glass-card p-6 sm:p-8 rounded-2xl border border-rose-500/30 space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
            <div>
              <span className="px-3 py-1 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-500/40 text-xs font-black uppercase tracking-wider shadow-xs">
                TEST CASE #{currentCase.id} — LIVE BACKEND EXECUTION
              </span>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white mt-2.5">
                {currentCase.title}
              </h2>
              <p className="text-sm font-bold text-rose-700 dark:text-rose-300 mt-1">
                {currentCase.subtitle}
              </p>
            </div>

            <button
              disabled={simulationState === 'RUNNING'}
              onClick={() => handleRunSimulation(currentCase.id)}
              className="px-6 py-3 bg-rose-600 hover:bg-rose-500 text-white font-black rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-rose-600/25 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02]"
            >
              {simulationState === 'RUNNING' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
              <span>{simulationState === 'RUNNING' ? 'Executing on Backend...' : 'Execute via Live API'}</span>
            </button>
          </div>

          {/* Failure Flow Visualization */}
          <div className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-wider overflow-x-auto pb-1">
            {['INPUT', 'FAILURE', 'DETECTION', 'SYSTEM RESPONSE', 'COMPLIANCE STATUS', 'EVIDENCE GENERATED'].map((step, idx) => (
              <React.Fragment key={step}>
                <div className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 shrink-0">
                  {idx + 1}. {step}
                </div>
                {idx < 5 && <ArrowRight className="w-3.5 h-3.5 text-rose-400 shrink-0" />}
              </React.Fragment>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            <div className="space-y-2.5 bg-slate-100/80 dark:bg-slate-900/80 p-5 rounded-xl border border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Operational Scenario Description
              </h3>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-sm font-medium">
                {currentCase.description}
              </p>
            </div>

            <div className="space-y-2.5 bg-slate-100/80 dark:bg-slate-900/80 p-5 rounded-xl border border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Expected System Automated Behaviour
              </h3>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-sm font-medium">
                {currentCase.expected}
              </p>
            </div>
          </div>

          {/* Simulation Result Output */}
          {simulationState === 'COMPLETE' && simOutput && (
            <div className="p-5 rounded-2xl glass-panel border border-emerald-500/40 space-y-3 anim-fade-in shadow-lg">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-black text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                <span>LIVE API RESULT — CASE {simOutput.case_id}: {simOutput.title}</span>
              </div>

              {/* Structured result display */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {simOutput.input && (
                  <div className="p-3 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className="font-black text-slate-500 dark:text-slate-400 text-[9px] uppercase tracking-wider mb-1">INPUT</div>
                    <div className="text-slate-700 dark:text-slate-200 font-medium">{simOutput.input}</div>
                  </div>
                )}
                {simOutput.failure && (
                  <div className="p-3 bg-red-50 dark:bg-red-950/50 rounded-xl border border-red-200 dark:border-red-700/40">
                    <div className="font-black text-red-500 text-[9px] uppercase tracking-wider mb-1">FAILURE</div>
                    <div className="text-slate-700 dark:text-slate-200 font-medium">{simOutput.failure}</div>
                  </div>
                )}
                {simOutput.detection && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/50 rounded-xl border border-amber-200 dark:border-amber-700/40">
                    <div className="font-black text-amber-500 text-[9px] uppercase tracking-wider mb-1">DETECTION</div>
                    <div className="text-slate-700 dark:text-slate-200 font-medium">{simOutput.detection}</div>
                  </div>
                )}
                {simOutput.system_response && (
                  <div className="p-3 bg-cyan-50 dark:bg-cyan-950/50 rounded-xl border border-cyan-200 dark:border-cyan-700/40">
                    <div className="font-black text-cyan-500 text-[9px] uppercase tracking-wider mb-1">SYSTEM RESPONSE</div>
                    <div className="text-slate-700 dark:text-slate-200 font-medium">{simOutput.system_response}</div>
                  </div>
                )}
              </div>

              {simOutput.final_compliance_status && (
                <div className="px-4 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-500/40 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="font-black text-emerald-800 dark:text-emerald-300 text-xs">FINAL STATUS: {simOutput.final_compliance_status}</span>
                </div>
              )}

              {simOutput.evidence_generated && (
                <div className="space-y-1.5">
                  <div className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <FileCheck2 className="w-3.5 h-3.5" />
                    Evidence Generated
                  </div>
                  <pre className="p-4 bg-slate-100 dark:bg-slate-950 rounded-xl text-xs font-mono text-cyan-800 dark:text-cyan-300 overflow-x-auto border border-slate-200 dark:border-slate-800 leading-relaxed shadow-inner max-h-64">
                    {JSON.stringify(simOutput.evidence_generated, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}

          {simulationState === 'ERROR' && simError && (
            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-300 dark:border-red-500/40 text-red-800 dark:text-red-300 text-xs font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{simError}</span>
            </div>
          )}
        </div>

        {/* FMEA Matrix */}
        <div className="glass-card p-6 rounded-2xl border border-rose-500/20 space-y-4">
          <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-5 h-5 text-rose-500" />
            Failure Mode & Effects Analysis (FMEA) Matrix
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400">
                  <th className="text-left p-3 rounded-tl-lg font-black uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">Failure Mode</th>
                  <th className="text-center p-3 font-black uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">Severity</th>
                  <th className="text-center p-3 font-black uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">Likelihood</th>
                  <th className="text-center p-3 font-black uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">Detection</th>
                  <th className="text-left p-3 font-black uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">Mitigation Strategy</th>
                  <th className="text-left p-3 rounded-tr-lg font-black uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">Fallback Action</th>
                </tr>
              </thead>
              <tbody>
                {fmeaMatrix.map((row, idx) => (
                  <tr key={idx} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                    <td className="p-3 font-bold text-slate-700 dark:text-slate-200">{row.case}</td>
                    <td className={`p-3 text-center ${sevColor(row.severity)}`}>{row.severity}</td>
                    <td className="p-3 text-center text-slate-600 dark:text-slate-400 font-semibold">{row.likelihood}</td>
                    <td className="p-3 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30 font-black text-[9px] uppercase">
                        {row.detection}
                      </span>
                    </td>
                    <td className="p-3 text-slate-600 dark:text-slate-300 font-medium">{row.mitigation}</td>
                    <td className="p-3 text-slate-600 dark:text-slate-300 font-medium">{row.fallback}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};
