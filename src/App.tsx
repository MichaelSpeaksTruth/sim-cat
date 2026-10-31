import React, { useState, useMemo, useCallback } from 'react';
import {
  ReactorInputs,
  CustomCriterionDefinition,
  NavigationSection,
  SimulationStage,
  PlaybackState,
} from './types/eurokin';
import { PRESET_SCENARIOS } from './lib/presets';
import { runEurokinSimulation } from './lib/eurokinEngine';

// Workstation Components
import { NavigationRail } from './components/NavigationRail';
import { WorkstationHeader } from './components/WorkstationHeader';
import { EngineeringInspector } from './components/EngineeringInspector';
import { Reactor3D } from './components/Reactor3D';
import { CatalystMicroscopy } from './components/CatalystMicroscopy';
import { AxialCharts } from './components/AxialCharts';
import { SimulationWorkspace } from './components/SimulationWorkspace';
import { CatalystComparison } from './components/CatalystComparison';
import { DiagnosticCard } from './components/DiagnosticCard';
import { ReactorSuggestionCard } from './components/ReactorSuggestionCard';
import { NistMappingView } from './components/NistMappingView';
import { CustomFormulaStudio } from './components/CustomFormulaStudio';
import { ReportExportModal } from './components/ReportExportModal';
import { InputConsole } from './components/InputConsole';
import { TransportDiagnosticsView } from './components/TransportDiagnosticsView';

import {
  Layers,
  Cpu,
  Flame,
  Wind,
  Gauge,
  Activity,
  LineChart,
  Split,
  FileCode2,
  CheckCircle2,
  AlertTriangle,
  ZoomIn,
  Sliders,
  Sparkles
} from 'lucide-react';

