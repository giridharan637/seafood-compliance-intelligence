import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface ThemeToggleProps {
  className?: string;
  compact?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = '', compact = false }) => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  if (compact) {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
        title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode (Current: ${isDark ? 'Dark' : 'Light'})`}
        className={`p-2 rounded-xl transition-all duration-200 cursor-pointer border shadow-xs flex items-center justify-center shrink-0 ${
          isDark
            ? 'bg-slate-800 hover:bg-slate-700 text-cyan-300 border-slate-700'
            : 'bg-white hover:bg-slate-100 text-amber-500 border-slate-200'
        } ${className}`}
      >
        {isDark ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
      title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode (Current: ${isDark ? 'Dark' : 'Light'})`}
      className={`relative inline-flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-300 cursor-pointer border shadow-xs select-none shrink-0 ${
        isDark
          ? 'bg-slate-800/90 hover:bg-slate-700 text-amber-300 border-slate-700/80 hover:border-amber-400/40 shadow-slate-950/50'
          : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-200 hover:border-cyan-400/50 shadow-slate-300/40'
      } ${className}`}
    >
      <div className="flex items-center gap-1.5">
        {isDark ? (
          <>
            <Moon className="w-3.5 h-3.5 text-cyan-300 animate-in fade-in duration-200" />
            <span className="text-cyan-200 font-medium">Dark</span>
          </>
        ) : (
          <>
            <Sun className="w-3.5 h-3.5 text-amber-500 animate-in fade-in duration-200" />
            <span className="text-slate-700 font-medium">Light</span>
          </>
        )}
      </div>

      {/* Visual toggle switch track */}
      <div
        className={`w-6 h-3.5 rounded-full p-0.5 transition-colors duration-200 flex items-center ${
          isDark ? 'bg-slate-700 justify-end' : 'bg-amber-100 justify-start'
        }`}
      >
        <div
          className={`w-2.5 h-2.5 rounded-full shadow-xs transition-transform duration-200 ${
            isDark ? 'bg-cyan-400' : 'bg-amber-500'
          }`}
        />
      </div>
    </button>
  );
};

