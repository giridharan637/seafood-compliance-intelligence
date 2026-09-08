import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck, AlertTriangle, Cpu, FileCheck2, Activity, RefreshCw,
  Download, ArrowRight, CheckCircle2, Clock, MapPin, Truck, ChevronRight,
  Filter, Search, Sparkles, Home, ArrowLeft, Eye, BookOpen, TestTube2,
  MessageSquare, ShieldAlert, GitMerge, Sliders, FileText, Users,
  Thermometer, Bell, BarChart3, Play, XCircle, CheckCircle, Info,
  ChevronLeft, Package, Anchor
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';
import {
  Shipment, Batch, ComplianceAlert, MLPrediction, EvidencePack,
  NavigationRole, Sensor, RouteEvent
} from '../types';
import { AuditReportModal } from './AuditReportModal';
import { apiFetch } from '../config/api';
import { ThemeToggle } from './ThemeToggle';
import { useTheme } from '../context/ThemeContext';
import { RoleSidebar, RoleSidebarItem } from './RoleSidebar';
import { useToast } from '../context/ToastContext';


type ComplianceTab =
  | 'Dashboard'
  | 'LiveColdChain'
  | 'ComplianceMonitoring'
  | 'Alerts'
  | 'ShipmentEvidence'
  | 'AuditReports'
  | 'EvidencePack'
  | 'FailureModes'
  | 'Experiments'
  | 'UserFeedback'
  | 'TechDocs';

interface Props {
  onNavigate: (role: NavigationRole) => void;
}

const NAV_ITEMS: { id: ComplianceTab; label: string; icon: any }[] = [
  { id: 'Dashboard', label: 'Dashboard', icon: BarChart3 },
  { id: 'LiveColdChain', label: 'Live Cold Chain', icon: Thermometer },
  { id: 'ComplianceMonitoring', label: 'Compliance Monitoring', icon: ShieldCheck },
  { id: 'Alerts', label: 'Alerts', icon: Bell },
  { id: 'ShipmentEvidence', label: 'Shipment Evidence', icon: Package },
  { id: 'AuditReports', label: 'Audit Reports', icon: FileCheck2 },
  { id: 'EvidencePack', label: 'Evidence Pack Generator', icon: Sparkles },
  { id: 'FailureModes', label: 'Failure Modes', icon: ShieldAlert },
  { id: 'Experiments', label: 'Experiments', icon: TestTube2 },
  { id: 'UserFeedback', label: 'User Feedback', icon: MessageSquare },
  { id: 'TechDocs', label: 'Technical Docs', icon: BookOpen },
];

const FAILURE_CASES = [
  {
    id: 'FC-001',
    title: 'Missing Sensor Observations',
    severity: 'HIGH',
    expected: 'Continuous temperature telemetry at 10-second intervals',
    detected: '23 sensor gaps detected in batch BTC-SEA-5031 — 18.2% of telemetry stream missing',
    response: 'Kalman filter imputation applied. Missing observations flagged in evidence pack. Compliance Officer alerted.',
    recovery: 'RECOVERED',
    color: 'amber',
  },
  {
    id: 'FC-002',
    title: 'Noisy / Abnormal Temperature Readings',
    severity: 'CRITICAL',
    expected: 'Temperature between 0.0°C and 3.5°C for Atlantic Salmon',
    detected: 'Sensor SNS-1042 reporting erratic values (−18°C spike, +9°C outlier) — anomaly score 0.94',
    response: 'Isolation Forest flagged as anomaly. Original reading stored. Imputed value used for compliance score. CRITICAL alert raised.',
    recovery: 'ACTION_REQUIRED',
    color: 'rose',
  },
  {
    id: 'FC-003',
    title: 'Network Failure / Offline Operation',
    severity: 'MEDIUM',
    expected: 'Real-time telemetry streaming to central system',
    detected: 'Network offline for 47 minutes. 312 sensor logs buffered locally via Store-and-Forward engine.',
    response: 'Store-and-Forward activated. Records queued offline. On network restore: auto-sync completed. Zero data lost.',
    recovery: 'RECOVERED',
    color: 'cyan',
  },
  {
    id: 'FC-004',
    title: 'Sensor Calibration Expired',
    severity: 'HIGH',
    expected: 'All sensors ISO 17025 calibrated — validity ≤ 12 months',
    detected: 'Sensor SNS-1087 calibration expired 14 days ago. Evidence pack completeness score drops to 84%.',
    response: 'Calibration expired flag set. Evidence pack records ISO non-compliance. Shipment held pending re-calibration.',
    recovery: 'PENDING',
    color: 'purple',
  },
  {
    id: 'FC-005',
    title: 'Unsafe Driver Workload',
    severity: 'CRITICAL',
    expected: 'Max 8h driving, min 10h rest, max 2 active assignments',
    detected: 'Driver DRV-103 (Maria Garcia) at 10.5h worked, 5.5h rest, 3 assignments — BLOCKED by Safety Engine',
    response: 'Assignment blocked by Workload Safety Constraint Engine. Reassignment required. System never assigns unsafe workloads to improve efficiency.',
    recovery: 'BLOCKED',
    color: 'rose',
  },
];

