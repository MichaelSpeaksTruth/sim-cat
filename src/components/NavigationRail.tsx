import React from 'react';
import { NavigationSection } from '../types/eurokin';
import {
  LayoutDashboard,
  Cpu,
  Layers,
  Wind,
  Gauge,
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
    { id: 'operating', label: 'Operating Conditions', shortCode: '05', icon: Gauge },
    { id: 'simulation', label: 'Simulation & Playback', shortCode: '06', icon: PlaySquare, badge: isDirty ? 'DIRTY' : 'READY' },
    { id: 'diagnostics', label: 'Transport Diagnostics', shortCode: '07', icon: Activity, badge: `${passedCount}/${totalCount}` },
    { id: 'results', label: 'Results Explorer', shortCode: '08', icon: LineChart },
    { id: 'comparison', label: 'Catalyst Comparison', shortCode: '09', icon: Split },
    { id: 'validation', label: 'Validation Lab', shortCode: '10', icon: FileCode2 },
  ];

  return (
    <aside
      className={`bg-[#0A0D12] border-r border-[#1E2533] flex flex-col justify-between shrink-0 select-none z-30 transition-all duration-150 ${
        isCollapsed ? 'w-[64px]' : 'w-[240px]'
      }`}
    >
      {/* Top Header / Brand */}
      <div>
        <div className="h-14 border-b border-[#1E2533] px-3.5 flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-2.5 h-2.5 bg-[#00D8F6]" />
              <div className="flex flex-col">
                <span className="font-mono font-extrabold text-xs tracking-wider text-slate-100">
                  SIM-CAT <span className="text-[#00D8F6] text-[10px] font-normal">v1.0</span>
                </span>
                <span className="text-[10px] font-mono text-amber-400/90 uppercase tracking-tight">
                  Research Preview (Rev 15)
                </span>
              </div>
            </div>
          )}

          {isCollapsed && (
            <div className="mx-auto w-3 h-3 bg-[#00D8F6]" title="SIM-CAT Workstation" />
          )}

          <button
            onClick={onToggleCollapse}
            className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-[#141A24] border border-transparent hover:border-[#283244] transition-colors"
            title={isCollapsed ? 'Expand Navigation (Ctrl+B)' : 'Collapse Navigation (Ctrl+B)'}
          >
            {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Section List */}
        <nav className="p-1.5 space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onSelectSection(item.id)}
                className={`w-full text-left flex items-center gap-3 px-3 py-2.5 transition-all text-xs font-mono relative ${
                  isActive
                    ? 'bg-[#141A24] text-slate-100 border-l-2 border-l-[#00D8F6] border-t border-r border-b border-[#252E3E]'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#0E131A] border border-transparent'
                }`}
                title={isCollapsed ? `${item.shortCode}. ${item.label}` : undefined}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-[#00D8F6]' : 'text-slate-400'
                  }`}
                />

                {!isCollapsed && (
                  <div className="flex items-center justify-between w-full overflow-hidden">
                    <span className="truncate">{item.label}</span>
                    {item.badge && (
                      <span
                        className={`text-[9px] px-1.5 py-0.2 border shrink-0 ${
                          item.badge === 'DIRTY'
                            ? 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/30'
                            : item.badge === 'READY'
                            ? 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/30'
                            : 'bg-[#141A24] text-slate-400 border-[#252E3E]'
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
      <div className="p-2 border-t border-[#1E2533]">
        {!isCollapsed ? (
          <div
            className={`p-2.5 border text-xs font-mono ${
              overallStatus === 'VALID_INTRINSIC'
                ? 'bg-[#10B981]/5 border-[#10B981]/30 text-slate-300'
                : overallStatus === 'CORRELATION_EXTRAPOLATION'
                ? 'bg-purple-950/20 border-purple-500/30 text-slate-300'
                : 'bg-[#EF4444]/5 border-[#EF4444]/30 text-slate-300'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] uppercase text-slate-400 tracking-wider">
                Eurokin Status
              </span>
              <span
                className={`w-2 h-2 ${
                  overallStatus === 'VALID_INTRINSIC'
                    ? 'bg-[#10B981]'
                    : overallStatus === 'CORRELATION_EXTRAPOLATION'
                    ? 'bg-purple-400'
                    : 'bg-[#EF4444]'
                }`}
              />
            </div>
            <div className="font-bold text-[11px] truncate">
              {overallStatus === 'VALID_INTRINSIC'
                ? 'INTRINSIC VALID'
                : overallStatus === 'CORRELATION_EXTRAPOLATION'
                ? 'EXTRAPOLATION'
                : 'TRANSPORT LIMITED'}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              {passedCount} of {totalCount} criteria pass
            </div>
          </div>
        ) : (
          <div
            className={`w-full py-2 flex items-center justify-center border ${
              overallStatus === 'VALID_INTRINSIC'
                ? 'bg-[#10B981]/10 border-[#10B981]/30 text-[#10B981]'
                : overallStatus === 'CORRELATION_EXTRAPOLATION'
                ? 'bg-purple-950/30 border-purple-500/40 text-purple-300'
                : 'bg-[#EF4444]/10 border-[#EF4444]/30 text-[#EF4444]'
            }`}
            title={`Status: ${overallStatus} (${passedCount}/${totalCount} criteria pass)`}
          >
            <span
              className={`w-2 h-2 ${
                overallStatus === 'VALID_INTRINSIC'
                  ? 'bg-[#10B981]'
                  : overallStatus === 'CORRELATION_EXTRAPOLATION'
                  ? 'bg-purple-400'
                  : 'bg-[#EF4444]'
              }`}
            />
          </div>
        )}
      </div>
    </aside>
  );
};
