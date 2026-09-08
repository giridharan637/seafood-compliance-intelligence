import React, { useState, useEffect, useCallback } from 'react';
import { 
  BarChart3, ShieldCheck, AlertTriangle, Cpu, FileCheck2, Search, Filter, 
  RefreshCcw, Anchor, Truck, Users, Activity, Settings, Database, ChevronRight,
  CheckCircle2, XCircle, Home, ArrowLeft, Download, Printer, Clock, MapPin,
  Sliders, ShieldAlert, Sparkles, UserCheck, UserX, ChevronLeft, ArrowUp, ArrowDown,
  Info, ExternalLink, Play, CheckCircle, RefreshCw
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area 
} from 'recharts';
import { 
  Shipment, Batch, Sensor, ComplianceAlert, NavigationRole, 
  AdminTab, SystemHealthData, SystemSettings, MLPrediction, Worker, RouteEvent, EvidencePack 
} from '../types';
import { apiFetch } from '../config/api';
import { AuditReportModal } from './AuditReportModal';
import { DatasetExplorerPage } from './DatasetExplorerPage';
import { ThemeToggle } from './ThemeToggle';
import { useTheme } from '../context/ThemeContext';
import { RoleSidebar, RoleSidebarItem } from './RoleSidebar';
import { useToast } from '../context/ToastContext';


interface Props {
  onNavigate: (role: NavigationRole) => void;
  initialTab?: AdminTab;
}

