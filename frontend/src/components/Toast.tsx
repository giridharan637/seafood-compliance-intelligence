import React from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useToast, Toast as ToastType, ToastType as ToastVariant } from '../context/ToastContext';

const ICONS: Record<ToastVariant, React.ReactNode> = {
  success: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />,
  error:   <XCircle     className="w-5 h-5 text-rose-400 shrink-0" />,
  warning: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />,
  info:    <Info        className="w-5 h-5 text-cyan-400 shrink-0" />,
};

const BORDER_COLORS: Record<ToastVariant, string> = {
  success: 'border-l-emerald-500',
  error:   'border-l-rose-500',
  warning: 'border-l-amber-500',
  info:    'border-l-cyan-500',
};

const BG_COLORS: Record<ToastVariant, string> = {
  success: 'bg-emerald-950/30',
  error:   'bg-rose-950/30',
  warning: 'bg-amber-950/30',
  info:    'bg-cyan-950/30',
};

const ToastItem: React.FC<{ toast: ToastType }> = ({ toast }) => {
  const { dismissToast } = useToast();

  return (
    <div
      className={`
        flex items-start gap-3 p-4 rounded-xl border border-slate-700/80 border-l-4
        ${BORDER_COLORS[toast.type]} ${BG_COLORS[toast.type]}
        backdrop-blur-md shadow-2xl shadow-black/40
        min-w-[300px] max-w-[420px]
        animate-toast-in
        text-slate-100
      `}
      style={{
        background: 'rgba(15, 23, 42, 0.92)',
      }}
    >
      {ICONS[toast.type]}
      <div className="flex-1 min-w-0">
        <div className="font-bold text-sm text-white leading-tight">{toast.title}</div>
        {toast.message && (
          <div className="text-xs text-slate-300 mt-0.5 leading-relaxed">{toast.message}</div>
        )}
      </div>
      <button
        onClick={() => dismissToast(toast.id)}
        className="shrink-0 p-0.5 rounded hover:bg-slate-700/50 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export const ToastContainer: React.FC = () => {
  const { toasts } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none"
      aria-live="polite"
      aria-label="Notifications"
    >
      {toasts.map(t => (
        <div key={t.id} className="pointer-events-auto">
          <ToastItem toast={t} />
        </div>
      ))}
    </div>
  );
};
