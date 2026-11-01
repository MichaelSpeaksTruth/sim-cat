import React, { useState } from 'react';
import { AxialProfilePoint, SimulationResult } from '../types/eurokin';
import {
  LineChart,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  ZoomIn,
  ZoomOut,
  Info,
} from 'lucide-react';

interface AxialChartsProps {
  simulation: SimulationResult;
  currentZNormalized: number;
  onZNormalizedChange: (zNorm: number) => void;
  initialZoom?: number;
}

export const AxialCharts: React.FC<AxialChartsProps> = ({
  simulation,
  currentZNormalized,
  onZNormalizedChange,
  initialZoom = 100,
}) => {
  const { axialProfiles, inputs } = simulation;
  const [activeMetric, setActiveMetric] = useState<'temperature' | 'pressure' | 'species' | 'rate' | 'effectiveness'>('temperature');
  const [showN2, setShowN2] = useState(true);
  const [showH2, setShowH2] = useState(true);
  const [showNH3, setShowNH3] = useState(true);
  const [showGuide, setShowGuide] = useState(false);
  const [zoomScale, setZoomScale] = useState<number>(initialZoom);
  const [compactChart, setCompactChart] = useState<boolean>(false);

  if (!axialProfiles || axialProfiles.length === 0) {
    return (
      <div className="p-8 text-center bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-500">
        No numerical solution data available. Run simulation to generate 1D axial profiles.
      </div>
    );
  }

  // Find currently selected point closest to currentZNormalized
  const targetIndex = Math.min(
    axialProfiles.length - 1,
    Math.max(0, Math.floor(currentZNormalized * (axialProfiles.length - 1)))
  );
  const currentPoint = axialProfiles[targetIndex];

  // SVG Chart Dimensions
  const svgWidth = 840;
  const svgHeight = compactChart ? 210 : 260;
  const margin = { top: 25, right: 35, bottom: 40, left: 65 };
  const plotWidth = svgWidth - margin.left - margin.right;
  const plotHeight = svgHeight - margin.top - margin.bottom;

  // Coordinate projection helpers
  const scaleX = (zNorm: number) => margin.left + zNorm * plotWidth;

  // Chart data bounds
  let minY = 0;
  let maxY = 1;
  let yUnit = '';
  let yLabel = '';

  if (activeMetric === 'temperature') {
    const allT = axialProfiles.map((p) => p.temperature);
    minY = Math.floor(Math.min(...allT) - 5);
    maxY = Math.ceil(Math.max(...allT) + 5);
    yUnit = 'K';
    yLabel = 'Temperature T(z) [K]';
  } else if (activeMetric === 'pressure') {
    const allP = axialProfiles.map((p) => p.pressure / 1e5); // bar
    minY = Math.floor(Math.min(...allP) - 0.2);
    maxY = Math.ceil(Math.max(...allP) + 0.2);
    yUnit = 'bar';
    yLabel = 'Total Pressure P(z) [bar]';
  } else if (activeMetric === 'species') {
    minY = 0.0;
    maxY = 0.85;
    yUnit = '[-]';
    yLabel = 'Gas Mole Fraction y_i(z)';
  } else if (activeMetric === 'rate') {
    const allR = axialProfiles.map((p) => p.reactionRate);
    minY = 0.0;
    maxY = Math.max(...allR) * 1.15;
    yUnit = 'mol/(kg·s)';
    yLabel = 'Observed Rate r_obs(z)';
  } else if (activeMetric === 'effectiveness') {
    minY = 0.85;
    maxY = 1.02;
    yUnit = '[-]';
    yLabel = 'Pellet Effectiveness Factor η(z)';
  }

  const scaleY = (val: number) => {
    const clamped = Math.max(minY, Math.min(maxY, val));
    return margin.top + plotHeight - ((clamped - minY) / (maxY - minY || 1)) * plotHeight;
  };

  // Generate path strings
  const generatePath = (getValue: (p: AxialProfilePoint) => number) => {
    return axialProfiles
      .map((p, idx) => {
        const x = scaleX(p.zNormalized);
        const y = scaleY(getValue(p));
        return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left - margin.left;
    const fraction = Math.max(0, Math.min(1, mouseX / plotWidth));
    onZNormalizedChange(fraction);
  };

  const currentX = scaleX(currentZNormalized);

  // Tab descriptions
  const metricDescriptions = {
    temperature: {
      headline: 'Bed Temperature Profile T(z)',
      details: `Inlet T = ${inputs.temperature.toFixed(0)} K, Wall Twall = ${(inputs.wallTemperature ?? inputs.temperature - 15).toFixed(0)} K. Exothermic heat release creates axial hot-spot peak.`,
      color: 'text-amber-700',
    },
    species: {
      headline: 'Reactant & Product Mole Fractions y_i(z)',
      details: 'Stoichiometric consumption of H₂ and N₂ coupled with synthetic generation of NH₃ along the bed depth.',
      color: 'text-blue-700',
    },
    rate: {
      headline: 'Observed Reaction Rate r_obs(z)',
      details: 'Local reaction rate in mol/(kg-cat·s) evaluated via Eurokin LHHW kinetic rate law multiplied by intraparticle effectiveness η.',
      color: 'text-emerald-700',
    },
    pressure: {
      headline: 'Fluid Pressure Drop P(z)',
      details: 'Axial static pressure profile governed by Ergun hydrodynamic packed bed equation.',
      color: 'text-sky-700',
    },
    effectiveness: {
      headline: 'Pellet Internal Effectiveness Factor η(z)',
      details: 'Ratio of observed rate to rate without pore diffusion limitation. Eurokin standard requires η ≥ 0.95 (95%) for intrinsic kinetic validity.',
      color: 'text-purple-700',
    },
  }[activeMetric];

  return (
    <div
      className="bg-white border border-slate-200/90 rounded-xl shadow-xs p-4 sm:p-5 lg:p-6 space-y-4 transition-all duration-150"
      style={zoomScale !== 100 ? { transform: `scale(${zoomScale / 100})`, transformOrigin: 'top left', width: `${(100 / zoomScale) * 100}%` } : undefined}
    >
      {/* 1. Header with Controls & Metric Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3.5 border-b border-slate-200/80">
        <div className="flex items-start sm:items-center gap-3">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg shrink-0 mt-0.5 sm:mt-0">
            <LineChart className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">
                Synchronized Reactor Axial Profile
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold border border-slate-200">
                1D Heterogeneous Solver
              </span>
            </div>
            <p className="text-xs text-slate-500 font-sans mt-0.5">
              Interactive cursor synchronizes bed depth <code className="font-mono text-blue-700 font-semibold">z</code> with local temperature, kinetics, species, and effectiveness.
            </p>
          </div>
        </div>

        {/* Action Controls: Zoom buttons + Metric Guide Toggle */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Zoom Controls */}
          <div className="flex items-center bg-slate-100 border border-slate-200 rounded-lg p-0.5 text-xs font-mono">
            <button
              onClick={() => setZoomScale((prev) => Math.max(75, prev - 10))}
              className="p-1 hover:bg-white text-slate-600 hover:text-slate-900 rounded transition-colors cursor-pointer"
              title="Zoom Out (Fit more on screen)"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoomScale(100)}
              className="px-1.5 py-0.5 text-[11px] font-semibold text-slate-700 hover:bg-white rounded transition-colors cursor-pointer"
              title="Reset Zoom to 100%"
            >
              {zoomScale}%
            </button>
            <button
              onClick={() => setZoomScale((prev) => Math.min(120, prev + 10))}
              className="p-1 hover:bg-white text-slate-600 hover:text-slate-900 rounded transition-colors cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Compact Chart Toggle */}
          <button
            onClick={() => setCompactChart(!compactChart)}
            className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
              compactChart
                ? 'bg-blue-50 border-blue-200 text-blue-700 font-semibold'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
            title="Toggle compact chart height to save vertical screen space"
          >
            {compactChart ? 'Compact Height' : 'Standard Height'}
          </button>

          {/* Metric Guide Glossary Toggle */}
          <button
            onClick={() => setShowGuide(!showGuide)}
            className={`px-2.5 py-1 text-xs font-medium rounded-lg border flex items-center gap-1.5 transition-colors cursor-pointer ${
              showGuide
                ? 'bg-blue-600 border-blue-600 text-white font-semibold shadow-xs'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
            title="Explain all metrics, formulas, and Eurokin benchmarks"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Metrics Guide</span>
            {showGuide ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Metric Switcher Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center overflow-x-auto no-scrollbar gap-1 bg-slate-100 rounded-lg p-1 text-xs font-medium border border-slate-200/80 shrink-0">
          <button
            onClick={() => setActiveMetric('temperature')}
            className={`px-2.5 py-1.5 rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              activeMetric === 'temperature'
                ? 'bg-white text-amber-700 font-bold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Temperature
          </button>
          <button
            onClick={() => setActiveMetric('species')}
            className={`px-2.5 py-1.5 rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              activeMetric === 'species'
                ? 'bg-white text-blue-700 font-bold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Species
          </button>
          <button
            onClick={() => setActiveMetric('rate')}
            className={`px-2.5 py-1.5 rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              activeMetric === 'rate'
                ? 'bg-white text-emerald-700 font-bold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Rate & Conversion
          </button>
          <button
            onClick={() => setActiveMetric('pressure')}
            className={`px-2.5 py-1.5 rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              activeMetric === 'pressure'
                ? 'bg-white text-sky-700 font-bold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Pressure
          </button>
          <button
            onClick={() => setActiveMetric('effectiveness')}
            className={`px-2.5 py-1.5 rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              activeMetric === 'effectiveness'
                ? 'bg-white text-purple-700 font-bold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Effectiveness
          </button>
        </div>

        {/* Tab Context Banner */}
        <div className="text-xs text-slate-600 flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/70 min-w-0 overflow-hidden">
          <span className={`font-bold shrink-0 ${metricDescriptions.color}`}>{metricDescriptions.headline}:</span>
          <span className="text-slate-500 font-sans truncate">{metricDescriptions.details}</span>
        </div>
      </div>

      {/* Expandable Metrics Glossary & Guide */}
      {showGuide && (
        <div className="p-4 bg-slate-50 border border-blue-200 rounded-xl space-y-3 transition-all animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
              <Info className="w-4 h-4 text-blue-600" />
              <span>What do the Result Explorer metrics stand for?</span>
            </h4>
            <span className="text-[11px] font-mono text-slate-500">Eurokin Consortium Protocol Reference</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 text-xs">
            <div className="p-3 bg-white rounded-lg border border-slate-200/90 shadow-2xs space-y-1">
              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-600" />
                <span>Axial Position (z)</span>
              </div>
              <p className="text-slate-600 leading-relaxed text-[11px]">
                Physical distance from reactor inlet (z = 0) to bed outlet (z = L). Synchronized in real-time across the 3D model and diagnostic calculations.
              </p>
              <div className="text-[10px] font-mono text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                Unit: mm or % of bed length
              </div>
            </div>

            <div className="p-3 bg-white rounded-lg border border-slate-200/90 shadow-2xs space-y-1">
              <div className="font-bold text-amber-800 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-600" />
                <span>Bed Temperature T(z)</span>
              </div>
              <p className="text-slate-600 leading-relaxed text-[11px]">
                Bulk fluid & pellet temperature. Ammonia synthesis is strongly exothermic (ΔH ≈ -46 kJ/mol). Wall cooling prevents thermal runaway and catalyst sintering.
              </p>
              <div className="text-[10px] font-mono text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                Unit: Kelvin [K] and Celsius [°C]
              </div>
            </div>

            <div className="p-3 bg-white rounded-lg border border-slate-200/90 shadow-2xs space-y-1">
              <div className="font-bold text-sky-800 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-sky-600" />
                <span>Total Pressure P(z)</span>
              </div>
              <p className="text-slate-600 leading-relaxed text-[11px]">
                Local static gas pressure. Decreases from inlet along the bed due to fluid friction through catalyst voids, computed with the Ergun equation.
              </p>
              <div className="text-[10px] font-mono text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded">
                Unit: bar and ΔP in kPa
              </div>
            </div>

            <div className="p-3 bg-white rounded-lg border border-slate-200/90 shadow-2xs space-y-1">
              <div className="font-bold text-emerald-800 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-600" />
                <span>N₂ Conversion (X)</span>
              </div>
              <p className="text-slate-600 leading-relaxed text-[11px]">
                Single-pass fractional conversion of feed nitrogen reactant: X = (F_N2,in - F_N2) / F_N2,in. Reaches equilibrium near bed exit.
              </p>
              <div className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                Unit: Percentage [%]
              </div>
            </div>

            <div className="p-3 bg-white rounded-lg border border-slate-200/90 shadow-2xs space-y-1">
              <div className="font-bold text-amber-800 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-600" />
                <span>Ammonia Mole Fraction (y_NH₃)</span>
              </div>
              <p className="text-slate-600 leading-relaxed text-[11px]">
                Molar fraction of synthesized ammonia in the gas stream: y_NH₃ = n_NH₃ / n_total. Increases monotonically with bed depth.
              </p>
              <div className="text-[10px] font-mono text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                Unit: mol% or fraction [-]
              </div>
            </div>

            <div className="p-3 bg-white rounded-lg border border-slate-200/90 shadow-2xs space-y-1">
              <div className="font-bold text-slate-800 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-slate-600" />
                <span>Reaction Rate (r_obs)</span>
              </div>
              <p className="text-slate-600 leading-relaxed text-[11px]">
                Local observed mass reaction rate per kg of catalyst, taking into account Eurokin Langmuir-Hinshelwood kinetics and internal diffusion: r_obs = η · r_intrinsic.
              </p>
              <div className="text-[10px] font-mono text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                Unit: mol / (kg-cat · s)
              </div>
            </div>

            <div className="p-3 bg-white rounded-lg border border-purple-200 shadow-2xs space-y-1 col-span-1 md:col-span-2">
              <div className="font-bold text-purple-900 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-purple-600" />
                  <span>Pellet Effectiveness Factor η(z) & Weisz-Prater Φ</span>
                </span>
                <span className="px-2 py-0.2 bg-emerald-100 text-emerald-800 font-mono text-[10px] font-semibold rounded">
                  Benchmark: η ≥ 0.95 (95%)
                </span>
              </div>
              <p className="text-slate-600 leading-relaxed text-[11px]">
                The internal effectiveness factor η is the key Eurokin metric. When <strong>η ≥ 0.95</strong>, internal pore diffusion resistance is negligible and the catalyst pellet operates in the pure intrinsic chemical regime. The Weisz-Prater modulus Φ evaluates pore diffusion; when <strong>Φ &lt; 1</strong>, intraparticle mass transfer does not limit the rate.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 2. Main SVG Scientific Chart */}
      <div className="relative bg-slate-50/70 border border-slate-200/80 rounded-lg overflow-hidden">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto cursor-crosshair select-none"
          onMouseMove={handleMouseMove}
        >
          {/* Horizontal Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1.0].map((frac, idx) => {
            const y = margin.top + frac * plotHeight;
            const val = maxY - frac * (maxY - minY);
            return (
              <g key={idx}>
                <line
                  x1={margin.left}
                  y1={y}
                  x2={margin.left + plotWidth}
                  y2={y}
                  stroke="#E2E8F0"
                  strokeWidth="1"
                  strokeDasharray="2 2"
                />
                <text
                  x={margin.left - 8}
                  y={y + 3}
                  textAnchor="end"
                  fill="#64748B"
                  fontSize="9"
                  fontFamily="monospace"
                >
                  {val >= 1000 ? val.toFixed(0) : val.toFixed(activeMetric === 'rate' ? 5 : 2)}
                </text>
              </g>
            );
          })}

          {/* Vertical Grid lines along bed length z/L */}
          {[0, 0.2, 0.4, 0.6, 0.8, 1.0].map((frac, idx) => {
            const x = margin.left + frac * plotWidth;
            const zMeters = (frac * inputs.bedHeight * 1000).toFixed(0);
            return (
              <g key={idx}>
                <line
                  x1={x}
                  y1={margin.top}
                  x2={x}
                  y2={margin.top + plotHeight}
                  stroke="#E2E8F0"
                  strokeWidth="1"
                  strokeDasharray="2 2"
                />
                <text
                  x={x}
                  y={margin.top + plotHeight + 16}
                  textAnchor="middle"
                  fill="#64748B"
                  fontSize="9"
                  fontFamily="monospace"
                >
                  {zMeters} mm
                </text>
              </g>
            );
          })}

          {/* Axis Labels */}
          <text
            x={margin.left + plotWidth / 2}
            y={svgHeight - 8}
            textAnchor="middle"
            fill="#64748B"
            fontSize="10"
            fontFamily="monospace"
          >
            Axial Bed Coordinate z [mm] (Inlet z = 0 → Outlet z = L)
          </text>

          <text
            x={-margin.top - plotHeight / 2}
            y={18}
            transform="rotate(-90)"
            textAnchor="middle"
            fill="#64748B"
            fontSize="10"
            fontFamily="monospace"
          >
            {yLabel}
          </text>

          {/* Metric Curves */}
          {activeMetric === 'temperature' && (
            <g>
              {/* Wall Temperature Reference Line */}
              <line
                x1={margin.left}
                y1={scaleY(inputs.wallTemperature ?? inputs.temperature - 15)}
                x2={margin.left + plotWidth}
                y2={scaleY(inputs.wallTemperature ?? inputs.temperature - 15)}
                stroke="#94A3B8"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
              <text
                x={margin.left + plotWidth - 4}
                y={scaleY(inputs.wallTemperature ?? inputs.temperature - 15) - 4}
                textAnchor="end"
                fill="#64748B"
                fontSize="8"
                fontFamily="monospace"
              >
                Cooling Wall Twall = {(inputs.wallTemperature ?? inputs.temperature - 15).toFixed(0)} K
              </text>

              {/* Temperature Profile */}
              <path
                d={generatePath((p) => p.temperature)}
                fill="none"
                stroke="#D97706"
                strokeWidth="2.5"
              />
            </g>
          )}

          {activeMetric === 'pressure' && (
            <path
              d={generatePath((p) => p.pressure / 1e5)}
              fill="none"
              stroke="#0284C7"
              strokeWidth="2.5"
            />
          )}

          {activeMetric === 'species' && (
            <g>
              {showH2 && (
                <path
                  d={generatePath((p) => p.yH2)}
                  fill="none"
                  stroke="#475569"
                  strokeWidth="2"
                />
              )}
              {showN2 && (
                <path
                  d={generatePath((p) => p.yN2)}
                  fill="none"
                  stroke="#2563EB"
                  strokeWidth="2"
                />
              )}
              {showNH3 && (
                <path
                  d={generatePath((p) => p.yNH3)}
                  fill="none"
                  stroke="#D97706"
                  strokeWidth="2.5"
                />
              )}
            </g>
          )}

          {activeMetric === 'rate' && (
            <g>
              <path
                d={generatePath((p) => p.reactionRate)}
                fill="none"
                stroke="#059669"
                strokeWidth="2.5"
              />
            </g>
          )}

          {activeMetric === 'effectiveness' && (
            <g>
              {/* 95% Eurokin intrinsic limit reference */}
              <line
                x1={margin.left}
                y1={scaleY(0.95)}
                x2={margin.left + plotWidth}
                y2={scaleY(0.95)}
                stroke="#059669"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
              <text
                x={margin.left + plotWidth - 4}
                y={scaleY(0.95) - 4}
                textAnchor="end"
                fill="#059669"
                fontSize="8"
                fontFamily="monospace"
              >
                Eurokin Intrinsic Threshold η = 0.95 (95%)
              </text>

              <path
                d={generatePath((p) => p.effectiveness)}
                fill="none"
                stroke="#7C3AED"
                strokeWidth="2.5"
              />
            </g>
          )}

          {/* Synchronized Vertical Cursor Plane */}
          <line
            x1={currentX}
            y1={margin.top}
            x2={currentX}
            y2={margin.top + plotHeight}
            stroke="#2563EB"
            strokeWidth="1.5"
          />

          {/* Current Position Marker Circle */}
          <circle
            cx={currentX}
            cy={
              activeMetric === 'temperature'
                ? scaleY(currentPoint.temperature)
                : activeMetric === 'pressure'
                ? scaleY(currentPoint.pressure / 1e5)
                : activeMetric === 'species'
                ? scaleY(currentPoint.yNH3)
                : activeMetric === 'rate'
                ? scaleY(currentPoint.reactionRate)
                : scaleY(currentPoint.effectiveness)
            }
            r="4.5"
            fill="#2563EB"
            stroke="#FFFFFF"
            strokeWidth="2"
          />
        </svg>

        {/* Legend for Species */}
        {activeMetric === 'species' && (
          <div className="absolute top-2 right-2 px-3 py-1.5 bg-white/95 border border-slate-200/90 rounded-lg shadow-xs flex items-center gap-3 text-[11px] font-mono select-none">
            <button
              onClick={() => setShowNH3(!showNH3)}
              className={`flex items-center gap-1.5 cursor-pointer ${showNH3 ? 'text-amber-700 font-semibold' : 'text-slate-400 line-through'}`}
            >
              <span className="w-2.5 h-1 rounded bg-[#D97706]" />
              <span>y_NH₃ (Product)</span>
            </button>
            <button
              onClick={() => setShowH2(!showH2)}
              className={`flex items-center gap-1.5 cursor-pointer ${showH2 ? 'text-slate-700 font-semibold' : 'text-slate-400 line-through'}`}
            >
              <span className="w-2.5 h-1 rounded bg-[#475569]" />
              <span>y_H₂ (Reactant)</span>
            </button>
            <button
              onClick={() => setShowN2(!showN2)}
              className={`flex items-center gap-1.5 cursor-pointer ${showN2 ? 'text-blue-700 font-semibold' : 'text-slate-400 line-through'}`}
            >
              <span className="w-2.5 h-1 rounded bg-[#2563EB]" />
              <span>y_N₂ (Reactant)</span>
            </button>
          </div>
        )}
      </div>

      {/* 3. Fully Visible, Un-truncated Metric Cards Grid */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-500">
            Local Bed Slice Inspection at z = {(currentPoint.z * 1000).toFixed(1)} mm ({(currentPoint.zNormalized * 100).toFixed(1)}% L)
          </span>
          <span className="text-[11px] text-slate-400 font-sans hidden sm:inline">
            Drag or click chart to scan axial coordinates
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '0.625rem' }}>
          {/* Card 1: Axial Position */}
          <div className="bg-slate-50 hover:bg-slate-100/80 border border-slate-200/90 rounded-lg p-3 transition-colors flex flex-col justify-between border-l-4 border-l-blue-500">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-tight">
                Axial Position
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-blue-100 text-blue-700 font-bold">
                z
              </span>
            </div>
            <div className="my-1.5">
              <span className="text-base sm:text-lg font-black font-mono text-slate-900 whitespace-nowrap">
                {(currentPoint.z * 1000).toFixed(1)}
              </span>
              <span className="text-xs font-bold text-slate-500 ml-1 font-sans">mm</span>
            </div>
            <div className="text-[11px] font-mono text-blue-700 font-semibold whitespace-nowrap">
              {(currentPoint.zNormalized * 100).toFixed(1)}% of Bed
            </div>
          </div>

          {/* Card 2: Bed Temperature */}
          <div className="bg-slate-50 hover:bg-slate-100/80 border border-slate-200/90 rounded-lg p-3 transition-colors flex flex-col justify-between border-l-4 border-l-amber-500">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-tight">
                Temperature
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-bold">
                T(z)
              </span>
            </div>
            <div className="my-1.5">
              <span className="text-base sm:text-lg font-black font-mono text-amber-700 whitespace-nowrap">
                {currentPoint.temperature.toFixed(1)}
              </span>
              <span className="text-xs font-bold text-amber-600 ml-1 font-sans">K</span>
            </div>
            <div className="text-[11px] font-mono text-slate-600 font-medium whitespace-nowrap">
              {(currentPoint.temperature - 273.15).toFixed(1)} °C
            </div>
          </div>

          {/* Card 3: Total Pressure */}
          <div className="bg-slate-50 hover:bg-slate-100/80 border border-slate-200/90 rounded-lg p-3 transition-colors flex flex-col justify-between border-l-4 border-l-sky-500">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-tight">
                Pressure
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-sky-100 text-sky-800 font-bold">
                P(z)
              </span>
            </div>
            <div className="my-1.5">
              <span className="text-base sm:text-lg font-black font-mono text-sky-700 whitespace-nowrap">
                {(currentPoint.pressure / 1e5).toFixed(2)}
              </span>
              <span className="text-xs font-bold text-sky-600 ml-1 font-sans">bar</span>
            </div>
            <div className="text-[11px] font-mono text-slate-600 font-medium whitespace-nowrap">
              ΔP: -{(currentPoint.deltaP / 1e3).toFixed(1)} kPa
            </div>
          </div>

          {/* Card 4: N2 Conversion */}
          <div className="bg-slate-50 hover:bg-slate-100/80 border border-slate-200/90 rounded-lg p-3 transition-colors flex flex-col justify-between border-l-4 border-l-emerald-500">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-tight">
                Conversion
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-bold">
                X_N₂
              </span>
            </div>
            <div className="my-1.5">
              <span className="text-base sm:text-lg font-black font-mono text-emerald-700 whitespace-nowrap">
                {(currentPoint.conversion * 100).toFixed(2)}
              </span>
              <span className="text-xs font-bold text-emerald-600 ml-1 font-sans">%</span>
            </div>
            <div className="text-[11px] font-mono text-slate-600 font-medium whitespace-nowrap">
              N₂ consumed
            </div>
          </div>

          {/* Card 5: Ammonia Mole Fraction */}
          <div className="bg-slate-50 hover:bg-slate-100/80 border border-slate-200/90 rounded-lg p-3 transition-colors flex flex-col justify-between border-l-4 border-l-orange-500">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-tight">
                Ammonia
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-orange-100 text-orange-800 font-bold">
                y_NH₃
              </span>
            </div>
            <div className="my-1.5">
              <span className="text-base sm:text-lg font-black font-mono text-orange-700 whitespace-nowrap">
                {(currentPoint.yNH3 * 100).toFixed(2)}
              </span>
              <span className="text-xs font-bold text-orange-600 ml-1 font-sans">%</span>
            </div>
            <div className="text-[11px] font-mono text-slate-600 font-medium whitespace-nowrap">
              gas mole fraction
            </div>
          </div>

          {/* Card 6: Observed Reaction Rate */}
          <div className="bg-slate-50 hover:bg-slate-100/80 border border-slate-200/90 rounded-lg p-3 transition-colors flex flex-col justify-between border-l-4 border-l-slate-600">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-tight">
                Reaction Rate
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-200 text-slate-800 font-bold">
                r_obs
              </span>
            </div>
            <div className="my-1.5">
              <span className="text-base sm:text-lg font-black font-mono text-slate-900 whitespace-nowrap">
                {currentPoint.reactionRate < 0.001
                  ? currentPoint.reactionRate.toExponential(2)
                  : currentPoint.reactionRate.toFixed(4)}
              </span>
            </div>
            <div className="text-[11px] font-mono text-slate-600 font-medium whitespace-nowrap">
              mol / (kg-cat · s)
            </div>
          </div>

          {/* Card 7: Pellet Effectiveness Factor */}
          <div className="bg-slate-50 hover:bg-slate-100/80 border border-slate-200/90 rounded-lg p-3 transition-colors flex flex-col justify-between border-l-4 border-l-purple-500">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-tight">
                Effectiveness
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-purple-100 text-purple-800 font-bold">
                η(z)
              </span>
            </div>
            <div className="my-1.5">
              <span
                className={`text-base sm:text-lg font-black font-mono whitespace-nowrap ${
                  currentPoint.effectiveness >= 0.95 ? 'text-emerald-700' : 'text-rose-700'
                }`}
              >
                {(currentPoint.effectiveness * 100).toFixed(1)}
              </span>
              <span className="text-xs font-bold text-slate-600 ml-1 font-sans">%</span>
            </div>
            <div className="text-[11px] font-mono text-slate-600 font-medium whitespace-nowrap">
              Φ = {currentPoint.weiszPrater.toFixed(3)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
