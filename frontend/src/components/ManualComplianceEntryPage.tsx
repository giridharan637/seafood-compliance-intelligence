import React, { useState, useEffect, useRef } from 'react';
import {
  FileCheck2, Search, CheckCircle2, AlertTriangle, XCircle, ShieldCheck,
  ShieldAlert, RefreshCw, Database, Sparkles, Home, ArrowRight, Download,
  Printer, Thermometer, Cpu, Truck, MapPin, Package, Clock, Eye, AlertCircle,
  FileSpreadsheet, Zap, HelpCircle, Layers, ChevronRight
} from 'lucide-react';
import { NavigationRole, EvidencePack, ManualEntryFormState, ManualEntryValidationResult } from '../types';
import { apiFetch } from '../config/api';
import { ThemeToggle } from './ThemeToggle';
import { AuditReportModal } from './AuditReportModal';
import { useToast } from '../context/ToastContext';

interface Props {
  onNavigate: (role: NavigationRole) => void;
}

const INITIAL_FORM: ManualEntryFormState = {
  shipment_id: '',
  batch_id: '',
  product_type: 'Pacific Cod (Frozen Fillets)',
  origin: 'Seattle Pier 91 Logistics Center (WA)',
  destination: 'Tokyo International Airport (NRT - Japan)',
  port_airport: 'Seattle-Tacoma Int\'l Airport Cold Logistics (SEA - USA)',
  transport_mode: 'Refrigerated Reefer Trailer + Air Cargo',
  quantity_kg: 1250.0,
  required_temp_min: -22.0,
  required_temp_max: -18.0,
  current_temp: -19.4,
  sensor_id: 'SNS-TEMP-001',
  sensor_type: 'Multi-Sensor IoT Cold Logger',
  calibration_date: '2026-08-20',
  calibration_due_date: '2026-11-20',
  calibration_status: 'VALID',
  route_status: 'On Schedule',
  last_custody_handover: 'Pier 91 Cold Staging Ramp (Good Condition)',
  driver_id: 'DRV-101',
  driver_name: 'David Vance',
  notes: 'Pre-dispatch physical inspection completed. Pallet temperature checked.'
};

