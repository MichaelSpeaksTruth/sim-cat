import React from 'react';
import { NavigationSection } from '../types/eurokin';
import {
  LayoutDashboard,
  Cpu,
  Layers,
  Wind,
  PlaySquare,
  Activity,
  LineChart,
  Split,
  FileCode2,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';

interface NavigationRailProps {
  activeSection: NavigationSection;
  onSelectSection: (section: NavigationSection) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  overallStatus: 'VALID_INTRINSIC' | 'TRANSPORT_LIMITED' | 'CORRELATION_EXTRAPOLATION';
  passedCount: number;
  totalCount: number;
  isDirty: boolean;
}

interface NavItem {
  id: NavigationSection;
  label: string;
  shortCode: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

export const NavigationRail: React.FC<NavigationRailProps> = ({
  activeSection,
  onSelectSection,
  isCollapsed,
  onToggleCollapse,
  overallStatus,
  passedCount,
  totalCount,
  isDirty,
}) => {
  const navItems: NavItem[] = [
    { id: 'overview', label: 'Overview & 3D Reactor', shortCode: '01', icon: LayoutDashboard },
    { id: 'setup', label: 'Reactor Setup', shortCode: '02', icon: Cpu },
    { id: 'catalyst', label: 'Catalyst Studio', shortCode: '03', icon: Layers },
    { id: 'feed', label: 'Feed Configuration', shortCode: '04', icon: Wind },
    { id: 'simulation', label: 'Simulation & Playback', shortCode: '05', icon: PlaySquare, badge: isDirty ? 'DIRTY' : 'READY' },
    { id: 'diagnostics', label: 'Transport Diagnostics', shortCode: '06', icon: Activity, badge: `${passedCount}/${totalCount}` },
    { id: 'results', label: 'Results Explorer', shortCode: '07', icon: LineChart },
    { id: 'comparison', label: 'Catalyst Comparison', shortCode: '08', icon: Split },
    { id: 'validation', label: 'Validation Lab', shortCode: '09', icon: FileCode2 },
  ];

  return (
    <aside
      className={`bg-white border-r border-slate-200/90 flex flex-col justify-between shrink-0 select-none z-30 transition-all duration-200 shadow-xs ${
        isCollapsed ? 'w-[68px]' : 'w-[250px]'
      }`}
    >
      {/* Top Header / Brand */}
      <div>
        <div className="h-14 border-b border-slate-200/90 px-4 flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center text-white font-bold text-xs shadow-xs">
                S
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="font-extrabold text-sm tracking-tight text-slate-900 font-mono">
                  SIM-CAT
                </span>
                <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200/60 font-mono">
                  v1.0
                </span>
              </div>
            </div>
          )}

          {isCollapsed && (
            <div className="mx-auto w-7 h-7 rounded-md bg-blue-600 flex items-center justify-center text-white font-bold text-xs shadow-xs" title="SIM-CAT Workstation">
              S
            </div>
          )}

          <button
            onClick={onToggleCollapse}
            className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            title={isCollapsed ? 'Expand Navigation' : 'Collapse Navigation'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Section List */}
        <nav className="p-2 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onSelectSection(item.id)}
                className={`w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-xs font-medium cursor-pointer ${
                  isActive
                    ? 'bg-blue-50/90 text-blue-700 font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
                title={isCollapsed ? `${item.shortCode}. ${item.label}` : undefined}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 transition-colors ${
                    isActive ? 'text-blue-600' : 'text-slate-400'
                  }`}
                />

                {!isCollapsed && (
                  <div className="flex items-center justify-between w-full overflow-hidden">
                    <span className="truncate">{item.label}</span>
                    {item.badge && (
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-semibold shrink-0 ml-1.5 ${
                          item.badge === 'DIRTY'
                            ? 'bg-amber-100 text-amber-800'
                            : item.badge === 'READY'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Diagnostic Status Tile */}
      <div className="p-3 border-t border-slate-200/90 bg-slate-50/60">
        {!isCollapsed ? (
          <div
            className={`p-3 rounded-lg border text-xs font-mono ${
              overallStatus === 'VALID_INTRINSIC'
                ? 'bg-emerald-50/80 border-emerald-200 text-slate-800'
                : overallStatus === 'CORRELATION_EXTRAPOLATION'
                ? 'bg-purple-50/80 border-purple-200 text-slate-800'
                : 'bg-rose-50/80 border-rose-200 text-slate-800'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-semibold uppercase text-slate-500 tracking-wider">
                Eurokin Status
              </span>
              <span
                className={`w-2 h-2 rounded-full ${
                  overallStatus === 'VALID_INTRINSIC'
                    ? 'bg-emerald-500 ring-2 ring-emerald-200'
                    : overallStatus === 'CORRELATION_EXTRAPOLATION'
                    ? 'bg-purple-500 ring-2 ring-purple-200'
                    : 'bg-rose-500 ring-2 ring-rose-200'
                }`}
              />
            </div>
            <div className="font-bold text-xs truncate">
              {overallStatus === 'VALID_INTRINSIC'
                ? 'INTRINSIC VALID'
                : overallStatus === 'CORRELATION_EXTRAPOLATION'
                ? 'EXTRAPOLATION'
                : 'TRANSPORT LIMITED'}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {passedCount} of {totalCount} criteria pass
            </div>
          </div>
        ) : (
          <div
            className={`w-full py-2.5 flex items-center justify-center rounded-lg border ${
              overallStatus === 'VALID_INTRINSIC'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                : overallStatus === 'CORRELATION_EXTRAPOLATION'
                ? 'bg-purple-50 border-purple-200 text-purple-600'
                : 'bg-rose-50 border-rose-200 text-rose-600'
            }`}
            title={`Status: ${overallStatus} (${passedCount}/${totalCount} criteria pass)`}
          >
            <div
              className={`w-2.5 h-2.5 rounded-full ${
                overallStatus === 'VALID_INTRINSIC'
                  ? 'bg-emerald-500'
                  : overallStatus === 'CORRELATION_EXTRAPOLATION'
                  ? 'bg-purple-500'
                  : 'bg-rose-500'
              }`}
            />
          </div>
        )}
      </div>
    </aside>
  );
};
