import React from 'react';
import { ShieldCheck, Anchor, Truck, ShieldAlert, GitMerge, TestTube2, Sliders, FileText, Sparkles, ChevronRight, Activity, Database, FileCheck2 } from 'lucide-react';
import { NavigationRole } from '../types';
import { ThemeToggle } from './ThemeToggle';

interface Props {
  onSelectRole: (role: NavigationRole) => void;
}

export const RoleSelectionLanding: React.FC<Props> = ({ onSelectRole }) => {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 flex flex-col justify-between p-4 sm:p-8 relative overflow-hidden transition-colors duration-300 select-none">
      
      {/* Liquid Glass Ambient Gradient Glows */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-cyan-500/15 dark:bg-cyan-500/20 rounded-full blur-[100px] pointer-events-none pulse-glow" />
      <div className="absolute top-1/3 -right-32 w-96 h-96 bg-blue-500/10 dark:bg-blue-500/15 rounded-full blur-[100px] pointer-events-none pulse-glow" style={{ animationDelay: '2s' }} />
      <div className="absolute -bottom-32 left-1/3 w-96 h-96 bg-emerald-500/10 dark:bg-emerald-500/15 rounded-full blur-[100px] pointer-events-none pulse-glow" style={{ animationDelay: '4s' }} />

      {/* Top Header Branding */}
      <header className="max-w-7xl mx-auto w-full flex items-center justify-between py-4 border-b border-slate-200/80 dark:border-slate-800/80 z-10">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-cyan-600 via-sky-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/25 border border-cyan-400/30">
            <Anchor className="w-6 h-6 text-white" />
          </div>
          <div>
            <span className="text-xl sm:text-2xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-cyan-700 via-sky-600 to-blue-800 dark:from-cyan-400 dark:via-sky-200 dark:to-white">
              SEAFOOD COMPLIANCE INTELLIGENCE
            </span>
            <span className="block text-[11px] font-bold text-cyan-700 dark:text-cyan-400/90 tracking-wider uppercase">
              Autonomous Cold-Chain Compliance & Evidence Engine
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex px-3.5 py-1.5 rounded-full glass-panel border border-cyan-500/30 text-cyan-800 dark:text-cyan-300 text-xs font-bold items-center gap-2 shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-cyan-500" />
            <span>10,000 Connected Log Engine</span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Hero Banner */}
      <div className="max-w-5xl mx-auto text-center my-10 z-10 anim-fade-up">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-panel border border-cyan-500/30 text-cyan-800 dark:text-cyan-300 text-xs font-bold mb-6 shadow-sm">
          <Activity className="w-4 h-4 text-cyan-600 dark:text-cyan-400 animate-pulse" />
          <span>Real-time Cold-Chain Telemetry • ML Anomaly Risk Detection • Instant Audit Pack</span>
        </div>
        <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-slate-900 dark:text-white mb-4 leading-tight">
          Seafood Export Automated Compliance & Evidence System
        </h1>
        <p className="text-xl sm:text-2xl font-bold text-cyan-700 dark:text-cyan-300/90 max-w-3xl mx-auto">
          Automated Evidence • Intelligent Monitoring • Audit Ready
        </p>
        <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base max-w-2xl mx-auto mt-3 font-medium">
          Select a role below to launch its dashboard instantly. No credentials or authentication required.
        </p>
      </div>

      {/* 3 Role Selection Cards */}
      <div className="max-w-6xl mx-auto w-full grid grid-cols-1 md:grid-cols-3 gap-6 my-6 z-10">
        
        {/* CARD 1: ADMIN */}
        <div 
          onClick={() => onSelectRole('ADMIN')}
          className="glass-card rounded-2xl p-8 cursor-pointer flex flex-col justify-between group hover:border-cyan-500/60 hover:shadow-2xl hover:shadow-cyan-500/15 transition-all duration-300 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-36 h-36 bg-cyan-500/10 rounded-bl-full pointer-events-none group-hover:bg-cyan-500/20 transition-colors" />
          <div>
            <div className="w-14 h-14 rounded-2xl bg-cyan-50 dark:bg-cyan-950/80 border border-cyan-300 dark:border-cyan-500/30 flex items-center justify-center text-cyan-700 dark:text-cyan-400 mb-6 group-hover:scale-110 group-hover:bg-cyan-600 group-hover:text-white transition-all duration-300 shadow-md">
              <Anchor className="w-7 h-7" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2 group-hover:text-cyan-600 dark:group-hover:text-cyan-300 transition-colors">
              ADMIN
            </h2>
            <p className="text-cyan-700 dark:text-cyan-400 font-bold text-sm mb-3">
              System Administration & Fleet Analytics
            </p>
            <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed font-medium">
              Global shipment analytics, IoT sensor fleet calibration tracking, relational dataset generation engine, system telemetry, and export reporting.
            </p>
          </div>

          <div className="mt-8 pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-cyan-700 dark:text-cyan-400 font-bold text-sm group-hover:translate-x-1 transition-transform">
            <span>Launch Admin Portal</span>
            <ChevronRight className="w-5 h-5" />
          </div>
        </div>

        {/* CARD 2: COMPLIANCE OFFICER */}
        <div 
          onClick={() => onSelectRole('COMPLIANCE')}
          className="glass-card rounded-2xl p-8 cursor-pointer flex flex-col justify-between group border-2 border-emerald-500/50 dark:border-emerald-500/40 hover:border-emerald-500 hover:shadow-2xl hover:shadow-emerald-500/20 transition-all duration-300 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-36 h-36 bg-emerald-500/15 rounded-bl-full pointer-events-none group-hover:bg-emerald-500/25 transition-colors" />
          <div className="absolute top-4 right-4">
            <span className="px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-500/20 border border-emerald-300 dark:border-emerald-500/50 text-emerald-800 dark:text-emerald-300 text-xs font-black uppercase tracking-wider shadow-xs">
              PRIMARY ROLE
            </span>
          </div>

          <div>
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-500/40 flex items-center justify-center text-emerald-700 dark:text-emerald-400 mb-6 group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300 shadow-md">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2 group-hover:text-emerald-600 dark:group-hover:text-emerald-300 transition-colors">
              COMPLIANCE OFFICER
            </h2>
            <p className="text-emerald-700 dark:text-emerald-400 font-bold text-sm mb-3">
              Compliance Monitoring & Audit Evidence
            </p>
            <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed font-medium">
              Live thermal monitoring, ML anomaly detection, chronological audit timeline, automated evidence pack generator, and 1-click audit report export.
            </p>
          </div>

          <div className="mt-8 pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-emerald-700 dark:text-emerald-400 font-bold text-sm group-hover:translate-x-1 transition-transform">
            <span>Launch Compliance Hub</span>
            <ChevronRight className="w-5 h-5" />
          </div>
        </div>

        {/* CARD 3: TRANSPORT / OPERATIONS */}
        <div 
          onClick={() => onSelectRole('TRANSPORT')}
          className="glass-card rounded-2xl p-8 cursor-pointer flex flex-col justify-between group hover:border-amber-500/60 hover:shadow-2xl hover:shadow-amber-500/15 transition-all duration-300 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-36 h-36 bg-amber-500/10 rounded-bl-full pointer-events-none group-hover:bg-amber-500/20 transition-colors" />
          <div>
            <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-500/30 flex items-center justify-center text-amber-700 dark:text-amber-400 mb-6 group-hover:scale-110 group-hover:bg-amber-600 group-hover:text-white transition-all duration-300 shadow-md">
              <Truck className="w-7 h-7" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2 group-hover:text-amber-600 dark:group-hover:text-amber-300 transition-colors">
              TRANSPORT / OPERATIONS
            </h2>
            <p className="text-amber-700 dark:text-amber-400 font-bold text-sm mb-3">
              Shipment, Route & Handover Operations
            </p>
            <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed font-medium">
              Active shipment tracking, route checkpoint logger, custody handover verification, and driver safety workload validation with auto-blocking.
            </p>
          </div>

          <div className="mt-8 pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-amber-700 dark:text-amber-400 font-bold text-sm group-hover:translate-x-1 transition-transform">
            <span>Launch Operations Panel</span>
            <ChevronRight className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Quick Access System Modules */}
      <div className="max-w-6xl mx-auto w-full z-10 mt-6 pt-6 border-t border-slate-200/80 dark:border-slate-800/80">
        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest text-center mb-4">
          Quick Access Evaluation & System Analysis Modules
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          <button 
            onClick={() => onSelectRole('MANUAL_ENTRY')}
            className="p-3.5 rounded-xl glass-panel border border-cyan-500/40 hover:border-cyan-400 bg-cyan-500/10 dark:bg-cyan-950/40 text-left transition-all group cursor-pointer shadow-xs hover:-translate-y-0.5"
          >
            <FileCheck2 className="w-5 h-5 text-cyan-600 dark:text-cyan-400 mb-2 group-hover:scale-110 transition-transform" />
            <div className="text-xs font-black text-slate-900 dark:text-white">Manual Entry</div>
            <div className="text-[10px] text-cyan-600 dark:text-cyan-400 font-bold">Auto-Fill & Report</div>
          </button>

          <button 
            onClick={() => onSelectRole('FAILURE_MODES')}
            className="p-3.5 rounded-xl glass-panel hover:border-rose-500/50 text-left transition-all group cursor-pointer shadow-xs hover:-translate-y-0.5"
          >
            <ShieldAlert className="w-5 h-5 text-rose-500 dark:text-rose-400 mb-2 group-hover:scale-110 transition-transform" />
            <div className="text-xs font-bold text-slate-900 dark:text-white">Failure Modes</div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">5 Test Scenarios</div>
          </button>

          <button 
            onClick={() => onSelectRole('WORKFLOW_MAP')}
            className="p-3.5 rounded-xl glass-panel hover:border-cyan-500/50 text-left transition-all group cursor-pointer shadow-xs hover:-translate-y-0.5"
          >
            <GitMerge className="w-5 h-5 text-cyan-600 dark:text-cyan-400 mb-2 group-hover:scale-110 transition-transform" />
            <div className="text-xs font-bold text-slate-900 dark:text-white">Workflow Map</div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">12 Export Stages</div>
          </button>

          <button 
            onClick={() => onSelectRole('EXPERIMENTS')}
            className="p-3.5 rounded-xl glass-panel hover:border-emerald-500/50 text-left transition-all group cursor-pointer shadow-xs hover:-translate-y-0.5"
          >
            <TestTube2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mb-2 group-hover:scale-110 transition-transform" />
            <div className="text-xs font-bold text-slate-900 dark:text-white">Baseline vs System</div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Manual vs Auto Study</div>
          </button>

          <button 
            onClick={() => onSelectRole('THRESHOLD_TUNING')}
            className="p-3.5 rounded-xl glass-panel hover:border-amber-500/50 text-left transition-all group cursor-pointer shadow-xs hover:-translate-y-0.5"
          >
            <Sliders className="w-5 h-5 text-amber-600 dark:text-amber-400 mb-2 group-hover:scale-110 transition-transform" />
            <div className="text-xs font-bold text-slate-900 dark:text-white">Threshold Tuning</div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Alert Sensitivity</div>
          </button>

          <button 
            onClick={() => onSelectRole('USER_FEEDBACK')}
            className="p-3.5 rounded-xl glass-panel hover:border-purple-500/50 text-left transition-all group cursor-pointer shadow-xs hover:-translate-y-0.5"
          >
            <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400 mb-2 group-hover:scale-110 transition-transform" />
            <div className="text-xs font-bold text-slate-900 dark:text-white">User Feedback</div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Stakeholder Rating</div>
          </button>

          <button 
            onClick={() => onSelectRole('TECH_DOCS')}
            className="p-3.5 rounded-xl glass-panel hover:border-sky-500/50 text-left transition-all group cursor-pointer shadow-xs hover:-translate-y-0.5"
          >
            <FileText className="w-5 h-5 text-sky-600 dark:text-sky-400 mb-2 group-hover:scale-110 transition-transform" />
            <div className="text-xs font-bold text-slate-900 dark:text-white">Tech Docs</div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">System Architecture</div>
          </button>

          <button 
            onClick={() => onSelectRole('DATASET_EXPLORER')}
            className="p-3.5 rounded-xl glass-panel hover:border-teal-500/50 text-left transition-all group cursor-pointer shadow-xs hover:-translate-y-0.5"
          >
            <Database className="w-5 h-5 text-teal-600 dark:text-teal-400 mb-2 group-hover:scale-110 transition-transform" />
            <div className="text-xs font-bold text-slate-900 dark:text-white">Dataset Explorer</div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Live DB Records</div>
          </button>
        </div>
      </div>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto w-full text-center py-4 border-t border-slate-200/80 dark:border-slate-900 text-xs text-slate-500 dark:text-slate-400 z-10 mt-6 font-medium">
        Seafood Export Automated Compliance & Evidence System • COE Capstone Project • Fully Operational & Interactive
      </footer>
    </div>
  );
};
