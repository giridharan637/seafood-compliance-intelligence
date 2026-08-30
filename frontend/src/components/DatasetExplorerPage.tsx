import React, { useState, useEffect, useCallback } from 'react';
import {
  Database, Search, Filter, ChevronLeft, ChevronRight, RefreshCw,
  AlertTriangle, CheckCircle2, Activity, Cpu, ChevronDown, ChevronUp,
  Anchor, ArrowUp, ArrowDown, FileSearch, XCircle, Home, Download, FileSpreadsheet,
  Zap, BarChart3
} from 'lucide-react';
import { NavigationRole } from '../types';
import { ThemeToggle } from './ThemeToggle';
import { useToast } from '../context/ToastContext';
import { apiFetch } from '../config/api';

interface Props {
  onNavigate: (role: NavigationRole) => void;
  refreshKey?: number;
}

interface DatasetSummary {
  product_batches: number;
  shipments: number;
  sensor_logs: number;
  sensors: number;
  sensor_calibrations: number;
  handover_records: number;
  route_events: number;
  worker_logs: number;
  compliance_events: number;
  ml_predictions: number;
  offline_buffer: number;
  missing_sensor_logs: number;
  noisy_sensor_logs: number;
  imputed_sensor_logs: number;
  expired_sensors: number;
  unsafe_workers: number;
  pending_offline_records: number;
}

interface BatchRecord {
  batch_id: string;
  product_type: string;
  quantity_kg: number;
  processing_date: string;
  origin: string;
  destination: string;
  required_temp_min: number;
  required_temp_max: number;
  export_date: string;
  shipment_id: string;
  compliance_status: string;
  current_temp?: number;
  shipment_status?: string;
  risk_score?: number;
  sensor_log_count?: number;
  missing_count?: number;
  noisy_count?: number;
  has_ml_prediction?: string;
}

interface SensorLogRecord {
  log_id: number;
  sensor_id: string;
  batch_id: string;
  shipment_id: string;
  timestamp: string;
  temperature: number | null;
  humidity: number | null;
  location: string;
  battery_status: number;
  signal_status: string;
  sensor_status: string;
  is_missing: number;
  is_noisy: number;
  is_imputed: number;
  original_temp: number | null;
  imputed_temp: number | null;
  anomaly_score: number;
  calibration_status?: string;
  accuracy_rating?: number;
}