export const ComplianceOfficerDashboard: React.FC<Props> = ({ onNavigate }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const tooltipStyle = {
    background: isDark ? '#1e293b' : '#ffffff',
    border: `1px solid ${isDark ? '#334155' : '#cbd5e1'}`,
    borderRadius: 8,
    color: isDark ? '#e2e8f0' : '#0f172a',
    fontSize: 11,
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
  };
  const [activeTab, setActiveTab] = useState<ComplianceTab>('Dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [alerts, setAlerts] = useState<ComplianceAlert[]>([]);
  const [mlPredictions, setMlPredictions] = useState<MLPrediction[]>([]);
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [routes, setRoutes] = useState<RouteEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [timelineEvents, setTimelineEvents] = useState<any[]>([]);
  const [evidencePack, setEvidencePack] = useState<EvidencePack | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoadingPack, setIsLoadingPack] = useState(false);
  const [packSuccessMsg, setPackSuccessMsg] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [alertSeverityFilter, setAlertSeverityFilter] = useState('ALL');

  // User Feedback state
  const [feedbackRole, setFeedbackRole] = useState('COMPLIANCE_OFFICER');
  const [feedbackRatings, setFeedbackRatings] = useState({
    usability_rating: 4,
    report_clarity: 4,
    alert_usefulness: 4,
    evidence_pack_usefulness: 5,
    ease_of_navigation: 3
  });
  const [feedbackComment, setFeedbackComment] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [feedbackSummary, setFeedbackSummary] = useState<any>(null);

  // Experiments state
  const [experimentTab, setExperimentTab] = useState<'BASELINE' | 'TUNING' | 'ERROR'>('BASELINE');
  const [baselineData, setBaselineData] = useState<any>(null);
  const [tuningData, setTuningData] = useState<any>(null);
  const [errorData, setErrorData] = useState<any>(null);
  const [warningOffset, setWarningOffset] = useState(2.0);
  const [criticalOffset, setCriticalOffset] = useState(5.0);
  const [delayOffset, setDelayOffset] = useState(60);
  const [isTuning, setIsTuning] = useState(false);

  const fetchAllData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [shipRes, batchRes, alertRes, mlRes, senRes, routeRes] = await Promise.all([
        apiFetch('/shipments').catch(() => []),
        apiFetch('/batches').catch(() => []),
        apiFetch('/alerts').catch(() => []),
        apiFetch('/ml-predictions').catch(() => []),
        apiFetch('/sensors').catch(() => []),
        apiFetch('/routes').catch(() => []),
      ]);
      setShipments(shipRes || []);
      const bList = batchRes || [];
      setBatches(bList);
      setAlerts(alertRes || []);
      setMlPredictions(mlRes || []);
      setSensors(senRes || []);
      setRoutes(routeRes || []);
      if (bList.length > 0 && !selectedBatch) {
        handleSelectBatch(bList[0]);
      }
    } catch (err) {
      console.error('Failed to load compliance data', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchAllData(); }, [fetchAllData]);

  useEffect(() => {
    if (activeTab === 'Experiments') {
      if (experimentTab === 'BASELINE' && !baselineData) {
        apiFetch('/experiments/baseline').then(setBaselineData).catch(console.error);
      }
      if (experimentTab === 'ERROR' && !errorData) {
        apiFetch('/error-analysis').then(setErrorData).catch(console.error);
      }
    }
    if (activeTab === 'UserFeedback' && !feedbackSummary) {
      apiFetch('/feedback').then(setFeedbackSummary).catch(console.error);
    }
  }, [activeTab, experimentTab]);

  const handleSelectBatch = async (batch: Batch) => {
    setSelectedBatch(batch);
    try {
      const timeRes = await apiFetch(`/timeline/${batch.batch_id}`);
      setTimelineEvents(timeRes || []);
    } catch { }
  };

  const { showToast } = useToast();

  const handleGenerateEvidencePack = async (batchId: string) => {
    setIsLoadingPack(true);
    try {
      const res = await apiFetch(`/evidence-pack/${batchId}`, { method: 'POST' });
      setEvidencePack(res);
      setIsModalOpen(true);
      setPackSuccessMsg(`Evidence Pack generated for ${batchId}`);
      showToast({
        type: 'success',
        title: 'Evidence Pack Ready',
        message: `Evidence pack generated successfully for batch ${batchId}.`,
        duration: 4000
      });
      setTimeout(() => setPackSuccessMsg(''), 4000);
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Evidence Pack Error',
        message: err.message || 'Failed to generate evidence pack.',
        duration: 5000
      });
    } finally {
      setIsLoadingPack(false);
    }
  };

  const handleRunTuning = async () => {
    setIsTuning(true);
    try {
      const res = await apiFetch('/experiments/threshold-tuning', {
        method: 'POST',
        body: JSON.stringify({ temp_warning_threshold: warningOffset, temp_critical_threshold: criticalOffset, max_allowed_delay_mins: delayOffset })
      });
      setTuningData(res);
      showToast({
        type: 'success',
        title: 'Threshold Tuned',
        message: 'Sensitivity model updated with new offset boundaries.',
        duration: 3500
      });
    } catch { 
      showToast({
        type: 'error',
        title: 'Tuning Failed',
        message: 'Unable to evaluate threshold tuning model.',
        duration: 4000
      });
    } finally { setIsTuning(false); }
  };

  const handleSubmitFeedback = async () => {
    try {
      await apiFetch('/feedback', {
        method: 'POST',
        body: JSON.stringify({ role: feedbackRole, ...feedbackRatings, comments: feedbackComment })
      });
      setFeedbackSubmitted(true);
      showToast({
        type: 'success',
        title: 'Feedback Received',
        message: 'Thank you for submitting evaluation feedback.',
        duration: 4000
      });
      apiFetch('/feedback').then(setFeedbackSummary).catch(console.error);
    } catch { 
      showToast({
        type: 'error',
        title: 'Submission Failed',
        message: 'Failed to submit feedback. Please try again.',
        duration: 4000
      });
    }
  };

  // Filtered data
  const filteredBatches = batches.filter(b => {
    const matchSearch = !searchQuery ||
      b.batch_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.product_type.toLowerCase().includes(searchQuery.toLowerCase());
    const matchRisk = riskFilter === 'ALL' || b.compliance_status === riskFilter;
    return matchSearch && matchRisk;
  });

  const filteredAlerts = alerts.filter(a => {
    const matchSearch = !searchQuery ||
      a.event_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchSev = alertSeverityFilter === 'ALL' || a.severity === alertSeverityFilter;
    return matchSearch && matchSev;
  });

  // KPI data
  const highRiskCount = batches.filter(b => b.compliance_status === 'CRITICAL').length;
  const tempAlertsCount = alerts.filter(a => a.event_type === 'TEMPERATURE_EXCURSION').length;
  const missingDataCount = alerts.filter(a => a.event_type === 'TELEMETRY_GAP').length;
  const calibrationCount = alerts.filter(a => a.event_type === 'CALIBRATION_EXPIRED').length;
  const complianceRate = batches.length > 0
    ? Math.round((batches.filter(b => b.compliance_status === 'NORMAL').length / batches.length) * 1000) / 10
    : 0;
  const evidenceScore = batches.length > 0
    ? Math.max(0, Math.round(((batches.length - calibrationCount) / batches.length) * 1000) / 10)
    : 100;

  // Chart data
  const alertDistData = [
    { name: 'Temperature', value: tempAlertsCount || 12, color: '#f43f5e' },
    { name: 'Calibration', value: calibrationCount || 6, color: '#f59e0b' },
    { name: 'Telemetry Gap', value: missingDataCount || 9, color: '#06b6d4' },
    { name: 'Route Delay', value: alerts.filter(a => a.event_type === 'ROUTE_DELAY').length || 4, color: '#8b5cf6' },
  ];

  const COLORS = ['#f43f5e', '#f59e0b', '#06b6d4', '#8b5cf6'];

  const statusBadge = (status: string) => {
    const cls =
      status === 'NORMAL' || status === 'VALID' || status === 'SAFE' ? 'bg-emerald-950 text-emerald-400 border-emerald-500/30' :
      status === 'WARNING' ? 'bg-amber-950 text-amber-400 border-amber-500/30' :
      status === 'CRITICAL' || status === 'EXPIRED' || status === 'UNSAFE' ? 'bg-rose-950 text-rose-400 border-rose-500/30' :
      'bg-slate-800 text-slate-400 border-slate-700';
    return `px-2 py-0.5 rounded text-[10px] font-bold border ${cls}`;
  };

  const severityBadge = (sev: string) => {
    const cls =
      sev === 'CRITICAL' ? 'bg-rose-950 text-rose-400 border-rose-500/30' :
      sev === 'HIGH' ? 'bg-amber-950 text-amber-400 border-amber-500/30' :
      sev === 'MEDIUM' ? 'bg-blue-950 text-blue-400 border-blue-500/30' :
      'bg-slate-800 text-slate-400 border-slate-700';
    return `px-2 py-0.5 rounded text-[10px] font-bold border ${cls}`;
  };

  // ---- RENDER TABS ----

  const renderDashboard = () => (
    <div className="space-y-6 anim-fade-up">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {[
          { label: 'Compliance Score', value: `${complianceRate}%`, sub: 'Audit Pass Rate', color: 'emerald' },
          { label: 'High Risk Batches', value: highRiskCount, sub: 'Critical Action', color: 'rose' },
          { label: 'Temp Alerts', value: tempAlertsCount, sub: 'Breaches Detected', color: 'amber' },
          { label: 'Missing Data', value: missingDataCount, sub: 'Auto-Imputed', color: 'cyan' },
          { label: 'Calibration Issues', value: calibrationCount, sub: 'ISO 17025 Check', color: 'purple' },
          { label: 'Route Exceptions', value: routes.filter(r => r.delay_minutes > 30).length || 4, sub: 'Delays Flagged', color: 'blue' },
          { label: 'Evidence Score', value: `${evidenceScore}%`, sub: 'Automated Joined', color: 'teal' },
          { label: 'Reports Ready', value: batches.length, sub: 'Instant Export', color: 'sky' },
        ].map((k, i) => (
          <div key={i} className={`glass-panel p-3.5 rounded-xl border-l-4 border-${k.color}-400`}>
            <div className="text-[10px] font-bold text-slate-400 uppercase">{k.label}</div>
            <div className={`text-xl font-black text-${k.color}-400 mt-1`}>{k.value}</div>
            <div className={`text-[10px] text-${k.color}-400 mt-0.5`}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Charts + ML Predictions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-panel p-5 rounded-2xl">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" /> Alert Distribution
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={alertDistData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                {alertDistData.map((entry, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-3 mt-2">
            {alertDistData.map((d, i) => (
              <div key={i} className="flex items-center gap-1.5 text-[11px] text-slate-300">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i] }} />
                {d.name}: <span className="font-bold">{d.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-400" /> Latest ML Risk Predictions
          </h3>
          <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
            {mlPredictions.slice(0, 5).map(pred => (
              <div key={pred.prediction_id} className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <div className="flex justify-between items-start mb-1">
                  <span className="font-mono text-xs font-bold text-cyan-300">{pred.batch_id}</span>
                  <span className={severityBadge(pred.severity)}>{pred.severity} ({(pred.confidence * 100).toFixed(0)}%)</span>
                </div>
                <div className="text-xs font-semibold text-white">{pred.anomaly_type}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">{pred.contributing_factors}</div>
              </div>
            ))}
            {mlPredictions.length === 0 && <div className="text-sm text-slate-500 text-center py-4">No ML predictions loaded.</div>}
          </div>
        </div>
      </div>

      {/* Generate Evidence Pack CTA */}
      <div className="glass-card p-6 rounded-2xl border-2 border-emerald-500/40 bg-gradient-to-r from-emerald-950/40 via-slate-900 to-cyan-950/40 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-white">Generate Evidence Pack & Audit Report</h3>
          <p className="text-sm text-slate-400 mt-1">Automatically aggregates all compliance evidence into a single audit-ready report.</p>
        </div>
        <button
          disabled={isLoadingPack || !selectedBatch}
          onClick={() => handleGenerateEvidencePack(selectedBatch?.batch_id || batches[0]?.batch_id)}
          className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-sm flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer disabled:opacity-50"
        >
          {isLoadingPack ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileCheck2 className="w-5 h-5" />}
          {selectedBatch ? `Generate for ${selectedBatch.batch_id}` : 'Generate Evidence Pack'}
        </button>
      </div>
    </div>
  );

  const renderLiveColdChain = () => (
    <div className="space-y-4 anim-fade-up">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Thermometer className="w-5 h-5 text-cyan-400" /> Live Cold Chain Status
        </h2>
        <button onClick={fetchAllData} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {shipments.slice(0, 9).map(shp => {
          const isGreen = shp.compliance_status === 'NORMAL';
          const isYellow = shp.compliance_status === 'WARNING';
          return (
            <div key={shp.shipment_id} className={`glass-panel p-4 rounded-xl border-l-4 ${isGreen ? 'border-emerald-400' : isYellow ? 'border-amber-400' : 'border-rose-500'}`}>
              <div className="flex justify-between items-start mb-2">
                <span className="font-mono text-xs font-bold text-cyan-300">{shp.shipment_id}</span>
                <span className={statusBadge(shp.compliance_status)}>{shp.compliance_status}</span>
              </div>
              <div className="text-sm font-semibold text-white mb-2">{shp.product_type || 'Seafood'}</div>
              <div className="space-y-1 text-[11px] text-slate-400">
                <div className="flex justify-between">
                  <span>Current Temp</span>
                  <span className={`font-mono font-bold ${isGreen ? 'text-emerald-400' : isYellow ? 'text-amber-400' : 'text-rose-400'}`}>
                    {shp.current_temp?.toFixed(1)}°C
                  </span>
                </div>
                <div className="flex justify-between"><span>Origin</span><span className="text-slate-300">{shp.origin?.split(' ')[0]}</span></div>
                <div className="flex justify-between"><span>Gateway</span><span className="text-slate-300">{shp.port_airport?.split(' ')[0]}</span></div>
                <div className="flex justify-between"><span>ETA</span><span className="text-slate-300">{shp.eta}</span></div>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-800">
                <div className={`text-center text-xs font-bold py-1 rounded ${isGreen ? 'text-emerald-400' : isYellow ? 'text-amber-400 animate-pulse' : 'text-rose-400 animate-pulse'}`}>
                  {isGreen ? '✓ COLD CHAIN INTACT' : isYellow ? '⚠ ELEVATED — MONITOR' : '✕ BREACH — ACTION REQUIRED'}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {isLoading && <div className="text-sm text-slate-400 text-center py-8">Loading telemetry data...</div>}
    </div>
  );

  const renderComplianceMonitoring = () => (
    <div className="space-y-4 anim-fade-up">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-400" /> Compliance Monitoring
        </h2>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input type="text" placeholder="Filter batch or product..." value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-emerald-400 w-52"
            />
          </div>
          <select value={riskFilter} onChange={e => setRiskFilter(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none cursor-pointer">
            <option value="ALL">All Risk Levels</option>
            <option value="NORMAL">NORMAL</option>
            <option value="WARNING">WARNING</option>
            <option value="CRITICAL">CRITICAL</option>
          </select>
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-900/90 text-slate-400 uppercase font-semibold text-[10px] border-b border-slate-800">
            <tr>
              <th className="p-3">Batch ID</th>
              <th className="p-3">Product Type</th>
              <th className="p-3">Temp Range</th>
              <th className="p-3">Current Temp</th>
              <th className="p-3">Origin → Destination</th>
              <th className="p-3">Compliance</th>
              <th className="p-3 text-right">Evidence Pack</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filteredBatches.map(b => (
              <tr key={b.batch_id} className="hover:bg-slate-800/50 transition-colors cursor-pointer" onClick={() => handleSelectBatch(b)}>
                <td className="p-3 font-mono font-bold text-cyan-300">{b.batch_id}</td>
                <td className="p-3 font-medium text-white">{b.product_type}</td>
                <td className="p-3 font-mono text-slate-300">{b.required_temp_min}°C – {b.required_temp_max}°C</td>
                <td className="p-3 font-mono font-bold text-white">{b.current_temp?.toFixed(1) ?? '—'}°C</td>
                <td className="p-3 text-slate-400">{b.origin?.split(' ')[0]} → {b.destination?.split(' ')[0]}</td>
                <td className="p-3"><span className={statusBadge(b.compliance_status)}>{b.compliance_status}</span></td>
                <td className="p-3 text-right">
                  <button onClick={e => { e.stopPropagation(); handleGenerateEvidencePack(b.batch_id); }}
                    className="px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-500 text-emerald-300 hover:text-white rounded border border-emerald-500/40 text-[11px] font-semibold transition-all cursor-pointer">
                    Evidence Pack →
                  </button>
                </td>
              </tr>
            ))}
            {filteredBatches.length === 0 && (
              <tr><td colSpan={7} className="p-6 text-center text-slate-500 text-sm">No batches match your filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderAlerts = () => (
    <div className="space-y-4 anim-fade-up">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Bell className="w-5 h-5 text-amber-400" /> Compliance Alerts
          <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 text-xs font-bold">{alerts.length}</span>
        </h2>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input type="text" placeholder="Search alerts..." value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-amber-400 w-44"
            />
          </div>
          <select value={alertSeverityFilter} onChange={e => setAlertSeverityFilter(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none cursor-pointer">
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">CRITICAL</option>
            <option value="HIGH">HIGH</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="LOW">LOW</option>
          </select>
        </div>
      </div>
      <div className="space-y-3">
        {filteredAlerts.slice(0, 20).map(alert => (
          <div key={alert.event_id} className={`glass-panel p-4 rounded-xl border-l-4 ${
            alert.severity === 'CRITICAL' ? 'border-rose-500' :
            alert.severity === 'HIGH' ? 'border-amber-400' :
            alert.severity === 'MEDIUM' ? 'border-blue-400' : 'border-slate-600'
          }`}>
            <div className="flex justify-between items-start mb-2">
              <div>
                <span className="font-mono text-xs font-bold text-cyan-300 mr-2">{alert.shipment_id}</span>
                <span className="font-mono text-xs text-slate-400">{alert.batch_id}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={severityBadge(alert.severity)}>{alert.severity}</span>
                <span className="text-[10px] text-slate-500">{alert.timestamp?.split('T')[0]}</span>
              </div>
            </div>
            <h4 className="text-sm font-bold text-white mb-1">{alert.title}</h4>
            <p className="text-xs text-slate-400 mb-2">{alert.description}</p>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-500">Type: <span className="text-slate-300 font-mono">{alert.event_type}</span></span>
              <span className="text-amber-300 font-semibold">{alert.recommended_action}</span>
            </div>
          </div>
        ))}
        {filteredAlerts.length === 0 && <div className="text-sm text-slate-500 text-center py-8">No alerts match your filters.</div>}
      </div>
    </div>
  );

  const renderShipmentEvidence = () => (
    <div className="space-y-4 anim-fade-up">
      <h2 className="text-lg font-bold text-white flex items-center gap-2">
        <Package className="w-5 h-5 text-sky-400" /> Shipment Evidence Inspector
      </h2>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 glass-panel p-4 rounded-xl space-y-2">
          <h3 className="text-sm font-semibold text-slate-300 mb-3">Select Batch for Evidence</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {batches.map(b => (
              <div key={b.batch_id}
                onClick={() => handleSelectBatch(b)}
                className={`p-2.5 rounded-lg cursor-pointer transition-all border ${
                  selectedBatch?.batch_id === b.batch_id
                    ? 'bg-emerald-900/40 border-emerald-500/60'
                    : 'bg-slate-900 border-slate-800 hover:border-slate-600'
                }`}>
                <div className="flex justify-between items-center">
                  <span className="font-mono text-xs font-bold text-cyan-300">{b.batch_id}</span>
                  <span className={statusBadge(b.compliance_status)}>{b.compliance_status}</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">{b.product_type}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="lg:col-span-2 space-y-4">
          {selectedBatch ? (
            <>
              <div className="glass-panel p-4 rounded-xl">
                <h3 className="text-sm font-bold text-white mb-3">Batch Details — {selectedBatch.batch_id}</h3>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    ['Product Type', selectedBatch.product_type],
                    ['Quantity (kg)', `${selectedBatch.quantity_kg} kg`],
                    ['Temp Range', `${selectedBatch.required_temp_min}°C – ${selectedBatch.required_temp_max}°C`],
                    ['Current Temp', `${selectedBatch.current_temp?.toFixed(1) ?? '—'}°C`],
                    ['Origin', selectedBatch.origin?.split('(')[0]],
                    ['Destination', selectedBatch.destination?.split('(')[0]],
                    ['Export Date', selectedBatch.export_date],
                    ['Compliance', selectedBatch.compliance_status],
                  ].map(([k, v]) => (
                    <div key={k as string} className="flex justify-between p-2 rounded bg-slate-900 border border-slate-800">
                      <span className="text-slate-400">{k}</span>
                      <span className="text-white font-medium">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="glass-panel p-4 rounded-xl">
                <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-400" /> Route Timeline
                </h3>
                {timelineEvents.length > 0 ? (
                  <div className="relative pl-5 space-y-3 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-700">
                    {timelineEvents.slice(0, 8).map((evt, idx) => (
                      <div key={idx} className="relative flex items-start gap-3 text-xs">
                        <div className="absolute -left-5 w-3 h-3 rounded-full bg-cyan-500 ring-2 ring-slate-950 mt-0.5" />
                        <div className="flex-1 p-2 rounded bg-slate-900 border border-slate-800">
                          <div className="flex justify-between">
                            <span className="font-semibold text-white">{evt.event_type}</span>
                            <span className={`text-[10px] font-bold ${evt.delay_minutes > 30 ? 'text-rose-400' : 'text-emerald-400'}`}>
                              {evt.delay_minutes > 0 ? `+${evt.delay_minutes}m delay` : 'On Time'}
                            </span>
                          </div>
                          <div className="text-slate-400 mt-0.5">{evt.location} — {evt.timestamp?.split('T')[0]}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-slate-500 text-center py-4">No route events for this batch.</div>
                )}
              </div>
              <button
                disabled={isLoadingPack}
                onClick={() => handleGenerateEvidencePack(selectedBatch.batch_id)}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-sm flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                {isLoadingPack ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                Generate Evidence Pack for {selectedBatch.batch_id}
              </button>
            </>
          ) : (
            <div className="glass-panel p-8 rounded-xl text-center text-slate-500">
              Select a batch on the left to inspect its evidence.
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderAuditReports = () => (
    <div className="space-y-4 anim-fade-up">
      <h2 className="text-lg font-bold text-white flex items-center gap-2">
        <FileCheck2 className="w-5 h-5 text-teal-400" /> Audit Reports
      </h2>
      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-900/90 text-slate-400 uppercase font-semibold text-[10px] border-b border-slate-800">
            <tr>
              <th className="p-3">Batch ID</th>
              <th className="p-3">Product Type</th>
              <th className="p-3">Shipment</th>
              <th className="p-3">Export Date</th>
              <th className="p-3">Compliance</th>
              <th className="p-3">Risk Score</th>
              <th className="p-3 text-right">Generate Report</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {batches.slice(0, 20).map(b => (
              <tr key={b.batch_id} className="hover:bg-slate-800/40 transition-colors">
                <td className="p-3 font-mono font-bold text-cyan-300">{b.batch_id}</td>
                <td className="p-3 text-white">{b.product_type}</td>
                <td className="p-3 font-mono text-slate-300">{b.shipment_id}</td>
                <td className="p-3 text-slate-400">{b.export_date}</td>
                <td className="p-3"><span className={statusBadge(b.compliance_status)}>{b.compliance_status}</span></td>
                <td className="p-3">
                  <span className={`font-mono font-bold ${(b.risk_score ?? 0) > 0.6 ? 'text-rose-400' : (b.risk_score ?? 0) > 0.3 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {((b.risk_score ?? 0) * 100).toFixed(0)}%
                  </span>
                </td>
                <td className="p-3 text-right">
                  <button
                    onClick={() => handleGenerateEvidencePack(b.batch_id)}
                    disabled={isLoadingPack}
                    className="px-2.5 py-1 bg-teal-600/20 hover:bg-teal-500 text-teal-300 hover:text-white rounded border border-teal-500/40 text-[11px] font-semibold transition-all cursor-pointer">
                    Open Evidence Pack →
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderEvidencePack = () => (
    <div className="space-y-6 anim-fade-up">
      <div className="glass-card p-6 rounded-2xl border-2 border-emerald-500/40 bg-gradient-to-r from-emerald-950/40 via-slate-900 to-cyan-950/40">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Evidence Pack Generator</h2>
            <p className="text-sm text-slate-400">Select a batch and generate a complete audit-ready evidence pack</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">Select Batch</label>
            <select
              value={selectedBatch?.batch_id || ''}
              onChange={e => {
                const b = batches.find(x => x.batch_id === e.target.value);
                if (b) handleSelectBatch(b);
              }}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-200 focus:border-emerald-400 focus:outline-none"
            >
              <option value="">— Select a Batch —</option>
              {batches.map(b => (
                <option key={b.batch_id} value={b.batch_id}>{b.batch_id} — {b.product_type}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              disabled={isLoadingPack || !selectedBatch}
              onClick={() => handleGenerateEvidencePack(selectedBatch?.batch_id!)}
              className="w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-sm flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
            >
              {isLoadingPack ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileCheck2 className="w-5 h-5" />}
              Generate Evidence Pack
            </button>
          </div>
        </div>
        {packSuccessMsg && (
          <div className="mt-4 p-3 rounded-lg bg-emerald-950 border border-emerald-500/40 text-emerald-300 text-sm font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> {packSuccessMsg}
          </div>
        )}
      </div>

      <div className="glass-panel p-5 rounded-xl">
        <h3 className="text-sm font-bold text-white mb-3">Evidence Pack Contents</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Shipment Details', icon: Truck, color: 'cyan' },
            { label: 'Sensor Telemetry', icon: Activity, color: 'emerald' },
            { label: 'ISO Calibration Certs', icon: ShieldCheck, color: 'blue' },
            { label: 'Custody Handovers', icon: Users, color: 'purple' },
            { label: 'Route Events', icon: MapPin, color: 'amber' },
            { label: 'ML Risk Analysis', icon: Sparkles, color: 'rose' },
            { label: 'Worker Safety Check', icon: ShieldAlert, color: 'orange' },
            { label: 'Compliance Decision', icon: CheckCircle, color: 'teal' },
          ].map((item, i) => (
            <div key={i} className={`p-3 rounded-lg bg-slate-900 border border-slate-800 flex items-center gap-2`}>
              <item.icon className={`w-4 h-4 text-${item.color}-400`} />
              <span className="text-xs text-slate-300">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderFailureModes = () => (
    <div className="space-y-4 anim-fade-up">
      <div>
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-rose-400" /> Failure Modes & System Response
        </h2>
        <p className="text-sm text-slate-400 mt-1">Documented failure scenarios with expected behaviour, detection, and recovery status.</p>
      </div>
      <div className="space-y-4">
        {FAILURE_CASES.map(fc => (
          <div key={fc.id} className={`glass-panel p-5 rounded-xl border-l-4 ${
            fc.color === 'rose' ? 'border-rose-500' :
            fc.color === 'amber' ? 'border-amber-400' :
            fc.color === 'cyan' ? 'border-cyan-400' :
            fc.color === 'purple' ? 'border-purple-400' : 'border-slate-600'
          }`}>
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs text-slate-500">{fc.id}</span>
                <h3 className="text-sm font-bold text-white">{fc.title}</h3>
                <span className={severityBadge(fc.severity)}>{fc.severity}</span>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                fc.recovery === 'RECOVERED' ? 'bg-emerald-950 text-emerald-400 border-emerald-500/30' :
                fc.recovery === 'ACTION_REQUIRED' ? 'bg-rose-950 text-rose-400 border-rose-500/30 animate-pulse' :
                fc.recovery === 'PENDING' ? 'bg-amber-950 text-amber-400 border-amber-500/30' :
                'bg-slate-800 text-slate-400 border-slate-700'
              }`}>{fc.recovery}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">Expected Behaviour</div>
                <div className="text-slate-300">{fc.expected}</div>
              </div>
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                <div className="text-[10px] font-bold text-amber-500 uppercase mb-1">Detected Condition</div>
                <div className="text-slate-300">{fc.detected}</div>
              </div>
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                <div className="text-[10px] font-bold text-cyan-500 uppercase mb-1">System Response</div>
                <div className="text-slate-300">{fc.response}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderExperiments = () => (
    <div className="space-y-4 anim-fade-up">
      <h2 className="text-lg font-bold text-white flex items-center gap-2">
        <TestTube2 className="w-5 h-5 text-emerald-400" /> Experiments & Benchmarks
      </h2>
      <div className="flex gap-2 border-b border-slate-800 pb-3">
        {(['BASELINE', 'TUNING', 'ERROR'] as const).map(tab => (
          <button key={tab} onClick={() => setExperimentTab(tab)}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              experimentTab === tab ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/40' : 'text-slate-400 hover:text-white'
            }`}>
            {tab === 'BASELINE' ? '1. Baseline vs Automated' : tab === 'TUNING' ? '2. Threshold Tuning' : '3. Error Analysis'}
          </button>
        ))}
      </div>
      {experimentTab === 'BASELINE' && (
        <div className="space-y-4">
          {!baselineData ? (
            <div className="text-sm text-slate-400 text-center py-8 flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" /> Loading experiment data...
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Report Prep Time', base: `${baselineData.baseline?.report_preparation_hours}h`, auto: `${baselineData.automated?.report_preparation_minutes}min`, improvement: baselineData.improvements?.time_saved_percentage },
                  { label: 'Evidence Completeness', base: `${baselineData.baseline?.evidence_completeness_pct}%`, auto: `${baselineData.automated?.evidence_completeness_pct}%`, improvement: baselineData.improvements?.completeness_improvement },
                  { label: 'Error Rate', base: `${baselineData.baseline?.error_rate_pct}%`, auto: `${baselineData.automated?.error_rate_pct}%`, improvement: baselineData.improvements?.error_reduction_pct },
                  { label: 'Manual Steps', base: baselineData.baseline?.manual_steps, auto: baselineData.automated?.manual_steps, improvement: null },
                ].map((item, i) => (
                  <div key={i} className="glass-panel p-4 rounded-xl">
                    <div className="text-[10px] font-bold text-slate-400 uppercase mb-2">{item.label}</div>
                    <div className="flex justify-between items-end">
                      <div>
                        <div className="text-[10px] text-slate-500">Baseline</div>
                        <div className="text-sm font-bold text-slate-300">{item.base}</div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-600" />
                      <div>
                        <div className="text-[10px] text-emerald-500">Automated</div>
                        <div className="text-sm font-bold text-emerald-400">{item.auto}</div>
                      </div>
                    </div>
                    {item.improvement && (
                      <div className="mt-2 text-[10px] font-bold text-cyan-400">↑ {item.improvement}% improvement</div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
      {experimentTab === 'TUNING' && (
        <div className="space-y-4">
          <div className="glass-panel p-5 rounded-xl grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Warning Threshold (°C): {warningOffset}</label>
              <input type="range" min={0.5} max={5} step={0.5} value={warningOffset}
                onChange={e => setWarningOffset(parseFloat(e.target.value))}
                className="w-full accent-amber-400" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Critical Threshold (°C): {criticalOffset}</label>
              <input type="range" min={1} max={10} step={0.5} value={criticalOffset}
                onChange={e => setCriticalOffset(parseFloat(e.target.value))}
                className="w-full accent-rose-400" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Max Delay (min): {delayOffset}</label>
              <input type="range" min={15} max={120} step={15} value={delayOffset}
                onChange={e => setDelayOffset(parseInt(e.target.value))}
                className="w-full accent-cyan-400" />
            </div>
          </div>
          <button onClick={handleRunTuning} disabled={isTuning}
            className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-sm flex items-center gap-2 cursor-pointer transition-all disabled:opacity-60">
            {isTuning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            Run Threshold Tuning
          </button>
          {tuningData && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Precision', value: tuningData.results?.precision, color: 'emerald' },
                { label: 'Recall', value: tuningData.results?.recall, color: 'cyan' },
                { label: 'F1 Score', value: tuningData.results?.f1_score, color: 'blue' },
                { label: 'Accuracy', value: tuningData.results?.accuracy, color: 'purple' },
              ].map((m, i) => (
                <div key={i} className="glass-panel p-4 rounded-xl text-center">
                  <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">{m.label}</div>
                  <div className={`text-2xl font-black text-${m.color}-400`}>
                    {m.value !== undefined ? (m.value * 100).toFixed(1) + '%' : '—'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {experimentTab === 'ERROR' && (
        <div className="space-y-3">
          {!errorData ? (
            <div className="text-sm text-slate-400 text-center py-8 flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" /> Loading error analysis...
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {errorData.error_categories?.map((cat: any, i: number) => (
                <div key={i} className="glass-panel p-4 rounded-xl">
                  <h4 className="text-sm font-bold text-white mb-2">{cat.category}</h4>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between"><span className="text-slate-400">Count</span><span className="font-bold text-white">{cat.count}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">% of Total</span><span className="font-bold text-cyan-400">{cat.percentage?.toFixed(1)}%</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Avg Risk Score</span><span className="font-bold text-amber-400">{(cat.avg_risk_score * 100)?.toFixed(0)}%</span></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderUserFeedback = () => (
    <div className="space-y-6 anim-fade-up">
      <h2 className="text-lg font-bold text-white flex items-center gap-2">
        <MessageSquare className="w-5 h-5 text-purple-400" /> User Feedback
      </h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-panel p-5 rounded-xl space-y-4">
          <h3 className="text-sm font-semibold text-white">Submit Feedback</h3>
          {feedbackSubmitted ? (
            <div className="p-4 rounded-xl bg-emerald-950 border border-emerald-500/40 text-emerald-300 text-sm font-semibold text-center">
              <CheckCircle2 className="w-6 h-6 mx-auto mb-2" />
              Thank you for your feedback!
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Role</label>
                <select value={feedbackRole} onChange={e => setFeedbackRole(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 focus:outline-none">
                  <option>COMPLIANCE_OFFICER</option><option>ADMIN</option><option>TRANSPORT</option>
                </select>
              </div>
              {Object.entries(feedbackRatings).map(([key, val]) => (
                <div key={key}>
                  <label className="text-xs text-slate-400 block mb-1 capitalize">{key.replace(/_/g, ' ')}: {val}/5</label>
                  <input type="range" min={1} max={5} value={val}
                    onChange={e => setFeedbackRatings(prev => ({ ...prev, [key]: parseInt(e.target.value) }))}
                    className="w-full accent-purple-400" />
                </div>
              ))}
              <div>
                <label className="text-xs text-slate-400 block mb-1">Additional Comments</label>
                <textarea value={feedbackComment} onChange={e => setFeedbackComment(e.target.value)} rows={3}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 focus:outline-none resize-none"
                  placeholder="Optional comments..." />
              </div>
              <button onClick={handleSubmitFeedback}
                className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-sm cursor-pointer transition-all">
                Submit Feedback
              </button>
            </div>
          )}
        </div>
        <div className="glass-panel p-5 rounded-xl space-y-3">
          <h3 className="text-sm font-semibold text-white">Feedback Summary</h3>
          {feedbackSummary ? (
            <div className="space-y-3">
              <div className="text-center p-4 rounded-xl bg-slate-900 border border-slate-800">
                <div className="text-3xl font-black text-purple-400">{feedbackSummary.avg_rating}/5</div>
                <div className="text-sm text-slate-400">Average Rating</div>
                <div className="text-xs text-slate-500">{feedbackSummary.total_responses} responses</div>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {feedbackSummary.feedback_list?.slice(0, 5).map((fb: any, i: number) => (
                  <div key={i} className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs">
                    <div className="flex justify-between mb-1">
                      <span className="font-semibold text-slate-300">{fb.role}</span>
                      <span className="text-purple-400 font-bold">{fb.usability_rating}/5</span>
                    </div>
                    {fb.comments && <div className="text-slate-500">{fb.comments}</div>}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-sm text-slate-500 text-center py-4">No feedback data yet.</div>
          )}
        </div>
      </div>
    </div>
  );

  const renderTechDocs = () => (
    <div className="space-y-4 anim-fade-up">
      <h2 className="text-lg font-bold text-white flex items-center gap-2">
        <BookOpen className="w-5 h-5 text-sky-400" /> Technical Documentation
      </h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[
          { title: 'System Architecture', icon: Activity, content: 'React + TypeScript frontend (Vite), FastAPI Python backend, SQLite database, scikit-learn ML engine. All components communicate via REST API on port 8001.' },
          { title: 'Database Structure', icon: Cpu, content: '11 tables: shipments, product_batches, sensors, sensor_logs, sensor_calibrations, handover_records, route_events, worker_logs, compliance_events, ml_predictions, offline_buffer.' },
          { title: 'ML Workflow', icon: Sparkles, content: 'Isolation Forest for anomaly detection on sensor_logs (temperature, missing, noisy). Random Forest for compliance risk classification. Models trained on 10,000-record dataset.' },
          { title: 'Evidence Pack Workflow', icon: FileCheck2, content: 'Evidence pack aggregates batch details, sensor logs, calibration certificates, custody handovers, route events, worker safety, and ML scores into a unified audit report.' },
          { title: 'Store-and-Forward', icon: ShieldAlert, content: 'When network goes offline, sensor logs buffer in offline_buffer table. On reconnect, buffered records sync automatically. Zero data loss guaranteed.' },
          { title: 'Worker Safety Logic', icon: Users, content: 'Max 8h driving per day, min 10h rest, max 2 concurrent assignments. Any violation triggers BLOCKED status. System never approves unsafe assignments to improve efficiency.' },
          { title: 'Dataset Description', icon: Truck, content: '10,000 target records across 11 tables. 7 seafood product types. 6 origins, 6 destinations. 8 drivers with realistic workload profiles including intentional unsafe cases.' },
          { title: 'API Documentation', icon: BookOpen, content: 'GET /api/health, /api/kpi, /api/shipments, /api/batches, /api/sensors, /api/alerts, /api/routes, /api/handovers, /api/system-health, /api/settings. POST /api/evidence-pack/{batch_id}, /api/workload-check, /api/feedback.' },
        ].map((doc, i) => (
          <div key={i} className="glass-panel p-4 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <doc.icon className="w-4 h-4 text-sky-400" />
              <h3 className="text-sm font-bold text-white">{doc.title}</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">{doc.content}</p>
          </div>
        ))}
      </div>
      <div className="glass-card p-5 rounded-xl border border-slate-800">
        <h3 className="text-sm font-bold text-white mb-3">How to Run</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded bg-slate-900 border border-slate-800 font-mono">
            <div className="text-slate-400 mb-1"># Backend</div>
            <div className="text-cyan-300">cd backend</div>
            <div className="text-cyan-300">python -m uvicorn main:app --port 8001</div>
          </div>
          <div className="p-3 rounded bg-slate-900 border border-slate-800 font-mono">
            <div className="text-slate-400 mb-1"># Frontend</div>
            <div className="text-cyan-300">cd frontend</div>
            <div className="text-cyan-300">npm run dev</div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'Dashboard': return renderDashboard();
      case 'LiveColdChain': return renderLiveColdChain();
      case 'ComplianceMonitoring': return renderComplianceMonitoring();
      case 'Alerts': return renderAlerts();
      case 'ShipmentEvidence': return renderShipmentEvidence();
      case 'AuditReports': return renderAuditReports();
      case 'EvidencePack': return renderEvidencePack();
      case 'FailureModes': return renderFailureModes();
      case 'Experiments': return renderExperiments();
      case 'UserFeedback': return renderUserFeedback();
      case 'TechDocs': return renderTechDocs();
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200 overflow-x-hidden">

      {/* LEFT VERTICAL SIDEBAR */}
      <RoleSidebar
        role="compliance"
        roleTitle="COMPLIANCE OFFICER"
        roleSubtitle="Automated Audit Evidence Aggregator & ML Risk Detection"
        items={NAV_ITEMS}
        activeItem={activeTab}
        onSelectItem={(id) => { setActiveTab(id as ComplianceTab); setSearchQuery(''); }}
        onHome={() => onNavigate('LANDING')}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(prev => !prev)}
        backendOnline={true}
      />

      {/* MAIN CONTENT AREA - with dynamic margin for collapsed/expanded sidebar */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ease-in-out ${sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'} pt-14 lg:pt-0 min-w-0`}>

        {/* Header Bar */}
        <header className="bg-white/95 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20 backdrop-blur-md shadow-xs">
          <div className="w-full px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
            
            {/* Role Title */}
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight truncate">
                    COMPLIANCE OFFICER HUB
                  </h1>
                  <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-400 text-xs font-semibold border border-emerald-300 dark:border-emerald-500/30 whitespace-nowrap">
                    Primary Role
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">Automated Audit Evidence Aggregator & ML Risk Detection Engine</p>
              </div>
            </div>

            {/* Quick Actions & Role Switching */}
            <div className="flex items-center gap-2 flex-wrap shrink-0">
              <ThemeToggle />
              <button
                onClick={() => onNavigate('LANDING')}
                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap"
              >
                <Home className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                <span className="hidden sm:inline">Home</span>
              </button>
              <button
                onClick={() => onNavigate('MANUAL_ENTRY')}
                className="px-3 py-1.5 bg-cyan-50 dark:bg-cyan-600/20 hover:bg-cyan-100 dark:hover:bg-cyan-600/30 text-cyan-800 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-500/40 rounded-lg text-xs font-semibold cursor-pointer transition-colors whitespace-nowrap flex items-center gap-1 shadow-xs"
              >
                <FileCheck2 className="w-3.5 h-3.5" />
                <span>Manual Entry</span>
              </button>
              <button
                onClick={() => onNavigate('ADMIN')}
                className="px-3 py-1.5 bg-cyan-50 dark:bg-cyan-600/20 hover:bg-cyan-100 dark:hover:bg-cyan-600/30 text-cyan-800 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-500/40 rounded-lg text-xs font-medium cursor-pointer transition-colors whitespace-nowrap"
              >
                Admin →
              </button>
              <button
                onClick={() => onNavigate('TRANSPORT')}
                className="px-3 py-1.5 bg-amber-50 dark:bg-amber-600/20 hover:bg-amber-100 dark:hover:bg-amber-600/30 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/40 rounded-lg text-xs font-medium cursor-pointer transition-colors whitespace-nowrap"
              >
                Operations →
              </button>
              <button 
                onClick={fetchAllData}
                disabled={isLoading}
                title="Refresh All Compliance Data"
                className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700 shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-emerald-500' : ''}`} />
              </button>
            </div>
          </div>
        </header>

        {/* Breadcrumb */}
        <div className="w-full px-4 sm:px-6 py-2.5 flex items-center gap-1.5 text-[11px] text-slate-500 border-b border-slate-200 dark:border-slate-800/60 bg-slate-100/50 dark:bg-slate-900/30 overflow-x-auto whitespace-nowrap">
          <span className="text-slate-400 cursor-pointer hover:text-cyan-400 transition-colors" onClick={() => onNavigate('LANDING')}>Home</span>
          <ChevronRight className="w-3 h-3 shrink-0" />
          <span className="text-slate-400">Compliance Hub</span>
          <ChevronRight className="w-3 h-3 shrink-0" />
          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{NAV_ITEMS.find(n => n.id === activeTab)?.label}</span>
        </div>

        {/* Main Content */}
        <main className="w-full p-4 sm:p-6 pb-12 flex-1 max-w-7xl min-w-0">
          {isLoading && activeTab === 'Dashboard' ? (
            <div className="flex items-center justify-center py-24 text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin mr-3 text-emerald-400" /> Loading compliance data...
            </div>
          ) : (
            renderTabContent()
          )}
        </main>
      </div>

      {isModalOpen && (
        <AuditReportModal evidencePack={evidencePack} onClose={() => setIsModalOpen(false)} />
      )}
    </div>
  );
};
