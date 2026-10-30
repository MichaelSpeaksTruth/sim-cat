import React, { useState, useMemo } from 'react';
import { ReactorInputs } from './types/eurokin';
import { PRESET_SCENARIOS } from './lib/presets';
import { runEurokinSimulation } from './lib/eurokinEngine';
import { InputConsole } from './components/InputConsole';
import { ReactorVisualizer } from './components/ReactorVisualizer';
import { DiagnosticCard } from './components/DiagnosticCard';
import { SensitivitySweep } from './components/SensitivitySweep';
import { FormulaLedger } from './components/FormulaLedger';
import { ReportExportModal } from './components/ReportExportModal';
import {
  FlaskConical,
  Activity,
  BookOpen,
  TrendingUp,
  FileCheck2,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Layers,
  HelpCircle,
  ExternalLink
} from 'lucide-react';

export function App() {
  // Default to official Eurokin N2O decomposition benchmark scenario
  const [inputs, setInputs] = useState<ReactorInputs>(PRESET_SCENARIOS[0].inputs);
  const [activeView, setActiveView] = useState<'assessment' | 'sweep' | 'formulas'>('assessment');
  const [showExportModal, setShowExportModal] = useState(false);

  // Run simulation engine synchronously on any input change
  const simulation = useMemo(() => {
    return runEurokinSimulation(inputs);
  }, [inputs]);

  const handleReset = () => {
    setInputs(PRESET_SCENARIOS[0].inputs);
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col font-sans selection:bg-amber-500/25 selection:text-amber-300">
      {/* Top Engineering Nav Bar */}
      <header className="bg-[#0b0e17] border-b border-slate-800 sticky top-0 z-40 backdrop-blur-md bg-opacity-95">
        <div className="max-w-[1720px] mx-auto px-4 lg:px-6 py-3 flex flex-wrap items-center justify-between gap-4">
          {/* Logo & Platform Info */}
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <FlaskConical className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm tracking-wider uppercase bg-gradient-to-r from-amber-400 via-amber-200 to-amber-500 bg-clip-text text-transparent">
                  EUROKIN CATALYST SIMULATOR
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-950/60 text-amber-300 border border-amber-800/60">
                  v2026.4
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Gas-Solid Fixed-Bed Intrinsic Kinetics Diagnostic & Transport Assessment Suite
              </p>
            </div>
          </div>

          {/* View Mode Navigation Tabs */}
          <div className="flex items-center bg-[#07090e] p-1 rounded-xl border border-slate-800 text-xs font-mono">
            <button
              onClick={() => setActiveView('assessment')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-all ${
                activeView === 'assessment'
                  ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Diagnostic Matrix</span>
            </button>

            <button
              onClick={() => setActiveView('sweep')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-all ${
                activeView === 'sweep'
                  ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Sensitivity Sweeps</span>
            </button>

            <button
              onClick={() => setActiveView('formulas')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-all ${
                activeView === 'formulas'
                  ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Formula Ledger</span>
            </button>
          </div>

          {/* Action Tools */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setShowExportModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono border border-slate-700 transition-colors"
            >
              <FileCheck2 className="w-3.5 h-3.5 text-amber-400" />
              <span>Audit & Export</span>
            </button>

            {/* Overall Status Pill */}
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold tracking-wide border ${
                simulation.overallStatus === 'VALID_INTRINSIC'
                  ? 'bg-emerald-950/70 text-emerald-300 border-emerald-600/70 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                  : 'bg-rose-950/80 text-rose-300 border-rose-600/70 shadow-[0_0_15px_rgba(244,63,94,0.2)]'
              }`}
            >
              {simulation.overallStatus === 'VALID_INTRINSIC' ? (
                <>
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>INTRINSIC VALID ({simulation.passedCount}/{simulation.totalCount})</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  <span>TRANSPORT LIMITED ({simulation.passedCount}/{simulation.totalCount})</span>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-[1720px] mx-auto px-4 lg:px-6 py-5 flex-1 w-full space-y-5">
        {/* Assessment Status & Recommendation Banner */}
        <section
          className={`p-4 rounded-xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all ${
            simulation.overallStatus === 'VALID_INTRINSIC'
              ? 'bg-emerald-950/20 border-emerald-800/50'
              : 'bg-rose-950/20 border-rose-800/50'
          }`}
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                  simulation.overallStatus === 'VALID_INTRINSIC'
                    ? 'bg-emerald-900/60 text-emerald-300'
                    : 'bg-rose-900/60 text-rose-300'
                }`}
              >
                {simulation.overallStatus === 'VALID_INTRINSIC'
                  ? 'Intrinsic Kinetic Requirements Fulfilled'
                  : 'Transport Limitations Active'}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {simulation.passedCount} of {simulation.totalCount} criteria satisfied (
                {((simulation.passedCount / simulation.totalCount) * 100).toFixed(0)}%)
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed max-w-4xl">
              {simulation.overallStatus === 'VALID_INTRINSIC'
                ? 'All transport-limiting phenomena (axial/radial dispersion, external film gradients, pore diffusion, and bed dilution) are negligible (< 5% conversion rate impact). Measured kinetics are purely intrinsic.'
                : 'One or more transport gradients exceed the EUROKIN 5% perturbation tolerance limit. Apparent activation energies and reaction orders will be masked unless bed or particle geometry is adjusted.'}
            </p>
          </div>

          <div className="flex flex-col items-end shrink-0 text-xs font-mono text-slate-400">
            <span className="text-[11px] uppercase tracking-wider text-slate-500">Reactor Hydraulic Suggestion:</span>
            <span className="font-semibold text-slate-200 mt-0.5">
              {simulation.reactorSuitability.packedBedFeasible
                ? '✓ Packed-Bed Fixed Reactor Viable'
                : '⚠ High ΔP: Consider Fluidized Bed'}
            </span>
          </div>
        </section>

        {/* View Switching Logic */}
        {activeView === 'assessment' && (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
            {/* Left Column: Parameter Control Console */}
            <div className="xl:col-span-4 space-y-5">
              <InputConsole
                inputs={inputs}
                onChange={setInputs}
                onReset={handleReset}
              />
            </div>

            {/* Right Column: Visualization & Diagnostic Matrix */}
            <div className="xl:col-span-8 space-y-5">
              {/* Reactor 2D / Pellet Microkinetics Visualizer */}
              <ReactorVisualizer simulation={simulation} />

              {/* Diagnostic Criteria Header */}
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-amber-400" />
                  <h3 className="font-semibold text-xs tracking-wider uppercase text-slate-200">
                    EUROKIN Intrinsic Kinetic Criteria (9 Core Checks)
                  </h3>
                </div>
                <span className="text-xs font-mono text-slate-500">
                  Target: &lt; 5% deviation on reaction rate
                </span>
              </div>

              {/* 9 Diagnostic Criteria Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {simulation.criteria.map((c) => (
                  <DiagnosticCard key={c.id} criterion={c} />
                ))}
              </div>
            </div>
          </div>
        )}

        {activeView === 'sweep' && (
          <SensitivitySweep baseInputs={inputs} />
        )}

        {activeView === 'formulas' && (
          <FormulaLedger simulation={simulation} />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-[#090b12] py-4 text-xs font-mono text-slate-500 text-center">
        <div className="max-w-[1720px] mx-auto px-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            EUROKIN Consortium Standard for Gas-Solid Fixed-Bed Reactors (Delft University of Technology / Anaproc).
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <a
              href="https://eurokin.org"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-amber-400 flex items-center gap-1 transition-colors"
            >
              <span>eurokin.org</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <span>Python & Web Native</span>
            <span className="text-emerald-400 font-semibold">Ready for Advanced Multiphase / Fluidized Upgrades</span>
          </div>
        </div>
      </footer>

      {/* Audit Report & Export Modal */}
      {showExportModal && (
        <ReportExportModal
          simulation={simulation}
          onClose={() => setShowExportModal(false)}
        />
      )}
    </div>
  );
}

export default App;
