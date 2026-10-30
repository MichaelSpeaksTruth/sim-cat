import React, { useState, useMemo } from 'react';
import { ReactorInputs, CustomCriterionDefinition } from './types/eurokin';
import { PRESET_SCENARIOS } from './lib/presets';
import { runEurokinSimulation } from './lib/eurokinEngine';
import { InputConsole } from './components/InputConsole';
import { ReactorVisualizer } from './components/ReactorVisualizer';
import { DiagnosticCard } from './components/DiagnosticCard';
import { ReactorSuggestionCard } from './components/ReactorSuggestionCard';
import { NistMappingView } from './components/NistMappingView';
import { CustomFormulaStudio } from './components/CustomFormulaStudio';
import { SensitivitySweep } from './components/SensitivitySweep';
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
  Database,
  Code2,
  Factory
} from 'lucide-react';

export function App() {
  // Default to standard Ammonia industrial baseline scenario
  const [inputs, setInputs] = useState<ReactorInputs>(PRESET_SCENARIOS[0].inputs);
  const [activeView, setActiveView] = useState<'assessment' | 'reactor_suggestion' | 'nist_data' | 'custom_formulas' | 'sweep'>('assessment');
  const [customCriteria, setCustomCriteria] = useState<CustomCriterionDefinition[]>([]);
  const [showExportModal, setShowExportModal] = useState(false);

  // Run simulation engine synchronously on any input or custom formula change
  const simulation = useMemo(() => {
    return runEurokinSimulation(inputs, customCriteria);
  }, [inputs, customCriteria]);

  const handleReset = () => {
    setInputs(PRESET_SCENARIOS[0].inputs);
  };

  const handleApplyNistProperties = (updatedProps: Partial<ReactorInputs>) => {
    setInputs((prev) => ({
      ...prev,
      ...updatedProps,
    }));
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-blue-600/20 selection:text-blue-900">
      {/* Top Engineering Nav Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 backdrop-blur-md bg-opacity-98 shadow-xs">
        <div className="max-w-[1720px] mx-auto px-4 lg:px-6 py-2.5 flex flex-wrap items-center justify-between gap-4">
          {/* Logo & Platform Info */}
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 shadow-2xs">
              <FlaskConical className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm tracking-wider uppercase text-blue-900">
                  SIM-CAT
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-100 text-blue-800 border border-blue-200">
                  AMMONIA (NH₃) SUITE
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-100 text-slate-600 border border-slate-200">
                  NIST SRD 69
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                Gas-Solid Fixed-Bed Intrinsic Kinetics Diagnostic & Transport Assessment Suite
              </p>
            </div>
          </div>

          {/* View Mode Navigation Tabs */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-mono">
            <button
              onClick={() => setActiveView('assessment')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeView === 'assessment'
                  ? 'bg-white text-blue-700 font-bold border border-slate-200 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Diagnostic Matrix</span>
            </button>

            <button
              onClick={() => setActiveView('reactor_suggestion')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeView === 'reactor_suggestion'
                  ? 'bg-white text-blue-700 font-bold border border-slate-200 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Factory className="w-3.5 h-3.5" />
              <span>Reactor Suitability</span>
            </button>

            <button
              onClick={() => setActiveView('nist_data')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeView === 'nist_data'
                  ? 'bg-white text-blue-700 font-bold border border-slate-200 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>NIST Data Mapping</span>
            </button>

            <button
              onClick={() => setActiveView('custom_formulas')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeView === 'custom_formulas'
                  ? 'bg-white text-blue-700 font-bold border border-slate-200 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Formula Audit & Custom Studio</span>
              {customCriteria.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-bold">
                  {customCriteria.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveView('sweep')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeView === 'sweep'
                  ? 'bg-white text-blue-700 font-bold border border-slate-200 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Sensitivity Sweeps</span>
            </button>
          </div>

          {/* Action Tools */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setShowExportModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-800 text-xs font-mono font-semibold border border-slate-300 shadow-2xs transition-colors"
            >
              <FileCheck2 className="w-3.5 h-3.5 text-blue-600" />
              <span>Audit & Export</span>
            </button>

            {/* Overall Status Pill */}
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold tracking-wide border shadow-2xs ${
                simulation.overallStatus === 'VALID_INTRINSIC'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : 'bg-rose-50 text-rose-800 border-rose-300'
              }`}
            >
              {simulation.overallStatus === 'VALID_INTRINSIC' ? (
                <>
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>INTRINSIC VALID ({simulation.passedCount}/{simulation.totalCount})</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>TRANSPORT LIMITED ({simulation.passedCount}/{simulation.totalCount})</span>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-[1720px] mx-auto px-4 lg:px-6 py-5 flex-1 w-full space-y-5">
        {/* FRONT PAGE REACTOR ARCHITECTURE & SUITABILITY ENGINE (Prominently placed at the top of Front Page & Assessment) */}
        {(activeView === 'assessment' || activeView === 'reactor_suggestion') && (
          <ReactorSuggestionCard suitability={simulation.reactorSuitability} />
        )}

        {/* View 1: Main Diagnostic Matrix */}
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
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-600" />
                  <h3 className="font-bold text-xs tracking-wider uppercase text-slate-800">
                    Intrinsic Kinetic Diagnostic Criteria ({simulation.criteria.length} Active Checks)
                  </h3>
                </div>
                <span className="text-xs font-mono text-slate-500">
                  Perturbation limit: &lt; 5% deviation on reaction rate
                </span>
              </div>

              {/* Diagnostic Criteria Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {simulation.criteria.map((c) => (
                  <DiagnosticCard key={c.id} criterion={c} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* View 2: Detailed Reactor Architecture View */}
        {activeView === 'reactor_suggestion' && (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
            <div className="xl:col-span-4 space-y-5">
              <InputConsole
                inputs={inputs}
                onChange={setInputs}
                onReset={handleReset}
              />
            </div>
            <div className="xl:col-span-8 space-y-5">
              <ReactorVisualizer simulation={simulation} />
            </div>
          </div>
        )}

        {/* View 3: NIST WebBook Data Mapping Ledger & Live Calculator */}
        {activeView === 'nist_data' && (
          <NistMappingView
            currentInputs={inputs}
            onApplyNistProperties={handleApplyNistProperties}
          />
        )}

        {/* View 4: Formula Audit & Custom Criteria Studio */}
        {activeView === 'custom_formulas' && (
          <CustomFormulaStudio
            customCriteria={customCriteria}
            onUpdateCriteria={setCustomCriteria}
            simulation={simulation}
          />
        )}

        {/* View 5: Sensitivity Sweeps */}
        {activeView === 'sweep' && (
          <SensitivitySweep baseInputs={inputs} />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-xs font-mono text-slate-500 text-center shadow-xs">
        <div className="max-w-[1720px] mx-auto px-4 flex flex-wrap items-center justify-between gap-3">
          <div className="text-slate-600">
            SIM-CAT Intrinsic Kinetics Diagnostic Suite • NIST Chemistry WebBook (SRD 69) Thermophysical Mapping
          </div>
          <div className="flex items-center gap-4 text-slate-600">
            <span>Ammonia Synthesis Benchmark Focus</span>
            <span className="text-emerald-700 font-semibold">Eurokin Protocol Compliant</span>
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
