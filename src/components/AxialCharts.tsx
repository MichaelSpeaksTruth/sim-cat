import React, { useState } from 'react';
import { AxialProfilePoint, SimulationResult } from '../types/eurokin';
import { LineChart, Crosshair } from 'lucide-react';

interface AxialChartsProps {
  simulation: SimulationResult;
  currentZNormalized: number;
  onZNormalizedChange: (zNorm: number) => void;
}

export const AxialCharts: React.FC<AxialChartsProps> = ({
  simulation,
  currentZNormalized,
  onZNormalizedChange,
}) => {
  const { axialProfiles, inputs } = simulation;
  const [activeMetric, setActiveMetric] = useState<'temperature' | 'pressure' | 'species' | 'rate' | 'effectiveness'>('temperature');
  const [showN2, setShowN2] = useState(true);
  const [showH2, setShowH2] = useState(true);
  const [showNH3, setShowNH3] = useState(true);

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
  const svgWidth = 820;
  const svgHeight = 280;
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

  return (
    <div className="bg-white border border-slate-200/90 rounded-xl shadow-xs p-5 lg:p-6 space-y-5">
      {/* Header and Metric Selector */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
            <LineChart className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span>Synchronized Reactor Axial Profile</span>
            </h3>
            <span className="text-xs text-slate-500 font-sans">
              Cursor tracking is synchronized in real time with the 3D reactor cross-section and local state inspection.
            </span>
          </div>
        </div>

        {/* Metric Switcher Tabs */}
        <div className="flex items-center bg-slate-100 rounded-lg p-1 text-xs font-medium">
          <button
            onClick={() => setActiveMetric('temperature')}
            className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
              activeMetric === 'temperature'
                ? 'bg-white text-amber-700 font-semibold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Temperature
          </button>
          <button
            onClick={() => setActiveMetric('species')}
            className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
              activeMetric === 'species'
                ? 'bg-white text-blue-700 font-semibold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Species
          </button>
          <button
            onClick={() => setActiveMetric('rate')}
            className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
              activeMetric === 'rate'
                ? 'bg-white text-emerald-700 font-semibold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Rate & Conversion
          </button>
          <button
            onClick={() => setActiveMetric('pressure')}
            className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
              activeMetric === 'pressure'
                ? 'bg-white text-sky-700 font-semibold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Pressure
          </button>
          <button
            onClick={() => setActiveMetric('effectiveness')}
            className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
              activeMetric === 'effectiveness'
                ? 'bg-white text-purple-700 font-semibold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Effectiveness
          </button>
        </div>
      </div>

      {/* Main SVG Scientific Chart */}
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

      {/* Dynamic & Responsive Metric Cards Bar (Resolves squishing at 100% zoom) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-7 gap-3">
        <div className="bg-slate-50/80 hover:bg-slate-50 border border-slate-200/80 rounded-lg p-3 transition-colors flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate">
            Axial Position
          </span>
          <span className="text-base font-bold font-mono text-slate-900 my-0.5 truncate">
            {(currentPoint.z * 1000).toFixed(1)} mm
          </span>
          <span className="text-[11px] font-mono text-blue-700 font-medium truncate">
            {(currentPoint.zNormalized * 100).toFixed(0)}% L
          </span>
        </div>

        <div className="bg-slate-50/80 hover:bg-slate-50 border border-slate-200/80 rounded-lg p-3 transition-colors flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate">
            Temperature
          </span>
          <span className="text-base font-bold font-mono text-amber-700 my-0.5 truncate">
            {currentPoint.temperature.toFixed(1)} K
          </span>
          <span className="text-[11px] font-mono text-slate-500 truncate">
            {(currentPoint.temperature - 273.15).toFixed(1)} °C
          </span>
        </div>

        <div className="bg-slate-50/80 hover:bg-slate-50 border border-slate-200/80 rounded-lg p-3 transition-colors flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate">
            Pressure
          </span>
          <span className="text-base font-bold font-mono text-sky-700 my-0.5 truncate">
            {(currentPoint.pressure / 1e5).toFixed(2)} bar
          </span>
          <span className="text-[11px] font-mono text-slate-500 truncate">
            -{(currentPoint.deltaP / 1e3).toFixed(1)} kPa
          </span>
        </div>

        <div className="bg-slate-50/80 hover:bg-slate-50 border border-slate-200/80 rounded-lg p-3 transition-colors flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate">
            Conversion
          </span>
          <span className="text-base font-bold font-mono text-emerald-700 my-0.5 truncate">
            {(currentPoint.conversion * 100).toFixed(1)}%
          </span>
          <span className="text-[11px] font-mono text-slate-500 truncate">
            N₂ reacted
          </span>
        </div>

        <div className="bg-slate-50/80 hover:bg-slate-50 border border-slate-200/80 rounded-lg p-3 transition-colors flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate">
            Ammonia
          </span>
          <span className="text-base font-bold font-mono text-amber-700 my-0.5 truncate">
            {(currentPoint.yNH3 * 100).toFixed(2)}%
          </span>
          <span className="text-[11px] font-mono text-slate-500 truncate">
            mol fraction
          </span>
        </div>

        <div className="bg-slate-50/80 hover:bg-slate-50 border border-slate-200/80 rounded-lg p-3 transition-colors flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate">
            Reaction Rate
          </span>
          <span className="text-base font-bold font-mono text-slate-900 my-0.5 truncate">
            {currentPoint.reactionRate.toExponential(2)}
          </span>
          <span className="text-[11px] font-mono text-slate-500 truncate">
            mol/(kg·s)
          </span>
        </div>

        <div className="bg-slate-50/80 hover:bg-slate-50 border border-slate-200/80 rounded-lg p-3 transition-colors flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate">
            Effectiveness
          </span>
          <span
            className={`text-base font-bold font-mono my-0.5 truncate ${
              currentPoint.effectiveness >= 0.95 ? 'text-emerald-700' : 'text-rose-700'
            }`}
          >
            {(currentPoint.effectiveness * 100).toFixed(1)}%
          </span>
          <span className="text-[11px] font-mono text-slate-500 truncate">
            Φ = {currentPoint.weiszPrater.toFixed(3)}
          </span>
        </div>
      </div>
    </div>
  );
};
