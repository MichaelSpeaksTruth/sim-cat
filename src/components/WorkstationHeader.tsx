import React from 'react';
import { SimulationResult, SimulationStage } from '../types/eurokin';
import { PRESET_SCENARIOS } from '../lib/presets';
import {
  FileCheck2,
  RotateCcw,
  ShieldCheck,
  AlertTriangle,
  Zap,
  Sliders,
  ChevronDown,
  ZoomIn,
  ZoomOut
} from 'lucide-react';

interface WorkstationHeaderProps {
  simulation: SimulationResult;
  selectedPresetId: string;
  onSelectPreset: (presetId: string) => void;
  onRunSimulation: () => void;
  isSimulating: boolean;
  simulationStage: SimulationStage;
  isDirty: boolean;
  onReset: () => void;
  onOpenExport: () => void;
  onOpenInspector: () => void;
  isInspectorOpen: boolean;
  globalZoom?: number;
  onChangeGlobalZoom?: (zoom: number) => void;
}

export const WorkstationHeader: React.FC<WorkstationHeaderProps> = ({
  simulation,
  selectedPresetId,
  onSelectPreset,
  onRunSimulation,
  isSimulating,
  simulationStage,
  isDirty,
  onReset,
  onOpenExport,
  onOpenInspector,
  isInspectorOpen,
  globalZoom = 100,
  onChangeGlobalZoom,
}) => {
  const { overallStatus, passedCount, totalCount } = simulation;

  return (
    <header className="h-14 bg-white border-b border-slate-200/90 px-4 lg:px-6 flex items-center justify-between gap-3 select-none z-30 shadow-xs">
      {/* Left: Chemical System & Preset Scenario Selector */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <span className="text-[11px] font-mono uppercase text-slate-500 font-semibold">
            System:
          </span>
          <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
            0.5 N₂ + 1.5 H₂ ⇌ NH₃
          </span>
        </div>

        <span className="hidden sm:inline text-slate-300">|</span>

        {/* Preset Selector */}
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[11px] uppercase text-slate-500 font-medium shrink-0">Preset:</span>
          <div className="relative">
            <select
              value={selectedPresetId}
              onChange={(e) => onSelectPreset(e.target.value)}
              className="appearance-none bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-lg text-slate-800 text-xs font-mono font-medium pl-2.5 pr-8 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors cursor-pointer truncate max-w-[260px] sm:max-w-[340px] md:max-w-md"
            >
              {PRESET_SCENARIOS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Dirty State Indicator */}
        {isDirty && (
          <span className="hidden md:inline-flex items-center text-[11px] font-mono px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-md font-medium shrink-0 animate-pulse">
            Out of Date
          </span>
        )}
      </div>

      {/* Right: Actions, Solver Trigger & Eurokin Status Pill */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* Reset Defaults */}
        <button
          onClick={onReset}
          className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg transition-colors cursor-pointer"
          title="Reset to Baseline Haber-Bosch Defaults"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        {/* Audit & Export Modal Trigger */}
        <button
          onClick={onOpenExport}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200 rounded-lg text-xs font-medium transition-colors cursor-pointer"
        >
          <FileCheck2 className="w-3.5 h-3.5 text-blue-600" />
          <span>Audit & Export</span>
        </button>

        {/* Solver Action Button */}
        <button
          onClick={onRunSimulation}
          disabled={isSimulating}
          className={`px-4 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-2 transition-all shadow-xs cursor-pointer ${
            isSimulating
              ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
              : isDirty
              ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/20'
              : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20'
          }`}
        >
          <Zap className={`w-3.5 h-3.5 ${isSimulating ? 'animate-spin' : ''}`} />
          <span>{isSimulating ? 'Solving RK4...' : 'Run Simulation'}</span>
        </button>

        {/* Status Badge */}
        <div
          className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-semibold rounded-lg border tracking-wide ${
            overallStatus === 'VALID_INTRINSIC'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-rose-50 text-rose-700 border-rose-200'
          }`}
        >
          {overallStatus === 'VALID_INTRINSIC' ? (
            <>
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>INTRINSIC ({passedCount}/{totalCount})</span>
            </>
          ) : (
            <>
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span>TRANSPORT LIMITED ({passedCount}/{totalCount})</span>
            </>
          )}
        </div>

        {/* Global Workspace View Zoom Controller */}
        {onChangeGlobalZoom && (
          <div className="flex items-center bg-slate-100 border border-slate-200/90 rounded-lg p-0.5 text-xs font-mono">
            <button
              onClick={() => onChangeGlobalZoom(Math.max(70, globalZoom - 10))}
              className="p-1 hover:bg-white text-slate-600 hover:text-slate-900 rounded transition-colors cursor-pointer"
              title="Zoom Out entire workspace (Fit more on screen)"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => onChangeGlobalZoom(100)}
              className="px-1.5 py-0.5 text-[11px] font-bold text-slate-700 hover:bg-white rounded transition-colors cursor-pointer"
              title="Current scale. Click to reset to 100%"
            >
              {globalZoom}%
            </button>

            <button
              onClick={() => onChangeGlobalZoom(Math.min(130, globalZoom + 10))}
              className="p-1 hover:bg-white text-slate-600 hover:text-slate-900 rounded transition-colors cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Toggle Right Inspector */}
        <button
          onClick={onOpenInspector}
          className={`p-1.5 border rounded-lg transition-colors cursor-pointer ${
            isInspectorOpen
              ? 'bg-blue-50 text-blue-700 border-blue-200'
              : 'bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border-slate-200'
          }`}
          title="Toggle Engineering Inspector Panel"
        >
          <Sliders className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