export const DatasetExplorerPage: React.FC<Props> = ({ onNavigate, refreshKey = 0 }) => {
  const { showToast } = useToast();
  const [summary, setSummary] = useState<DatasetSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [targetCount, setTargetCount] = useState<number | null>(null);

  // Batch list state
  const [batches, setBatches] = useState<BatchRecord[]>([]);
  const [batchTotal, setBatchTotal] = useState(0);
  const [batchPage, setBatchPage] = useState(1);
  const [batchPageSize] = useState(20);
  const [batchTotalPages, setBatchTotalPages] = useState(1);
  const [batchLoading, setBatchLoading] = useState(true);
  const [batchError, setBatchError] = useState('');

  // Filters & sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('batch_id');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Drill-down sensor logs
  const [expandedBatch, setExpandedBatch] = useState<string | null>(null);
  const [sensorLogs, setSensorLogs] = useState<SensorLogRecord[]>([]);
  const [sensorLogsTotal, setSensorLogsTotal] = useState(0);
  const [sensorLogsPage, setSensorLogsPage] = useState(1);
  const [sensorLogsTotalPages, setSensorLogsTotalPages] = useState(1);
  const [sensorLogsLoading, setSensorLogsLoading] = useState(false);
  const [anomalyOnly, setAnomalyOnly] = useState(false);

  const fetchSummary = async () => {
    setSummaryLoading(true);
    setSummaryError('');
    try {
      const data = await apiFetch<DatasetSummary>('/dataset/summary');
      setSummary(data);
    } catch (err: any) {
      setSummaryError('Failed to load dataset summary. Is the backend running?');
    } finally {
      setSummaryLoading(false);
    }
  };

  const fetchBatches = useCallback(async (page = batchPage) => {
    setBatchLoading(true);
    setBatchError('');
    try {
      const params = new URLSearchParams({
        page: String(page),
        page_size: String(batchPageSize),
        sort_by: sortBy,
        sort_order: sortOrder,
      });
      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      if (statusFilter !== 'ALL') params.set('status_filter', statusFilter);

      const data = await apiFetch<{ data: BatchRecord[]; total: number; total_pages: number; page: number }>(`/dataset/batches?${params.toString()}`);
      setBatches(data.data || []);
      setBatchTotal(data.total || 0);
      setBatchTotalPages(data.total_pages || 1);
      setBatchPage(data.page || 1);
    } catch (err: any) {
      setBatchError('Failed to load batches. Check backend connection.');
    } finally {
      setBatchLoading(false);
    }
  }, [batchPage, batchPageSize, searchQuery, statusFilter, sortBy, sortOrder]);

  const fetchSensorLogs = async (batchId: string, page = 1) => {
    setSensorLogsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        page_size: '30',
        anomaly_only: String(anomalyOnly),
      });
      const data = await apiFetch<{ data: SensorLogRecord[]; total: number; total_pages: number; page: number }>(`/dataset/sensor-logs/${batchId}?${params.toString()}`);
      setSensorLogs(data.data || []);
      setSensorLogsTotal(data.total || 0);
      setSensorLogsTotalPages(data.total_pages || 1);
      setSensorLogsPage(data.page || 1);
    } catch (err: any) {
      setSensorLogs([]);
    } finally {
      setSensorLogsLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  // Re-fetch when refreshKey changes (e.g., dataset regenerated from AdminDashboard)
  useEffect(() => {
    if (refreshKey > 0) {
      fetchSummary();
      fetchBatches(1);
    }
  }, [refreshKey]);

  useEffect(() => {
    fetchBatches(1);
  }, [searchQuery, statusFilter, sortBy, sortOrder]);

  useEffect(() => {
    fetchBatches(batchPage);
  }, [batchPage]);

  const handleGenerateDataset = async (count: number) => {
    setIsGenerating(true);
    setTargetCount(count);
    try {
      await apiFetch('/generate-dataset', {
        method: 'POST',
        body: JSON.stringify({ record_count: count }),
      });
      // Auto-refresh after generation
      await fetchSummary();
      await fetchBatches(1);
      showToast({
        type: 'success',
        title: 'Dataset Generated Successfully',
        message: `${count.toLocaleString()} target records are now available in the database.`,
        duration: 5000,
      });
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Dataset Generation Failed',
        message: err.message || 'Unable to connect to backend. Ensure it is running on port 8001.',
      });
    } finally {
      setIsGenerating(false);
      setTargetCount(null);
    }
  };

  const handleSort = (col: string) => {
    if (sortBy === col) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(col);
      setSortOrder('asc');
    }
  };

  const handleExpandBatch = (batchId: string) => {
    if (expandedBatch === batchId) {
      setExpandedBatch(null);
      setSensorLogs([]);
    } else {
      setExpandedBatch(batchId);
      fetchSensorLogs(batchId, 1);
    }
  };

  const SortIcon = ({ col }: { col: string }) => {
    if (sortBy !== col) return null;
    return sortOrder === 'asc'
      ? <ArrowUp className="w-3 h-3 text-cyan-400" />
      : <ArrowDown className="w-3 h-3 text-cyan-400" />;
  };

  const statusBadge = (status: string) => {
    const cls = status === 'NORMAL'
      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
      : status === 'WARNING'
      ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
      : 'bg-rose-500/10 text-rose-400 border-rose-500/30';
    return (
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${cls}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 flex flex-col transition-colors duration-200">
      {/* Header */}
      <header className="bg-white/95 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 backdrop-blur-md shadow-xs">
        <div className="max-w-full px-4 py-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('LANDING')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer text-xs font-semibold"
            >
              <Home className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
              ← Back to Home
            </button>
            <div>
              <h1 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                DATASET EXPLORER
                <span className="px-2 py-0.5 rounded bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-400 text-xs font-semibold border border-cyan-300 dark:border-cyan-500/30">
                  Server-Side Paginated
                </span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">All database records — batches, sensors, calibration, custody, routes, ML</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Dataset generation buttons */}
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/60 rounded-xl px-3 py-1.5 border border-slate-200 dark:border-slate-700">
              <Zap className="w-3.5 h-3.5 text-cyan-500 dark:text-cyan-400 shrink-0" />
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mr-1">Generate:</span>
              {[5000, 10000, 15000].map(cnt => (
                <button
                  key={cnt}
                  disabled={isGenerating}
                  onClick={() => handleGenerateDataset(cnt)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer border transition-all ${
                    targetCount === cnt && isGenerating
                      ? 'bg-cyan-500 text-white border-cyan-400 animate-pulse'
                      : 'bg-white dark:bg-slate-900 hover:bg-cyan-50 dark:hover:bg-cyan-900/30 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600'
                  }`}
                >
                  {isGenerating && targetCount === cnt ? '...' : `${(cnt/1000).toFixed(0)}K`}
                </button>
              ))}
            </div>
            <ThemeToggle />
            <a
              href="/api/dataset/export/csv"
              download="seafood_compliance_dataset.csv"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 dark:bg-teal-600/20 hover:bg-teal-100 dark:hover:bg-teal-600/40 text-teal-800 dark:text-teal-300 border border-teal-300 dark:border-teal-500/40 rounded-lg text-xs font-medium cursor-pointer transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> Download CSV
            </a>
            <a
              href="/api/dataset/export/excel"
              download="seafood_compliance_dataset.xlsx"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-600/20 hover:bg-emerald-100 dark:hover:bg-emerald-600/40 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/40 rounded-lg text-xs font-medium cursor-pointer transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" /> Download Excel
            </a>
            <button
              onClick={() => onNavigate('ADMIN')}
              className="px-3 py-1.5 bg-cyan-50 dark:bg-cyan-600/20 hover:bg-cyan-100 dark:hover:bg-cyan-600/30 text-cyan-800 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-500/40 rounded-lg text-xs font-medium cursor-pointer"
            >
              Admin Dashboard →
            </button>
          </div>
        </div>
      </header>

      <main className="w-full p-4 sm:p-6 flex-1 space-y-6">

        {/* Dataset Generation Banner - shows real counts */}
        <div className="glass-card p-4 rounded-2xl border border-cyan-500/20 bg-gradient-to-r from-cyan-950/20 to-slate-900 flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-xs font-extrabold uppercase tracking-wider text-cyan-400 block">
              REAL RELATIONAL DATASET ENGINE
            </span>
            {summary ? (
              <p className="text-sm font-semibold text-white mt-0.5">
                Currently Loaded: <span className="text-cyan-300 font-mono font-bold">{summary.product_batches.toLocaleString()}</span> Batches
                {' · '}<span className="text-emerald-300 font-mono font-bold">{summary.shipments}</span> Shipments
                {' · '}<span className="text-purple-300 font-mono font-bold">{summary.sensor_logs.toLocaleString()}</span> Sensor Logs
              </p>
            ) : (
              <p className="text-sm text-slate-400 mt-0.5">Loading database statistics...</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">Generate New Dataset:</span>
            {[5000, 10000, 15000].map(cnt => (
              <button
                key={cnt}
                disabled={isGenerating}
                onClick={() => handleGenerateDataset(cnt)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border transition-all ${
                  targetCount === cnt && isGenerating
                    ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-md animate-pulse'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700 hover:border-cyan-500/40'
                }`}
              >
                {isGenerating && targetCount === cnt ? 'Generating...' : `${cnt.toLocaleString()} Records`}
              </button>
            ))}
          </div>
        </div>

        {/* Summary Cards */}
        {summaryLoading ? (
          <div className="glass-panel p-6 rounded-2xl flex items-center justify-center gap-3 text-slate-400 text-sm">
            <RefreshCw className="w-5 h-5 animate-spin text-cyan-400" />
            Loading database summary...
          </div>
        ) : summaryError ? (
          <div className="glass-panel p-6 rounded-2xl border border-rose-500/30 bg-rose-950/20 text-rose-300 text-sm flex items-center gap-3">
            <XCircle className="w-5 h-5 text-rose-400" />
            {summaryError}
          </div>
        ) : summary && (
          <div className="glass-card p-5 rounded-2xl border border-cyan-500/20 space-y-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Database className="w-4 h-4 text-cyan-400" />
              DATABASE TABLE RECORD COUNTS
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
              {[
                { label: 'Product Batches', value: summary.product_batches, color: 'text-cyan-400' },
                { label: 'Shipments', value: summary.shipments, color: 'text-blue-400' },
                { label: 'Sensor Logs', value: summary.sensor_logs.toLocaleString(), color: 'text-emerald-400' },
                { label: 'Sensors', value: summary.sensors, color: 'text-purple-400' },
                { label: 'Calibrations', value: summary.sensor_calibrations, color: 'text-amber-400' },
                { label: 'Handovers', value: summary.handover_records, color: 'text-teal-400' },
                { label: 'Route Events', value: summary.route_events, color: 'text-sky-400' },
                { label: 'Workers', value: summary.worker_logs, color: 'text-violet-400' },
                { label: 'Compliance Alerts', value: summary.compliance_events, color: 'text-rose-400' },
                { label: 'ML Predictions', value: summary.ml_predictions, color: 'text-fuchsia-400' },
                { label: 'Offline Buffer', value: summary.pending_offline_records, color: summary.pending_offline_records > 0 ? 'text-amber-400' : 'text-slate-500' },
              ].map(({ label, value, color }) => (
                <div key={label} className="glass-panel p-3 rounded-xl border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">{label}</div>
                  <div className={`text-lg font-black mt-0.5 ${color}`}>{value}</div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/20 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <div>
                  <div className="text-[10px] text-slate-400">Missing Observations</div>
                  <div className="text-sm font-bold text-amber-400">{summary.missing_sensor_logs.toLocaleString()} logs flagged</div>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-cyan-950/20 border border-cyan-500/20 flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                <div>
                  <div className="text-[10px] text-slate-400">Noisy Observations</div>
                  <div className="text-sm font-bold text-cyan-400">{summary.noisy_sensor_logs.toLocaleString()} logs flagged</div>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-purple-950/20 border border-purple-500/20 flex items-center gap-2">
                <Cpu className="w-4 h-4 text-purple-400" />
                <div>
                  <div className="text-[10px] text-slate-400">Imputed Records</div>
                  <div className="text-sm font-bold text-purple-400">{summary.imputed_sensor_logs.toLocaleString()} auto-imputed</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Batch Explorer Table */}
        <div className="glass-panel p-6 rounded-2xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <FileSearch className="w-5 h-5 text-cyan-400" />
                PRODUCT BATCH RECORDS
                <span className="text-slate-400 text-sm font-normal">({batchTotal} total)</span>
              </h2>
              <p className="text-xs text-slate-400">Click a batch row to expand sensor logs. All data is from the live database.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search batch, product, origin..."
                  value={searchQuery}
                  onChange={e => { setSearchQuery(e.target.value); setBatchPage(1); }}
                  className="pl-9 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-400 w-60"
                />
              </div>
              <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs">
                <Filter className="w-3.5 h-3.5 text-cyan-400" />
                <select
                  value={statusFilter}
                  onChange={e => { setStatusFilter(e.target.value); setBatchPage(1); }}
                  className="bg-transparent text-slate-200 focus:outline-none cursor-pointer"
                >
                  <option value="ALL" className="bg-slate-900">All Statuses</option>
                  <option value="NORMAL" className="bg-slate-900">NORMAL</option>
                  <option value="WARNING" className="bg-slate-900">WARNING</option>
                  <option value="CRITICAL" className="bg-slate-900">CRITICAL</option>
                </select>
              </div>
              <button
                onClick={() => { fetchSummary(); fetchBatches(batchPage); }}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 transition-colors cursor-pointer"
                title="Refresh"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Loading state */}
          {batchLoading && (
            <div className="flex items-center justify-center gap-3 py-12 text-slate-400">
              <RefreshCw className="w-5 h-5 animate-spin text-cyan-400" />
              Loading batch records...
            </div>
          )}

          {/* Error state */}
          {!batchLoading && batchError && (
            <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-sm flex items-center gap-3">
              <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
              {batchError}
            </div>
          )}

          {/* Empty state */}
          {!batchLoading && !batchError && batches.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500 gap-3">
              <Database className="w-12 h-12 opacity-30" />
              <p className="text-sm font-medium">No batch records found matching your filters.</p>
              <button
                onClick={() => { setSearchQuery(''); setStatusFilter('ALL'); }}
                className="text-xs text-cyan-400 hover:text-cyan-300 underline cursor-pointer"
              >
                Clear filters
              </button>
            </div>
          )}

          {/* Data Table */}
          {!batchLoading && !batchError && batches.length > 0 && (
            <>
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900/90 text-slate-400 uppercase font-semibold text-[10px] border-b border-slate-800">
                    <tr>
                      <th className="p-2 w-8"></th>
                      {[
                        { key: 'batch_id', label: 'Batch ID' },
                        { key: 'product_type', label: 'Product Type' },
                        { key: 'quantity_kg', label: 'Qty (kg)' },
                        { key: 'compliance_status', label: 'Status' },
                        { key: null, label: 'Temp Range' },
                        { key: null, label: 'Sensor Logs' },
                        { key: null, label: 'Missing/Noisy' },
                        { key: null, label: 'ML Pred' },
                        { key: null, label: 'Risk Score' },
                      ].map(({ key, label }) => (
                        <th
                          key={label}
                          onClick={() => key && handleSort(key)}
                          className={`p-2 whitespace-nowrap ${key ? 'cursor-pointer hover:text-cyan-300 select-none' : ''}`}
                        >
                          <div className="flex items-center gap-1">
                            {label}
                            {key && <SortIcon col={key} />}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {batches.map(batch => (
                      <React.Fragment key={batch.batch_id}>
                        <tr
                          className={`hover:bg-slate-800/40 transition-colors cursor-pointer ${expandedBatch === batch.batch_id ? 'bg-slate-800/60 border-l-4 border-cyan-500' : ''}`}
                          onClick={() => handleExpandBatch(batch.batch_id)}
                        >
                          <td className="p-2 text-center">
                            {expandedBatch === batch.batch_id
                              ? <ChevronUp className="w-4 h-4 text-cyan-400 mx-auto" />
                              : <ChevronDown className="w-4 h-4 text-slate-500 mx-auto" />
                            }
                          </td>
                          <td className="p-2 font-mono font-bold text-cyan-300 whitespace-nowrap">
                            {batch.batch_id}
                            <div className="text-[10px] text-slate-500 font-normal">{batch.shipment_id}</div>
                          </td>
                          <td className="p-2 font-medium text-white max-w-[200px] truncate">{batch.product_type}</td>
                          <td className="p-2 font-mono text-slate-300">{batch.quantity_kg?.toFixed(0)}</td>
                          <td className="p-2">{statusBadge(batch.compliance_status)}</td>
                          <td className="p-2 font-mono text-slate-300 whitespace-nowrap">
                            {batch.required_temp_min}°C → {batch.required_temp_max}°C
                          </td>
                          <td className="p-2">
                            <span className="text-slate-300 font-mono">{(batch.sensor_log_count || 0).toLocaleString()}</span>
                            <span className="text-slate-500 ml-1">logs</span>
                          </td>
                          <td className="p-2">
                            <div className="flex items-center gap-1.5">
                              {(batch.missing_count || 0) > 0 && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-400 border border-amber-500/30">
                                  {batch.missing_count}M
                                </span>
                              )}
                              {(batch.noisy_count || 0) > 0 && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-cyan-950 text-cyan-400 border border-cyan-500/30">
                                  {batch.noisy_count}N
                                </span>
                              )}
                              {!batch.missing_count && !batch.noisy_count && (
                                <span className="text-emerald-400">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-2">
                            {batch.has_ml_prediction
                              ? <span className="text-purple-400 text-[10px] font-bold">✓ ML</span>
                              : <span className="text-slate-600 text-[10px]">—</span>
                            }
                          </td>
                          <td className="p-2">
                            {batch.risk_score !== undefined && batch.risk_score !== null ? (
                              <div className="flex items-center gap-1">
                                <div className="w-12 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${batch.risk_score > 0.7 ? 'bg-rose-500' : batch.risk_score > 0.4 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                    style={{ width: `${Math.round(batch.risk_score * 100)}%` }}
                                  />
                                </div>
                                <span className="text-[10px] font-mono text-slate-400">{(batch.risk_score * 100).toFixed(0)}%</span>
                              </div>
                            ) : <span className="text-slate-600">—</span>}
                          </td>
                        </tr>

                        {/* Expanded Sensor Logs Row */}
                        {expandedBatch === batch.batch_id && (
                          <tr>
                            <td colSpan={10} className="p-0">
                              <div className="bg-slate-900/60 border-b border-slate-800 p-4 space-y-3">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                  <h3 className="text-xs font-bold text-cyan-300 flex items-center gap-2">
                                    <Cpu className="w-4 h-4 text-purple-400" />
                                    SENSOR LOGS for {batch.batch_id}
                                    <span className="text-slate-400 font-normal">({sensorLogsTotal} total)</span>
                                  </h3>
                                  <div className="flex items-center gap-2">
                                    <label className="flex items-center gap-1.5 text-[11px] text-slate-400 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={anomalyOnly}
                                        onChange={e => {
                                          setAnomalyOnly(e.target.checked);
                                          fetchSensorLogs(batch.batch_id, 1);
                                        }}
                                        className="accent-rose-400"
                                      />
                                      Anomaly/Missing only
                                    </label>
                                  </div>
                                </div>

                                {sensorLogsLoading ? (
                                  <div className="flex items-center gap-2 text-slate-400 text-xs py-4">
                                    <RefreshCw className="w-4 h-4 animate-spin text-purple-400" />
                                    Loading sensor logs...
                                  </div>
                                ) : sensorLogs.length === 0 ? (
                                  <div className="text-slate-500 text-xs py-4 text-center">No sensor logs found.</div>
                                ) : (
                                  <>
                                    <div className="overflow-x-auto rounded-lg border border-slate-800">
                                      <table className="w-full text-left text-[11px] text-slate-300">
                                        <thead className="bg-slate-950 text-slate-500 uppercase font-semibold text-[9px] border-b border-slate-800">
                                          <tr>
                                            {['Timestamp', 'Sensor ID', 'Temp (°C)', 'Imputed Temp', 'Humidity', 'Battery', 'Signal', 'Status', 'Missing', 'Noisy', 'Anomaly Score', 'Cal. Status'].map(h => (
                                              <th key={h} className="p-2 whitespace-nowrap">{h}</th>
                                            ))}
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-800/50">
                                          {sensorLogs.map(log => (
                                            <tr
                                              key={log.log_id}
                                              className={`hover:bg-slate-800/30 ${log.is_missing ? 'bg-amber-950/10' : log.is_noisy ? 'bg-cyan-950/10' : ''}`}
                                            >
                                              <td className="p-2 font-mono text-slate-400 whitespace-nowrap">{log.timestamp}</td>
                                              <td className="p-2 font-mono text-purple-300">{log.sensor_id}</td>
                                              <td className="p-2 font-mono font-bold text-white">
                                                {log.temperature !== null && log.temperature !== undefined ? `${log.temperature.toFixed(1)}°C` : (
                                                  <span className="text-amber-400 font-bold">MISSING</span>
                                                )}
                                              </td>
                                              <td className="p-2 font-mono text-emerald-300">
                                                {log.imputed_temp !== null && log.imputed_temp !== undefined ? `${log.imputed_temp.toFixed(1)}°C` : '—'}
                                              </td>
                                              <td className="p-2 font-mono text-slate-400">
                                                {log.humidity !== null ? `${log.humidity}%` : '—'}
                                              </td>
                                              <td className="p-2 font-mono">
                                                <span className={log.battery_status < 30 ? 'text-rose-400' : 'text-slate-300'}>
                                                  {log.battery_status}%
                                                </span>
                                              </td>
                                              <td className="p-2">
                                                <span className={`text-[10px] font-semibold ${log.signal_status === 'EXCELLENT' ? 'text-emerald-400' : log.signal_status === 'GOOD' ? 'text-cyan-400' : log.signal_status === 'DISCONNECTED' ? 'text-rose-400' : 'text-amber-400'}`}>
                                                  {log.signal_status}
                                                </span>
                                              </td>
                                              <td className="p-2">
                                                <span className={`text-[10px] font-bold uppercase ${log.sensor_status === 'NORMAL' ? 'text-emerald-400' : log.sensor_status === 'CRITICAL' ? 'text-rose-400 animate-pulse' : 'text-amber-400'}`}>
                                                  {log.sensor_status}
                                                </span>
                                              </td>
                                              <td className="p-2 text-center">
                                                {log.is_missing ? <span className="text-amber-400 font-bold">●</span> : <span className="text-slate-600">○</span>}
                                              </td>
                                              <td className="p-2 text-center">
                                                {log.is_noisy ? <span className="text-cyan-400 font-bold">●</span> : <span className="text-slate-600">○</span>}
                                              </td>
                                              <td className="p-2">
                                                <div className="flex items-center gap-1">
                                                  <div className="w-10 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                                    <div
                                                      className={`h-full rounded-full ${log.anomaly_score > 0.7 ? 'bg-rose-500' : log.anomaly_score > 0.4 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                                      style={{ width: `${Math.round(log.anomaly_score * 100)}%` }}
                                                    />
                                                  </div>
                                                  <span className="font-mono text-[10px]">{log.anomaly_score.toFixed(2)}</span>
                                                </div>
                                              </td>
                                              <td className="p-2">
                                                <span className={`text-[10px] font-bold ${log.calibration_status === 'VALID' ? 'text-emerald-400' : log.calibration_status === 'EXPIRED' ? 'text-rose-400' : 'text-slate-500'}`}>
                                                  {log.calibration_status || '—'}
                                                </span>
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>

                                    {/* Sensor Logs Pagination */}
                                    {sensorLogsTotalPages > 1 && (
                                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                                        <span>Page {sensorLogsPage} of {sensorLogsTotalPages} ({sensorLogsTotal} logs)</span>
                                        <div className="flex items-center gap-2">
                                          <button
                                            disabled={sensorLogsPage <= 1}
                                            onClick={() => { const p = sensorLogsPage - 1; setSensorLogsPage(p); fetchSensorLogs(batch.batch_id, p); }}
                                            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                                          >
                                            <ChevronLeft className="w-3.5 h-3.5" />
                                          </button>
                                          <button
                                            disabled={sensorLogsPage >= sensorLogsTotalPages}
                                            onClick={() => { const p = sensorLogsPage + 1; setSensorLogsPage(p); fetchSensorLogs(batch.batch_id, p); }}
                                            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                                          >
                                            <ChevronRight className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Batch Pagination */}
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>
                  Showing {((batchPage - 1) * batchPageSize) + 1}–{Math.min(batchPage * batchPageSize, batchTotal)} of {batchTotal} batches
                </span>
                <div className="flex items-center gap-2">
                  <button
                    disabled={batchPage <= 1}
                    onClick={() => setBatchPage(p => Math.max(1, p - 1))}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" /> Prev
                  </button>
                  {/* Page buttons */}
                  {Array.from({ length: Math.min(5, batchTotalPages) }, (_, i) => {
                    const startPage = Math.max(1, Math.min(batchPage - 2, batchTotalPages - 4));
                    const pageNum = startPage + i;
                    if (pageNum > batchTotalPages) return null;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setBatchPage(pageNum)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer ${batchPage === pageNum ? 'bg-cyan-600 text-white' : 'bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300'}`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  <button
                    disabled={batchPage >= batchTotalPages}
                    onClick={() => setBatchPage(p => Math.min(batchTotalPages, p + 1))}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    Next <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
};