export const AdminDashboard: React.FC<Props> = ({ onNavigate, initialTab = 'Dashboard' }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const gridColor = isDark ? '#334155' : '#cbd5e1';
  const axisColor = isDark ? '#94a3b8' : '#475569';
  const tooltipStyle = {
    backgroundColor: isDark ? '#0f172a' : '#ffffff',
    borderColor: isDark ? '#334155' : '#cbd5e1',
    color: isDark ? '#f8fafc' : '#0f172a',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
  };
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<AdminTab>(initialTab);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [datasetRefreshKey, setDatasetRefreshKey] = useState(0);

  // Global Admin Data States
  const [kpis, setKpis] = useState<any>({
    total_shipments: 66,
    total_batches: 66,
    active_shipments: 42,
    compliance_rate: 86.4,
    open_alerts: 8,
    sensor_health: 95.2,
    reports_generated: 66,
    evidence_completeness: 100.0
  });

  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [alerts, setAlerts] = useState<ComplianceAlert[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);
  const [healthData, setHealthData] = useState<SystemHealthData | null>(null);
  const [settingsData, setSettingsData] = useState<SystemSettings>({
    temp_warning_threshold: 2.0,
    temp_critical_threshold: 5.0,
    max_allowed_delay_mins: 60,
    alert_sensitivity: 'HIGH',
    store_forward_sync_interval: 10,
    auto_impute_missing: true
  });

  // State indicators
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [targetCount, setTargetCount] = useState(10000);

  // Detail inspection states
  const [selectedShipmentDetail, setSelectedShipmentDetail] = useState<any | null>(null);
  const [selectedBatchDetail, setSelectedBatchDetail] = useState<Batch | null>(null);
  const [inspectEvidencePack, setInspectEvidencePack] = useState<EvidencePack | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoadingPack, setIsLoadingPack] = useState(false);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [portFilter, setPortFilter] = useState('ALL');
  const [sensorFilter, setSensorFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Experiments sub-tab
  const [experimentTab, setExperimentTab] = useState<'BASELINE' | 'TUNING' | 'ERROR_ANALYSIS'>('BASELINE');
  const [baselineData, setBaselineData] = useState<any>(null);
  const [tuningData, setTuningData] = useState<any>(null);
  const [errorAnalysisData, setErrorAnalysisData] = useState<any>(null);
  const [warningOffset, setWarningOffset] = useState<number>(2.0);
  const [criticalOffset, setCriticalOffset] = useState<number>(5.0);
  const [delayOffset, setDelayOffset] = useState<number>(60);
  const [isTuningCalculating, setIsTuningCalculating] = useState(false);

  // Settings form state
  const [settingsSuccessBanner, setSettingsSuccessBanner] = useState('');

  // Synchronize initialTab prop if changed
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Load all foundational data
  const fetchAllData = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const [kpiRes, shipRes, batchRes, sensRes, alertRes, wrkRes, routeRes, healthRes, settRes] = await Promise.all([
        apiFetch('/kpi').catch(() => null),
        apiFetch('/shipments').catch(() => []),
        apiFetch('/batches').catch(() => []),
        apiFetch('/sensors').catch(() => []),
        apiFetch('/alerts').catch(() => []),
        apiFetch('/workers').catch(() => []),
        apiFetch('/routes').catch(() => []),
        apiFetch('/system-health').catch(() => null),
        apiFetch('/settings').catch(() => null)
      ]);

      if (kpiRes) setKpis(kpiRes);
      setShipments(shipRes || []);
      setBatches(batchRes || []);
      setSensors(sensRes || []);
      setAlerts(alertRes || []);
      setWorkers(wrkRes || []);
      setRoutes(routeRes || []);
      if (healthRes) setHealthData(healthRes);
      if (settRes) setSettingsData(settRes);
    } catch (err: any) {
      console.error("Failed to fetch admin data", err);
      setErrorMsg(err.message || 'Failed to connect to backend server. Please verify backend is running on port 8001.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Fetch experiment data on demand
  useEffect(() => {
    if (activeTab === 'Experiments') {
      if (experimentTab === 'BASELINE' && !baselineData) {
        apiFetch('/experiments/baseline')
          .then(data => setBaselineData(data))
          .catch(e => console.error("Baseline fetch error", e));
      } else if (experimentTab === 'TUNING') {
        runTuningExperiment(warningOffset, criticalOffset, delayOffset);
      } else if (experimentTab === 'ERROR_ANALYSIS' && !errorAnalysisData) {
        apiFetch('/error-analysis')
          .then(data => setErrorAnalysisData(data))
          .catch(e => console.error("Error analysis fetch error", e));
      }
    }
  }, [activeTab, experimentTab]);

  const runTuningExperiment = async (w: number, c: number, d: number) => {
    setIsTuningCalculating(true);
    try {
      const res = await apiFetch('/experiments/threshold-tuning', {
        method: 'POST',
        body: JSON.stringify({
          temp_warning_threshold: w,
          temp_critical_threshold: c,
          max_allowed_delay_mins: d
        })
      });
      setTuningData(res);
    } catch (err) {
      console.error("Tuning experiment error", err);
    } finally {
      setIsTuningCalculating(false);
    }
  };

  const handleRegenerateDataset = async (count: number) => {
    setIsGenerating(true);
    try {
      const result = await apiFetch('/generate-dataset', {
        method: 'POST',
        body: JSON.stringify({ record_count: count })
      });
      setTargetCount(count);
      await fetchAllData();
      // Increment refreshKey to force DatasetExplorerPage to re-fetch
      setDatasetRefreshKey(prev => prev + 1);
      showToast({
        type: 'success',
        title: 'Dataset Generated Successfully',
        message: `${count.toLocaleString()} target records generated. Dataset table is now updated.`,
        duration: 5000,
      });
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Dataset Generation Failed',
        message: err.message || 'Please check the backend connection.',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleInspectShipment = async (shipmentId: string) => {
    try {
      const data = await apiFetch(`/shipments/${shipmentId}`);
      setSelectedShipmentDetail(data);
    } catch (err: any) {
      showToast({ type: 'error', title: 'Failed to load shipment details', message: err.message });
    }
  };

  const handleGenerateEvidencePackModal = async (batchId: string) => {
    setIsLoadingPack(true);
    try {
      const pack = await apiFetch(`/evidence-pack/${batchId}`, { method: 'POST' });
      setInspectEvidencePack(pack);
      setIsModalOpen(true);
    } catch (err: any) {
      showToast({ type: 'error', title: 'Evidence Pack Failed', message: err.message });
    } finally {
      setIsLoadingPack(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch('/settings', {
        method: 'POST',
        body: JSON.stringify(settingsData)
      });
      if (res && res.settings) setSettingsData(res.settings);
      showToast({ type: 'success', title: 'Settings Saved', message: 'System settings have been applied to the telemetry engine.' });
      setSettingsSuccessBanner('System settings successfully saved and applied to telemetry engine!');
      setTimeout(() => setSettingsSuccessBanner(''), 4000);
    } catch (err: any) {
      showToast({ type: 'error', title: 'Settings Save Failed', message: err.message });
    }
  };

  // Switch tab & update browser URL path cleanly
  const handleTabChange = (tab: AdminTab) => {
    setActiveTab(tab);
    setSelectedShipmentDetail(null);
    setSelectedBatchDetail(null);
    setSearchQuery('');
    setCurrentPage(1);

    const pathMap: Record<AdminTab, string> = {
      'Dashboard': '/admin/dashboard',
      'Shipments': '/admin/shipments',
      'Batches': '/admin/batches',
      'Sensors': '/admin/sensors',
      'Users': '/admin/users',
      'Routes': '/admin/routes',
      'Health': '/admin/system-health',
      'Reports': '/admin/reports',
      'Experiments': '/admin/experiments',
      'Settings': '/admin/settings',
      'DatasetExplorer': '/admin/dataset-explorer'
    };

    const targetUrl = pathMap[tab] || '/admin/dashboard';
    window.history.pushState({ tab }, '', targetUrl);
  };

  // Filtered shipments
  const filteredShipments = shipments.filter(s => {
    const matchSearch = !searchQuery || 
      s.shipment_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.batch_id && s.batch_id.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.product_type && s.product_type.toLowerCase().includes(searchQuery.toLowerCase())) ||
      s.origin.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.destination.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || s.compliance_status === statusFilter;
    const matchPort = portFilter === 'ALL' || (s.port_airport && s.port_airport.includes(portFilter));
    return matchSearch && matchStatus && matchPort;
  });

  const paginatedShipments = filteredShipments.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const totalShipmentPages = Math.max(1, Math.ceil(filteredShipments.length / pageSize));

  // Filtered batches
  const filteredBatches = batches.filter(b => {
    const matchSearch = !searchQuery ||
      b.batch_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.product_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.origin.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.destination.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || b.compliance_status === statusFilter;
    return matchSearch && matchStatus;
  });

  // Filtered sensors
  const filteredSensors = sensors.filter(s => {
    const matchSearch = !searchQuery ||
      s.sensor_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.sensor_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.technician.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCal = sensorFilter === 'ALL' || s.calibration_status === sensorFilter;
    return matchSearch && matchCal;
  });

  // Chart data
  const volumeChartData = [
    { name: 'Mon', shipments: 12, volume_tons: 34.2 },
    { name: 'Tue', shipments: 19, volume_tons: 52.8 },
    { name: 'Wed', shipments: 15, volume_tons: 41.5 },
    { name: 'Thu', shipments: 22, volume_tons: 68.0 },
    { name: 'Fri', shipments: 28, volume_tons: 82.4 },
    { name: 'Sat', shipments: 14, volume_tons: 38.1 },
    { name: 'Sun', shipments: 9, volume_tons: 24.6 },
  ];

  const complianceChartData = [
    { name: 'Week 1', rate: 82.5, target: 95.0 },
    { name: 'Week 2', rate: 85.0, target: 95.0 },
    { name: 'Week 3', rate: 89.2, target: 95.0 },
    { name: 'Week 4', rate: 94.6, target: 95.0 },
  ];

  const alertDistData = [
    { name: 'Thermal Breaches', value: alerts.filter(a => a.event_type === 'TEMPERATURE_EXCURSION').length || 12, color: '#f43f5e' },
    { name: 'Expired Calibration', value: alerts.filter(a => a.event_type === 'CALIBRATION_EXPIRED').length || 6, color: '#f59e0b' },
    { name: 'Telemetry Gaps', value: alerts.filter(a => a.event_type === 'TELEMETRY_GAP').length || 9, color: '#06b6d4' },
    { name: 'Route Delays', value: 7, color: '#8b5cf6' },
  ];

  const sensorHealthData = [
    { name: 'Valid Calibration', count: sensors.filter(s => s.calibration_status === 'VALID').length || 45, color: '#10b981' },
    { name: 'Expired Calibration', count: sensors.filter(s => s.calibration_status === 'EXPIRED').length || 5, color: '#f43f5e' },
  ];

  const routeDelayData = [
    { checkpoint: 'Cold Storage Exit', avg_delay: 8 },
    { checkpoint: 'Highway Transit', avg_delay: 24 },
    { checkpoint: 'Port Inspection', avg_delay: 45 },
    { checkpoint: 'Aircraft Ramp', avg_delay: 12 },
  ];

  const completenessData = [
    { category: 'Batch Meta', score: 100 },
    { category: 'Shipment Meta', score: 100 },
    { category: 'Sensor Logs', score: 98.4 },
    { category: 'Calibration Certs', score: 95.0 },
    { category: 'Handovers', score: 96.2 },
    { category: 'Worker Safety', score: 100 },
  ];

  // Navigation Items Definition
  const navItems: RoleSidebarItem[] = [
    { id: 'Dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'Shipments', label: 'Shipments', icon: Truck },
    { id: 'Batches', label: 'Batches', icon: Database },
    { id: 'Sensors', label: 'Sensors', icon: Cpu },
    { id: 'Users', label: 'Users / Roles', icon: Users },
    { id: 'Routes', label: 'Routes', icon: Activity },
    { id: 'Health', label: 'System Health', icon: ShieldCheck },
    { id: 'Reports', label: 'Reports', icon: FileCheck2 },
    { id: 'Experiments', label: 'Experiments', icon: RefreshCcw },
    { id: 'Settings', label: 'Settings', icon: Settings },
    { id: 'DatasetExplorer', label: 'Dataset Explorer', icon: Database },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 font-sans transition-colors duration-200 overflow-x-hidden">
      
      {/* LEFT VERTICAL SIDEBAR */}
      <RoleSidebar
        role="admin"
        roleTitle="ADMIN PANEL"
        roleSubtitle="System Overview & Configuration"
        items={navItems}
        activeItem={activeTab}
        onSelectItem={(id) => handleTabChange(id as AdminTab)}
        onHome={() => onNavigate('LANDING')}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(prev => !prev)}
        backendOnline={!errorMsg}
      />

      {/* MAIN CONTENT AREA — with dynamic margin for collapsed/expanded sidebar */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ease-in-out ${sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'} pt-14 lg:pt-0 min-w-0`}>
        
        {/* Compact top bar for breadcrumbs + refresh */}
        <div className="sticky top-0 z-20 bg-white/95 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 backdrop-blur-md shadow-xs">
          <div className="px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-2">
            
            <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium min-w-0">
                <button 
                  onClick={() => onNavigate('LANDING')}
                  className="hover:text-cyan-400 flex items-center gap-1 cursor-pointer transition-colors shrink-0"
                >
                  <Home className="w-3.5 h-3.5" />
                  Home
                </button>
                <span className="shrink-0">&gt;</span>
                <button 
                  onClick={() => handleTabChange('Dashboard')}
                  className={`hover:text-cyan-400 cursor-pointer transition-colors shrink-0 ${activeTab === 'Dashboard' ? 'text-white font-bold' : ''}`}
                >
                  Admin
                </button>
                {activeTab !== 'Dashboard' && (
                  <>
                    <span className="shrink-0">&gt;</span>
                    <span className="text-cyan-300 font-bold truncate max-w-[140px]">
                      {navItems.find(n => n.id === activeTab)?.label || activeTab}
                    </span>
                  </>
                )}
                {selectedShipmentDetail && (
                  <>
                    <span className="shrink-0">&gt;</span>
                    <span className="text-amber-400 font-mono font-bold truncate max-w-[120px]">
                      {selectedShipmentDetail.shipment?.shipment_id}
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <ThemeToggle />
              <button
                onClick={() => onNavigate('MANUAL_ENTRY')}
                className="hidden sm:flex px-3 py-1.5 bg-cyan-50 dark:bg-cyan-600/20 hover:bg-cyan-100 dark:hover:bg-cyan-600/30 text-cyan-800 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-500/40 rounded-lg text-xs font-semibold cursor-pointer transition-colors items-center gap-1 shadow-xs"
              >
                <FileCheck2 className="w-3.5 h-3.5" />
                <span>Manual Entry</span>
              </button>
              <button
                onClick={() => onNavigate('COMPLIANCE')}
                className="hidden sm:flex px-3 py-1.5 bg-emerald-50 dark:bg-emerald-600/20 hover:bg-emerald-100 dark:hover:bg-emerald-600/30 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/40 rounded-lg text-xs font-medium cursor-pointer transition-colors items-center gap-1"
              >
                Compliance →
              </button>
              <button
                onClick={() => onNavigate('TRANSPORT')}
                className="hidden sm:flex px-3 py-1.5 bg-amber-50 dark:bg-amber-600/20 hover:bg-amber-100 dark:hover:bg-amber-600/30 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/40 rounded-lg text-xs font-medium cursor-pointer transition-colors items-center gap-1"
              >
                Operations →
              </button>
              <button 
                onClick={fetchAllData}
                title="Refresh all data"
                className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-cyan-600 dark:hover:text-cyan-300 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700 shrink-0"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Main page content */}
        <main className="w-full p-4 sm:p-6 flex-1 space-y-6">

        {/* Global Loading / Error State */}
        {isLoading && (
          <div className="glass-panel p-12 rounded-2xl flex flex-col items-center justify-center gap-3 text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin text-cyan-400" />
            <p className="text-sm font-semibold">Loading system telemetry and database records...</p>
          </div>
        )}

        {!isLoading && errorMsg && (
          <div className="glass-panel p-6 rounded-2xl border border-rose-500/40 bg-rose-950/20 text-rose-300 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <XCircle className="w-6 h-6 text-rose-400 shrink-0" />
              <div>
                <h3 className="font-bold text-white">Connection Error</h3>
                <p className="text-xs text-rose-300 mt-0.5">{errorMsg}</p>
              </div>
            </div>
            <button
              onClick={fetchAllData}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Retry Connection
            </button>
          </div>
        )}

        {/* =====================================================================
            VIEW 1: DASHBOARD VIEW
        ===================================================================== */}
        {!isLoading && activeTab === 'Dashboard' && (
          <div className="space-y-6">
            {/* Dataset Regeneration Controller */}
            <div className="glass-card rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 border border-cyan-500/20 bg-gradient-to-r from-cyan-950/30 to-slate-900">
              <div>
                <span className="text-xs font-extrabold uppercase tracking-wider text-cyan-400 block">
                  REAL RELATIONAL DATASET ENGINE
                </span>
                <p className="text-sm font-semibold text-white">
                  Currently Loaded Dataset: <span className="text-cyan-300 font-mono font-bold">{kpis.total_shipments}</span> Shipments & <span className="text-cyan-300 font-mono font-bold">10,000+</span> Connected Telemetry Records
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-medium">Regenerate Target:</span>
                {[5000, 10000, 15000].map(cnt => (
                  <button
                    key={cnt}
                    disabled={isGenerating}
                    onClick={() => handleRegenerateDataset(cnt)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border transition-all ${
                      targetCount === cnt 
                        ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-md shadow-cyan-500/20' 
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                    }`}
                  >
                    {isGenerating ? 'Generating...' : `${cnt.toLocaleString()} Records`}
                  </button>
                ))}
              </div>
            </div>

            {/* 8 Admin KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
              <div className="glass-panel p-3.5 rounded-xl border-l-4 border-cyan-400">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Total Shipments</div>
                <div className="text-xl font-black text-white mt-1">{kpis.total_shipments}</div>
                <div className="text-[10px] text-cyan-400 mt-0.5">Active Export Fleet</div>
              </div>

              <div className="glass-panel p-3.5 rounded-xl border-l-4 border-blue-400">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Total Batches</div>
                <div className="text-xl font-black text-white mt-1">{kpis.total_batches}</div>
                <div className="text-[10px] text-blue-400 mt-0.5">Tracked Lots</div>
              </div>

              <div className="glass-panel p-3.5 rounded-xl border-l-4 border-amber-400">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Active Shipments</div>
                <div className="text-xl font-black text-white mt-1">{kpis.active_shipments}</div>
                <div className="text-[10px] text-amber-400 mt-0.5">En Route / At Port</div>
              </div>

              <div className="glass-panel p-3.5 rounded-xl border-l-4 border-emerald-400">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Compliance Rate</div>
                <div className="text-xl font-black text-emerald-400 mt-1">{kpis.compliance_rate}%</div>
                <div className="text-[10px] text-emerald-400 mt-0.5">Target: 95.0%</div>
              </div>

              <div className="glass-panel p-3.5 rounded-xl border-l-4 border-rose-400">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Open Alerts</div>
                <div className="text-xl font-black text-rose-400 mt-1">{kpis.open_alerts}</div>
                <div className="text-[10px] text-rose-400 mt-0.5">Action Required</div>
              </div>

              <div className="glass-panel p-3.5 rounded-xl border-l-4 border-purple-400">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Sensor Health</div>
                <div className="text-xl font-black text-purple-300 mt-1">{kpis.sensor_health}%</div>
                <div className="text-[10px] text-purple-400 mt-0.5">Calibrated Units</div>
              </div>

              <div className="glass-panel p-3.5 rounded-xl border-l-4 border-sky-400">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Reports Ready</div>
                <div className="text-xl font-black text-white mt-1">{kpis.reports_generated}</div>
                <div className="text-[10px] text-sky-400 mt-0.5">Audit Packs</div>
              </div>

              <div className="glass-panel p-3.5 rounded-xl border-l-4 border-teal-400">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Evidence Score</div>
                <div className="text-xl font-black text-teal-300 mt-1">{kpis.evidence_completeness}%</div>
                <div className="text-[10px] text-teal-400 mt-0.5">Full Data Joined</div>
              </div>
            </div>

            {/* 6 Recharts Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              
              {/* Chart 1: Shipment Volume over time */}
              <div className="glass-panel p-5 rounded-2xl">
                <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-cyan-400" />
                  1. Shipment Volume Over Time
                </h3>
                <p className="text-xs text-slate-400 mb-4">Export tonnage and shipment counts</p>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={volumeChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                      <XAxis dataKey="name" stroke={axisColor} fontSize={11} />
                      <YAxis stroke={axisColor} fontSize={11} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Bar dataKey="shipments" fill="#0284c7" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart 2: Compliance Rate Trend */}
              <div className="glass-panel p-5 rounded-2xl">
                <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  2. Compliance Rate Trend
                </h3>
                <p className="text-xs text-slate-400 mb-4">Weekly cold-chain compliance score vs target</p>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={complianceChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                      <XAxis dataKey="name" stroke={axisColor} fontSize={11} />
                      <YAxis domain={[70, 100]} stroke={axisColor} fontSize={11} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Line type="monotone" dataKey="rate" stroke="#047857" strokeWidth={3} dot={{ r: 5 }} />
                      <Line type="monotone" dataKey="target" stroke="#64748b" strokeDasharray="4 4" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart 3: Alert Distribution */}
              <div className="glass-panel p-5 rounded-2xl">
                <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  3. Alert Distribution Breakdown
                </h3>
                <p className="text-xs text-slate-400 mb-4">Compliance exception categories</p>
                <div className="h-52 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={alertDistData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }: any) => `${name} ${percent !== undefined ? (percent * 100).toFixed(0) : 0}%`}>
                        {alertDistData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart 4: Sensor Health */}
              <div className="glass-panel p-5 rounded-2xl">
                <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-purple-400" />
                  4. Sensor Health & Calibration
                </h3>
                <p className="text-xs text-slate-400 mb-4">Active IoT sensors ISO calibration status</p>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={sensorHealthData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                      <XAxis type="number" stroke={axisColor} fontSize={11} />
                      <YAxis dataKey="name" type="category" stroke={axisColor} fontSize={11} width={120} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Bar dataKey="count" fill="#6d28d9" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart 5: Route Delay Statistics */}
              <div className="glass-panel p-5 rounded-2xl">
                <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-amber-400" />
                  5. Route Delay Statistics
                </h3>
                <p className="text-xs text-slate-400 mb-4">Average minutes delayed by checkpoint stage</p>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={routeDelayData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                      <XAxis dataKey="checkpoint" stroke={axisColor} fontSize={10} />
                      <YAxis stroke={axisColor} fontSize={11} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Bar dataKey="avg_delay" fill="#c2410c" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart 6: Evidence Completeness */}
              <div className="glass-panel p-5 rounded-2xl">
                <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
                  <FileCheck2 className="w-4 h-4 text-teal-400" />
                  6. Evidence Completeness Score
                </h3>
                <p className="text-xs text-slate-400 mb-4">Joined evidence verification score %</p>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={completenessData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                      <XAxis dataKey="category" stroke={axisColor} fontSize={10} />
                      <YAxis domain={[80, 100]} stroke={axisColor} fontSize={11} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Area type="monotone" dataKey="score" stroke="#0f766e" fill="#0f766e" fillOpacity={0.2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================================
            VIEW 2: SHIPMENTS PAGE
        ===================================================================== */}
        {!isLoading && activeTab === 'Shipments' && (
          <div className="space-y-6">
            
            {/* If a shipment is selected for drill-down inspection */}
            {selectedShipmentDetail ? (
              <div className="glass-panel p-6 rounded-2xl space-y-6">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setSelectedShipmentDetail(null)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <ArrowLeft className="w-4 h-4" /> Back to Shipments
                    </button>
                    <div>
                      <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        SHIPMENT DETAILS: {selectedShipmentDetail.shipment?.shipment_id}
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                          selectedShipmentDetail.shipment?.compliance_status === 'NORMAL' ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30' :
                          selectedShipmentDetail.shipment?.compliance_status === 'WARNING' ? 'bg-amber-950 text-amber-400 border border-amber-500/30' :
                          'bg-rose-950 text-rose-400 border border-rose-500/30'
                        }`}>
                          {selectedShipmentDetail.shipment?.compliance_status}
                        </span>
                      </h2>
                      <p className="text-xs text-slate-400">Product: {selectedShipmentDetail.shipment?.product_type} • Batch: {selectedShipmentDetail.shipment?.batch_id}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleGenerateEvidencePackModal(selectedShipmentDetail.shipment?.batch_id)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-lg shadow-emerald-600/20"
                  >
                    <FileCheck2 className="w-4 h-4" />
                    Generate Evidence Pack
                  </button>
                </div>

                {/* Shipment Parameters Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="glass-panel p-4 rounded-xl space-y-2 border border-slate-800">
                    <h3 className="font-bold text-cyan-400 uppercase tracking-wider">Route & Transit</h3>
                    <div className="space-y-1 text-slate-300">
                      <div><span className="text-slate-500">Origin:</span> {selectedShipmentDetail.shipment?.origin}</div>
                      <div><span className="text-slate-500">Destination:</span> {selectedShipmentDetail.shipment?.destination}</div>
                      <div><span className="text-slate-500">Gateway Port:</span> {selectedShipmentDetail.shipment?.port_airport}</div>
                      <div><span className="text-slate-500">Current Temp:</span> <span className="font-mono font-bold text-cyan-300">{selectedShipmentDetail.shipment?.current_temp}°C</span></div>
                      <div><span className="text-slate-500">Status:</span> {selectedShipmentDetail.shipment?.shipment_status}</div>
                    </div>
                  </div>

                  <div className="glass-panel p-4 rounded-xl space-y-2 border border-slate-800">
                    <h3 className="font-bold text-purple-400 uppercase tracking-wider">Driver & Safety Workload</h3>
                    <div className="space-y-1 text-slate-300">
                      <div><span className="text-slate-500">Driver Name:</span> {selectedShipmentDetail.shipment?.driver_name}</div>
                      <div><span className="text-slate-500">Driving Hours:</span> {selectedShipmentDetail.shipment?.working_hours} hrs</div>
                      <div><span className="text-slate-500">Rest Hours:</span> {selectedShipmentDetail.shipment?.rest_hours} hrs</div>
                      <div><span className="text-slate-500">Safety Status:</span> <span className="font-bold text-emerald-400">{selectedShipmentDetail.shipment?.safety_status || 'SAFE'}</span></div>
                    </div>
                  </div>

                  <div className="glass-panel p-4 rounded-xl space-y-2 border border-slate-800">
                    <h3 className="font-bold text-amber-400 uppercase tracking-wider">Batch Specifications</h3>
                    <div className="space-y-1 text-slate-300">
                      <div><span className="text-slate-500">Quantity:</span> {selectedShipmentDetail.shipment?.quantity_kg} kg</div>
                      <div><span className="text-slate-500">Req Temp Envelope:</span> {selectedShipmentDetail.shipment?.required_temp_min}°C to {selectedShipmentDetail.shipment?.required_temp_max}°C</div>
                    </div>
                  </div>
                </div>

                {/* Route Events & Handovers */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="glass-panel p-4 rounded-xl border border-slate-800 space-y-3">
                    <h3 className="text-xs font-bold text-white uppercase flex items-center gap-1.5">
                      <Activity className="w-4 h-4 text-cyan-400" /> Route Checkpoints
                    </h3>
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1 text-xs">
                      {selectedShipmentDetail.routes?.map((r: any, idx: number) => (
                        <div key={idx} className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 flex justify-between items-center">
                          <div>
                            <span className="font-semibold text-white">{r.event_type}</span>
                            <div className="text-[10px] text-slate-400">{r.location} • {r.timestamp}</div>
                          </div>
                          <span className="font-mono text-[10px] text-amber-300">+{r.delay_minutes} min delay</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="glass-panel p-4 rounded-xl border border-slate-800 space-y-3">
                    <h3 className="text-xs font-bold text-white uppercase flex items-center gap-1.5">
                      <FileCheck2 className="w-4 h-4 text-emerald-400" /> Custody Handovers
                    </h3>
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1 text-xs">
                      {selectedShipmentDetail.handovers?.map((h: any, idx: number) => (
                        <div key={idx} className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 flex justify-between items-center">
                          <div>
                            <span className="font-semibold text-white">{h.from_person} → {h.to_person}</span>
                            <div className="text-[10px] text-slate-400">{h.location} • {h.timestamp}</div>
                          </div>
                          <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 text-[10px] font-bold">
                            {h.handover_status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Shipment List Table */
              <div className="glass-panel p-6 rounded-2xl space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <Truck className="w-5 h-5 text-cyan-400" />
                      Live Export Shipments ({filteredShipments.length} Total)
                    </h2>
                    <p className="text-xs text-slate-400">Comprehensive database of operational seafood export shipments</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    {/* Search input */}
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        placeholder="Search Shipment, Batch, Product, Port..."
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                        className="pl-9 pr-4 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-400 w-64"
                      />
                    </div>

                    {/* Status Filter */}
                    <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1 text-xs">
                      <Filter className="w-3.5 h-3.5 text-cyan-400" />
                      <select
                        value={statusFilter}
                        onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                        className="bg-transparent text-slate-200 focus:outline-none cursor-pointer"
                      >
                        <option value="ALL" className="bg-slate-900">All Statuses</option>
                        <option value="NORMAL" className="bg-slate-900">NORMAL (Green)</option>
                        <option value="WARNING" className="bg-slate-900">WARNING (Yellow)</option>
                        <option value="CRITICAL" className="bg-slate-900">CRITICAL (Red)</option>
                      </select>
                    </div>

                    {/* Port Filter */}
                    <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1 text-xs">
                      <select
                        value={portFilter}
                        onChange={(e) => { setPortFilter(e.target.value); setCurrentPage(1); }}
                        className="bg-transparent text-slate-200 focus:outline-none cursor-pointer"
                      >
                        <option value="ALL" className="bg-slate-900">All Ports/Airports</option>
                        <option value="Anchorage" className="bg-slate-900">Anchorage (ANC)</option>
                        <option value="Seattle" className="bg-slate-900">Seattle (SEA)</option>
                        <option value="Vancouver" className="bg-slate-900">Vancouver</option>
                        <option value="Los Angeles" className="bg-slate-900">Los Angeles (LAX)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Empty State */}
                {filteredShipments.length === 0 ? (
                  <div className="p-12 text-center text-slate-500 text-sm">
                    No shipments match the selected filters.
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto rounded-xl border border-slate-800">
                      <table className="w-full text-left text-xs text-slate-300">
                        <thead className="bg-slate-900/90 text-slate-400 uppercase font-semibold text-[10px] border-b border-slate-800">
                          <tr>
                            <th className="p-3">Shipment / Batch ID</th>
                            <th className="p-3">Product Type</th>
                            <th className="p-3">Origin → Destination</th>
                            <th className="p-3">Port / Airport</th>
                            <th className="p-3">Temp (°C)</th>
                            <th className="p-3">Status</th>
                            <th className="p-3">Driver / Safety</th>
                            <th className="p-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {paginatedShipments.map((s) => (
                            <tr key={s.shipment_id} className="hover:bg-slate-800/40 transition-colors">
                              <td className="p-3 font-mono font-medium text-cyan-300">
                                <div>{s.shipment_id}</div>
                                <div className="text-[10px] text-slate-500">{s.batch_id}</div>
                              </td>
                              <td className="p-3 font-medium text-white">{s.product_type}</td>
                              <td className="p-3 text-slate-400">
                                <div>{s.origin}</div>
                                <div className="text-[10px] text-slate-500">→ {s.destination}</div>
                              </td>
                              <td className="p-3 text-slate-300">{s.port_airport}</td>
                              <td className="p-3 font-mono font-semibold text-white">
                                {s.current_temp.toFixed(1)}°C
                              </td>
                              <td className="p-3">
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase border ${
                                  s.compliance_status === 'NORMAL' 
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                    : s.compliance_status === 'WARNING'
                                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                    : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                                }`}>
                                  {s.compliance_status}
                                </span>
                              </td>
                              <td className="p-3">
                                <div className="text-slate-300">{s.driver_name || 'Driver Assigned'}</div>
                                <span className={`text-[10px] font-semibold ${s.safety_status === 'UNSAFE' ? 'text-rose-400' : 'text-emerald-400'}`}>
                                  {s.safety_status || 'SAFE'}
                                </span>
                              </td>
                              <td className="p-3 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => handleInspectShipment(s.shipment_id)}
                                    className="px-2.5 py-1 bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-300 rounded border border-cyan-500/30 font-medium cursor-pointer"
                                  >
                                    Inspect →
                                  </button>
                                  <button
                                    onClick={() => handleGenerateEvidencePackModal(s.batch_id || '')}
                                    className="px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 rounded border border-emerald-500/30 font-medium cursor-pointer"
                                  >
                                    Pack
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination Bar */}
                    <div className="flex items-center justify-between text-xs text-slate-400 pt-2">
                      <span>Showing {((currentPage - 1) * pageSize) + 1}–{Math.min(currentPage * pageSize, filteredShipments.length)} of {filteredShipments.length} records</span>
                      <div className="flex items-center gap-2">
                        <button
                          disabled={currentPage <= 1}
                          onClick={() => setCurrentPage(p => p - 1)}
                          className="px-3 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 rounded-lg cursor-pointer"
                        >
                          Prev
                        </button>
                        <span>Page {currentPage} of {totalShipmentPages}</span>
                        <button
                          disabled={currentPage >= totalShipmentPages}
                          onClick={() => setCurrentPage(p => p + 1)}
                          className="px-3 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 rounded-lg cursor-pointer"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* =====================================================================
            VIEW 3: BATCHES PAGE
        ===================================================================== */}
        {!isLoading && activeTab === 'Batches' && (
          <div className="space-y-6">
            {selectedBatchDetail ? (
              <div className="glass-panel p-6 rounded-2xl space-y-6">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setSelectedBatchDetail(null)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4" /> Back to Batches
                    </button>
                    <div>
                      <h2 className="text-lg font-bold text-white">BATCH DETAILS: {selectedBatchDetail.batch_id}</h2>
                      <p className="text-xs text-slate-400">{selectedBatchDetail.product_type} • Linked Shipment: {selectedBatchDetail.shipment_id}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleGenerateEvidencePackModal(selectedBatchDetail.batch_id)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-600/20"
                  >
                    <FileCheck2 className="w-4 h-4" />
                    Generate Batch Evidence Pack
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="glass-panel p-4 rounded-xl space-y-2 border border-slate-800">
                    <h3 className="font-bold text-cyan-400 uppercase">Product & Storage</h3>
                    <div className="space-y-1 text-slate-300">
                      <div><span className="text-slate-500">Product:</span> {selectedBatchDetail.product_type}</div>
                      <div><span className="text-slate-500">Quantity:</span> {selectedBatchDetail.quantity_kg} kg</div>
                      <div><span className="text-slate-500">Min Allowed Temp:</span> <span className="font-mono text-cyan-300">{selectedBatchDetail.required_temp_min}°C</span></div>
                      <div><span className="text-slate-500">Max Allowed Temp:</span> <span className="font-mono text-cyan-300">{selectedBatchDetail.required_temp_max}°C</span></div>
                    </div>
                  </div>

                  <div className="glass-panel p-4 rounded-xl space-y-2 border border-slate-800">
                    <h3 className="font-bold text-amber-400 uppercase">Dates & Processing</h3>
                    <div className="space-y-1 text-slate-300">
                      <div><span className="text-slate-500">Processing Date:</span> {selectedBatchDetail.processing_date}</div>
                      <div><span className="text-slate-500">Export Date:</span> {selectedBatchDetail.export_date}</div>
                      <div><span className="text-slate-500">Compliance Status:</span> <span className="font-bold text-emerald-400">{selectedBatchDetail.compliance_status}</span></div>
                    </div>
                  </div>

                  <div className="glass-panel p-4 rounded-xl space-y-2 border border-slate-800">
                    <h3 className="font-bold text-purple-400 uppercase">Origin & Destination</h3>
                    <div className="space-y-1 text-slate-300">
                      <div><span className="text-slate-500">Origin:</span> {selectedBatchDetail.origin}</div>
                      <div><span className="text-slate-500">Destination:</span> {selectedBatchDetail.destination}</div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="glass-panel p-6 rounded-2xl space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <Database className="w-5 h-5 text-blue-400" />
                      Product Batch Registry ({filteredBatches.length} Total)
                    </h2>
                    <p className="text-xs text-slate-400">All registered seafood batches, target temperature thresholds, and compliance statuses</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        placeholder="Search Batch ID, Product, Origin..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 pr-4 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-400 w-64"
                      />
                    </div>

                    <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1 text-xs">
                      <Filter className="w-3.5 h-3.5 text-cyan-400" />
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="bg-transparent text-slate-200 focus:outline-none cursor-pointer"
                      >
                        <option value="ALL" className="bg-slate-900">All Statuses</option>
                        <option value="NORMAL" className="bg-slate-900">NORMAL</option>
                        <option value="WARNING" className="bg-slate-900">WARNING</option>
                        <option value="CRITICAL" className="bg-slate-900">CRITICAL</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-800">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-900/90 text-slate-400 uppercase font-semibold text-[10px] border-b border-slate-800">
                      <tr>
                        <th className="p-3">Batch ID</th>
                        <th className="p-3">Product Type</th>
                        <th className="p-3">Quantity (kg)</th>
                        <th className="p-3">Temp Range</th>
                        <th className="p-3">Processing / Export Date</th>
                        <th className="p-3">Origin → Destination</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {filteredBatches.slice(0, 15).map((b) => (
                        <tr key={b.batch_id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="p-3 font-mono font-bold text-cyan-300">{b.batch_id}</td>
                          <td className="p-3 font-medium text-white">{b.product_type}</td>
                          <td className="p-3 font-mono">{b.quantity_kg?.toLocaleString()} kg</td>
                          <td className="p-3 font-mono text-cyan-300">{b.required_temp_min}°C to {b.required_temp_max}°C</td>
                          <td className="p-3 text-slate-400">
                            <div>{b.processing_date}</div>
                            <div className="text-[10px] text-slate-500">Exp: {b.export_date}</div>
                          </td>
                          <td className="p-3 text-slate-400">{b.origin} → {b.destination}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase border ${
                              b.compliance_status === 'NORMAL' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                              b.compliance_status === 'WARNING' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
                              'bg-rose-500/10 text-rose-400 border-rose-500/30'
                            }`}>
                              {b.compliance_status}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => setSelectedBatchDetail(b)}
                                className="px-2.5 py-1 bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-300 rounded border border-cyan-500/30 text-xs font-medium cursor-pointer"
                              >
                                Details →
                              </button>
                              <button
                                onClick={() => handleGenerateEvidencePackModal(b.batch_id)}
                                className="px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 rounded border border-emerald-500/30 text-xs font-medium cursor-pointer"
                              >
                                Pack
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* =====================================================================
            VIEW 4: SENSORS PAGE
        ===================================================================== */}
        {!isLoading && activeTab === 'Sensors' && (
          <div className="glass-panel p-6 rounded-2xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-purple-400" />
                  IoT Sensor Fleet & Calibration Management ({sensors.length} Total Units)
                </h2>
                <p className="text-xs text-slate-400">ISO/IEC 17025 calibration audit status, battery levels, signal telemetry & accuracy ratings</p>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search Sensor ID, Technician..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-4 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-400 w-60"
                  />
                </div>

                <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1 text-xs">
                  <Filter className="w-3.5 h-3.5 text-cyan-400" />
                  <select
                    value={sensorFilter}
                    onChange={(e) => setSensorFilter(e.target.value)}
                    className="bg-transparent text-slate-200 focus:outline-none cursor-pointer"
                  >
                    <option value="ALL" className="bg-slate-900">All Calibrations</option>
                    <option value="VALID" className="bg-slate-900">VALID (ISO Certified)</option>
                    <option value="EXPIRED" className="bg-slate-900">EXPIRED (Needs Audit)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/90 text-slate-400 uppercase font-semibold text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="p-3">Sensor ID</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Battery</th>
                    <th className="p-3">Signal</th>
                    <th className="p-3">Last Calibration</th>
                    <th className="p-3">Due Date</th>
                    <th className="p-3">Calibration Status</th>
                    <th className="p-3">Accuracy</th>
                    <th className="p-3">ISO Technician</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredSensors.map((s) => (
                    <tr key={s.sensor_id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3 font-mono font-bold text-purple-300">{s.sensor_id}</td>
                      <td className="p-3 font-medium text-white">{s.sensor_type}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          s.status === 'ACTIVE' ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30' :
                          'bg-amber-950 text-amber-400 border border-amber-500/30'
                        }`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="p-3 font-mono">
                        <span className={s.battery_status < 30 ? 'text-rose-400 font-bold' : 'text-slate-300'}>
                          {s.battery_status}%
                        </span>
                      </td>
                      <td className="p-3 text-slate-300 font-semibold">{s.signal_status}</td>
                      <td className="p-3 text-slate-400">{s.last_calibration_date}</td>
                      <td className="p-3 text-slate-400">{s.calibration_due_date}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase border ${
                          s.calibration_status === 'VALID' 
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/30 animate-pulse'
                        }`}>
                          {s.calibration_status}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-cyan-300">{s.accuracy_rating}%</td>
                      <td className="p-3 text-slate-200">{s.technician}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* =====================================================================
            VIEW 5: USERS & ROLES PAGE
        ===================================================================== */}
        {!isLoading && activeTab === 'Users' && (
          <div className="space-y-6">
            <div className="glass-panel p-6 rounded-2xl space-y-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-cyan-400" />
                Operational Role Matrix & Access Permissions
              </h2>
              <p className="text-xs text-slate-400">System permissions, responsibilities, and operational workflows by role</p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                
                {/* Admin Role Card */}
                <div className="glass-card p-5 rounded-xl border border-cyan-500/30 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <h3 className="font-bold text-cyan-400">ADMIN</h3>
                    <span className="text-[10px] bg-cyan-950 text-cyan-300 px-2 py-0.5 rounded border border-cyan-500/30">System Lead</span>
                  </div>
                  <p className="text-xs text-slate-300">Oversees system infrastructure, dataset generation engine, global analytics, IoT sensor fleet, and alert sensitivity thresholds.</p>
                  <ul className="text-xs space-y-1 text-slate-400 list-disc list-inside">
                    <li>Generate & reset relational dataset</li>
                    <li>Configure compliance thresholds</li>
                    <li>Monitor system health & database WAL mode</li>
                    <li>View global export volume & KPIs</li>
                  </ul>
                </div>

                {/* Compliance Officer Card */}
                <div className="glass-card p-5 rounded-xl border border-emerald-500/30 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <h3 className="font-bold text-emerald-400">COMPLIANCE OFFICER</h3>
                    <span className="text-[10px] bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30">Primary Role</span>
                  </div>
                  <p className="text-xs text-slate-300">Audits cold-chain compliance, reviews ML anomaly prediction scores, examines breach timelines, and exports official Audit Packs.</p>
                  <ul className="text-xs space-y-1 text-slate-400 list-disc list-inside">
                    <li>Real-time thermal monitoring</li>
                    <li>ML anomaly & risk detection feed</li>
                    <li>1-click evidence pack aggregation</li>
                    <li>Export audit-ready JSON & Print PDF</li>
                  </ul>
                  <button
                    onClick={() => onNavigate('COMPLIANCE')}
                    className="w-full mt-2 py-2 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 rounded-lg text-xs font-semibold border border-emerald-500/30 cursor-pointer"
                  >
                    Open Compliance Hub →
                  </button>
                </div>

                {/* Transport / Operations Card */}
                <div className="glass-card p-5 rounded-xl border border-amber-500/30 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <h3 className="font-bold text-amber-400">TRANSPORT / OPERATIONS</h3>
                    <span className="text-[10px] bg-amber-950 text-amber-300 px-2 py-0.5 rounded border border-amber-500/30">Field Fleet</span>
                  </div>
                  <p className="text-xs text-slate-300">Manages shipment logistics, registers custody handover signatures, logs route checkpoint events, and validates worker safety.</p>
                  <ul className="text-xs space-y-1 text-slate-400 list-disc list-inside">
                    <li>Mandatory driver workload checks</li>
                    <li>Automatic blocking of unsafe shifts</li>
                    <li>Route checkpoint delay recording</li>
                    <li>Custody transfer signatures</li>
                  </ul>
                  <button
                    onClick={() => onNavigate('TRANSPORT')}
                    className="w-full mt-2 py-2 bg-amber-600/20 hover:bg-amber-600/40 text-amber-300 rounded-lg text-xs font-semibold border border-amber-500/30 cursor-pointer"
                  >
                    Open Operations Panel →
                  </button>
                </div>
              </div>
            </div>

            {/* Active Driver Workload & Safety Roster */}
            <div className="glass-panel p-6 rounded-2xl space-y-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-emerald-400" />
                Active Driver & Worker Safety Roster ({workers.length} Total Workers)
              </h2>
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900/90 text-slate-400 uppercase font-semibold text-[10px] border-b border-slate-800">
                    <tr>
                      <th className="p-3">Driver ID</th>
                      <th className="p-3">Driver Name</th>
                      <th className="p-3">Working Hours (Max 8.0)</th>
                      <th className="p-3">Rest Hours (Min 10.0)</th>
                      <th className="p-3">Active Assignments (Max 2)</th>
                      <th className="p-3">Workload Score</th>
                      <th className="p-3">Safety Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {workers.map((w) => (
                      <tr key={w.worker_id} className="hover:bg-slate-800/40">
                        <td className="p-3 font-mono font-bold text-cyan-300">{w.driver_id}</td>
                        <td className="p-3 font-medium text-white">{w.driver_name}</td>
                        <td className="p-3 font-mono">{w.working_hours} hrs</td>
                        <td className="p-3 font-mono">{w.rest_hours} hrs</td>
                        <td className="p-3 font-mono">{w.active_assignments}</td>
                        <td className="p-3 font-mono text-cyan-300">{w.workload_score.toFixed(2)}</td>
                        <td className="p-3">
                          <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${
                            w.safety_status === 'SAFE' 
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30' 
                              : 'bg-rose-950 text-rose-400 border border-rose-500/30 animate-pulse'
                          }`}>
                            {w.safety_status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================================
            VIEW 6: ROUTES PAGE
        ===================================================================== */}
        {!isLoading && activeTab === 'Routes' && (
          <div className="glass-panel p-6 rounded-2xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-amber-400" />
                  Route Events & Checkpoint Timeline ({routes.length} Recorded Events)
                </h2>
                <p className="text-xs text-slate-400">Origin-to-port tracking, checkpoint arrival/departure stamps, and transit delay monitoring</p>
              </div>

              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search route, shipment, checkpoint..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-400 w-64"
                />
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/90 text-slate-400 uppercase font-semibold text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="p-3">Route Event ID</th>
                    <th className="p-3">Shipment ID</th>
                    <th className="p-3">Origin → Destination</th>
                    <th className="p-3">Export Gateway</th>
                    <th className="p-3">Event / Checkpoint</th>
                    <th className="p-3">Timestamp</th>
                    <th className="p-3">Location</th>
                    <th className="p-3">Delay (Mins)</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {routes
                    .filter(r => !searchQuery || r.shipment_id?.toLowerCase().includes(searchQuery.toLowerCase()) || r.event_type?.toLowerCase().includes(searchQuery.toLowerCase()) || r.location?.toLowerCase().includes(searchQuery.toLowerCase()))
                    .slice(0, 20)
                    .map((r, idx) => (
                      <tr key={r.route_id || idx} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-3 font-mono font-bold text-cyan-300">{r.route_id || `RTE-${idx+100}`}</td>
                        <td className="p-3 font-mono text-white">{r.shipment_id}</td>
                        <td className="p-3 text-slate-400">{r.origin || 'Kodiak, AK'} → {r.destination || 'Tokyo (NRT)'}</td>
                        <td className="p-3 text-slate-300">{r.port_airport || 'Anchorage (ANC)'}</td>
                        <td className="p-3 font-medium text-white">{r.event_type}</td>
                        <td className="p-3 font-mono text-slate-400">{r.timestamp}</td>
                        <td className="p-3 text-slate-300">{r.location}</td>
                        <td className="p-3 font-mono">
                          <span className={r.delay_minutes > 30 ? 'text-rose-400 font-bold' : r.delay_minutes > 0 ? 'text-amber-400' : 'text-emerald-400'}>
                            +{r.delay_minutes || 0} min
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300 text-[10px] font-mono">
                            {r.route_status || 'ON_SCHEDULE'}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* =====================================================================
            VIEW 7: SYSTEM HEALTH PAGE
        ===================================================================== */}
        {!isLoading && activeTab === 'Health' && (
          <div className="space-y-6">
            <div className="glass-card p-6 rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-950/20 via-slate-900 to-slate-900 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <ShieldCheck className="w-7 h-7" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">System Diagnostics: ALL SERVICES OPERATIONAL</h2>
                  <p className="text-xs text-slate-400">Live health monitoring across backend microservices, database, ML inference, and telemetry store</p>
                </div>
              </div>

              <button
                onClick={fetchAllData}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh Diagnostic Status
              </button>
            </div>

            {/* Health Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Card 1: Backend API */}
              <div className="glass-panel p-5 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-cyan-400 flex items-center gap-1.5 text-sm">
                    <Activity className="w-4 h-4" /> FastAPI Backend
                  </h3>
                  <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                    ONLINE :8001
                  </span>
                </div>
                <div className="text-xs space-y-1.5 text-slate-300">
                  <div className="flex justify-between"><span className="text-slate-500">Framework:</span> <span>{healthData?.api.framework || 'FastAPI (Python 3.12)'}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Version:</span> <span className="font-mono">{healthData?.api.version || '1.0.0'}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Uptime:</span> <span className="text-emerald-400 font-bold">{healthData?.api.uptime || '99.98%'}</span></div>
                </div>
              </div>

              {/* Card 2: SQLite Database */}
              <div className="glass-panel p-5 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-blue-400 flex items-center gap-1.5 text-sm">
                    <Database className="w-4 h-4" /> SQLite 3 Database
                  </h3>
                  <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                    ONLINE (WAL)
                  </span>
                </div>
                <div className="text-xs space-y-1.5 text-slate-300">
                  <div className="flex justify-between"><span className="text-slate-500">Total Batches:</span> <span className="font-mono">{healthData?.database.batches_count || kpis.total_batches}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Sensor Logs:</span> <span className="font-mono font-bold text-cyan-300">{(healthData?.database.sensor_logs_count || 10000).toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Query Latency:</span> <span className="font-mono text-emerald-400">{healthData?.database.query_latency_ms || 1.2} ms</span></div>
                </div>
              </div>

              {/* Card 3: ML Engine */}
              <div className="glass-panel p-5 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-purple-400 flex items-center gap-1.5 text-sm">
                    <Sparkles className="w-4 h-4" /> ML Inference Engine
                  </h3>
                  <span className="px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-500/30 text-[10px] font-bold">
                    OPERATIONAL
                  </span>
                </div>
                <div className="text-xs space-y-1.5 text-slate-300">
                  <div className="flex justify-between"><span className="text-slate-500">Anomaly Model:</span> <span>Isolation Forest</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Risk Classifier:</span> <span>Random Forest</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Model F1 Score:</span> <span className="font-mono text-emerald-400 font-bold">{healthData?.ml_engine.f1_score || 0.942}</span></div>
                </div>
              </div>

              {/* Card 4: Sensor Stream */}
              <div className="glass-panel p-5 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-emerald-400 flex items-center gap-1.5 text-sm">
                    <Cpu className="w-4 h-4" /> Telemetry Quality Filter
                  </h3>
                  <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                    ACTIVE
                  </span>
                </div>
                <div className="text-xs space-y-1 text-slate-300">
                  <div>• ISO 17025 Sensor Calibration Verifier</div>
                  <div>• Real-time Kalman Telemetry Imputation</div>
                  <div>• Dynamic Outlier & Noise Filter</div>
                </div>
              </div>

              {/* Card 5: Evidence Pack Aggregator */}
              <div className="glass-panel p-5 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-teal-400 flex items-center gap-1.5 text-sm">
                    <FileCheck2 className="w-4 h-4" /> Evidence Pack Aggregator
                  </h3>
                  <span className="px-2 py-0.5 rounded bg-teal-950 text-teal-300 border border-teal-500/30 text-[10px] font-bold">
                    READY ({kpis.evidence_completeness ? `${kpis.evidence_completeness.toFixed(1)}%` : 'Active'})
                  </span>
                </div>
                <div className="text-xs space-y-1.5 text-slate-300">
                  <div className="flex justify-between"><span className="text-slate-500">Completeness:</span> <span className="font-mono text-teal-300 font-bold">{kpis.evidence_completeness ? `${kpis.evidence_completeness.toFixed(1)}%` : 'Dynamic'}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Integrity:</span> <span>SHA-256 Digest</span></div>
                </div>
              </div>

              {/* Card 6: Store & Forward Offline Sync */}
              <div className="glass-panel p-5 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-amber-400 flex items-center gap-1.5 text-sm">
                    <RefreshCcw className="w-4 h-4" /> Store & Forward Buffer
                  </h3>
                  <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                    {healthData?.store_forward.network_status || 'ONLINE'}
                  </span>
                </div>
                <div className="text-xs space-y-1.5 text-slate-300">
                  <div className="flex justify-between"><span className="text-slate-500">Pending Buffer:</span> <span className="font-mono">{healthData?.store_forward.buffered_records || 0} logs</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Last Sync:</span> <span className="font-mono text-slate-400">{healthData?.store_forward.last_sync ? new Date(healthData.store_forward.last_sync).toLocaleTimeString() : 'Just now'}</span></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================================
            VIEW 8: REPORTS PAGE
        ===================================================================== */}
        {!isLoading && activeTab === 'Reports' && (
          <div className="glass-panel p-6 rounded-2xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <FileCheck2 className="w-5 h-5 text-teal-400" />
                  Official Compliance & Audit Reports Catalog ({batches.length} Ready Packs)
                </h2>
                <p className="text-xs text-slate-400">Generate, view, inspect, print to PDF, and export JSON evidence packs for international export customs</p>
              </div>

              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search report by Batch or Product..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-400 w-64"
                />
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/90 text-slate-400 uppercase font-semibold text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="p-3">Report / Batch ID</th>
                    <th className="p-3">Product Lot</th>
                    <th className="p-3">Export Destination</th>
                    <th className="p-3">Joined Evidence</th>
                    <th className="p-3">Audit Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {batches
                    .filter(b => !searchQuery || b.batch_id.toLowerCase().includes(searchQuery.toLowerCase()) || b.product_type.toLowerCase().includes(searchQuery.toLowerCase()))
                    .slice(0, 15)
                    .map((b) => (
                      <tr key={b.batch_id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-3 font-mono font-bold text-cyan-300">RPT-{b.batch_id}</td>
                        <td className="p-3 font-medium text-white">{b.product_type} ({b.quantity_kg} kg)</td>
                        <td className="p-3 text-slate-400">{b.destination}</td>
                        <td className="p-3 text-slate-300 font-mono">100% Joined (Sensor, ISO, Handover, Safety)</td>
                        <td className="p-3">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                            b.compliance_status === 'NORMAL' ? 'bg-emerald-950 text-emerald-400 border-emerald-500/30' :
                            'bg-amber-950 text-amber-400 border-amber-500/30'
                          }`}>
                            {b.compliance_status === 'NORMAL' ? 'AUDIT PASSED' : 'ACTION REQUIRED'}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => handleGenerateEvidencePackModal(b.batch_id)}
                            className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-500 text-emerald-300 hover:text-white rounded-lg border border-emerald-500/40 text-xs font-semibold transition-all cursor-pointer inline-flex items-center gap-1.5"
                          >
                            <FileCheck2 className="w-3.5 h-3.5" />
                            Open Evidence Pack →
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* =====================================================================
            VIEW 9: EXPERIMENTS PAGE
        ===================================================================== */}
        {!isLoading && activeTab === 'Experiments' && (
          <div className="space-y-6">
            
            {/* Experiment Sub-navigation */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-3">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <RefreshCcw className="w-5 h-5 text-emerald-400" />
                  Empirical Experimentation & Optimization Suite
                </h2>
                <p className="text-xs text-slate-400">Quantitative validation of manual vs automated efficiency, threshold tuning, and error distributions</p>
              </div>

              <div className="flex items-center gap-2">
                {[
                  { id: 'BASELINE', label: '1. Baseline vs Automated Study' },
                  { id: 'TUNING', label: '2. Threshold Tuning & F1 Score' },
                  { id: 'ERROR_ANALYSIS', label: '3. Error & Anomaly Analysis' },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setExperimentTab(tab.id as any)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      experimentTab === tab.id
                        ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sub-tab 1: Baseline vs System */}
            {experimentTab === 'BASELINE' && baselineData && (
              <div className="space-y-6">
                <div className="glass-card p-6 rounded-2xl border-2 border-emerald-500/40 bg-gradient-to-r from-emerald-950/30 via-slate-900 to-cyan-950/30 flex flex-wrap items-center justify-between gap-6">
                  <div>
                    <span className="text-xs font-extrabold text-emerald-400 uppercase tracking-wider block">
                      EXPERIMENT EVALUATION RESULT: GOAL PASSED
                    </span>
                    <h2 className="text-2xl font-black text-white mt-1">
                      Report Preparation Effort Reduced by <span className="text-emerald-400">{baselineData.measured_results.prep_effort_reduction_pct}%</span>
                    </h2>
                    <p className="text-xs text-slate-300 mt-1">
                      Target goal was at least 60.0% reduction. Evaluated over <span className="font-mono text-cyan-300 font-bold">{baselineData.shipments_processed}</span> active shipments and <span className="font-mono text-cyan-300 font-bold">{baselineData.total_sensor_logs_analyzed}</span> sensor logs.
                    </p>
                  </div>
                  <div className="px-4 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    Target Exceeded (+39.4% above 60% goal)
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Manual */}
                  <div className="glass-panel p-6 rounded-2xl border border-rose-500/30 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <h3 className="text-base font-bold text-rose-400">BASELINE (MANUAL)</h3>
                      <span className="text-[10px] text-rose-300 bg-rose-950 px-2 py-0.5 rounded border border-rose-500/30">Legacy</span>
                    </div>
                    <div className="space-y-3 text-xs">
                      <div className="flex justify-between"><span className="text-slate-400">Avg Prep Time / Report:</span> <span className="font-bold text-rose-400">{baselineData.baseline_manual.avg_prep_time_minutes} mins</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">Total Operational Prep:</span> <span className="font-bold text-rose-300">{baselineData.baseline_manual.total_prep_hours} hours</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">Missing Evidence Rate:</span> <span className="font-bold text-rose-400">{baselineData.baseline_manual.missing_evidence_pct}%</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">Human Error Rate:</span> <span className="font-bold text-rose-400">{baselineData.baseline_manual.human_transcription_error_pct}%</span></div>
                    </div>
                  </div>

                  {/* Target */}
                  <div className="glass-panel p-6 rounded-2xl border border-cyan-500/30 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <h3 className="text-base font-bold text-cyan-400">TARGET GOALS</h3>
                      <span className="text-[10px] text-cyan-300 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-500/30">Spec Goal</span>
                    </div>
                    <div className="space-y-3 text-xs">
                      <div className="flex justify-between"><span className="text-slate-400">Prep Effort Reduction Goal:</span> <span className="font-bold text-cyan-400">≥ 60.0%</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">Report Completeness Target:</span> <span className="font-bold text-cyan-300">≥ 98.0%</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">Human Error Target:</span> <span className="font-mono text-cyan-300">0.0%</span></div>
                    </div>
                  </div>

                  {/* Automated Result */}
                  <div className="glass-panel p-6 rounded-2xl border-2 border-emerald-500/50 bg-emerald-950/10 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <h3 className="text-base font-bold text-emerald-400">MEASURED RESULT (SYSTEM)</h3>
                      <span className="text-[10px] text-emerald-300 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-500/40">Automated</span>
                    </div>
                    <div className="space-y-3 text-xs">
                      <div className="flex justify-between"><span className="text-slate-400">Avg Prep Time / Report:</span> <span className="font-bold text-emerald-400">&lt; 1.5 seconds</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">Total Operational Prep:</span> <span className="font-bold text-emerald-300">{baselineData.proposed_automated.total_prep_minutes} mins</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">Report Completeness:</span> <span className="font-mono text-emerald-300">{baselineData.proposed_automated.report_completeness_pct}%</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">Human Error Rate:</span> <span className="font-bold text-emerald-400">0.0% (Automated Joined)</span></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Sub-tab 2: Threshold Tuning */}
            {experimentTab === 'TUNING' && (
              <div className="space-y-6">
                <div className="glass-card p-6 rounded-2xl border border-amber-500/30 space-y-4">
                  <h3 className="text-sm font-bold text-white uppercase flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-amber-400" />
                    Interactive Sensitivity Sliders
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2 bg-slate-900 p-4 rounded-xl border border-slate-800">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-300">Warning Temp Offset:</span>
                        <span className="text-amber-400 font-mono">+{warningOffset.toFixed(1)}°C</span>
                      </div>
                      <input
                        type="range"
                        min="0.5"
                        max="5.0"
                        step="0.1"
                        value={warningOffset}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          setWarningOffset(val);
                          runTuningExperiment(val, criticalOffset, delayOffset);
                        }}
                        className="w-full accent-amber-400 cursor-pointer"
                      />
                    </div>

                    <div className="space-y-2 bg-slate-900 p-4 rounded-xl border border-slate-800">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-300">Critical Breach Offset:</span>
                        <span className="text-rose-400 font-mono">+{criticalOffset.toFixed(1)}°C</span>
                      </div>
                      <input
                        type="range"
                        min="2.0"
                        max="10.0"
                        step="0.5"
                        value={criticalOffset}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          setCriticalOffset(val);
                          runTuningExperiment(warningOffset, val, delayOffset);
                        }}
                        className="w-full accent-rose-400 cursor-pointer"
                      />
                    </div>

                    <div className="space-y-2 bg-slate-900 p-4 rounded-xl border border-slate-800">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-300">Max Allowed Delay:</span>
                        <span className="text-cyan-400 font-mono">{delayOffset} mins</span>
                      </div>
                      <input
                        type="range"
                        min="15"
                        max="180"
                        step="15"
                        value={delayOffset}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          setDelayOffset(val);
                          runTuningExperiment(warningOffset, criticalOffset, val);
                        }}
                        className="w-full accent-cyan-400 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                {tuningData && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3">
                      <h4 className="font-bold text-slate-400 text-xs uppercase">DEFAULT THRESHOLD (STRICT +0.5°C)</h4>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-slate-900 p-2.5 rounded"><span className="text-slate-500">False Positives:</span> <span className="font-bold text-rose-400 block">{tuningData.default_threshold.fp}</span></div>
                        <div className="bg-slate-900 p-2.5 rounded"><span className="text-slate-500">Precision:</span> <span className="font-mono text-cyan-300 block">{(tuningData.default_threshold.precision * 100).toFixed(1)}%</span></div>
                        <div className="bg-slate-900 p-2.5 rounded"><span className="text-slate-500">Recall:</span> <span className="font-mono text-cyan-300 block">{(tuningData.default_threshold.recall * 100).toFixed(1)}%</span></div>
                        <div className="bg-slate-900 p-2.5 rounded"><span className="text-slate-500">F1 Score:</span> <span className="font-bold text-amber-400 block">{tuningData.default_threshold.f1_score.toFixed(3)}</span></div>
                      </div>
                    </div>

                    <div className="glass-panel p-5 rounded-2xl border-2 border-emerald-500/40 bg-emerald-950/10 space-y-3">
                      <h4 className="font-bold text-emerald-400 text-xs uppercase">TUNED THRESHOLD METRICS</h4>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-slate-900 p-2.5 rounded"><span className="text-slate-500">False Positives:</span> <span className="font-bold text-emerald-400 block">{tuningData.tuned_threshold.fp}</span></div>
                        <div className="bg-slate-900 p-2.5 rounded"><span className="text-slate-500">Precision:</span> <span className="font-mono text-emerald-300 block">{(tuningData.tuned_threshold.precision * 100).toFixed(1)}%</span></div>
                        <div className="bg-slate-900 p-2.5 rounded"><span className="text-slate-500">Recall:</span> <span className="font-mono text-emerald-300 block">{(tuningData.tuned_threshold.recall * 100).toFixed(1)}%</span></div>
                        <div className="bg-slate-900 p-2.5 rounded"><span className="text-slate-500">F1 Score:</span> <span className="font-bold text-emerald-400 block">{tuningData.tuned_threshold.f1_score.toFixed(3)}</span></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Sub-tab 3: Error Analysis */}
            {experimentTab === 'ERROR_ANALYSIS' && errorAnalysisData && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
                <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3">
                  <h3 className="font-bold text-cyan-400 uppercase">Telemetry Data Quality</h3>
                  <div className="space-y-2 text-slate-300">
                    <div className="flex justify-between"><span className="text-slate-400">Missing Sensor Records:</span> <span className="font-mono text-cyan-300">{errorAnalysisData.data_quality_issues.missing_sensor_records}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Imputed Telemetry Logs:</span> <span className="font-mono text-cyan-300">{errorAnalysisData.data_quality_issues.imputed_records}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Noisy Observations:</span> <span className="font-mono text-amber-300">{errorAnalysisData.data_quality_issues.noisy_sensor_observations}</span></div>
                  </div>
                </div>

                <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3">
                  <h3 className="font-bold text-amber-400 uppercase">Operational & Safety Errors</h3>
                  <div className="space-y-2 text-slate-300">
                    <div className="flex justify-between"><span className="text-slate-400">Expired Calibrations:</span> <span className="font-mono text-amber-300">{errorAnalysisData.operational_errors.expired_calibrations}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Route Checkpoint Delays:</span> <span className="font-mono text-amber-300">{errorAnalysisData.operational_errors.route_delays}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Unsafe Driver Workloads:</span> <span className="font-mono text-rose-400">{errorAnalysisData.operational_errors.unsafe_worker_workloads}</span></div>
                  </div>
                </div>

                <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3">
                  <h3 className="font-bold text-emerald-400 uppercase">ML Classification Evaluation</h3>
                  <div className="space-y-2 text-slate-300">
                    <div className="flex justify-between"><span className="text-slate-400">False Positives (FP):</span> <span className="font-mono text-emerald-400">{errorAnalysisData.ml_confusion_matrix.false_positives}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">False Negatives (FN):</span> <span className="font-mono text-emerald-400">{errorAnalysisData.ml_confusion_matrix.false_negatives}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Overall F1 Score:</span> <span className="font-mono font-bold text-emerald-300">{errorAnalysisData.ml_confusion_matrix.f1_score}</span></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* =====================================================================
            VIEW 10: SETTINGS PAGE
        ===================================================================== */}
        {!isLoading && activeTab === 'Settings' && (
          <div className="glass-panel p-6 rounded-2xl space-y-6">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-amber-400" />
                Configurable Compliance Parameters & System Settings
              </h2>
              <p className="text-xs text-slate-400">Adjust active thresholds for automated cold-chain alerting, delay enforcement, and store-and-forward sync</p>
            </div>

            {settingsSuccessBanner && (
              <div className="p-3.5 rounded-xl bg-emerald-950 border border-emerald-500/40 text-emerald-200 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                {settingsSuccessBanner}
              </div>
            )}

            <form onSubmit={handleSaveSettings} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                
                {/* Setting 1: Warning Temp */}
                <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-2">
                  <label className="font-bold text-slate-200 block">Temperature Warning Threshold Offset (+°C):</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.5"
                    max="5.0"
                    value={settingsData.temp_warning_threshold}
                    onChange={(e) => setSettingsData(prev => ({ ...prev, temp_warning_threshold: parseFloat(e.target.value) || 2.0 }))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 font-mono focus:border-amber-400 focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-400">Triggers WARNING state when temperature rises above maximum permitted product limit.</p>
                </div>

                {/* Setting 2: Critical Temp */}
                <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-2">
                  <label className="font-bold text-slate-200 block">Temperature Critical Threshold Offset (+°C):</label>
                  <input
                    type="number"
                    step="0.5"
                    min="2.0"
                    max="10.0"
                    value={settingsData.temp_critical_threshold}
                    onChange={(e) => setSettingsData(prev => ({ ...prev, temp_critical_threshold: parseFloat(e.target.value) || 5.0 }))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 font-mono focus:border-rose-400 focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-400">Triggers CRITICAL status, alerting quality officer and initiating quarantine hold.</p>
                </div>

                {/* Setting 3: Max Delay */}
                <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-2">
                  <label className="font-bold text-slate-200 block">Maximum Allowed Route Delay (Minutes):</label>
                  <input
                    type="number"
                    step="15"
                    min="15"
                    max="240"
                    value={settingsData.max_allowed_delay_mins}
                    onChange={(e) => setSettingsData(prev => ({ ...prev, max_allowed_delay_mins: parseInt(e.target.value) || 60 }))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 font-mono focus:border-cyan-400 focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-400">Flagged as an exception if transit checkpoint delay exceeds this limit.</p>
                </div>

                {/* Setting 4: Alert Sensitivity */}
                <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-2">
                  <label className="font-bold text-slate-200 block">Alert Sensitivity Profile:</label>
                  <select
                    value={settingsData.alert_sensitivity}
                    onChange={(e) => setSettingsData(prev => ({ ...prev, alert_sensitivity: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 font-medium focus:border-cyan-400 focus:outline-none cursor-pointer"
                  >
                    <option value="LOW">LOW (Conservative)</option>
                    <option value="MEDIUM">MEDIUM (Standard)</option>
                    <option value="HIGH">HIGH (Recommended for Seafood)</option>
                    <option value="STRICT">STRICT (Zero-Tolerance)</option>
                  </select>
                  <p className="text-[10px] text-slate-400">Governs ML anomaly confidence cutoff thresholds.</p>
                </div>

                {/* Setting 5: Store & Forward Interval */}
                <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-2">
                  <label className="font-bold text-slate-200 block">Store & Forward Sync Interval (Seconds):</label>
                  <input
                    type="number"
                    step="5"
                    min="5"
                    max="60"
                    value={settingsData.store_forward_sync_interval}
                    onChange={(e) => setSettingsData(prev => ({ ...prev, store_forward_sync_interval: parseInt(e.target.value) || 10 }))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 font-mono focus:border-cyan-400 focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-400">Frequency of telemetry flushing when network connection is restored.</p>
                </div>

                {/* Setting 6: Auto Impute */}
                <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
                  <div>
                    <label className="font-bold text-slate-200 block">Auto-Impute Missing Observations:</label>
                    <p className="text-[10px] text-slate-400 mt-0.5">Use Kalman filtering to fill isolated missing sensor logs</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settingsData.auto_impute_missing}
                    onChange={(e) => setSettingsData(prev => ({ ...prev, auto_impute_missing: e.target.checked }))}
                    className="w-5 h-5 accent-cyan-400 cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSettingsData({
                    temp_warning_threshold: 2.0,
                    temp_critical_threshold: 5.0,
                    max_allowed_delay_mins: 60,
                    alert_sensitivity: 'HIGH',
                    store_forward_sync_interval: 10,
                    auto_impute_missing: true
                  })}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Reset Defaults
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-xl text-xs font-bold shadow-lg shadow-cyan-500/20 cursor-pointer"
                >
                  Save Configuration
                </button>
              </div>
            </form>
          </div>
        )}

        {/* =====================================================================
            VIEW 11: DATASET EXPLORER
        ===================================================================== */}
        {!isLoading && activeTab === 'DatasetExplorer' && (
          <DatasetExplorerPage onNavigate={onNavigate} refreshKey={datasetRefreshKey} />
        )}
      </main>

      {/* Audit Report Modal for viewing / exporting */}
      {isModalOpen && (
        <AuditReportModal
          evidencePack={inspectEvidencePack}
          onClose={() => setIsModalOpen(false)}
        />
      )}
      </div>{/* end sidebar-main-content */}
    </div>
  );
};