export function App() {
  // Primary state: Inputs and Presets
  const [inputs, setInputs] = useState<ReactorInputs>(PRESET_SCENARIOS[0].inputs);
  const [selectedPresetId, setSelectedPresetId] = useState<string>(PRESET_SCENARIOS[0].id);
  const [activeSection, setActiveSection] = useState<NavigationSection>('overview');

  // Simulation execution & lifecycle state
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationStage, setSimulationStage] = useState<SimulationStage>('completed');
  const [isDirty, setIsDirty] = useState(false);

  // Playback & Scrubber State
  const [playbackState, setPlaybackState] = useState<PlaybackState>({
    isPlaying: false,
    currentZNormalized: 0.35,
    speed: 1.0,
  });

  // UI Panels state
  const [isInspectorOpen, setIsInspectorOpen] = useState(true);
  const [isNavCollapsed, setIsNavCollapsed] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showMicroscopyView, setShowMicroscopyView] = useState(false);
  const [customCriteria, setCustomCriteria] = useState<CustomCriterionDefinition[]>([]);

  // Calculate simulation result
  const simulation = useMemo(() => {
    return runEurokinSimulation(inputs, customCriteria);
  }, [inputs, customCriteria]);

  // Handle Input Changes with dirty state tracking
  const handleUpdateInputs = (updated: ReactorInputs) => {
    setInputs(updated);
    setIsDirty(true);
  };

  const handleUpdateSingleField = (field: keyof ReactorInputs, value: number) => {
    setInputs((prev) => ({
      ...prev,
      [field]: value,
    }));
    setIsDirty(true);
  };

  const handleSelectPreset = (presetId: string) => {
    setSelectedPresetId(presetId);
    const found = PRESET_SCENARIOS.find((p) => p.id === presetId);
    if (found) {
      setInputs({ ...found.inputs });
      setIsDirty(false);
    }
  };

  const handleReset = () => {
    setInputs({ ...PRESET_SCENARIOS[0].inputs });
    setSelectedPresetId(PRESET_SCENARIOS[0].id);
    setIsDirty(false);
  };

  // Run Simulation with staged lifecycle
  const handleRunSimulation = useCallback(() => {
    setIsSimulating(true);
    setSimulationStage('validating');

    setTimeout(() => {
      setSimulationStage('initializing');
      setTimeout(() => {
        setSimulationStage('evaluating_properties');
        setTimeout(() => {
          setSimulationStage('integrating');
          setTimeout(() => {
            setSimulationStage('checking_convergence');
            setTimeout(() => {
              setSimulationStage('generating_results');
              setTimeout(() => {
                setSimulationStage('completed');
                setIsSimulating(false);
                setIsDirty(false);
              }, 180);
            }, 180);
          }, 240);
        }, 180);
      }, 160);
    }, 150);
  }, []);

  const handleZNormalizedChange = (zNorm: number) => {
    setPlaybackState((prev) => ({ ...prev, currentZNormalized: zNorm }));
  };

  return (
    <div className="h-screen w-screen bg-slate-50 text-slate-900 flex flex-col font-sans overflow-hidden selection:bg-blue-500/20 selection:text-blue-700">
      {/* 1. Top Industrial Engineering Workstation Header */}
      <WorkstationHeader
        simulation={simulation}
        selectedPresetId={selectedPresetId}
        onSelectPreset={handleSelectPreset}
        onRunSimulation={handleRunSimulation}
        isSimulating={isSimulating}
        simulationStage={simulationStage}
        isDirty={isDirty}
        onReset={handleReset}
        onOpenExport={() => setShowExportModal(true)}
        onOpenInspector={() => setIsInspectorOpen(!isInspectorOpen)}
        isInspectorOpen={isInspectorOpen}
      />

      {/* 2. Main Workstation Body: Navigation Rail + Central Canvas + Right Inspector */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Vertical Navigation Rail */}
        <NavigationRail
          activeSection={activeSection}
          onSelectSection={(sec) => {
            setActiveSection(sec);
            setShowMicroscopyView(false);
          }}
          isCollapsed={isNavCollapsed}
          onToggleCollapse={() => setIsNavCollapsed(!isNavCollapsed)}
          overallStatus={simulation.overallStatus}
          passedCount={simulation.passedCount}
          totalCount={simulation.totalCount}
          isDirty={isDirty}
        />

        {/* Central Dynamic Scientific Workspace */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-6 bg-slate-50 tech-grid-pattern">
          {/* Modal / High-Magnification Pellet Inspection Override */}
          {showMicroscopyView ? (
            <CatalystMicroscopy
              simulation={simulation}
              onClose={() => setShowMicroscopyView(false)}
            />
          ) : (
            <>
              {/* SECTION 1: OVERVIEW & 3D REACTOR */}
              {activeSection === 'overview' && (
                <div className="space-y-6 max-w-7xl mx-auto">
                  {/* Centerpiece 3D WebGL Fixed-Bed Reactor */}
                  <Reactor3D
                    simulation={simulation}
                    currentZNormalized={playbackState.currentZNormalized}
                    onZNormalizedChange={handleZNormalizedChange}
                    onSelectPellet={() => setShowMicroscopyView(true)}
                    className="h-[460px] lg:h-[500px]"
                  />

                  {/* Synchronized 1D Axial Profile Explorer */}
                  <AxialCharts
                    simulation={simulation}
                    currentZNormalized={playbackState.currentZNormalized}
                    onZNormalizedChange={handleZNormalizedChange}
                  />

                  {/* Architectural Feasibility Bar */}
                  <ReactorSuggestionCard suitability={simulation.reactorSuitability} />
                </div>
              )}

              {/* SECTION 2: REACTOR SETUP & GEOMETRY */}
              {activeSection === 'setup' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-7xl mx-auto">
                  <div className="lg:col-span-6 space-y-4">
                    <InputConsole
                      inputs={inputs}
                      onChange={handleUpdateInputs}
                      onReset={handleReset}
                      isDirty={isDirty}
                    />
                  </div>
                  <div className="lg:col-span-6 space-y-4">
                    <Reactor3D
                      simulation={simulation}
                      currentZNormalized={playbackState.currentZNormalized}
                      onZNormalizedChange={handleZNormalizedChange}
                      onSelectPellet={() => setShowMicroscopyView(true)}
                      className="h-[520px]"
                    />
                  </div>
                </div>
              )}

              {/* SECTION 3: CATALYST STUDIO */}
              {activeSection === 'catalyst' && (
                <div className="space-y-6 max-w-7xl mx-auto">
                  <div className="bg-white border border-slate-200/90 rounded-xl shadow-xs p-4 flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-mono font-bold uppercase text-slate-800 flex items-center gap-2">
                        <Layers className="w-4 h-4 text-blue-600" />
                        <span>Catalyst Studio & Pellet Morphology</span>
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Promoted Magnetite (K₂O-Al₂O₃-CaO) active iron crystallites.
                      </p>
                    </div>

                    <button
                      onClick={() => setShowMicroscopyView(true)}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-mono text-xs font-semibold rounded-lg shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                      <span>Inspect Microscopic Pore Cutaway</span>
                    </button>
                  </div>

                  <CatalystMicroscopy simulation={simulation} />
                </div>
              )}

              {/* SECTION 4: FEED CONFIGURATION & NIST THERMOPHYSICS */}
              {activeSection === 'feed' && (
                <NistMappingView
                  currentInputs={inputs}
                  onApplyNistProperties={(updated) => handleUpdateInputs({ ...inputs, ...updated })}
                />
              )}

              {/* SECTION 5: OPERATING CONDITIONS */}
              {activeSection === 'operating' && (
                <div className="space-y-4">
                  <InputConsole
                    inputs={inputs}
                    onChange={handleUpdateInputs}
                    onReset={handleReset}
                    isDirty={isDirty}
                  />
                  <AxialCharts
                    simulation={simulation}
                    currentZNormalized={playbackState.currentZNormalized}
                    onZNormalizedChange={handleZNormalizedChange}
                  />
                </div>
              )}

              {/* SECTION 6: SIMULATION & PLAYBACK */}
              {activeSection === 'simulation' && (
                <div className="space-y-4">
                  <SimulationWorkspace
                    simulation={simulation}
                    onRunSimulation={handleRunSimulation}
                    isSimulating={isSimulating}
                    simulationStage={simulationStage}
                    playbackState={playbackState}
                    onPlaybackChange={setPlaybackState}
                    onZNormalizedChange={handleZNormalizedChange}
                  />

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                    <div className="lg:col-span-6">
                      <Reactor3D
                        simulation={simulation}
                        currentZNormalized={playbackState.currentZNormalized}
                        onZNormalizedChange={handleZNormalizedChange}
                        onSelectPellet={() => setShowMicroscopyView(true)}
                        className="h-[440px]"
                      />
                    </div>
                    <div className="lg:col-span-6">
                      <AxialCharts
                        simulation={simulation}
                        currentZNormalized={playbackState.currentZNormalized}
                        onZNormalizedChange={handleZNormalizedChange}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION 7: TRANSPORT DIAGNOSTICS (EUROKIN PROTOCOL) */}
              {activeSection === 'diagnostics' && (
                <TransportDiagnosticsView simulation={simulation} />
              )}

              {/* SECTION 8: RESULTS EXPLORER */}
              {activeSection === 'results' && (
                <div className="space-y-4">
                  <AxialCharts
                    simulation={simulation}
                    currentZNormalized={playbackState.currentZNormalized}
                    onZNormalizedChange={handleZNormalizedChange}
                  />
                  <ReactorSuggestionCard suitability={simulation.reactorSuitability} />
                </div>
              )}

              {/* SECTION 9: CATALYST COMPARISON */}
              {activeSection === 'comparison' && (
                <CatalystComparison
                  baseInputs={inputs}
                  baseResult={simulation}
                />
              )}

              {/* SECTION 10: VALIDATION LAB & CUSTOM FORMULAS */}
              {activeSection === 'validation' && (
                <CustomFormulaStudio
                  customCriteria={customCriteria}
                  onUpdateCriteria={setCustomCriteria}
                  simulation={simulation}
                />
              )}
            </>
          )}
        </main>

        {/* Right Collapsible Engineering Inspector */}
        <EngineeringInspector
          simulation={simulation}
          inputs={inputs}
          onUpdateInput={handleUpdateSingleField}
          isOpen={isInspectorOpen}
          onToggle={() => setIsInspectorOpen(!isInspectorOpen)}
          isDirty={isDirty}
        />
      </div>

      {/* Modal: Diagnostic Report & Audit Export */}
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
