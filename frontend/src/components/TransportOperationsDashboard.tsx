import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Truck, ShieldAlert, UserCheck, AlertTriangle, MapPin, Clock,
  CheckCircle2, ArrowRight, ShieldCheck, Activity, RefreshCw, UserX,
  Home, Search, Filter, Database, Wifi, WifiOff, Package, Users,
  Cpu, ChevronRight, Play, BarChart3, Thermometer, Bell, Info,
  CheckCircle, XCircle, Download, FileCheck2, ChevronLeft
} from 'lucide-react';
import { Shipment, Worker, NavigationRole, Sensor, RouteEvent } from '../types';
import { apiFetch } from '../config/api';
import { StoreForwardBar } from './StoreForwardBar';
import { ThemeToggle } from './ThemeToggle';
import { RoleSidebar } from './RoleSidebar';
import { ErrorBoundary } from './ErrorBoundary';
import { KPICardsSkeleton, TableSkeleton, CardsGridSkeleton } from './SkeletonLoaders';
import { useToast } from '../context/ToastContext';

type TransportTab =
  | 'Dashboard'
  | 'ActiveShipments'
  | 'RouteEvents'
  | 'CustodyHandovers'
  | 'WorkerWorkload'
  | 'SensorStatus'
  | 'StoreForward'
  | 'SafetyValidation';

interface Props {
  onNavigate: (role: NavigationRole) => void;
}

const NAV_ITEMS: { id: TransportTab; label: string; icon: any }[] = [
  { id: 'Dashboard', label: 'Operations Dashboard', icon: BarChart3 },
  { id: 'ActiveShipments', label: 'Active Shipments', icon: Truck },
  { id: 'RouteEvents', label: 'Route Events', icon: MapPin },
  { id: 'CustodyHandovers', label: 'Custody Handovers', icon: Package },
  { id: 'WorkerWorkload', label: 'Driver / Worker Workload', icon: Users },
  { id: 'SensorStatus', label: 'Sensor Status', icon: Cpu },
  { id: 'StoreForward', label: 'Store & Forward', icon: Database },
  { id: 'SafetyValidation', label: 'Safety Validation', icon: ShieldAlert },
];

