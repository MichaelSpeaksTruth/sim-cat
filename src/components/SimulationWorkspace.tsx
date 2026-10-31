import React, { useEffect, useRef } from 'react';
import { SimulationResult, SimulationStage, PlaybackState } from '../types/eurokin';
import {
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  Cpu,
  Zap,
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
  const { inputs } = simulation;
  const timerRef = useRef<number | null>(null);

  // Playback timer animation loop
  useEffect(() => {
    if (playbackState.isPlaying) {
      timerRef.current = window.setInterval(() => {
        onPlaybackChange((prev) => {
          let nextZ = prev.currentZNormalized + 0.015 * prev.speed;
          if (nextZ > 1.0) {
            nextZ = 0.0;
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
    { id: 'validating', label: '1. Validation', desc: 'Checking thermodynamic & mechanical validity' },
    { id: 'initializing', label: '2. Initialization', desc: 'Allocating state vectors & axial mesh' },
    { id: 'evaluating_properties', label: '3. Properties', desc: 'Evaluating transport tensors' },
    { id: 'integrating', label: '4. Integration (RK4)', desc: 'Integrating 1D balance equations along z' },
    { id: 'checking_convergence', label: '5. Convergence', desc: 'Verifying energy closure & continuity' },
    { id: 'generating_results', label: '6. Diagnostics', desc: 'Evaluating Eurokin criteria & suitability' },
    { id: 'completed', label: '7. Completed', desc: 'Solution converged & synchronized' },
  ];

  const currentStageIndex = stages.findIndex((s) => s.id === simulationStage);

  return (
    <div className="bg-white border border-slate-200/90 rounded-xl shadow-xs p-5 lg:p-6 space-y-5">
      {/* Top Banner & Run Trigger */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-900">
                  Simulation Engine & Numerical Playback
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200">
                  RK4 Integration
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 font-sans">
                Solves coupled differential equations for reactant conversion, temperature, and Ergun pressure drop across the bed.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={onRunSimulation}
          disabled={isSimulating}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 shadow-xs cursor-pointer ${
            isSimulating
              ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20 active:translate-y-px'
          }`}
        >
          <Zap className={`w-4 h-4 ${isSimulating ? 'animate-spin' : ''}`} />
          <span>{isSimulating ? 'Executing Solver...' : 'Run Simulation'}</span>
        </button>
      </div>

      {/* Simulation Lifecycle Stage Pipeline */}
      <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-4">
        <div className="text-xs font-semibold text-slate-500 tracking-wider uppercase mb-3 flex items-center justify-between">
          <span>Solver Execution Pipeline</span>
          <span className="text-blue-700 font-mono text-[11px] font-bold">
            {isSimulating ? 'SOLVER ACTIVE' : 'STEADY-STATE CONVERGED'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs font-mono">
          {stages.slice(0, 6).map((stage, idx) => {
            const isPast = !isSimulating || currentStageIndex > idx || simulationStage === 'completed';
            const isCurrent = isSimulating && currentStageIndex === idx;

            return (
              <div
                key={stage.id}
                className={`p-3 rounded-lg border transition-all ${
                  isCurrent
                    ? 'bg-blue-50 border-blue-300 text-blue-900 shadow-xs'
                    : isPast
                    ? 'bg-white border-slate-200/80 text-slate-800'
                    : 'bg-slate-100/60 border-slate-200/50 text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold text-slate-500">
                    {stage.label.split('.')[0]}
                  </span>
                  {isPast ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  ) : isCurrent ? (
                    <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                  )}
                </div>
                <div className="text-xs font-semibold truncate font-sans">
                  {stage.label.split('. ')[1]}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Numerical Playback & Axial Scrubber Controls */}
      <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900">
              Axial Position Scrubber
            </span>
            <span className="text-slate-500 text-xs">
              (Inspect local solution vectors along bed height)
            </span>
          </div>

          {/* Transport playback controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={togglePlay}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
                playbackState.isPlaying
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 shadow-xs'
              }`}
            >
              {playbackState.isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{playbackState.isPlaying ? 'Pause' : 'Play'}</span>
            </button>

            <button
              onClick={handleResetPlayback}
              className="p-1.5 bg-white text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg shadow-xs transition-colors cursor-pointer"
              title="Reset scrubber to bed inlet (z = 0)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            {/* Speed buttons */}
            <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 shadow-xs text-xs font-medium">
              {[0.5, 1.0, 2.0].map((s) => (
                <button
                  key={s}
                  onClick={() => handleSpeedChange(s)}
                  className={`px-2 py-0.5 rounded cursor-pointer ${
                    playbackState.speed === s
                      ? 'bg-blue-600 text-white font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Scrubber Range Slider */}
        <div className="space-y-1.5">
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
            className="w-full accent-blue-600 cursor-pointer h-2 bg-slate-200 rounded-lg appearance-none"
          />

          <div className="flex justify-between text-xs font-mono text-slate-500">
            <span>Inlet z = 0.0 mm (Syngas Feed)</span>
            <span className="text-blue-700 font-bold">
              Current: z = {(playbackState.currentZNormalized * inputs.bedHeight * 1000).toFixed(1)} mm ({ (playbackState.currentZNormalized * 100).toFixed(0) }% L)
            </span>
            <span>Outlet z = {(inputs.bedHeight * 1000).toFixed(0)} mm (Effluent)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
