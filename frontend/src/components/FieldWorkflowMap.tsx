import React, { useState } from 'react';
import { GitMerge, MapPin, ShieldCheck, CheckCircle2, Clock, Activity, Home, ArrowRight, Layers, FileCheck2 } from 'lucide-react';
import { NavigationRole } from '../types';
import { ThemeToggle } from './ThemeToggle';

interface Props {
  onNavigate: (role: NavigationRole) => void;
}

export const FieldWorkflowMap: React.FC<Props> = ({ onNavigate }) => {
  const [selectedStageIndex, setSelectedStageIndex] = useState<number>(0);

  const workflowStages = [
    { name: "1. Seafood Processing", role: "Processing Facility Supervisor", record_type: "Quality Grading & Organoleptic Log", details: "Initial catch processing, filleting, washing, and temperature chilling down to 1.0°C." },
    { name: "2. Batch Creation", role: "Quality Ops Manager", record_type: "Product Batch Record (BTC-SEA-5001)", details: "Product batch metadata created, export lot assignment, required thermal limits set (-22°C to -18°C frozen / 0°C to 4°C chilled)." },
    { name: "3. Cold Storage Entry", role: "Warehouse Lead", record_type: "Facility Thermal Audit Record", details: "Staging batch inside cold storage warehouse facility under automated continuous monitoring." },
    { name: "4. Vehicle Loading", role: "Refrigerated Transport Tech", record_type: "Refrigerated Vehicle Pre-Cool Cert", details: "Pre-cooling reefer trailer unit down to -20.0°C prior to pallet loading." },
    { name: "5. Sensor Activation", role: "IoT Logistics Tech", record_type: "Sensor Calibration Cert (SNS-1001)", details: "Activating IoT multi-sensor logger; verifying ISO 17025 calibration validity and battery level." },
    { name: "6. Transport Transit", role: "Refrigerated Truck Driver", record_type: "Continuous 15-min Telemetry Log", details: "High-frequency GPS, temperature, humidity, and signal logging stream during road transport." },
    { name: "7. Route Checkpoints", role: "Logistics Checkpoint Inspector", record_type: "Route Event Record (RTE-001-3)", details: "Logging transit arrival time, highway delays, and reefer compressor diagnostic logs." },
    { name: "8. Custody Handover", role: "Ramp Logistics Supervisor", record_type: "Chain of Custody Handover (HND-001)", details: "Physical seal inspection, digital signature capture, and custody transfer confirmation." },
    { name: "9. Port / Airport Arrival", role: "Airport Cargo Ramp Agent", record_type: "Air Cargo Terminal Staging Log", details: "Arrival at Ted Stevens Anchorage Airport (ANC) or Seattle-Tacoma (SEA) cold facility." },
    { name: "10. Export Inspection", role: "Customs & Seafood Inspector", record_type: "Customs Export Quality Cert", details: "Physical temperature probe verification, sanitary certificate inspection, and export clearance." },
    { name: "11. Final Aircraft Loading", role: "Airline Cold Chain Specialist", record_type: "Final Aircraft Cargo Manifest", details: "Loading temp-controlled ULD container into cargo aircraft hold bound for Tokyo Haneda (HND)." },
    { name: "12. Audit Evidence Pack", role: "Compliance System (Automated)", record_type: "Structured Evidence Pack & Audit Report", details: "Automated aggregation of all 11 previous stage records into a 1-click printable Audit Report." }
  ];

  const currentStage = workflowStages[selectedStageIndex];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 flex flex-col transition-colors duration-300 relative overflow-hidden select-none">
      
      {/* Liquid Glass Ambient Glows */}
      <div className="absolute top-10 left-1/4 w-96 h-96 bg-cyan-500/10 dark:bg-cyan-500/15 rounded-full blur-[100px] pointer-events-none pulse-glow" />
      <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-emerald-500/10 dark:bg-emerald-500/15 rounded-full blur-[100px] pointer-events-none pulse-glow" style={{ animationDelay: '3s' }} />

      {/* Header */}
      <header className="bg-white/90 dark:bg-slate-900/80 border-b border-slate-200/80 dark:border-slate-800/80 sticky top-0 z-30 backdrop-blur-xl shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => onNavigate('LANDING')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/90 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer text-xs font-bold shadow-xs"
            >
              <Home className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
              <span>← Back to Home</span>
            </button>
            <div>
              <h1 className="text-lg font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                FIELD WORKFLOW MAP
                <span className="px-2.5 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-300 text-xs font-black border border-cyan-300 dark:border-cyan-500/30">
                  12 Export Lifecycle Stages
                </span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Interactive End-to-End Cold Chain Process Visualization</p>
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
        
        {/* Interactive Diagram Pipeline */}
        <div className="glass-card p-6 rounded-2xl border border-cyan-500/30 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-500" />
              Click Any Lifecycle Stage to View Linked Operational Records
            </h2>
            <span className="text-xs text-cyan-600 dark:text-cyan-400 font-bold">
              Stage {selectedStageIndex + 1} of 12 Selected
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {workflowStages.map((stage, idx) => {
              const isSelected = selectedStageIndex === idx;
              return (
                <button
                  key={idx}
                  onClick={() => setSelectedStageIndex(idx)}
                  className={`p-3.5 rounded-xl text-left border transition-all duration-200 cursor-pointer relative overflow-hidden group shadow-xs ${
                    isSelected 
                      ? 'bg-cyan-500/20 dark:bg-cyan-950/80 border-cyan-500 text-cyan-950 dark:text-white shadow-md shadow-cyan-500/20 ring-2 ring-cyan-400/50' 
                      : 'glass-panel hover:border-cyan-400/40 text-slate-600 dark:text-slate-400 hover:-translate-y-0.5'
                  }`}
                >
                  <div className={`text-[10px] font-black mb-1 ${isSelected ? 'text-cyan-700 dark:text-cyan-400' : 'text-slate-500 dark:text-slate-400'}`}>
                    STAGE #{idx + 1}
                  </div>
                  <div className="text-xs font-bold truncate">
                    {stage.name.split('. ')[1]}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Stage Detail Drawer */}
        <div className="glass-panel p-6 sm:p-8 rounded-2xl space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
            <div>
              <span className="text-xs font-black text-cyan-700 dark:text-cyan-400 uppercase tracking-widest">
                STAGE DETAILS & LINKED RECORDS
              </span>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {currentStage.name}
              </h3>
            </div>

            <span className="px-3.5 py-1.5 rounded-full bg-slate-100 dark:bg-slate-900 text-cyan-800 dark:text-cyan-300 border border-slate-200 dark:border-cyan-500/30 text-xs font-mono font-bold shadow-xs">
              Actor / Role: {currentStage.role}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            <div className="space-y-2.5 bg-slate-100/80 dark:bg-slate-900/80 p-5 rounded-xl border border-slate-200 dark:border-slate-800">
              <h4 className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-500" />
                Process & Operational Description
              </h4>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-sm font-medium">{currentStage.details}</p>
            </div>

            <div className="space-y-2.5 bg-slate-100/80 dark:bg-slate-900/80 p-5 rounded-xl border border-slate-200 dark:border-slate-800">
              <h4 className="font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-emerald-500" />
                Generated & Joined Record Type
              </h4>
              <p className="text-slate-900 dark:text-white font-mono font-bold text-sm">{currentStage.record_type}</p>
              <div className="pt-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Joined automatically into final Evidence Pack</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
