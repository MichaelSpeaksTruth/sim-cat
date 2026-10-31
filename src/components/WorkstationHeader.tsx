import React from 'react';
import { SimulationResult, PresetScenario, SimulationStage } from '../types/eurokin';
import { PRESET_SCENARIOS } from '../lib/presets';
import {
  FileCheck2,
  RotateCcw,
  ShieldCheck,
  AlertTriangle,
  Zap,
  Layers,
  ChevronDown,
  Activity,
  Sliders
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
}) => {
  const { overallStatus, passedCount, totalCount, inputs } = simulation;

  return (
    <header className="h-14 bg-[#0A0D12] border-b border-[#1E2533] px-4 flex items-center justify-between gap-4 select-none z-30">
      {/* Left: Chemical System & Preset Scenario Selector */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono uppercase text-slate-500 font-semibold">
            System:
          </span>
          <span className="font-mono text-xs font-bold text-slate-100 flex items-center gap-1.5">
            0.5 N₂ + 1.5 H₂ ⇌ NH₃
          </span>
        </div>

        <span className="text-slate-700">|</span>

        {/* Preset Selector */}
        <div className="flex items-center gap-1.5 text-xs font-mono">
          <span className="text-[10px] uppercase text-slate-500">Preset:</span>
          <select
            value={selectedPresetId}
            onChange={(e) => onSelectPreset(e.target.value)}
            className="bg-[#12161E] border border-[#252E3E] text-slate-200 text-xs font-mono px-2 py-1 focus:outline-none focus:border-[#00D8F6]"
          >
            {PRESET_SCENARIOS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Dirty State Indicator */}
        {isDirty && (
          <span className="text-[10px] font-mono px-2 py-0.5 bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/40 animate-pulse">
            Simulation Out of Date — Run Solver
          </span>
        )}
      </div>

      {/* Right: Actions, Solver Trigger & Eurokin Status Pill */}
      <div className="flex items-center gap-3">
        {/* Reset Defaults */}
        <button
          onClick={onReset}
          className="p-1.5 bg-[#12161E] hover:bg-[#1A202A] text-slate-400 hover:text-slate-100 border border-[#252E3E] transition-colors"
          title="Reset to Baseline Haber-Bosch Defaults"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        {/* Audit & Export Modal Trigger */}
        <button
          onClick={onOpenExport}
          className="px-3 py-1.5 bg-[#12161E] hover:bg-[#1A202A] text-slate-300 hover:text-slate-100 border border-[#252E3E] text-xs font-mono font-medium flex items-center gap-1.5 transition-colors"
        >
          <FileCheck2 className="w-3.5 h-3.5 text-[#00D8F6]" />
          <span>Audit & Export</span>
        </button>

        {/* Big Rectangular Solver Action Button */}
        <button
          onClick={onRunSimulation}
          disabled={isSimulating}
          className={`px-4 py-1.5 text-xs font-mono font-bold uppercase tracking-wider border flex items-center gap-2 transition-all shadow-xs ${
            isSimulating
              ? 'bg-[#141A24] text-slate-500 border-[#283244] cursor-not-allowed'
              : isDirty
              ? 'bg-[#EF4444] hover:bg-[#F87171] text-white border-[#EF4444] animate-pulse'
              : 'bg-[#00D8F6] hover:bg-[#38BDF8] text-[#080A0D] border-[#00D8F6]'
          }`}
        >
          <Zap className={`w-3.5 h-3.5 ${isSimulating ? 'animate-spin' : ''}`} />
          <span>{isSimulating ? 'Solving RK4...' : 'Run Simulation'}</span>
        </button>

        {/* Eurokin Status Badge */}
        <div
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-bold border tracking-wide ${
            overallStatus === 'VALID_INTRINSIC'
              ? 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/30'
              : 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/30'
          }`}
        >
          {overallStatus === 'VALID_INTRINSIC' ? (
            <>
              <ShieldCheck className="w-4 h-4 text-[#10B981]" />
              <span>INTRINSIC ({passedCount}/{totalCount})</span>
            </>
          ) : (
            <>
              <AlertTriangle className="w-4 h-4 text-[#EF4444]" />
              <span>TRANSPORT LIMITED ({passedCount}/{totalCount})</span>
            </>
          )}
        </div>

        {/* Toggle Right Inspector */}
        <button
          onClick={onOpenInspector}
          className={`p-1.5 border transition-colors ${
            isInspectorOpen
              ? 'bg-[#141A24] text-[#00D8F6] border-[#00D8F6]/50'
              : 'bg-[#12161E] text-slate-400 hover:text-slate-100 border-[#252E3E]'
          }`}
          title="Toggle Engineering Inspector Panel"
        >
          <Sliders className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};
