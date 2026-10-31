import React, { useState, useEffect, useRef } from 'react';
import { SimulationResult, SimulationStage, PlaybackState, ReactorInputs } from '../types/eurokin';
import {
  Play,
  Pause,
  RotateCcw,
  FastForward,
  CheckCircle2,
  AlertCircle,
  Cpu,
  Layers,
  Activity,
  Zap,
  Flame,
  Gauge,
  Sliders,
  Sparkles
} from 'lucide-react';

interface SimulationWorkspaceProps {
  simulation: SimulationResult;
  onRunSimulation: () => void;
  isSimulating: boolean;
  simulationStage: SimulationStage;
  playbackState: PlaybackState;
  onPlaybackChange: (updater: (prev: PlaybackState) => PlaybackState) => void;
  onZNormalizedChange: (zNorm: number) => void;
}

export const SimulationWorkspace: React.FC<SimulationWorkspaceProps> = ({
  simulation,
  onRunSimulation,
  isSimulating,
  simulationStage,
  playbackState,
  onPlaybackChange,
  onZNormalizedChange,
}) => {
  const { axialProfiles, inputs } = simulation;
  const timerRef = useRef<number | null>(null);

  // Playback timer animation loop
  useEffect(() => {
    if (playbackState.isPlaying) {
      timerRef.current = window.setInterval(() => {
        onPlaybackChange((prev) => {
          let nextZ = prev.currentZNormalized + 0.015 * prev.speed;
          if (nextZ > 1.0) {
            nextZ = 0.0; // loop back to inlet
          }
          onZNormalizedChange(nextZ);
          return { ...prev, currentZNormalized: nextZ };
        });
      }, 50);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [playbackState.isPlaying, playbackState.speed]);

  const togglePlay = () => {
    onPlaybackChange((prev) => ({ ...prev, isPlaying: !prev.isPlaying }));
  };

  const handleResetPlayback = () => {
    onPlaybackChange((prev) => ({ ...prev, isPlaying: false, currentZNormalized: 0.0 }));
    onZNormalizedChange(0.0);
  };

  const handleSpeedChange = (speed: number) => {
    onPlaybackChange((prev) => ({ ...prev, speed }));
  };

  const stages: Array<{ id: SimulationStage; label: string; desc: string }> = [
    { id: 'validating', label: '1. Input Validation', desc: 'Checking thermodynamic & mechanical validity' },
    { id: 'initializing', label: '2. Model Initialization', desc: 'Allocating state vectors & axial mesh' },
    { id: 'evaluating_properties', label: '3. NIST Property Evaluation', desc: 'Evaluating Shomate, Wilke & Fuller transport tensors' },
    { id: 'integrating', label: '4. Reactor Integration (RK4)', desc: 'Integrating 1D mass, heat, and momentum balance along z' },
    { id: 'checking_convergence', label: '5. Convergence Evaluation', desc: 'Verifying energy closure & continuity residuals' },
    { id: 'generating_results', label: '6. Diagnostic Matrix', desc: 'Evaluating the 9 Eurokin criteria & suitability scores' },
    { id: 'completed', label: '7. Completed', desc: 'Solution converged & synchronized' },
  ];

  const currentStageIndex = stages.findIndex((s) => s.id === simulationStage);

  return (
    <div className="bg-[#0A0D12] border border-[#1E2533] p-5 space-y-5">
      {/* Top Banner & Run Trigger */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#1E2533]">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-slate-100 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-[#00D8F6]" />
              Industrial Simulation Engine & Numerical Playback
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 bg-[#141A24] text-slate-300 border border-[#252E3E]">
              Runge-Kutta 4th Order (RK4)
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 font-sans">
            Solves the simultaneous coupled differential equations for reactant conversion $X_A(z)$, gas temperature $T(z)$, and Ergun pressure drop $P(z)$ across the packed catalyst bed.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onRunSimulation}
            disabled={isSimulating}
            className={`px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider border transition-all flex items-center gap-2 shadow-sm ${
              isSimulating
                ? 'bg-[#141A24] text-slate-500 border-[#283244] cursor-not-allowed'
                : 'bg-[#00D8F6] hover:bg-[#38BDF8] text-[#080A0D] border-[#00D8F6] active:translate-y-px'
            }`}
          >
            <Zap className={`w-3.5 h-3.5 ${isSimulating ? 'animate-spin' : ''}`} />
            <span>{isSimulating ? 'Executing Solver...' : 'Run Simulation'}</span>
          </button>
        </div>
      </div>

      {/* Simulation Lifecycle Stage Pipeline */}
      <div className="bg-[#080A0D] border border-[#1E2533] p-4">
        <div className="text-[10px] font-mono uppercase text-slate-400 tracking-wider mb-2 flex items-center justify-between">
          <span>Solver Lifecycle Execution Stages</span>
          <span className="text-[#00D8F6]">
            {isSimulating ? 'SOLVER ACTIVE' : 'STEADY-STATE CONVERGED'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-2 text-xs font-mono">
          {stages.slice(0, 6).map((stage, idx) => {
            const isPast = !isSimulating || currentStageIndex > idx || simulationStage === 'completed';
            const isCurrent = isSimulating && currentStageIndex === idx;

            return (
              <div
                key={stage.id}
                className={`p-2.5 border transition-all ${
                  isCurrent
                    ? 'bg-[#00D8F6]/10 border-[#00D8F6] text-slate-100 shadow-xs'
                    : isPast
                    ? 'bg-[#0E131A] border-[#1C2533] text-slate-300'
                    : 'bg-[#080A0D] border-[#161D28] text-slate-600'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold">
                    {stage.label.split('.')[0]}
                  </span>
                  {isPast ? (
                    <CheckCircle2 className="w-3 h-3 text-[#10B981]" />
                  ) : isCurrent ? (
                    <span className="w-2 h-2 bg-[#00D8F6] animate-pulse" />
                  ) : (
                    <span className="w-1.5 h-1.5 bg-[#252E3E]" />
                  )}
                </div>
                <div className="text-[11px] font-semibold truncate">
                  {stage.label.split('. ')[1]}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Numerical Playback & Axial Scrubber Controls */}
      <div className="bg-[#080A0D] border border-[#1E2533] p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-200 uppercase tracking-wide">
              Axial Position Scrubber
            </span>
            <span className="text-slate-500 text-[11px]">
              (Scrub to inspect local solution vectors)
            </span>
          </div>

          {/* Transport playback controls */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={togglePlay}
              className={`px-3 py-1 text-xs border flex items-center gap-1.5 transition-colors ${
                playbackState.isPlaying
                  ? 'bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/60'
                  : 'bg-[#141A24] text-slate-200 hover:text-[#00D8F6] border-[#283244]'
              }`}
            >
              {playbackState.isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              <span>{playbackState.isPlaying ? 'Pause' : 'Play'}</span>
            </button>

            <button
              onClick={handleResetPlayback}
              className="p-1.5 bg-[#141A24] text-slate-400 hover:text-slate-100 border border-[#283244] transition-colors"
              title="Reset scrubber to bed inlet (z = 0)"
            >
              <RotateCcw className="w-3 h-3" />
            </button>

            {/* Speed buttons */}
            <div className="flex items-center ml-2 border border-[#222B3A]">
              {[0.5, 1.0, 2.0].map((s) => (
                <button
                  key={s}
                  onClick={() => handleSpeedChange(s)}
                  className={`px-2 py-0.5 text-[10px] ${
                    playbackState.speed === s
                      ? 'bg-[#00D8F6]/20 text-[#00D8F6] font-bold'
                      : 'bg-[#0E131A] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Scrubber Range Slider */}
        <div className="space-y-1">
          <input
            type="range"
            min="0"
            max="1"
            step="0.005"
            value={playbackState.currentZNormalized}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              onPlaybackChange((prev) => ({ ...prev, currentZNormalized: val }));
              onZNormalizedChange(val);
            }}
            className="w-full accent-[#00D8F6] cursor-pointer"
          />

          <div className="flex justify-between text-[10px] font-mono text-slate-500">
            <span>Inlet z = 0.0 mm (Feed Syngas)</span>
            <span className="text-[#00D8F6] font-bold">
              Current: z = {(playbackState.currentZNormalized * inputs.bedHeight * 1000).toFixed(1)} mm ({ (playbackState.currentZNormalized * 100).toFixed(0) }% L)
            </span>
            <span>Outlet z = {(inputs.bedHeight * 1000).toFixed(0)} mm (Effluent)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
