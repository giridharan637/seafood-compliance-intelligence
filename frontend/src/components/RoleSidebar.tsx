import React, { useState } from 'react';
import { Home, Menu, X, Anchor, Circle, ChevronLeft, ChevronRight, ShieldCheck, Truck, Shield } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

export interface RoleSidebarItem {
  id: string;
  label: string;
  icon: React.ElementType;
}

interface RoleSidebarProps {
  role: 'compliance' | 'transport' | 'admin';
  roleTitle: string;
  roleSubtitle?: string;
  items: RoleSidebarItem[];
  activeItem: string;
  onSelectItem: (id: string) => void;
  onHome: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  backendOnline?: boolean;
}

export const RoleSidebar: React.FC<RoleSidebarProps> = ({
  role,
  roleTitle,
  roleSubtitle = 'Automated Compliance & Evidence System',
  items,
  activeItem,
  onSelectItem,
  onHome,
  collapsed,
  onToggleCollapse,
  backendOnline = true,
}) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  // Theme styling based on role
  const roleStyles = {
    compliance: {
      accentText: 'text-emerald-600 dark:text-emerald-400',
      accentBg: 'bg-emerald-50 dark:bg-emerald-500/15',
      accentBorder: 'border-l-emerald-600 dark:border-l-emerald-400',
      activeBorderColor: 'border-emerald-500/40',
      activeText: 'text-emerald-900 dark:text-emerald-300 font-bold',
      activeDot: 'bg-emerald-500 dark:bg-emerald-400',
      badgeBg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30',
      icon: ShieldCheck,
      ringHover: 'hover:border-emerald-500/40',
    },
    transport: {
      accentText: 'text-amber-600 dark:text-amber-400',
      accentBg: 'bg-amber-50 dark:bg-amber-500/15',
      accentBorder: 'border-l-amber-600 dark:border-l-amber-400',
      activeBorderColor: 'border-amber-500/40',
      activeText: 'text-amber-900 dark:text-amber-300 font-bold',
      activeDot: 'bg-amber-500 dark:bg-amber-400',
      badgeBg: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30',
      icon: Truck,
      ringHover: 'hover:border-amber-500/40',
    },
    admin: {
      accentText: 'text-cyan-600 dark:text-cyan-400',
      accentBg: 'bg-cyan-50 dark:bg-cyan-500/15',
      accentBorder: 'border-l-cyan-600 dark:border-l-cyan-400',
      activeBorderColor: 'border-cyan-500/40',
      activeText: 'text-cyan-900 dark:text-cyan-300 font-bold',
      activeDot: 'bg-cyan-500 dark:bg-cyan-400',
      badgeBg: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-500/30',
      icon: Shield,
      ringHover: 'hover:border-cyan-500/40',
    },
  }[role];

  const RoleIcon = roleStyles.icon;

  const renderSidebarItems = (isMobile = false) => {
    const isCollapsedMode = !isMobile && collapsed;

    return (
      <div className="flex flex-col h-full w-full overflow-x-hidden select-none">
        {/* Top Header: Hamburger & Brand */}
        <div className={`p-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center shrink-0 ${isCollapsedMode ? 'flex-col gap-3 justify-center' : 'justify-between gap-2'}`}>
          {!isCollapsedMode ? (
            <div className="flex items-center gap-2.5 overflow-hidden min-w-0">
              <div className={`p-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 shrink-0 ${roleStyles.accentText}`}>
                <RoleIcon className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-black tracking-wide text-slate-900 dark:text-white uppercase truncate">
                  {roleTitle}
                </div>
                <div className={`text-[10px] font-semibold ${roleStyles.accentText} truncate`}>
                  Compliance Intelligence
                </div>
              </div>
            </div>
          ) : (
            <div className={`p-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 shrink-0 ${roleStyles.accentText}`} title={roleTitle}>
              <RoleIcon className="w-5 h-5" />
            </div>
          )}

          {/* Desktop 3-line Hamburger Toggle Button */}
          {!isMobile && (
            <button
              onClick={onToggleCollapse}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800/60 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700/50 transition-all cursor-pointer flex items-center justify-center shrink-0 shadow-xs hover:scale-105"
              title={collapsed ? 'Expand Sidebar (☰)' : 'Collapse Sidebar (☰)'}
              aria-label="Toggle Sidebar"
            >
              <Menu className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Navigation Items List — scrollable vertically only, zero horizontal overflow */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-3 space-y-1 scrollbar-thin">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = activeItem === item.id;

            return (
              <div key={item.id} className="relative w-full">
                <button
                  onClick={() => {
                    onSelectItem(item.id);
                    if (isMobile) setMobileOpen(false);
                  }}
                  className={`
                    w-full flex items-center ${isCollapsedMode ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2.5'}
                    rounded-xl transition-all duration-150 cursor-pointer text-xs
                    ${isActive
                      ? `${roleStyles.accentBg} ${roleStyles.activeText} border-l-4 ${roleStyles.accentBorder} shadow-xs font-semibold`
                      : `text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/50 border-l-4 border-transparent ${roleStyles.ringHover}`
                    }
                  `}
                  title={isCollapsedMode ? item.label : undefined}
                >
                  <Icon className={`w-4 h-4 shrink-0 transition-transform ${isActive ? roleStyles.accentText + ' scale-110' : 'text-slate-500 dark:text-slate-400'}`} />
                  {!isCollapsedMode && (
                    <span className="truncate text-left font-medium flex-1">
                      {item.label}
                    </span>
                  )}
                  {!isCollapsedMode && isActive && (
                    <span className={`w-1.5 h-1.5 rounded-full ${roleStyles.activeDot} shrink-0`} />
                  )}
                </button>
              </div>
            );
          })}

          {/* Divider */}
          <div className="pt-2 pb-1">
            <div className="border-t border-slate-200 dark:border-slate-800" />
          </div>

          {/* Back to Home Item */}
          <div className="relative w-full">
            <button
              onClick={() => {
                onHome();
                if (isMobile) setMobileOpen(false);
              }}
              className={`
                w-full flex items-center ${isCollapsedMode ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2.5'}
                rounded-xl text-slate-700 dark:text-slate-400 hover:text-cyan-700 dark:hover:text-cyan-300 hover:bg-cyan-50 dark:hover:bg-cyan-950/30 transition-all cursor-pointer text-xs font-medium border-l-4 border-transparent
              `}
              title={isCollapsedMode ? 'Back to Home' : undefined}
            >
              <Home className="w-4 h-4 shrink-0 text-cyan-600 dark:text-cyan-400 transition-transform" />
              {!isCollapsedMode && (
                <span className="truncate font-semibold text-cyan-700 dark:text-cyan-400">
                  Back to Home
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Footer: Theme Toggle & Backend Status — reserved fixed bottom area */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 space-y-2 shrink-0 bg-white/95 dark:bg-slate-900/95 overflow-hidden">
          {!isCollapsedMode ? (
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Theme</span>
              <ThemeToggle />
            </div>
          ) : (
            <div className="flex justify-center w-full" title="Toggle Theme">
              <ThemeToggle compact={true} />
            </div>
          )}

          {!isCollapsedMode ? (
            <div className="flex items-center gap-2 px-1">
              <Circle className={`w-2 h-2 fill-current shrink-0 ${backendOnline ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`} />
              <span className={`text-[10px] font-semibold truncate ${backendOnline ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                Backend {backendOnline ? 'Online' : 'Offline'}
              </span>
            </div>
          ) : (
            <div className="flex justify-center w-full py-0.5" title={`Backend ${backendOnline ? 'Online' : 'Offline'}`}>
              <Circle className={`w-2 h-2 fill-current shrink-0 ${backendOnline ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`} />
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Mobile Top Bar with ☰ Hamburger Button */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-white/95 dark:bg-slate-900/95 border-b border-slate-200 dark:border-slate-800 backdrop-blur-md flex items-center justify-between px-4 shadow-md">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
            aria-label="Open Navigation Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <RoleIcon className={`w-4 h-4 ${roleStyles.accentText}`} />
            <span className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-[180px]">
              {roleTitle}
            </span>
          </div>
        </div>
        <ThemeToggle compact={true} />
      </div>

      {/* Mobile Off-Canvas Drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileOpen(false)}
          />
          {/* Drawer content */}
          <div className="relative w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 h-full overflow-hidden flex flex-col shadow-2xl animate-slide-in-left z-10">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-3.5 right-3 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-200 cursor-pointer z-20"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
            {renderSidebarItems(true)}
          </div>
        </div>
      )}

      {/* Desktop Sticky/Fixed Left Vertical Sidebar */}
      <aside
        className={`
          hidden lg:flex fixed left-0 top-0 h-screen overflow-x-hidden overflow-y-hidden bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800/80
          shadow-xl z-30 flex-col transition-all duration-300 ease-in-out select-none
          ${collapsed ? 'w-20' : 'w-64'}
        `}
      >
        {renderSidebarItems(false)}
      </aside>
    </>
  );
};

