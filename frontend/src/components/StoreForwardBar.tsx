import React from 'react';
import { Wifi, WifiOff, RefreshCw, CheckCircle2, ShieldAlert } from 'lucide-react';
import { NetworkStatus } from '../types';

interface Props {
  networkStatus: NetworkStatus;
  onToggleNetwork: (status: 'ONLINE' | 'OFFLINE') => void;
  onSyncNetwork: () => void;
}

export const StoreForwardBar: React.FC<Props> = ({
  networkStatus,
  onToggleNetwork,
  onSyncNetwork
}) => {
  const isOffline = networkStatus.status === 'OFFLINE';
  const isSyncing = networkStatus.status === 'SYNCING';
  const isComplete = networkStatus.status === 'SYNC COMPLETE';

  const handleRestoreAndSync = async () => {
    onToggleNetwork('ONLINE');
    setTimeout(() => {
      onSyncNetwork();
    }, 300);
  };

  return (
    <div className={`w-full px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between transition-all duration-300 text-xs sm:text-sm backdrop-blur-md border-b select-none ${
      isOffline 
        ? 'bg-amber-500/15 dark:bg-amber-950/80 border-amber-400/40 text-amber-950 dark:text-amber-200' 
        : (isComplete 
            ? 'bg-emerald-500/15 dark:bg-emerald-950/80 border-emerald-400/40 text-emerald-950 dark:text-emerald-200' 
            : 'bg-white/80 dark:bg-slate-900/80 border-slate-200/80 dark:border-slate-800/80 text-slate-800 dark:text-slate-200')
    }`}>
      <div className="flex items-center gap-3 flex-wrap">
        {isOffline ? (
          <div className="flex items-center gap-2 font-black text-amber-800 dark:text-amber-300">
            <WifiOff className="w-4 h-4 text-amber-600 dark:text-amber-400 animate-pulse" />
            <span>STORE & FORWARD FALLBACK MODE (OFFLINE)</span>
          </div>
        ) : isSyncing ? (
          <div className="flex items-center gap-2 text-cyan-800 dark:text-cyan-300 font-black">
            <RefreshCw className="w-4 h-4 animate-spin text-cyan-600 dark:text-cyan-400" />
            <span>Synchronizing Offline Telemetry Buffer...</span>
          </div>
        ) : isComplete ? (
          <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-black">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Store & Forward Sync Complete — All Records Uploaded</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 font-bold">
            <Wifi className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="font-black text-emerald-700 dark:text-emerald-400">SYSTEM ONLINE</span>
            <span className="text-slate-500 dark:text-slate-400 font-medium">| Direct Telemetry Link Active</span>
          </div>
        )}

        {networkStatus.buffered_records_count > 0 && (
          <span className="px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30 text-xs font-black shadow-xs">
            {networkStatus.buffered_records_count} Records Buffered Locally
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        <span className="text-slate-500 dark:text-slate-400 text-xs hidden md:inline font-mono">
          Last Sync: {networkStatus.last_sync_timestamp}
        </span>

        {isOffline ? (
          <button
            onClick={handleRestoreAndSync}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md shadow-emerald-600/20 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Restore Network & Sync</span>
          </button>
        ) : (
          <button
            onClick={() => onToggleNetwork('OFFLINE')}
            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Simulate Network Failure</span>
          </button>
        )}
      </div>
    </div>
  );
};
