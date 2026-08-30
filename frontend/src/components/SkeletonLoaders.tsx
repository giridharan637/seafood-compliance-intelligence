import React from 'react';

export const KPICardsSkeleton: React.FC<{ count?: number }> = ({ count = 5 }) => (
  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 anim-pulse">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="glass-panel p-4 rounded-xl space-y-2 border-l-4 border-slate-300 dark:border-slate-700 bg-slate-100/50 dark:bg-slate-900/50">
        <div className="h-2.5 w-20 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
        <div className="h-7 w-12 bg-slate-300 dark:bg-slate-700 rounded animate-pulse mt-2" />
        <div className="h-2 w-28 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
      </div>
    ))}
  </div>
);

export const TableSkeleton: React.FC<{ rows?: number; cols?: number }> = ({ rows = 6, cols = 8 }) => (
  <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40 p-4 space-y-3 anim-pulse">
    <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-800">
      <div className="h-4 w-36 bg-slate-200 dark:bg-slate-800 rounded" />
      <div className="h-7 w-48 bg-slate-200 dark:bg-slate-800 rounded-lg" />
    </div>
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 py-2.5 items-center border-b border-slate-100 dark:divide-slate-800/40">
          {Array.from({ length: cols }).map((_, c) => (
            <div
              key={c}
              className="h-3 bg-slate-200 dark:bg-slate-800/80 rounded animate-pulse"
              style={{ width: `${Math.max(10, 100 / cols - 2)}%` }}
            />
          ))}
        </div>
      ))}
    </div>
  </div>
);

export const CardsGridSkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 anim-pulse">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="glass-panel p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 bg-slate-100/40 dark:bg-slate-900/40">
        <div className="flex justify-between items-center">
          <div className="h-4 w-28 bg-slate-200 dark:bg-slate-800 rounded" />
          <div className="h-4 w-16 bg-slate-200 dark:bg-slate-800 rounded" />
        </div>
        <div className="space-y-1.5 pt-1">
          <div className="h-2.5 w-full bg-slate-200 dark:bg-slate-800 rounded" />
          <div className="h-2.5 w-3/4 bg-slate-200 dark:bg-slate-800 rounded" />
          <div className="h-2.5 w-1/2 bg-slate-200 dark:bg-slate-800 rounded" />
        </div>
      </div>
    ))}
  </div>
);

export const DashboardShellSkeleton: React.FC = () => (
  <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 w-full anim-fade-in select-none">
    <KPICardsSkeleton count={5} />
    <div className="glass-card p-5 rounded-2xl border border-slate-200 dark:border-slate-800 h-40 bg-slate-100/30 dark:bg-slate-900/30 animate-pulse" />
    <CardsGridSkeleton count={6} />
  </div>
);