export const ManualComplianceEntryPage: React.FC<Props> = ({ onNavigate }) => {
  const { showToast } = useToast();
  const [form, setForm] = useState<ManualEntryFormState>(INITIAL_FORM);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOptions, setSearchOptions] = useState<any[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Status and result states
  const [isAutofilled, setIsAutofilled] = useState(false);
  const [autofillSource, setAutofillSource] = useState<'DATABASE' | 'SAMPLE' | null>(null);
  const [sampleBadgeLabel, setSampleBadgeLabel] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingPack, setIsGeneratingPack] = useState(false);
  
  const [validationResult, setValidationResult] = useState<ManualEntryValidationResult | null>(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [savedBatchId, setSavedBatchId] = useState<string | null>(null);
  
  // Evidence Pack & Audit Report modal
  const [evidencePack, setEvidencePack] = useState<EvidencePack | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch search options on mount
  useEffect(() => {
    apiFetch<any[]>('/manual-entry/options')
      .then(res => setSearchOptions(res || []))
      .catch(err => console.error("Failed to load search options", err));
  }, []);

  // Handle click outside dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter search options
  const filteredOptions = searchOptions.filter(opt => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      opt.shipment_id?.toLowerCase().includes(q) ||
      opt.batch_id?.toLowerCase().includes(q) ||
      opt.product_type?.toLowerCase().includes(q) ||
      opt.origin?.toLowerCase().includes(q) ||
      opt.destination?.toLowerCase().includes(q)
    );
  }).slice(0, 8);

  // Handle Auto-fill from DB
  const handleSelectOption = async (identifier: string) => {
    setIsDropdownOpen(false);
    setSearchQuery(identifier);
    try {
      const res = await apiFetch<any>(`/manual-entry/autofill/${encodeURIComponent(identifier)}`);
      if (res.found) {
        setForm({
          shipment_id: res.shipment_id || '',
          batch_id: res.batch_id || '',
          product_type: res.product_type || '',
          origin: res.origin || '',
          destination: res.destination || '',
          port_airport: res.port_airport || '',
          transport_mode: res.transport_mode || 'Refrigerated Truck + Air Cargo',
          quantity_kg: res.quantity_kg || 1200.0,
          required_temp_min: res.required_temp_min !== undefined ? res.required_temp_min : -22.0,
          required_temp_max: res.required_temp_max !== undefined ? res.required_temp_max : -18.0,
          current_temp: res.current_temp !== undefined ? res.current_temp : -19.0,
          sensor_id: res.sensor_id || 'SNS-TEMP-001',
          sensor_type: res.sensor_type || 'Multi-Sensor IoT Logger',
          calibration_date: res.calibration_date || '2026-08-20',
          calibration_due_date: res.calibration_due_date || '2026-11-20',
          calibration_status: res.calibration_status || 'VALID',
          route_status: res.route_status || 'On Schedule',
          last_custody_handover: res.last_custody_handover || 'Facility Cold Ramp',
          driver_id: res.driver_id || 'DRV-101',
          driver_name: res.driver_name || 'Fleet Operator',
          notes: `Auto-filled from database record for shipment ${res.shipment_id}.`
        });
        setRecentObservations(res.recent_observations || []);
        if (res.route_status) {
          setRouteInfo({ status: res.route_status, last_event: res.last_route_event || '', count: res.route_events_count || 0 });
        }
        if (res.last_custody_handover) {
          setCustodyInfo({ last_handover: res.last_custody_handover, count: res.custody_handovers_count || 0 });
        }
        setIsAutofilled(true);
        setAutofillSource('DATABASE');
        setSampleBadgeLabel(null);
        setValidationResult(null);
        setSaveSuccessMsg(null);
        showToast({
          type: 'info',
          title: 'Database Record Auto-Filled',
          message: `Loaded operational telemetry for ${res.shipment_id} (${res.product_type}).`,
          duration: 4000
        });
      }
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Auto-fill Failed',
        message: err.message || 'Could not find record in database.'
      });
    }
  };

  // Handle Load Sample Record
  const handleLoadSample = async () => {
    try {
      const res = await apiFetch<any>('/manual-entry/sample');
      if (res.found) {
        setForm({
          shipment_id: res.shipment_id || 'SHP-2026-101',
          batch_id: res.batch_id || 'BTC-SEA-5001',
          product_type: res.product_type || 'Frozen Shrimp (Black Tiger)',
          origin: res.origin || 'Chennai Seafood Processing Unit',
          destination: res.destination || 'Tokyo International Airport (NRT - Japan)',
          port_airport: res.port_airport || 'Chennai Port Cold Terminal',
          transport_mode: res.transport_mode || 'Refrigerated Truck + Air Cargo',
          quantity_kg: res.quantity_kg || 1450.0,
          required_temp_min: res.required_temp_min !== undefined ? res.required_temp_min : -22.0,
          required_temp_max: res.required_temp_max !== undefined ? res.required_temp_max : -18.0,
          current_temp: res.current_temp !== undefined ? res.current_temp : -17.2,
          sensor_id: res.sensor_id || 'SNS-TEMP-001',
          sensor_type: res.sensor_type || 'Multi-Sensor IoT Logger',
          calibration_date: res.calibration_date || '2026-08-20',
          calibration_due_date: res.calibration_due_date || '2026-11-20',
          calibration_status: res.calibration_status || 'VALID',
          route_status: res.route_status || 'On Schedule',
          last_custody_handover: res.last_custody_handover || 'Chennai Cold Storage Transfer',
          driver_id: res.driver_id || 'DRV-101',
          driver_name: res.driver_name || 'Rajesh Kumar',
          notes: 'Sample operational compliance record loaded for demonstration.'
        });
        setSearchQuery(res.shipment_id);
        setRecentObservations(res.recent_observations || []);
        if (res.route_status) {
          setRouteInfo({ status: res.route_status, last_event: res.last_route_event || '', count: res.route_events_count || 0 });
        }
        if (res.last_custody_handover) {
          setCustodyInfo({ last_handover: res.last_custody_handover, count: res.custody_handovers_count || 0 });
        }
        setIsAutofilled(true);
        setAutofillSource('SAMPLE');
        setSampleBadgeLabel(res.demo_label || 'Sample operational record loaded');
        setValidationResult(null);
        setSaveSuccessMsg(null);
        showToast({
          type: 'success',
          title: 'Sample Record Loaded',
          message: 'Real database demonstration record loaded successfully.',
          duration: 4000
        });
      }
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Failed to Load Sample',
        message: err.message || 'Error loading sample record.'
      });
    }
  };

  // Reset form
  const handleResetForm = () => {
    setForm({
      ...INITIAL_FORM,
      shipment_id: '',
      batch_id: '',
      notes: ''
    });
    setSearchQuery('');
    setRecentObservations([]);
    setRouteInfo(null);
    setCustodyInfo(null);
    setIsAutofilled(false);
    setAutofillSource(null);
    setSampleBadgeLabel(null);
    setValidationResult(null);
    setSaveSuccessMsg(null);
    setSavedBatchId(null);
  };

  // Validate Record
  const handleValidateRecord = async () => {
    setIsValidating(true);
    setValidationResult(null);
    try {
      const res = await apiFetch<ManualEntryValidationResult>('/manual-entry/validate', {
        method: 'POST',
        body: JSON.stringify(form)
      });
      setValidationResult(res);
      if (res.is_valid) {
        showToast({
          type: res.compliance_status === 'NORMAL' ? 'success' : res.compliance_status === 'WARNING' ? 'warning' : 'error',
          title: `Validation: ${res.compliance_status}`,
          message: res.summary || 'Compliance rule checks completed.',
          duration: 5000
        });
      } else {
        showToast({
          type: 'error',
          title: 'Validation Errors Detected',
          message: res.validation_errors?.join('; ') || 'Please correct required fields.',
          duration: 6000
        });
      }
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Validation Failed',
        message: err.message || 'Error executing compliance validation rules.'
      });
    } finally {
      setIsValidating(false);
    }
  };

  // Save Record to Database
  const handleSaveRecord = async () => {
    setIsSaving(true);
    setSaveSuccessMsg(null);
    try {
      const res = await apiFetch<any>('/manual-entry/save', {
        method: 'POST',
        body: JSON.stringify(form)
      });
      if (res.success) {
        setSaveSuccessMsg(res.message);
        setSavedBatchId(res.batch_id);
        // Refresh options list in background
        apiFetch<any[]>('/manual-entry/options').then(opts => setSearchOptions(opts || [])).catch(() => {});
        showToast({
          type: 'success',
          title: 'Record Saved to Database',
          message: `Saved ${res.shipment_id} / ${res.batch_id} to SQLite database. Status: ${res.compliance_status}`,
          duration: 5000
        });
        // Automatically validate to show updated status
        handleValidateRecord();
      }
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Save Failed',
        message: err.message || 'Failed to save compliance record to SQLite database.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Stored telemetry & route preview from auto-fill
  const [recentObservations, setRecentObservations] = useState<any[]>([]);
  const [routeInfo, setRouteInfo] = useState<{ status: string; last_event: string; count: number } | null>(null);
  const [custodyInfo, setCustodyInfo] = useState<{ last_handover: string; count: number } | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  // Helper for field change
  const handleChange = (field: keyof ManualEntryFormState, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setSaveSuccessMsg(null);
  };

  // Generate Evidence Pack (creates & updates Evidence Pack summary card)
  const handleGenerateEvidencePack = async () => {
    const targetBatchId = form.batch_id.trim();
    if (!targetBatchId) {
      showToast({
        type: 'warning',
        title: 'Batch ID Missing',
        message: 'Please provide or save a valid Batch ID first.'
      });
      return;
    }

    setIsGeneratingPack(true);
    try {
      // First ensure it's saved/persisted
      await apiFetch('/manual-entry/save', {
        method: 'POST',
        body: JSON.stringify(form)
      });

      // Then generate real evidence pack
      const pack = await apiFetch<EvidencePack>('/manual-entry/generate-evidence-pack', {
        method: 'POST',
        body: JSON.stringify({ batch_id: targetBatchId })
      });

      setEvidencePack(pack);
      showToast({
        type: 'success',
        title: 'Evidence Pack Generated',
        message: `Generated compliance evidence pack for ${targetBatchId} (${pack.completeness_score}% readiness).`,
        duration: 5000
      });
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Evidence Pack Generation Failed',
        message: err.message || 'Could not generate evidence pack for this record.'
      });
    } finally {
      setIsGeneratingPack(false);
    }
  };

  // Generate Complete Audit Report (opens the official audit modal)
  const handleGenerateAuditReport = async () => {
    const targetBatchId = form.batch_id.trim();
    if (!targetBatchId) {
      showToast({
        type: 'warning',
        title: 'Batch ID Missing',
        message: 'Please provide or save a valid Batch ID first.'
      });
      return;
    }

    setIsGeneratingReport(true);
    try {
      // First ensure it's saved/persisted
      await apiFetch('/manual-entry/save', {
        method: 'POST',
        body: JSON.stringify(form)
      });

      // Then generate real evidence pack
      const pack = await apiFetch<EvidencePack>('/manual-entry/generate-evidence-pack', {
        method: 'POST',
        body: JSON.stringify({ batch_id: targetBatchId })
      });

      setEvidencePack(pack);
      setIsModalOpen(true);
      showToast({
        type: 'success',
        title: 'Audit Report Generated',
        message: `Audit report opened for ${targetBatchId} (${pack.overall_status}).`,
        duration: 4000
      });
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Audit Report Generation Failed',
        message: err.message || 'Could not generate audit report for this record.'
      });
    } finally {
      setIsGeneratingReport(false);
    }
  };

  // Temperature compliance visual state
  const isTempBreached = form.current_temp > form.required_temp_max;
  const isTempOverfrozen = form.current_temp < (form.required_temp_min - 3.0);
  const tempOffset = form.current_temp - form.required_temp_max;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 flex flex-col transition-colors duration-300 relative overflow-hidden select-none">
      
      {/* Liquid Glass Ambient Glows */}
      <div className="absolute top-12 right-1/4 w-96 h-96 bg-cyan-500/10 dark:bg-cyan-500/15 rounded-full blur-[100px] pointer-events-none pulse-glow" />
      <div className="absolute bottom-12 left-1/4 w-96 h-96 bg-emerald-500/10 dark:bg-emerald-500/15 rounded-full blur-[100px] pointer-events-none pulse-glow" style={{ animationDelay: '3s' }} />

      {/* Top Header Sticky Bar */}
      <header className="bg-white/95 dark:bg-slate-900/90 border-b border-slate-200/80 dark:border-slate-800/80 sticky top-0 z-30 backdrop-blur-xl shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button 
              onClick={() => onNavigate('LANDING')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/90 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer text-xs font-bold shadow-xs shrink-0"
            >
              <Home className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
              <span className="hidden sm:inline">← Back to Home</span>
            </button>
            <div className="min-w-0">
              <h1 className="text-lg font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2 flex-wrap">
                MANUAL COMPLIANCE ENTRY
                <span className="px-2.5 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-300 text-xs font-black border border-cyan-300 dark:border-cyan-500/30 whitespace-nowrap">
                  Operational Telemetry & Record Aggregator
                </span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">Enter or auto-fill operational shipment records to execute compliance analysis & generate real audit packs</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <ThemeToggle />
            <button
              onClick={() => onNavigate('COMPLIANCE')}
              className="px-3.5 py-1.5 bg-emerald-50 dark:bg-emerald-600/20 hover:bg-emerald-100 dark:hover:bg-emerald-600/30 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/40 rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-xs whitespace-nowrap"
            >
              Compliance Hub →
            </button>
            <button
              onClick={() => onNavigate('ADMIN')}
              className="px-3.5 py-1.5 bg-cyan-50 dark:bg-cyan-600/20 hover:bg-cyan-100 dark:hover:bg-cyan-600/30 text-cyan-800 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-500/40 rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-xs whitespace-nowrap"
            >
              Admin →
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto w-full p-4 sm:p-6 flex-1 space-y-6 z-10 anim-fade-up">

        {/* Search, Auto-fill & Demo Mode Bar */}
        <div className="glass-card p-5 sm:p-6 rounded-2xl border border-cyan-500/30 shadow-lg space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-cyan-600 dark:text-cyan-400 block mb-1">
                STEP 1: SELECT SHIPMENT / BATCH TO AUTO-FILL
              </span>
              <h2 className="text-base font-black text-slate-900 dark:text-white">
                Live Database Auto-Fill & Search
              </h2>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleLoadSample}
                className="px-3.5 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md shadow-cyan-600/20 transition-all hover:scale-105"
              >
                <Sparkles className="w-4 h-4" />
                <span>Load Sample Demo Record</span>
              </button>
              <button
                type="button"
                onClick={handleResetForm}
                className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
              >
                Clear Form
              </button>
            </div>
          </div>

          {/* Search Dropdown / Autocomplete Input */}
          <div className="relative" ref={dropdownRef}>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setIsDropdownOpen(true);
                  }}
                  onFocus={() => setIsDropdownOpen(true)}
                  placeholder="Search by Shipment ID (e.g. SHP-2026-101) or Batch ID (e.g. BTC-SEA-5001)..."
                  className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 dark:text-slate-200 font-bold focus:border-cyan-500 focus:outline-none"
                />
              </div>
              <button
                onClick={() => searchQuery && handleSelectOption(searchQuery)}
                className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-xs"
              >
                Auto-Fill Data
              </button>
            </div>

            {/* Dropdown Options List */}
            {isDropdownOpen && filteredOptions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl z-40 max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                {filteredOptions.map((opt, i) => (
                  <div
                    key={i}
                    onClick={() => handleSelectOption(opt.shipment_id)}
                    className="p-3 hover:bg-cyan-50 dark:hover:bg-cyan-950/40 cursor-pointer transition-colors flex items-center justify-between text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-cyan-600 dark:text-cyan-400">{opt.shipment_id}</span>
                        <span className="text-slate-400">·</span>
                        <span className="font-bold text-slate-700 dark:text-slate-300">{opt.batch_id}</span>
                        <span className="text-slate-400">·</span>
                        <span className="text-slate-600 dark:text-slate-400 font-medium truncate">{opt.product_type}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 truncate mt-0.5">
                        {opt.origin} → {opt.destination}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                        opt.compliance_status === 'NORMAL' ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300' :
                        opt.compliance_status === 'WARNING' ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300' :
                        'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-300'
                      }`}>
                        {opt.compliance_status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Indicators Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-800/60 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              {isAutofilled && (
                <span className="px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/40 text-[11px] font-bold flex items-center gap-1.5 shadow-xs">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  Auto-filled from Database
                </span>
              )}
              {sampleBadgeLabel && (
                <span className="px-2.5 py-1 rounded-lg bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-500/40 text-[11px] font-bold flex items-center gap-1.5 shadow-xs">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                  {sampleBadgeLabel}
                </span>
              )}
              {!isAutofilled && (
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  ✏️ Manual Custom Entry Mode — Enter operational records below or select an existing shipment above.
                </span>
              )}
            </div>

            <div className="text-[11px] text-slate-400 font-mono">
              Database: <span className="text-cyan-600 dark:text-cyan-400 font-bold">{searchOptions.length} Shipments connected</span>
            </div>
          </div>
        </div>

        {/* Success Banner if Saved */}
        {saveSuccessMsg && (
          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-500/40 text-emerald-900 dark:text-emerald-200 text-xs font-bold flex items-center justify-between shadow-md anim-fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{saveSuccessMsg}</span>
            </div>
            <button
              onClick={handleGenerateEvidencePack}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              Generate Evidence Pack Now →
            </button>
          </div>
        )}

        {/* 2-Column Responsive Operational Record Form */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* LEFT COLUMN: Identification, Logistics & Chain of Custody */}
          <div className="glass-panel p-6 rounded-2xl space-y-5 border border-slate-200 dark:border-slate-800 shadow-md">
            <div className="border-b border-slate-200 dark:border-slate-800 pb-3 flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Package className="w-4 h-4 text-cyan-500" />
                1. Identification & Product Lot
              </h3>
              <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-bold uppercase tracking-wider">
                {isAutofilled ? '⚡ Auto-Filled' : '✏️ Editable'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-slate-700 dark:text-slate-300 font-bold text-xs block mb-1.5">
                  Shipment ID <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.shipment_id}
                  onChange={(e) => handleChange('shipment_id', e.target.value)}
                  placeholder="e.g. SHP-2026-101"
                  className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-slate-200 font-mono font-bold focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-700 dark:text-slate-300 font-bold text-xs block mb-1.5">
                  Batch ID <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.batch_id}
                  onChange={(e) => handleChange('batch_id', e.target.value)}
                  placeholder="e.g. BTC-SEA-5001"
                  className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-slate-200 font-mono font-bold focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-slate-700 dark:text-slate-300 font-bold text-xs block mb-1.5">
                  Seafood Product Type <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.product_type}
                  onChange={(e) => handleChange('product_type', e.target.value)}
                  placeholder="e.g. Pacific Cod (Frozen Fillets)"
                  className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-slate-200 font-bold focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-700 dark:text-slate-300 font-bold text-xs block mb-1.5">
                  Quantity (kg)
                </label>
                <input
                  type="number"
                  value={form.quantity_kg}
                  onChange={(e) => handleChange('quantity_kg', parseFloat(e.target.value) || 0)}
                  placeholder="1250.0"
                  className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-slate-200 font-bold focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Logistics & Route section */}
            <div className="border-t border-slate-200 dark:border-slate-800 pt-4 space-y-4">
              <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Truck className="w-4 h-4 text-amber-500" />
                2. Transport Route & Terminal Logistics
              </h3>

              <div>
                <label className="text-slate-700 dark:text-slate-300 font-bold text-xs block mb-1.5">
                  Origin Processing Facility <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.origin}
                  onChange={(e) => handleChange('origin', e.target.value)}
                  placeholder="e.g. Seattle Pier 91 Logistics Center (WA)"
                  className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-slate-200 font-bold focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-700 dark:text-slate-300 font-bold text-xs block mb-1.5">
                  Destination Export Port / Airport <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.destination}
                  onChange={(e) => handleChange('destination', e.target.value)}
                  placeholder="e.g. Tokyo International Airport (NRT - Japan)"
                  className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-slate-200 font-bold focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-700 dark:text-slate-300 font-bold text-xs block mb-1.5">
                    Port / Airport Logistics Hub
                  </label>
                  <input
                    type="text"
                    value={form.port_airport}
                    onChange={(e) => handleChange('port_airport', e.target.value)}
                    placeholder="e.g. Seattle-Tacoma Int'l (SEA)"
                    className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-slate-200 font-bold focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-slate-700 dark:text-slate-300 font-bold text-xs block mb-1.5">
                    Transport Mode
                  </label>
                  <select
                    value={form.transport_mode}
                    onChange={(e) => handleChange('transport_mode', e.target.value)}
                    className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-slate-200 font-bold focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="Refrigerated Truck + Air Cargo">Refrigerated Truck + Air Cargo</option>
                    <option value="Refrigerated Reefer Trailer + Air Cargo">Refrigerated Reefer Trailer + Air Cargo</option>
                    <option value="Intermodal Reefer Container + Maritime Freight">Intermodal Reefer Container + Maritime Freight</option>
                    <option value="Dedicated Cold-Chain Van + Air Freight">Dedicated Cold-Chain Van + Air Freight</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Custody Handover & Driver Info */}
            <div className="border-t border-slate-200 dark:border-slate-800 pt-4 space-y-4">
              <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <MapPin className="w-4 h-4 text-purple-500" />
                3. Custody Handover & Driver Validation
              </h3>

              <div>
                <label className="text-slate-700 dark:text-slate-300 font-bold text-xs block mb-1.5">
                  Last Custody Handover Status
                </label>
                <input
                  type="text"
                  value={form.last_custody_handover}
                  onChange={(e) => handleChange('last_custody_handover', e.target.value)}
                  placeholder="e.g. Pier 91 Cold Staging Ramp (Good Condition)"
                  className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-slate-200 font-bold focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-700 dark:text-slate-300 font-bold text-xs block mb-1.5">
                    Assigned Driver ID
                  </label>
                  <input
                    type="text"
                    value={form.driver_id}
                    onChange={(e) => handleChange('driver_id', e.target.value)}
                    placeholder="e.g. DRV-101"
                    className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-slate-200 font-mono font-bold focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-slate-700 dark:text-slate-300 font-bold text-xs block mb-1.5">
                    Driver Full Name
                  </label>
                  <input
                    type="text"
                    value={form.driver_name}
                    onChange={(e) => handleChange('driver_name', e.target.value)}
                    placeholder="e.g. David Vance"
                    className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-slate-200 font-bold focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Thermal Requirements, IoT Sensor, Calibration & Analysis */}
          <div className="glass-panel p-6 rounded-2xl space-y-5 border border-slate-200 dark:border-slate-800 shadow-md">
            <div className="border-b border-slate-200 dark:border-slate-800 pb-3 flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Thermometer className="w-4 h-4 text-rose-500" />
                4. Thermal Limits & Measured Temperature
              </h3>
              <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold uppercase tracking-wider">
                Critical Compliance Parameters
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-slate-700 dark:text-slate-300 font-bold text-xs block mb-1.5">
                  Min Temp (°C) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={form.required_temp_min}
                  onChange={(e) => handleChange('required_temp_min', parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-slate-200 font-mono font-bold focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-700 dark:text-slate-300 font-bold text-xs block mb-1.5">
                  Max Temp (°C) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={form.required_temp_max}
                  onChange={(e) => handleChange('required_temp_max', parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-slate-200 font-mono font-bold focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-700 dark:text-slate-300 font-bold text-xs block mb-1.5">
                  Current Measured (°C) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={form.current_temp}
                  onChange={(e) => handleChange('current_temp', parseFloat(e.target.value) || 0)}
                  className={`w-full border rounded-xl p-2.5 text-xs font-mono font-black focus:outline-none ${
                    isTempBreached ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-500 text-rose-600 dark:text-rose-400' :
                    isTempOverfrozen ? 'bg-cyan-50 dark:bg-cyan-950/60 border-cyan-500 text-cyan-600 dark:text-cyan-400' :
                    'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-emerald-600 dark:text-emerald-400'
                  }`}
                />
              </div>
            </div>

            {/* Thermal Indicator Visual */}
            <div className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-between ${
              isTempBreached ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-400 text-rose-800 dark:text-rose-300' :
              isTempOverfrozen ? 'bg-cyan-50 dark:bg-cyan-950/40 border-cyan-400 text-cyan-800 dark:text-cyan-300' :
              'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 text-emerald-800 dark:text-emerald-300'
            }`}>
              <div className="flex items-center gap-2">
                <Thermometer className="w-4 h-4 shrink-0" />
                <span>
                  {isTempBreached ? `🚨 THERMAL EXCURSION: +${tempOffset.toFixed(1)}°C above max limit (${form.required_temp_max}°C)` :
                   isTempOverfrozen ? `⚠️ Overfreezing anomaly: temperature below recommended min (${form.required_temp_min}°C)` :
                   `✅ In Thermal Range: ${form.current_temp}°C (Safe limit: ${form.required_temp_min}°C to ${form.required_temp_max}°C)`}
                </span>
              </div>
              <span className="font-mono text-[10px] uppercase">
                {isTempBreached ? 'QUARANTINE RISK' : 'COMPLIANT'}
              </span>
            </div>

            {/* IoT Sensor & Calibration Section */}
            <div className="border-t border-slate-200 dark:border-slate-800 pt-4 space-y-4">
              <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Cpu className="w-4 h-4 text-cyan-500" />
                5. IoT Sensor Hardware & ISO 17025 Calibration
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-700 dark:text-slate-300 font-bold text-xs block mb-1.5">
                    Sensor Logger ID <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.sensor_id}
                    onChange={(e) => handleChange('sensor_id', e.target.value)}
                    placeholder="e.g. SNS-TEMP-001"
                    className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-slate-200 font-mono font-bold focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-slate-700 dark:text-slate-300 font-bold text-xs block mb-1.5">
                    Calibration Status (ISO 17025) <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={form.calibration_status}
                    onChange={(e) => handleChange('calibration_status', e.target.value as 'VALID' | 'EXPIRED')}
                    className={`w-full border rounded-xl p-2.5 text-xs font-bold focus:outline-none ${
                      form.calibration_status === 'VALID' ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-400 text-emerald-800 dark:text-emerald-300' :
                      'bg-rose-50 dark:bg-rose-950/60 border-rose-400 text-rose-800 dark:text-rose-300'
                    }`}
                  >
                    <option value="VALID">VALID (Certified within ISO Window)</option>
                    <option value="EXPIRED">EXPIRED (Mandatory Recalibration Overdue)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-700 dark:text-slate-300 font-bold text-xs block mb-1.5">
                    Last Calibration Date
                  </label>
                  <input
                    type="date"
                    value={form.calibration_date}
                    onChange={(e) => handleChange('calibration_date', e.target.value)}
                    className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-slate-200 font-bold focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-slate-700 dark:text-slate-300 font-bold text-xs block mb-1.5">
                    Calibration Due Date
                  </label>
                  <input
                    type="date"
                    value={form.calibration_due_date}
                    onChange={(e) => handleChange('calibration_due_date', e.target.value)}
                    className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-slate-200 font-bold focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Notes & Remarks */}
            <div className="border-t border-slate-200 dark:border-slate-800 pt-4">
              <label className="text-slate-700 dark:text-slate-300 font-bold text-xs block mb-1.5">
                Audit Notes / Quality Remarks
              </label>
              <textarea
                rows={2}
                value={form.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder="Enter inspector remarks, seal serial numbers, or pre-flight clearance notes..."
                className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-slate-200 font-medium focus:border-cyan-500 focus:outline-none leading-relaxed"
              />
            </div>
          </div>
        </div>

        {/* Action Controls & Workflow Buttons */}
        <div className="glass-card p-6 rounded-2xl border border-cyan-500/30 shadow-xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-cyan-600 dark:text-cyan-400 block mb-0.5">
                STEP 2 & 3: COMPLIANCE ANALYSIS, PERSISTENCE & AUDIT REPORTS
              </span>
              <h2 className="text-sm font-black text-slate-900 dark:text-white">
                Validate, Save to SQLite, Generate Evidence Pack & View Audit Report
              </h2>
            </div>

            {/* Action Buttons Bar: All 4 buttons */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                type="button"
                id="btn-validate-record"
                disabled={isValidating}
                onClick={handleValidateRecord}
                className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer border border-slate-300 dark:border-slate-700 transition-all shadow-xs disabled:opacity-50"
              >
                {isValidating ? <RefreshCw className="w-4 h-4 animate-spin text-cyan-500" /> : <ShieldCheck className="w-4 h-4 text-cyan-500" />}
                <span>Validate Record</span>
              </button>

              <button
                type="button"
                id="btn-save-record"
                disabled={isSaving}
                onClick={handleSaveRecord}
                className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-md shadow-cyan-600/25 transition-all hover:scale-105 disabled:opacity-50"
              >
                {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                <span>Save Record</span>
              </button>

              <button
                type="button"
                id="btn-generate-evidence-pack"
                disabled={isGeneratingPack}
                onClick={handleGenerateEvidencePack}
                className="px-4 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-md shadow-teal-600/25 transition-all hover:scale-105 disabled:opacity-50"
              >
                {isGeneratingPack ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
                <span>Generate Evidence Pack</span>
              </button>

              <button
                type="button"
                id="btn-generate-audit-report"
                disabled={isGeneratingReport}
                onClick={handleGenerateAuditReport}
                className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-black flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-600/25 transition-all hover:scale-105 disabled:opacity-50"
              >
                {isGeneratingReport ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileCheck2 className="w-4 h-4" />}
                <span>Generate Audit Report</span>
              </button>
            </div>
          </div>

          {/* Validation & Compliance Findings Results Display */}
          {validationResult && (
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-4 anim-fade-in">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border ${
                    validationResult.compliance_status === 'NORMAL' ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/40' :
                    validationResult.compliance_status === 'WARNING' ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-500/40' :
                    'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-500/40'
                  }`}>
                    COMPLIANCE STATUS: {validationResult.compliance_status}
                  </span>
                  <span className="text-xs text-slate-500 font-mono">
                    Calculated Risk Score: <span className="font-bold text-slate-700 dark:text-slate-200">{validationResult.risk_score}</span>
                  </span>
                </div>

                <div className="text-xs text-slate-500 font-medium">
                  {validationResult.summary}
                </div>
              </div>

              {/* Validation errors if any */}
              {validationResult.validation_errors && validationResult.validation_errors.length > 0 && (
                <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-500/40 text-rose-900 dark:text-rose-200 text-xs space-y-1">
                  <div className="font-black flex items-center gap-1.5">
                    <XCircle className="w-4 h-4 text-rose-600" />
                    Validation Errors to Correct:
                  </div>
                  <ul className="list-disc pl-5 space-y-0.5">
                    {validationResult.validation_errors.map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Findings Cards List */}
              {validationResult.findings && validationResult.findings.length > 0 && (
                <div className="space-y-2">
                  <div className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Automated Compliance Findings & Recommendations:
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {validationResult.findings.map((f, i) => (
                      <div
                        key={i}
                        className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
                          f.severity === 'NORMAL' ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-500/30 text-slate-800 dark:text-slate-200' :
                          f.severity === 'WARNING' ? 'bg-amber-50/70 dark:bg-amber-950/40 border-amber-300 dark:border-amber-500/30 text-slate-800 dark:text-slate-200' :
                          'bg-rose-50/70 dark:bg-rose-950/40 border-rose-300 dark:border-rose-500/30 text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between font-black">
                          <span className="flex items-center gap-1.5">
                            {f.severity === 'NORMAL' ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> :
                             f.severity === 'WARNING' ? <AlertTriangle className="w-4 h-4 text-amber-500" /> :
                             <AlertCircle className="w-4 h-4 text-rose-500" />}
                            {f.title}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[9px] uppercase font-black ${
                            f.severity === 'NORMAL' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                            f.severity === 'WARNING' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                            'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          }`}>
                            {f.severity}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                          {f.description}
                        </p>
                        {f.action && (
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold bg-white/60 dark:bg-slate-900/60 p-2 rounded-lg border border-slate-200 dark:border-slate-800">
                            Action: {f.action}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Evidence Pack Summary Panel (if generated) */}
        {evidencePack && (
          <div className="glass-card p-6 rounded-2xl border border-emerald-500/30 shadow-xl space-y-4 anim-fade-up">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-300 dark:border-emerald-500/30">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    Generated Compliance Evidence Pack ({evidencePack.report_id})
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Batch {evidencePack.batch_id} • Shipment {evidencePack.shipment_id}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-xs font-black uppercase border ${
                  evidencePack.overall_status === 'PASSED' ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-300' : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-300'
                }`}>
                  Status: {evidencePack.overall_status}
                </span>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/20 cursor-pointer flex items-center gap-1.5"
                >
                  <Eye className="w-4 h-4" />
                  <span>Open Full Audit Report Modal</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
              <div className="glass-panel p-4 rounded-xl border border-teal-500/30 text-center">
                <div className="text-[10px] uppercase font-bold text-teal-600 dark:text-teal-400">Readiness Score</div>
                <div className="text-3xl font-black text-teal-600 dark:text-teal-400 my-1">{evidencePack.completeness_score}%</div>
                <div className="text-[10px] text-slate-400 font-medium">Joined Multi-Table Evidence</div>
              </div>

              <div className="glass-panel p-4 rounded-xl space-y-1 md:col-span-3">
                <div className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">Executive Summary</div>
                <p className="text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                  {evidencePack.executive_summary}
                </p>
                <div className="flex flex-wrap gap-3 pt-2 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  <span>📍 Handovers: <strong className="text-slate-800 dark:text-white">{evidencePack.custody_handovers.length}</strong></span>
                  <span>🚛 Route Checkpoints: <strong className="text-slate-800 dark:text-white">{evidencePack.route_events.length}</strong></span>
                  <span>⚙️ Calibrations: <strong className="text-slate-800 dark:text-white">{evidencePack.calibration_evidence.length}</strong></span>
                  <span>📊 ML Risk: <strong className="text-slate-800 dark:text-white">{evidencePack.ml_anomaly_findings.risk_level}</strong></span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Database Telemetry Observations Preview (if available from auto-fill) */}
        {recentObservations && recentObservations.length > 0 && (
          <div className="glass-card p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Cpu className="w-4 h-4 text-cyan-500" />
                Live Sensor Observations Stream from Database ({recentObservations.length} recent telemetry points)
              </h3>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                ✓ Verified DB Sensor Logs
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-[10px] uppercase">
                    <th className="py-2 px-3">Timestamp</th>
                    <th className="py-2 px-3">Temperature</th>
                    <th className="py-2 px-3">Humidity</th>
                    <th className="py-2 px-3">Location</th>
                    <th className="py-2 px-3">Battery</th>
                    <th className="py-2 px-3">Quality Flags</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono text-[11px]">
                  {recentObservations.map((obs, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-2 px-3 text-slate-600 dark:text-slate-400">{obs.timestamp}</td>
                      <td className="py-2 px-3 font-bold text-cyan-600 dark:text-cyan-400">{obs.temperature}°C</td>
                      <td className="py-2 px-3 text-slate-600 dark:text-slate-300">{obs.humidity}%</td>
                      <td className="py-2 px-3 font-sans text-slate-700 dark:text-slate-300 truncate max-w-[200px]">{obs.location}</td>
                      <td className="py-2 px-3">{obs.battery_status}%</td>
                      <td className="py-2 px-3 font-sans">
                        {obs.is_missing ? <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-[9px] font-bold mr-1">Missing/Imputed</span> : null}
                        {obs.is_noisy ? <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 text-[9px] font-bold mr-1">Noisy</span> : null}
                        {!obs.is_missing && !obs.is_noisy ? <span className="text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">Normal Telemetry</span> : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Audit Report Modal integration */}
      {isModalOpen && evidencePack && (
        <AuditReportModal evidencePack={evidencePack} onClose={() => setIsModalOpen(false)} />
      )}
    </div>
  );
};