export const TransportOperationsDashboard: React.FC<Props> = ({ onNavigate }) => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<TransportTab>('Dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [routes, setRoutes] = useState<RouteEvent[]>([]);
  const [handovers, setHandovers] = useState<any[]>([]);
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshingShipments, setIsRefreshingShipments] = useState(false);

  // Store & Forward state
  const [networkStatus, setNetworkStatus] = useState<any>({ status: 'ONLINE', buffered_records_count: 0, last_sync_timestamp: '' });
  const [bufferRecords, setBufferRecords] = useState<any[]>([]);
  const [isToggling, setIsToggling] = useState(false);
  const [actionMsg, setActionMsg] = useState('');

  // Workload check state
  const [selectedDriverId, setSelectedDriverId] = useState('DRV-103');
  const [additionalHours, setAdditionalHours] = useState(3.0);
  const [safetyCheckResult, setSafetyCheckResult] = useState<any>(null);
  const [isCheckingWorkload, setIsCheckingWorkload] = useState(false);

  // Filters & Pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const showMsg = (msg: string) => {
    setActionMsg(msg);
    setTimeout(() => setActionMsg(''), 4000);
  };

  const handleRefreshShipments = async () => {
    if (isRefreshingShipments) return;
    setIsRefreshingShipments(true);
    try {
      const freshShipments = await apiFetch<Shipment[]>(`/shipments?_t=${Date.now()}`);
      if (Array.isArray(freshShipments)) {
        setShipments(freshShipments);
        showToast({
          type: 'success',
          title: 'Shipments Refreshed',
          message: `Updated active fleet with ${freshShipments.length} records.`,
          duration: 3500
        });
      } else {
        throw new Error('Invalid response structure from backend');
      }
    } catch (err: any) {
      console.error('Failed to refresh shipments:', err);
      showToast({
        type: 'warning',
        title: 'Refresh Incomplete',
        message: 'Unable to refresh shipments from server. Showing last available data.',
        duration: 4000
      });
    } finally {
      setIsRefreshingShipments(false);
    }
  };

  const fetchAllData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [shipRes, wrkRes, routeRes, handRes, senRes, netRes] = await Promise.all([
        apiFetch('/shipments').catch(() => []),
        apiFetch('/workers').catch(() => []),
        apiFetch('/routes').catch(() => []),
        apiFetch('/handovers').catch(() => []),
        apiFetch('/sensors').catch(() => []),
        apiFetch('/network-status').catch(() => ({ status: 'ONLINE', buffered_records_count: 0 })),
      ]);
      setShipments(Array.isArray(shipRes) ? shipRes : []);
      setWorkers(Array.isArray(wrkRes) ? wrkRes : []);
      setRoutes(Array.isArray(routeRes) ? routeRes : []);
      setHandovers(Array.isArray(handRes) ? handRes : []);
      setSensors(Array.isArray(senRes) ? senRes : []);
      setNetworkStatus(netRes && typeof netRes === 'object' ? netRes : { status: 'ONLINE', buffered_records_count: 0 });
    } catch (err) {
      console.error('Failed to load operations data', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchAllData(); }, [fetchAllData]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery, statusFilter]);

  useEffect(() => {
    if (activeTab === 'StoreForward') {
      apiFetch('/store-forward/buffer').then(res => setBufferRecords(Array.isArray(res?.data) ? res.data : [])).catch(() => {});
    }
  }, [activeTab]);

  const runWorkloadCheck = async (driverId: string, hours: number) => {
    setIsCheckingWorkload(true);
    try {
      const res = await apiFetch('/workload-check', {
        method: 'POST',
        body: JSON.stringify({ driver_id: driverId, additional_hours: hours })
      });
      setSafetyCheckResult(res);
    } catch (err) {
      console.error('Workload check error', err);
    } finally {
      setIsCheckingWorkload(false);
    }
  };

  const handleToggleNetwork = async (status: 'ONLINE' | 'OFFLINE') => {
    setIsToggling(true);
    try {
      const res = await apiFetch('/network-toggle', {
        method: 'POST',
        body: JSON.stringify({ status })
      });
      setNetworkStatus(res);
      showMsg(status === 'OFFLINE' ? 'Network set to OFFLINE — records buffering locally.' : 'Network restored — syncing buffered records...');
      if (status === 'ONLINE') {
        await apiFetch('/network-sync', { method: 'POST' });
        const updatedNet = await apiFetch('/network-status');
        setNetworkStatus(updatedNet);
        apiFetch('/store-forward/buffer').then(r => setBufferRecords(Array.isArray(r?.data) ? r.data : [])).catch(() => {});
        showMsg('Sync complete — all buffered records uploaded.');
      }
    } catch { showMsg('Network toggle failed.'); }
    finally { setIsToggling(false); }
  };

  const handleSyncNetwork = async () => {
    try {
      await apiFetch('/network-toggle', { method: 'POST', body: JSON.stringify({ status: 'ONLINE' }) });
      setNetworkStatus((prev: any) => ({ ...prev, status: 'SYNCING' }));
      await apiFetch('/network-sync', { method: 'POST' });
      const updatedNet = await apiFetch('/network-status');
      setNetworkStatus(updatedNet);
      apiFetch('/store-forward/buffer').then(res => setBufferRecords(Array.isArray((res as any)?.data) ? (res as any).data : [])).catch(() => {});
      showMsg('Sync complete — all buffered records uploaded.');
    } catch { showMsg('Network sync failed.'); }
  };

  const handleConfirmAssignment = () => {
    if (safetyCheckResult && !safetyCheckResult.is_safe) {
      showToast({
        type: 'error',
        title: 'Assignment Blocked',
        message: 'ASSIGNMENT REJECTED: System blocked unsafe workload assignment violation.',
        duration: 5000
      });
      return;
    }
    showToast({
      type: 'success',
      title: 'Assignment Confirmed',
      message: 'Assignment successfully verified and dispatched under safe parameters!',
      duration: 4000
    });
  };

  // Safe filtered data
  const filteredShipments = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return (shipments || []).filter(s => {
      if (!s) return false;
      const shpId = (s.shipment_id || '').toLowerCase();
      const prodType = (s.product_type || '').toLowerCase();
      const drvName = (s.driver_name || '').toLowerCase();
      const drvId = (s.driver_id || '').toLowerCase();
      const orig = (s.origin || '').toLowerCase();
      const dest = (s.destination || '').toLowerCase();

      const matchSearch = !q || shpId.includes(q) || prodType.includes(q) || drvName.includes(q) || drvId.includes(q) || orig.includes(q) || dest.includes(q);
      const matchStatus = statusFilter === 'ALL' || s.compliance_status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [shipments, searchQuery, statusFilter]);

  const filteredRoutes = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return (routes || []).filter(r => {
      if (!r) return false;
      const shpId = (r.shipment_id || '').toLowerCase();
      const evtType = (r.event_type || '').toLowerCase();
      const loc = (r.location || '').toLowerCase();
      return !q || shpId.includes(q) || evtType.includes(q) || loc.includes(q);
    });
  }, [routes, searchQuery]);

  // KPI helpers with null-safety
  const activeShipments = useMemo(() => (shipments || []).filter(s => s && ['IN_TRANSIT', 'AT_PORT'].includes(s.shipment_status)), [shipments]);
  const criticalShipments = useMemo(() => (shipments || []).filter(s => s && s.compliance_status === 'CRITICAL'), [shipments]);
  const unsafeWorkers = useMemo(() => (workers || []).filter(w => w && w.safety_status === 'UNSAFE'), [workers]);
  const delayedRoutes = useMemo(() => (routes || []).filter(r => r && (r.delay_minutes || 0) > 30), [routes]);
  const expiredSensors = useMemo(() => (sensors || []).filter(s => s && s.calibration_status === 'EXPIRED'), [sensors]);

  const statusBadge = (status: string) => {
    const s = (status || '').toUpperCase();
    const cls =
      s === 'NORMAL' || s === 'VALID' || s === 'SAFE' || s === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/30' :
      s === 'WARNING' || s === 'IN_TRANSIT' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300 dark:border-amber-500/30' :
      s === 'CRITICAL' || s === 'EXPIRED' || s === 'UNSAFE' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-300 dark:border-rose-500/30' :
      'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700';
    return `px-2 py-0.5 rounded text-[10px] font-bold border ${cls}`;
  };

  // ---- RENDER TABS ----

  const renderDashboard = () => (
    <div className="space-y-6 anim-fade-up">
      {isLoading ? (
        <KPICardsSkeleton count={5} />
      ) : (
        /* KPI Cards */
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            { label: 'Active Shipments', value: activeShipments.length, color: 'border-amber-500 text-amber-600 dark:text-amber-400', sub: 'In Transit / At Port' },
            { label: 'Critical Alerts', value: criticalShipments.length, color: 'border-rose-500 text-rose-600 dark:text-rose-400', sub: 'Immediate Action' },
            { label: 'Unsafe Workers', value: unsafeWorkers.length, color: 'border-rose-500 text-rose-600 dark:text-rose-400', sub: 'Blocked Assignments' },
            { label: 'Route Delays', value: delayedRoutes.length, color: 'border-amber-500 text-amber-600 dark:text-amber-400', sub: '>30 min delays' },
            { label: 'Expired Sensors', value: expiredSensors.length, color: 'border-purple-500 text-purple-600 dark:text-purple-400', sub: 'Needs Recalibration' },
          ].map((k, i) => (
            <div key={i} className={`glass-panel p-4 rounded-xl border-l-4 ${k.color.split(' ')[0]} bg-white/70 dark:bg-slate-900/60 shadow-xs`}>
              <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">{k.label}</div>
              <div className={`text-2xl font-black ${k.color.split(' ').slice(1).join(' ')} mt-1`}>{k.value}</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{k.sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* Safety Banner */}
      <div className="glass-card p-5 rounded-2xl border-2 border-amber-500/40 bg-gradient-to-r from-amber-50/50 via-slate-50 to-rose-50/50 dark:from-amber-950/30 dark:via-slate-900 dark:to-rose-950/30 shadow-md">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/40 shrink-0">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wide">Mandatory Workload Safety Constraint Engine</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Max 8h/day, min 10h rest, max 2 assignments — unsafe assignments are strictly blocked</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {(workers || []).slice(0, 6).map(w => (
            <div key={w?.driver_id || w?.worker_id} className={`p-3 rounded-xl border ${
              w?.safety_status === 'SAFE' ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-500/30' : 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-300 dark:border-rose-500/40'
            }`}>
              <div className="text-xs font-bold text-slate-900 dark:text-white">{w?.driver_name || 'Driver'}</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 my-1">{w?.driver_id} · {w?.working_hours || 0}h worked</div>
              <span className={statusBadge(w?.safety_status || 'SAFE')}>{w?.safety_status || 'SAFE'}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Active Shipments Preview */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Truck className="w-4 h-4 text-amber-500" /> Active Shipment Fleet
          </h3>
          <button
            onClick={() => setActiveTab('ActiveShipments')}
            className="text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>View All ({shipments.length})</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(shipments || []).slice(0, 6).map(shp => (
            <div key={shp?.shipment_id} className={`p-4 rounded-xl border bg-white dark:bg-slate-900 shadow-xs ${
              shp?.compliance_status === 'NORMAL' ? 'border-emerald-300 dark:border-emerald-500/30' :
              shp?.compliance_status === 'WARNING' ? 'border-amber-300 dark:border-amber-500/30' : 'border-rose-300 dark:border-rose-500/40'
            }`}>
              <div className="flex justify-between items-start mb-2">
                <span className="font-mono text-xs font-black text-cyan-600 dark:text-cyan-400">{shp?.shipment_id}</span>
                <span className={statusBadge(shp?.compliance_status || 'NORMAL')}>{shp?.compliance_status || 'NORMAL'}</span>
              </div>
              <div className="text-xs space-y-1 text-slate-600 dark:text-slate-400">
                <div className="flex justify-between"><span className="text-slate-500">Product</span><span className="font-bold text-slate-900 dark:text-white truncate max-w-[140px]">{shp?.product_type || '—'}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Driver</span><span className="text-slate-900 dark:text-slate-200">{shp?.driver_name || shp?.driver_id || '—'}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Temp</span><span className="font-mono font-bold text-amber-600 dark:text-amber-400">{(typeof shp?.current_temp === 'number' ? shp.current_temp : Number(shp?.current_temp) || 0).toFixed(1)}°C</span></div>
                <div className="flex justify-between"><span className="text-slate-500">ETA</span><span className="text-slate-700 dark:text-slate-300 truncate max-w-[140px]">{shp?.eta || '—'}</span></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderActiveShipments = () => {
    const totalCount = filteredShipments.length;
    const totalPages = Math.ceil(totalCount / pageSize) || 1;
    const paginatedShipments = filteredShipments.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    return (
      <div className="space-y-4 anim-fade-up">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Truck className="w-5 h-5 text-amber-500" /> Active Shipments ({totalCount})
          </h2>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search shipments..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:border-amber-400 w-48 shadow-xs"
              />
            </div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-slate-200 focus:outline-none cursor-pointer shadow-xs"
            >
              <option value="ALL">All Statuses</option>
              <option value="NORMAL">NORMAL</option>
              <option value="WARNING">WARNING</option>
              <option value="CRITICAL">CRITICAL</option>
            </select>
            <button
              onClick={handleRefreshShipments}
              disabled={isRefreshingShipments}
              title={isRefreshingShipments ? 'Refreshing active shipments...' : 'Refresh Active Shipments'}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer disabled:opacity-50 shadow-xs flex items-center justify-center"
              aria-label="Refresh Active Shipments"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshingShipments ? 'animate-spin text-amber-500' : ''}`} />
            </button>
          </div>
        </div>

        {isLoading ? (
          <TableSkeleton rows={6} cols={8} />
        ) : (
          <div className="glass-card rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-md">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300 border-collapse min-w-[700px]">
                <thead className="bg-slate-100/90 dark:bg-slate-900/90 text-slate-600 dark:text-slate-400 uppercase font-bold text-[10px] border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3">Shipment ID</th>
                    <th className="p-3">Product</th>
                    <th className="p-3">Driver</th>
                    <th className="p-3">Origin → Destination</th>
                    <th className="p-3">Port/Airport</th>
                    <th className="p-3">Temp (°C)</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">ETA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {paginatedShipments.map(s => (
                    <tr key={s?.shipment_id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-3 font-mono font-bold text-cyan-600 dark:text-cyan-400">{s?.shipment_id}</td>
                      <td className="p-3 font-medium text-slate-900 dark:text-white">{s?.product_type || '—'}</td>
                      <td className="p-3 text-slate-700 dark:text-slate-300">{s?.driver_name || s?.driver_id || '—'}</td>
                      <td className="p-3 text-slate-500 dark:text-slate-400">{s?.origin?.split(' ')[0] || s?.origin || '—'} → {s?.destination?.split(' ')[0] || s?.destination || '—'}</td>
                      <td className="p-3 text-slate-500 dark:text-slate-400">{s?.port_airport?.split(' ')[0] || s?.port_airport || '—'}</td>
                      <td className="p-3 font-mono font-bold text-amber-600 dark:text-amber-400">{(typeof s?.current_temp === 'number' ? s.current_temp : Number(s?.current_temp) || 0).toFixed(1)}°C</td>
                      <td className="p-3"><span className={statusBadge(s?.compliance_status || 'NORMAL')}>{s?.compliance_status || 'NORMAL'}</span></td>
                      <td className="p-3 text-slate-500 dark:text-slate-400">{s?.eta || '—'}</td>
                    </tr>
                  ))}
                  {paginatedShipments.length === 0 && (
                    <tr><td colSpan={8} className="p-8 text-center text-slate-400">No shipments match your search criteria.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="p-3 bg-slate-50/80 dark:bg-slate-900/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                <div>Showing {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, totalCount)} of {totalCount}</div>
                <div className="flex items-center gap-1.5">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="px-2 font-bold text-slate-800 dark:text-slate-200">{currentPage} / {totalPages}</span>
                  <button
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderRouteEvents = () => {
    const totalCount = filteredRoutes.length;
    const totalPages = Math.ceil(totalCount / pageSize) || 1;
    const paginatedRoutes = filteredRoutes.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    return (
      <div className="space-y-4 anim-fade-up">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <MapPin className="w-5 h-5 text-blue-500" /> Route Events ({totalCount})
          </h2>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search events..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-200 focus:outline-none w-48 shadow-xs"
            />
          </div>
        </div>

        {isLoading ? (
          <TableSkeleton rows={6} cols={8} />
        ) : (
          <div className="glass-card rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-md">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300 border-collapse min-w-[700px]">
                <thead className="bg-slate-100/90 dark:bg-slate-900/90 text-slate-600 dark:text-slate-400 uppercase font-bold text-[10px] border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3">Route ID</th>
                    <th className="p-3">Shipment</th>
                    <th className="p-3">Event Type</th>
                    <th className="p-3">Timestamp</th>
                    <th className="p-3">Location</th>
                    <th className="p-3">Delay (min)</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {paginatedRoutes.map(r => (
                    <tr key={r?.route_id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-3 font-mono text-slate-500">{r?.route_id}</td>
                      <td className="p-3 font-mono font-bold text-cyan-600 dark:text-cyan-400">{r?.shipment_id}</td>
                      <td className="p-3 font-medium text-slate-900 dark:text-white">{r?.event_type}</td>
                      <td className="p-3 text-slate-500 dark:text-slate-400">{r?.timestamp ? `${r.timestamp.split('T')[0]} ${r.timestamp.split('T')[1]?.split('.')[0] || ''}` : '—'}</td>
                      <td className="p-3 text-slate-700 dark:text-slate-300">{r?.location}</td>
                      <td className={`p-3 font-mono font-bold ${(r?.delay_minutes || 0) > 30 ? 'text-rose-600 dark:text-rose-400' : (r?.delay_minutes || 0) > 10 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        {(r?.delay_minutes || 0) > 0 ? `+${r.delay_minutes}` : '0'}
                      </td>
                      <td className="p-3"><span className={statusBadge(r?.route_status || 'NORMAL')}>{r?.route_status || 'NORMAL'}</span></td>
                      <td className="p-3 text-slate-500 max-w-xs truncate">{r?.notes || '—'}</td>
                    </tr>
                  ))}
                  {paginatedRoutes.length === 0 && (
                    <tr><td colSpan={8} className="p-8 text-center text-slate-400">No route events found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="p-3 bg-slate-50/80 dark:bg-slate-900/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                <div>Showing {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, totalCount)} of {totalCount}</div>
                <div className="flex items-center gap-1.5">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="px-2 font-bold text-slate-800 dark:text-slate-200">{currentPage} / {totalPages}</span>
                  <button
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderCustodyHandovers = () => (
    <div className="space-y-4 anim-fade-up">
      <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
        <Package className="w-5 h-5 text-teal-500" /> Custody Handover Records ({handovers.length})
      </h2>
      {isLoading ? (
        <TableSkeleton rows={5} cols={9} />
      ) : handovers.length === 0 ? (
        <div className="glass-panel p-8 rounded-2xl text-center text-slate-400 text-sm">
          No custody handover records available.
        </div>
      ) : (
        <div className="glass-card rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-md">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300 border-collapse min-w-[750px]">
              <thead className="bg-slate-100/90 dark:bg-slate-900/90 text-slate-600 dark:text-slate-400 uppercase font-bold text-[10px] border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3">Handover ID</th>
                  <th className="p-3">Shipment</th>
                  <th className="p-3">Batch</th>
                  <th className="p-3">From</th>
                  <th className="p-3">To</th>
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">Location</th>
                  <th className="p-3">Condition</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {(handovers || []).slice(0, 50).map((h, i) => (
                  <tr key={h?.handover_id || i} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="p-3 font-mono text-slate-500">{h?.handover_id}</td>
                    <td className="p-3 font-mono font-bold text-cyan-600 dark:text-cyan-400">{h?.shipment_id}</td>
                    <td className="p-3 font-mono text-slate-500">{h?.batch_id}</td>
                    <td className="p-3 text-slate-700 dark:text-slate-300">{h?.from_person}</td>
                    <td className="p-3 text-slate-900 dark:text-white font-bold">{h?.to_person}</td>
                    <td className="p-3 text-slate-500 dark:text-slate-400">{h?.timestamp ? h.timestamp.split('T')[0] : '—'}</td>
                    <td className="p-3 text-slate-700 dark:text-slate-300">{h?.location}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        h?.condition === 'GOOD' || h?.condition === 'NORMAL' || h?.condition?.includes('PASSED') ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300'
                      }`}>{h?.condition || 'GOOD'}</span>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        h?.handover_status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300'
                      }`}>{h?.handover_status || 'PENDING'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );

  const renderWorkerWorkload = () => (
    <div className="space-y-4 anim-fade-up">
      <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
        <Users className="w-5 h-5 text-amber-500" /> Driver / Worker Workload Safety ({workers.length})
      </h2>
      {isLoading ? (
        <TableSkeleton rows={5} cols={8} />
      ) : (
        <div className="glass-card rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-md">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300 border-collapse min-w-[700px]">
              <thead className="bg-slate-100/90 dark:bg-slate-900/90 text-slate-600 dark:text-slate-400 uppercase font-bold text-[10px] border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3">Worker ID</th>
                  <th className="p-3">Driver ID</th>
                  <th className="p-3">Driver Name</th>
                  <th className="p-3">Hours Worked</th>
                  <th className="p-3">Rest Hours</th>
                  <th className="p-3">Assignments</th>
                  <th className="p-3">Workload Score</th>
                  <th className="p-3">Safety Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {(workers || []).map(w => (
                  <tr key={w?.worker_id || w?.driver_id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="p-3 font-mono text-slate-500">{w?.worker_id}</td>
                    <td className="p-3 font-mono text-cyan-600 dark:text-cyan-400 font-bold">{w?.driver_id}</td>
                    <td className="p-3 font-bold text-slate-900 dark:text-white">{w?.driver_name}</td>
                    <td className={`p-3 font-mono font-bold ${(w?.working_hours || 0) > 8 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>{w?.working_hours || 0}h</td>
                    <td className={`p-3 font-mono font-bold ${(w?.rest_hours || 0) < 10 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>{w?.rest_hours || 0}h</td>
                    <td className={`p-3 font-bold ${(w?.active_assignments || 0) > 2 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300'}`}>{w?.active_assignments || 0}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${(w?.workload_score || 0) > 0.8 ? 'bg-rose-500' : (w?.workload_score || 0) > 0.5 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                            style={{ width: `${Math.min(100, (w?.workload_score || 0) * 100)}%` }}
                          />
                        </div>
                        <span className="font-mono text-xs font-bold">{((w?.workload_score || 0) * 100).toFixed(0)}%</span>
                      </div>
                    </td>
                    <td className="p-3"><span className={statusBadge(w?.safety_status || 'SAFE')}>{w?.safety_status || 'SAFE'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );

  const renderSensorStatus = () => (
    <div className="space-y-4 anim-fade-up">
      <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
        <Cpu className="w-5 h-5 text-cyan-500" /> Sensor Fleet Status ({sensors.length})
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {[
          { label: 'Total Sensors', value: sensors.length, color: 'border-cyan-500 text-cyan-600 dark:text-cyan-400' },
          { label: 'ISO 17025 Valid', value: sensors.filter(s => s && s.calibration_status === 'VALID').length, color: 'border-emerald-500 text-emerald-600 dark:text-emerald-400' },
          { label: 'Calibration Expired', value: sensors.filter(s => s && s.calibration_status === 'EXPIRED').length, color: 'border-rose-500 text-rose-600 dark:text-rose-400' },
          { label: 'Low Battery', value: sensors.filter(s => s && (s.battery_status || 0) < 20).length, color: 'border-amber-500 text-amber-600 dark:text-amber-400' },
        ].map((k, i) => (
          <div key={i} className={`glass-panel p-3.5 rounded-xl border-l-4 ${k.color.split(' ')[0]} bg-white/70 dark:bg-slate-900/60 shadow-xs`}>
            <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">{k.label}</div>
            <div className={`text-2xl font-black ${k.color.split(' ').slice(1).join(' ')} mt-1`}>{k.value}</div>
          </div>
        ))}
      </div>
      {isLoading ? (
        <TableSkeleton rows={5} cols={9} />
      ) : (
        <div className="glass-card rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-md">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300 border-collapse min-w-[750px]">
              <thead className="bg-slate-100/90 dark:bg-slate-900/90 text-slate-600 dark:text-slate-400 uppercase font-bold text-[10px] border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3">Sensor ID</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Battery</th>
                  <th className="p-3">Signal</th>
                  <th className="p-3">Calibration</th>
                  <th className="p-3">Due Date</th>
                  <th className="p-3">Accuracy</th>
                  <th className="p-3">Technician</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {(sensors || []).slice(0, 50).map(s => (
                  <tr key={s?.sensor_id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="p-3 font-mono font-bold text-cyan-600 dark:text-cyan-400">{s?.sensor_id}</td>
                    <td className="p-3 text-slate-900 dark:text-white font-medium">{s?.sensor_type}</td>
                    <td className="p-3"><span className={statusBadge(s?.status || 'ACTIVE')}>{s?.status || 'ACTIVE'}</span></td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="w-12 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${(s?.battery_status || 0) < 20 ? 'bg-rose-500' : (s?.battery_status || 0) < 50 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                            style={{ width: `${s?.battery_status || 0}%` }}
                          />
                        </div>
                        <span className={`font-mono text-xs ${(s?.battery_status || 0) < 20 ? 'text-rose-600 font-bold' : 'text-slate-600 dark:text-slate-300'}`}>{s?.battery_status || 0}%</span>
                      </div>
                    </td>
                    <td className="p-3 text-slate-700 dark:text-slate-300">{s?.signal_status}</td>
                    <td className="p-3"><span className={statusBadge(s?.calibration_status || 'VALID')}>{s?.calibration_status || 'VALID'}</span></td>
                    <td className="p-3 text-slate-500 dark:text-slate-400">{s?.calibration_due_date || '—'}</td>
                    <td className="p-3 font-mono text-slate-700 dark:text-slate-300">{s?.accuracy_rating || 99}%</td>
                    <td className="p-3 text-slate-500 dark:text-slate-400">{s?.technician || 'Certified Tech'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );

  const renderStoreForward = () => (
    <div className="space-y-6 anim-fade-up">
      <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
        <Database className="w-5 h-5 text-teal-500" /> Store & Forward — Offline Buffer Manager
      </h2>

      {actionMsg && (
        <div className="p-3 rounded-xl bg-cyan-100 dark:bg-cyan-950 border border-cyan-300 dark:border-cyan-500/40 text-cyan-900 dark:text-cyan-300 text-xs font-bold flex items-center gap-2 shadow-xs">
          <Info className="w-4 h-4" /> {actionMsg}
        </div>
      )}

      {/* Network Status Card */}
      <div className={`glass-card p-5 rounded-2xl border-2 shadow-md ${
        networkStatus.status === 'ONLINE' ? 'border-emerald-400 dark:border-emerald-500/50' :
        networkStatus.status === 'OFFLINE' ? 'border-rose-400 dark:border-rose-500/50' :
        'border-cyan-400 dark:border-cyan-500/50'
      }`}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${
              networkStatus.status === 'ONLINE' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:border-emerald-500/40 dark:text-emerald-400' :
              networkStatus.status === 'OFFLINE' ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:border-rose-500/40 dark:text-rose-400' :
              'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:border-cyan-500/40 dark:text-cyan-400'
            }`}>
              {networkStatus.status === 'ONLINE' ? <Wifi className="w-6 h-6" /> : <WifiOff className="w-6 h-6" />}
            </div>
            <div>
              <div className="text-lg font-black text-slate-900 dark:text-white">{networkStatus.status}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Buffered records: <span className="font-bold text-slate-900 dark:text-white">{networkStatus.buffered_records_count || 0}</span>
              </div>
              {networkStatus.last_sync_timestamp && (
                <div className="text-[11px] text-slate-400">Last sync: {networkStatus.last_sync_timestamp}</div>
              )}
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => handleToggleNetwork('OFFLINE')}
              disabled={isToggling || networkStatus.status === 'OFFLINE'}
              className="px-4 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-600/20 dark:hover:bg-rose-600/40 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-500/40 rounded-xl text-xs font-bold cursor-pointer transition-all disabled:opacity-50"
            >
              <WifiOff className="w-4 h-4 inline mr-1" /> Go Offline
            </button>
            <button
              onClick={() => handleToggleNetwork('ONLINE')}
              disabled={isToggling || networkStatus.status === 'ONLINE'}
              className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-600/20 dark:hover:bg-emerald-600/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/40 rounded-xl text-xs font-bold cursor-pointer transition-all disabled:opacity-50"
            >
              <Wifi className="w-4 h-4 inline mr-1" /> Restore Network & Sync
            </button>
          </div>
        </div>
      </div>

      {/* How it works */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-3">How Store & Forward Works</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-rose-300 dark:border-rose-500/30">
            <div className="text-rose-600 dark:text-rose-400 font-bold mb-1">1. OFFLINE</div>
            <div className="text-slate-600 dark:text-slate-300">Network disconnected. All new sensor telemetry records queued in local offline_buffer table.</div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-amber-300 dark:border-amber-500/30">
            <div className="text-amber-600 dark:text-amber-400 font-bold mb-1">2. BUFFERING</div>
            <div className="text-slate-600 dark:text-slate-300">Records stored with payload_type and payload_data. No data is lost. Buffer grows until sync.</div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-emerald-300 dark:border-emerald-500/30">
            <div className="text-emerald-600 dark:text-emerald-400 font-bold mb-1">3. SYNC</div>
            <div className="text-slate-600 dark:text-slate-300">On network restore, buffered records auto-sync to central system. Synced = 1 marked in DB.</div>
          </div>
        </div>
      </div>

      {/* Buffer Records */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-3">Offline Buffer Records</h3>
        {bufferRecords.length === 0 ? (
          <div className="text-xs text-slate-400 text-center py-6">No buffered records — network is online and synced.</div>
        ) : (
          <div className="space-y-2">
            {bufferRecords.map((rec, i) => (
              <div key={i} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs flex items-center justify-between">
                <div>
                  <span className="font-mono font-bold text-cyan-600 dark:text-cyan-300">{rec?.payload_type}</span>
                  <span className="text-slate-500 ml-2">{rec?.created_at}</span>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                  rec?.synced ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300'
                }`}>{rec?.synced ? 'SYNCED' : 'PENDING'}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderSafetyValidation = () => (
    <div className="space-y-6 anim-fade-up">
      <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
        <ShieldAlert className="w-5 h-5 text-amber-500" /> Workload Safety Validation
      </h2>

      {actionMsg && (
        <div className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2 shadow-xs ${
          actionMsg.includes('safe') || actionMsg.includes('verified')
            ? 'bg-emerald-100 dark:bg-emerald-950 border-emerald-300 dark:border-emerald-500/40 text-emerald-900 dark:text-emerald-300'
            : 'bg-amber-100 dark:bg-amber-950 border-amber-300 dark:border-amber-500/40 text-amber-900 dark:text-amber-300'
        }`}>
          <Info className="w-4 h-4" /> {actionMsg}
        </div>
      )}

      <div className="glass-card p-5 rounded-2xl border-2 border-amber-500/40 bg-gradient-to-r from-amber-50/50 via-slate-50 to-rose-50/50 dark:from-amber-950/30 dark:via-slate-900 dark:to-rose-950/30 shadow-md">
        <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wide mb-1">Mandatory Safety Constraints</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Max 8h/day · Min 10h rest · Max 2 active assignments · Never bypass for efficiency</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Select Driver:</label>
            <select
              value={selectedDriverId}
              onChange={e => { setSelectedDriverId(e.target.value); setSafetyCheckResult(null); }}
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-slate-200 focus:border-amber-400 focus:outline-none"
            >
              {(workers || []).map(w => (
                <option key={w?.driver_id} value={w?.driver_id}>
                  {w?.driver_name} ({w?.driver_id}) — {w?.safety_status} ({w?.working_hours}h)
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Proposed Additional Hours: {additionalHours}h</label>
            <input
              type="range" step={0.5} min={0} max={12} value={additionalHours}
              onChange={e => { setAdditionalHours(parseFloat(e.target.value)); setSafetyCheckResult(null); }}
              className="w-full accent-amber-500 mt-3"
            />
          </div>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => runWorkloadCheck(selectedDriverId, additionalHours)}
              disabled={isCheckingWorkload}
              className="flex-1 py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-all shadow-xs"
            >
              {isCheckingWorkload ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              Run Safety Check
            </button>
            <button
              disabled={!safetyCheckResult || !safetyCheckResult.is_safe}
              onClick={handleConfirmAssignment}
              className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                safetyCheckResult && safetyCheckResult.is_safe
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
              }`}
            >
              {safetyCheckResult && !safetyCheckResult.is_safe ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
              Confirm Assignment
            </button>
          </div>
        </div>
      </div>

      {safetyCheckResult && (
        <div className={`p-5 rounded-2xl border shadow-md ${
          safetyCheckResult.is_safe
            ? 'bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-500/40'
            : 'bg-rose-50/90 dark:bg-rose-950/80 border-2 border-rose-400 dark:border-rose-500'
        }`}>
          {!safetyCheckResult.is_safe && (
            <div className="text-sm font-black text-rose-600 dark:text-rose-400 uppercase tracking-wide flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5" />
              {safetyCheckResult.alert_banner || 'UNSAFE ASSIGNMENT — REASSIGN REQUIRED'}
            </div>
          )}
          {safetyCheckResult.is_safe && (
            <div className="text-sm font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wide flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-5 h-5" /> ASSIGNMENT APPROVED — SAFE WORKLOAD
            </div>
          )}
          <p className="text-xs font-semibold text-slate-800 dark:text-white mb-3">{safetyCheckResult.message}</p>
          {safetyCheckResult.violations?.length > 0 && (
            <ul className="list-disc list-inside text-xs space-y-1 font-mono text-rose-600 dark:text-rose-300">
              {safetyCheckResult.violations.map((v: string, i: number) => <li key={i}>{v}</li>)}
            </ul>
          )}
          <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            {[
              ['Current Hours', `${safetyCheckResult.current_working_hours}h`],
              ['Additional', `${safetyCheckResult.additional_hours}h`],
              ['Total Projected', `${safetyCheckResult.projected_hours}h`],
              ['Max Allowed', '8.0h'],
            ].map(([label, val]) => (
              <div key={label as string} className="text-center bg-white/60 dark:bg-slate-900/60 p-2 rounded-xl">
                <div className="text-slate-500 text-[10px] uppercase font-bold">{label}</div>
                <div className="font-bold text-slate-900 dark:text-white text-sm">{val}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'Dashboard': return renderDashboard();
      case 'ActiveShipments': return renderActiveShipments();
      case 'RouteEvents': return renderRouteEvents();
      case 'CustodyHandovers': return renderCustodyHandovers();
      case 'WorkerWorkload': return renderWorkerWorkload();
      case 'SensorStatus': return renderSensorStatus();
      case 'StoreForward': return renderStoreForward();
      case 'SafetyValidation': return renderSafetyValidation();
      default: return renderDashboard();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200 overflow-x-hidden select-none">

      {/* LEFT VERTICAL SIDEBAR */}
      <RoleSidebar
        role="transport"
        roleTitle="TRANSPORT & OPERATIONS"
        roleSubtitle="Route Checkpoints · Handover Logs · Workload Safety"
        items={NAV_ITEMS}
        activeItem={activeTab}
        onSelectItem={(id) => { setActiveTab(id as TransportTab); setSearchQuery(''); }}
        onHome={() => onNavigate('LANDING')}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(prev => !prev)}
        backendOnline={networkStatus.status === 'ONLINE'}
      />

      {/* MAIN CONTENT AREA */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ease-in-out ${sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'} pt-14 lg:pt-0 min-w-0`}>

        {/* Store & Forward Simulation Bar */}
        <StoreForwardBar
          networkStatus={networkStatus}
          onToggleNetwork={handleToggleNetwork}
          onSyncNetwork={handleSyncNetwork}
        />

        {/* Header Bar */}
        <header className="bg-white/95 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20 backdrop-blur-md shadow-xs">
          <div className="w-full px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
            
            {/* Role Title */}
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight truncate">
                    TRANSPORT & OPERATIONS PANEL
                  </h1>
                  <span className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-400 text-xs font-semibold border border-amber-300 dark:border-amber-500/30 whitespace-nowrap">
                    Fleet & Safety
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">Route Checkpoints · Handover Logs · Mandatory Driver Workload Validation</p>
              </div>
            </div>

            {/* Quick Actions, Status, Theme & Role Switching */}
            <div className="flex items-center gap-2 flex-wrap shrink-0">
              {/* Network status indicator */}
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold whitespace-nowrap ${
                networkStatus.status === 'ONLINE'
                  ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-400 border-emerald-300 dark:border-emerald-500/30'
                  : 'bg-rose-50 dark:bg-rose-950 text-rose-800 dark:text-rose-400 border-rose-300 dark:border-rose-500/30 animate-pulse'
              }`}>
                {networkStatus.status === 'ONLINE' ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
                <span>{networkStatus.status}</span>
                {networkStatus.buffered_records_count > 0 && (
                  <span className="ml-1">({networkStatus.buffered_records_count} buffered)</span>
                )}
              </div>
              <ThemeToggle />
              <button
                onClick={() => onNavigate('LANDING')}
                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap shadow-xs"
              >
                <Home className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                <span className="hidden sm:inline">Home</span>
              </button>
              <button
                onClick={() => onNavigate('MANUAL_ENTRY')}
                className="px-3 py-1.5 bg-cyan-50 dark:bg-cyan-600/20 hover:bg-cyan-100 dark:hover:bg-cyan-600/30 text-cyan-800 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-500/40 rounded-xl text-xs font-semibold cursor-pointer transition-colors whitespace-nowrap flex items-center gap-1 shadow-xs"
              >
                <FileCheck2 className="w-3.5 h-3.5" />
                <span>Manual Entry</span>
              </button>
              <button
                onClick={() => onNavigate('ADMIN')}
                className="px-3 py-1.5 bg-cyan-50 dark:bg-cyan-600/20 hover:bg-cyan-100 dark:hover:bg-cyan-600/30 text-cyan-800 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-500/40 rounded-xl text-xs font-medium cursor-pointer transition-colors whitespace-nowrap shadow-xs"
              >
                Admin →
              </button>
              <button
                onClick={() => onNavigate('COMPLIANCE')}
                className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-600/20 hover:bg-emerald-100 dark:hover:bg-emerald-600/30 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/40 rounded-xl text-xs font-medium cursor-pointer transition-colors whitespace-nowrap shadow-xs"
              >
                Compliance →
              </button>
              <button 
                onClick={fetchAllData}
                disabled={isLoading}
                title={isLoading ? 'Refreshing operations data...' : 'Refresh All Operations Data'}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700 disabled:opacity-50 shadow-xs flex items-center justify-center shrink-0"
                aria-label="Refresh All Operations Data"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-amber-500' : ''}`} />
              </button>
            </div>
          </div>
        </header>

        {/* Breadcrumb */}
        <div className="w-full px-4 sm:px-6 py-2.5 flex items-center gap-1.5 text-[11px] text-slate-500 border-b border-slate-200 dark:border-slate-800/60 bg-slate-100/50 dark:bg-slate-900/30 overflow-x-auto whitespace-nowrap">
          <span className="text-slate-400 cursor-pointer hover:text-cyan-500 transition-colors" onClick={() => onNavigate('LANDING')}>Home</span>
          <ChevronRight className="w-3 h-3 shrink-0" />
          <span className="text-slate-400">Transport & Operations</span>
          <ChevronRight className="w-3 h-3 shrink-0" />
          <span className="text-amber-600 dark:text-amber-400 font-bold">{NAV_ITEMS.find(n => n.id === activeTab)?.label}</span>
        </div>

        {/* Main Content */}
        <main className="w-full p-4 sm:p-6 pb-12 flex-1 max-w-7xl min-w-0">
          <ErrorBoundary fallbackTitle={`Error loading ${NAV_ITEMS.find(n => n.id === activeTab)?.label || 'section'}`} onReset={fetchAllData}>
            {renderTabContent()}
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
};
