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
  const [resultsViewTab, setResultsViewTab] = useState<'all' | 'axial' | 'feasibility' | 'table'>('all');
  const [simulationLayoutMode, setSimulationLayoutMode] = useState<'stacked' | 'split'>('stacked');
  const [globalZoom, setGlobalZoom] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('simcat_global_zoom');
      return saved ? parseInt(saved, 10) : 100;
    } catch {
      return 100;
    }
  });

  const handleUpdateGlobalZoom = (zoom: number) => {
    setGlobalZoom(zoom);
    try {
      localStorage.setItem('simcat_global_zoom', zoom.toString());
    } catch {
      // ignore
    }
  };

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
        globalZoom={globalZoom}
        onChangeGlobalZoom={handleUpdateGlobalZoom}
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

        {/* Central Dynamic Scientific Workspace with Global Zoom Scaler */}
        <main
          className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-6 bg-slate-50 tech-grid-pattern transition-all duration-150"
          style={globalZoom !== 100 ? { zoom: globalZoom / 100 } : undefined}
        >
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

              {/* SECTION 2: REACTOR SETUP & OPERATING PARAMETERS */}
              {(activeSection === 'setup' || (activeSection as string) === 'operating') && (
                <div className="space-y-6 max-w-7xl mx-auto">
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

              {/* SECTION 3: CATALYST STUDIO */}
              {activeSection === 'catalyst' && (
                <div className="space-y-4 max-w-7xl mx-auto">
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

              {/* SECTION 5: SIMULATION & PLAYBACK */}
              {activeSection === 'simulation' && (
                <div className="space-y-4 max-w-7xl mx-auto">
                  {/* Top Bar with Layout Switcher */}
                  <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200/90 rounded-xl p-3 shadow-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                        <Activity className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-slate-800">
                          Simulation Studio & Axial Synchronization
                        </h3>
                        <p className="text-xs text-slate-500 font-sans">
                          Inspect finite difference solution vectors alongside the 3D fixed-bed reactor geometry.
                        </p>
                      </div>
                    </div>

                    {/* Layout switcher: Stacked vs Split */}
                    <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-mono">
                      <button
                        onClick={() => setSimulationLayoutMode('stacked')}
                        className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                          simulationLayoutMode === 'stacked'
                            ? 'bg-white text-blue-700 font-bold shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                        title="Stacked full-width layout for wide screens and maximum visibility"
                      >
                        Stacked (Full Width)
                      </button>
                      <button
                        onClick={() => setSimulationLayoutMode('split')}
                        className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                          simulationLayoutMode === 'split'
                            ? 'bg-white text-blue-700 font-bold shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                        title="Side-by-side 3D reactor and axial profile"
                      >
                        Split (Side-by-Side)
                      </button>
                    </div>
                  </div>

                  <SimulationWorkspace
                    simulation={simulation}
                    onRunSimulation={handleRunSimulation}
                    isSimulating={isSimulating}
                    simulationStage={simulationStage}
                    playbackState={playbackState}
                    onPlaybackChange={setPlaybackState}
                    onZNormalizedChange={handleZNormalizedChange}
                  />

                  {simulationLayoutMode === 'stacked' ? (
                    <div className="space-y-5">
                      <Reactor3D
                        simulation={simulation}
                        currentZNormalized={playbackState.currentZNormalized}
                        onZNormalizedChange={handleZNormalizedChange}
                        onSelectPellet={() => setShowMicroscopyView(true)}
                        className="h-[460px]"
                      />
                      <AxialCharts
                        simulation={simulation}
                        currentZNormalized={playbackState.currentZNormalized}
                        onZNormalizedChange={handleZNormalizedChange}
                      />
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
                      <div className="xl:col-span-5">
                        <Reactor3D
                          simulation={simulation}
                          currentZNormalized={playbackState.currentZNormalized}
                          onZNormalizedChange={handleZNormalizedChange}
                          onSelectPellet={() => setShowMicroscopyView(true)}
                          className="h-[440px]"
                        />
                      </div>
                      <div className="xl:col-span-7">
                        <AxialCharts
                          simulation={simulation}
                          currentZNormalized={playbackState.currentZNormalized}
                          onZNormalizedChange={handleZNormalizedChange}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* SECTION 6: TRANSPORT DIAGNOSTICS (EUROKIN PROTOCOL) */}
              {activeSection === 'diagnostics' && (
                <TransportDiagnosticsView simulation={simulation} />
              )}

              {/* SECTION 7: RESULTS EXPLORER */}
              {activeSection === 'results' && (
                <div className="space-y-4 max-w-7xl mx-auto">
                  {/* Results Top Control Bar */}
                  <div className="bg-white border border-slate-200/90 rounded-xl shadow-xs p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg shrink-0">
                        <LineChart className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                            Results Explorer & Diagnostics
                          </h2>
                          <span
                            className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded ${
                              simulation.overallStatus === 'VALID_INTRINSIC'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {simulation.overallStatus === 'VALID_INTRINSIC'
                              ? 'INTRINSIC REGIME (η ≥ 95%)'
                              : 'MASS TRANSFER INFLUENCE'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 font-sans mt-0.5">
                          Comprehensive Eurokin axial profile tracking, rate distribution, and mechanical reactor feasibility.
                        </p>
                      </div>
                    </div>

                    {/* View options & Canvas expander */}
                    <div className="flex flex-wrap items-center gap-2">
                      {/* View tab switcher */}
                      <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs font-medium border border-slate-200/80">
                        <button
                          onClick={() => setResultsViewTab('all')}
                          className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                            resultsViewTab === 'all'
                              ? 'bg-white text-blue-700 font-bold shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Complete View
                        </button>
                        <button
                          onClick={() => setResultsViewTab('axial')}
                          className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                            resultsViewTab === 'axial'
                              ? 'bg-white text-blue-700 font-bold shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Axial Profile
                        </button>
                        <button
                          onClick={() => setResultsViewTab('feasibility')}
                          className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                            resultsViewTab === 'feasibility'
                              ? 'bg-white text-blue-700 font-bold shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Feasibility
                        </button>
                        <button
                          onClick={() => setResultsViewTab('table')}
                          className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                            resultsViewTab === 'table'
                              ? 'bg-white text-blue-700 font-bold shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Data Table
                        </button>
                      </div>

                      {/* Expand / Collapse Inspector */}
                      <button
                        onClick={() => setIsInspectorOpen(!isInspectorOpen)}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg border flex items-center gap-1.5 transition-colors cursor-pointer ${
                          !isInspectorOpen
                            ? 'bg-blue-50 border-blue-200 text-blue-700'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                        title={isInspectorOpen ? "Collapse Inspector to widen Results Explorer" : "Restore Inspector panel"}
                      >
                        <span>{isInspectorOpen ? 'Maximize Width' : 'Show Inspector'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Summary Metric Ribbon */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2.5 text-xs">
                    <div className="bg-white border border-slate-200/90 rounded-lg p-2.5 shadow-2xs">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Bed Length L</span>
                      <span className="font-mono font-bold text-slate-900 text-sm">{(inputs.bedHeight * 1000).toFixed(0)} mm</span>
                      <span className="text-[10px] text-slate-500 block font-mono">D_tube = {(inputs.tubeDiameter * 1000).toFixed(1)} mm</span>
                    </div>

                    <div className="bg-white border border-slate-200/90 rounded-lg p-2.5 shadow-2xs">
                      <span className="text-[10px] uppercase font-bold text-amber-500 block">Hotspot Temperature</span>
                      <span className="font-mono font-bold text-amber-700 text-sm">{simulation.maxTemperature.toFixed(1)} K</span>
                      <span className="text-[10px] text-slate-500 block font-mono">at z = {(simulation.hotspotLocationZ * 1000).toFixed(1)} mm</span>
                    </div>

                    <div className="bg-white border border-slate-200/90 rounded-lg p-2.5 shadow-2xs">
                      <span className="text-[10px] uppercase font-bold text-sky-500 block">Total Pressure Drop</span>
                      <span className="font-mono font-bold text-sky-700 text-sm">{(simulation.totalDeltaP / 1e3).toFixed(1)} kPa</span>
                      <span className="text-[10px] text-slate-500 block font-mono">P_inlet = {(inputs.totalPressure / 1e5).toFixed(1)} bar</span>
                    </div>

                    <div className="bg-white border border-slate-200/90 rounded-lg p-2.5 shadow-2xs">
                      <span className="text-[10px] uppercase font-bold text-emerald-500 block">Outlet Conversion</span>
                      <span className="font-mono font-bold text-emerald-700 text-sm">{(simulation.outletConversion * 100).toFixed(2)}%</span>
                      <span className="text-[10px] text-slate-500 block font-mono">N₂ reacted single-pass</span>
                    </div>

                    <div className="bg-white border border-slate-200/90 rounded-lg p-2.5 shadow-2xs col-span-2 sm:col-span-4 lg:col-span-1">
                      <span className="text-[10px] uppercase font-bold text-purple-500 block">Commercial Rate</span>
                      <span className="font-mono font-bold text-purple-700 text-sm">{simulation.ammoniaProductionRateKgH.toFixed(2)} kg/h</span>
                      <span className="text-[10px] text-slate-500 block font-mono">pure NH₃ synthesized</span>
                    </div>
                  </div>

                  {/* Main Explorer Content based on View Tab */}
                  {(resultsViewTab === 'all' || resultsViewTab === 'axial') && (
                    <AxialCharts
                      simulation={simulation}
                      currentZNormalized={playbackState.currentZNormalized}
                      onZNormalizedChange={handleZNormalizedChange}
                    />
                  )}

                  {(resultsViewTab === 'all' || resultsViewTab === 'feasibility') && (
                    <ReactorSuggestionCard suitability={simulation.reactorSuitability} />
                  )}

                  {resultsViewTab === 'table' && (
                    <div className="bg-white border border-slate-200/90 rounded-xl shadow-xs overflow-hidden">
                      <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-bold text-slate-900">Numerical Axial Profile Discretization Table</h3>
                          <p className="text-xs text-slate-500">1D Finite difference solution slices along the packed bed depth.</p>
                        </div>
                        <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-1 rounded">
                          {simulation.axialProfiles.length} grid nodes
                        </span>
                      </div>
                      <div className="overflow-x-auto max-h-[460px]">
                        <table className="w-full text-left text-xs font-mono">
                          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 sticky top-0">
                            <tr>
                              <th className="p-2.5">z [mm]</th>
                              <th className="p-2.5">z/L [%]</th>
                              <th className="p-2.5">T [K]</th>
                              <th className="p-2.5">T [°C]</th>
                              <th className="p-2.5">P [bar]</th>
                              <th className="p-2.5">X_N₂ [%]</th>
                              <th className="p-2.5">y_NH₃ [%]</th>
                              <th className="p-2.5">r_obs [mol/(kg·s)]</th>
                              <th className="p-2.5">η [-]</th>
                              <th className="p-2.5">Φ [-]</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-slate-800">
                            {simulation.axialProfiles.map((pt, idx) => (
                              <tr
                                key={idx}
                                onClick={() => handleZNormalizedChange(pt.zNormalized)}
                                className={`cursor-pointer transition-colors hover:bg-blue-50/60 ${
                                  Math.abs(pt.zNormalized - playbackState.currentZNormalized) < 0.02
                                    ? 'bg-blue-100/70 font-bold text-blue-900'
                                    : ''
                                }`}
                              >
                                <td className="p-2.5">{(pt.z * 1000).toFixed(1)}</td>
                                <td className="p-2.5">{(pt.zNormalized * 100).toFixed(0)}%</td>
                                <td className="p-2.5 text-amber-700">{pt.temperature.toFixed(1)}</td>
                                <td className="p-2.5 text-slate-600">{(pt.temperature - 273.15).toFixed(1)}</td>
                                <td className="p-2.5 text-sky-700">{(pt.pressure / 1e5).toFixed(2)}</td>
                                <td className="p-2.5 text-emerald-700">{(pt.conversion * 100).toFixed(2)}%</td>
                                <td className="p-2.5 text-orange-700">{(pt.yNH3 * 100).toFixed(2)}%</td>
                                <td className="p-2.5">{pt.reactionRate < 0.001 ? pt.reactionRate.toExponential(2) : pt.reactionRate.toFixed(4)}</td>
                                <td className={`p-2.5 ${pt.effectiveness >= 0.95 ? 'text-emerald-700' : 'text-rose-700'}`}>
                                  {(pt.effectiveness * 100).toFixed(1)}%
                                </td>
                                <td className="p-2.5">{pt.weiszPrater.toFixed(3)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* SECTION 8: CATALYST COMPARISON */}
              {activeSection === 'comparison' && (
                <CatalystComparison
                  baseInputs={inputs}
                  baseResult={simulation}
                />
              )}

              {/* SECTION 9: VALIDATION LAB & CUSTOM FORMULAS */}
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
