import React, { useState } from 'react';
import { AxialProfilePoint, SimulationResult } from '../types/eurokin';
import { LineChart, Crosshair, Eye, Flame, Gauge, Layers, Info } from 'lucide-react';

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
      <div className="p-8 text-center bg-[#0A0D12] border border-[#1E2533] text-xs font-mono text-slate-500">
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
    <div className="bg-[#0A0D12] border border-[#1E2533] p-5 space-y-4">
      {/* Header and Metric Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#1E2533]">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-[#141A24] border border-[#252E3E] text-[#00D8F6]">
            <LineChart className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-100 flex items-center gap-2">
              <span>Synchronized Reactor Axial Profile Explorer</span>
              <span className="text-[10px] font-normal text-slate-500 font-mono">
                (Runge-Kutta 1D Differential Integration)
              </span>
            </h3>
            <span className="text-[11px] text-slate-400 font-sans">
              Cursor tracking is synchronized in real time with the 3D reactor cross-section and local state inspection.
            </span>
          </div>
        </div>

        {/* Metric Switcher Tabs */}
        <div className="flex items-center gap-1 text-xs font-mono">
          <button
            onClick={() => setActiveMetric('temperature')}
            className={`px-2.5 py-1 text-[11px] border transition-colors ${
              activeMetric === 'temperature'
                ? 'bg-[#141A24] text-[#F59E0B] border-[#F59E0B]/60'
                : 'text-slate-400 border-[#1E2533] hover:text-slate-200'
            }`}
          >
            Temperature T(z)
          </button>
          <button
            onClick={() => setActiveMetric('species')}
            className={`px-2.5 py-1 text-[11px] border transition-colors ${
              activeMetric === 'species'
                ? 'bg-[#141A24] text-[#00D8F6] border-[#00D8F6]/60'
                : 'text-slate-400 border-[#1E2533] hover:text-slate-200'
            }`}
          >
            Species y_i(z)
          </button>
          <button
            onClick={() => setActiveMetric('rate')}
            className={`px-2.5 py-1 text-[11px] border transition-colors ${
              activeMetric === 'rate'
                ? 'bg-[#141A24] text-[#10B981] border-[#10B981]/60'
                : 'text-slate-400 border-[#1E2533] hover:text-slate-200'
            }`}
          >
            Rate r(z) & X_A(z)
          </button>
          <button
            onClick={() => setActiveMetric('pressure')}
            className={`px-2.5 py-1 text-[11px] border transition-colors ${
              activeMetric === 'pressure'
                ? 'bg-[#141A24] text-[#38BDF8] border-[#38BDF8]/60'
                : 'text-slate-400 border-[#1E2533] hover:text-slate-200'
            }`}
          >
            Pressure P(z)
          </button>
          <button
            onClick={() => setActiveMetric('effectiveness')}
            className={`px-2.5 py-1 text-[11px] border transition-colors ${
              activeMetric === 'effectiveness'
                ? 'bg-[#141A24] text-purple-400 border-purple-500/60'
                : 'text-slate-400 border-[#1E2533] hover:text-slate-200'
            }`}
          >
            Effectiveness η(z)
          </button>
        </div>
      </div>

      {/* Main SVG Scientific Chart */}
      <div className="relative bg-[#06080B] border border-[#171E2B] overflow-hidden">
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
                  stroke="#171F2C"
                  strokeWidth="1"
                  strokeDasharray="2 2"
                />
                <text
                  x={margin.left - 8}
                  y={y + 3}
                  textAnchor="end"
                  fill="#5C6878"
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
                  stroke="#171F2C"
                  strokeWidth="1"
                  strokeDasharray="2 2"
                />
                <text
                  x={x}
                  y={margin.top + plotHeight + 16}
                  textAnchor="middle"
                  fill="#5C6878"
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
            fill="#8B949E"
            fontSize="10"
            fontFamily="monospace"
          >
            Axial Bed Coordinate z [mm] (Inlet z = 0 → Outlet z = L)
          </text>

          <text
            x={-margin.top - plotHeight / 2}
            y={16}
            transform="rotate(-90)"
            textAnchor="middle"
            fill="#8B949E"
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
                stroke="#64748B"
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
                stroke="#F59E0B"
                strokeWidth="2.5"
              />
            </g>
          )}

          {activeMetric === 'pressure' && (
            <path
              d={generatePath((p) => p.pressure / 1e5)}
              fill="none"
              stroke="#38BDF8"
              strokeWidth="2.5"
            />
          )}

          {activeMetric === 'species' && (
            <g>
              {showH2 && (
                <path
                  d={generatePath((p) => p.yH2)}
                  fill="none"
                  stroke="#E2E8F0"
                  strokeWidth="2"
                />
              )}
              {showN2 && (
                <path
                  d={generatePath((p) => p.yN2)}
                  fill="none"
                  stroke="#00D8F6"
                  strokeWidth="2"
                />
              )}
              {showNH3 && (
                <path
                  d={generatePath((p) => p.yNH3)}
                  fill="none"
                  stroke="#F59E0B"
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
                stroke="#10B981"
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
                stroke="#10B981"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
              <text
                x={margin.left + plotWidth - 4}
                y={scaleY(0.95) - 4}
                textAnchor="end"
                fill="#10B981"
                fontSize="8"
                fontFamily="monospace"
              >
                Eurokin Intrinsic Threshold η = 0.95 (95%)
              </text>

              <path
                d={generatePath((p) => p.effectiveness)}
                fill="none"
                stroke="#A855F7"
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
            stroke="#00D8F6"
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
            fill="#00D8F6"
            stroke="#06080B"
            strokeWidth="1.5"
          />
        </svg>

        {/* Legend for Species */}
        {activeMetric === 'species' && (
          <div className="absolute top-2 right-2 px-2.5 py-1.5 bg-[#0A0D12]/90 border border-[#1E2533] flex items-center gap-3 text-[10px] font-mono select-none">
            <button
              onClick={() => setShowNH3(!showNH3)}
              className={`flex items-center gap-1.5 ${showNH3 ? 'text-[#F59E0B]' : 'text-slate-600 line-through'}`}
            >
              <span className="w-2.5 h-1 bg-[#F59E0B]" />
              <span>y_NH₃ (Product)</span>
            </button>
            <button
              onClick={() => setShowH2(!showH2)}
              className={`flex items-center gap-1.5 ${showH2 ? 'text-slate-200' : 'text-slate-600 line-through'}`}
            >
              <span className="w-2.5 h-1 bg-[#E2E8F0]" />
              <span>y_H₂ (Reactant)</span>
            </button>
            <button
              onClick={() => setShowN2(!showN2)}
              className={`flex items-center gap-1.5 ${showN2 ? 'text-[#00D8F6]' : 'text-slate-600 line-through'}`}
            >
              <span className="w-2.5 h-1 bg-[#00D8F6]" />
              <span>y_N₂ (Reactant)</span>
            </button>
          </div>
        )}
      </div>

      {/* Synchronized Readout Bar at Selected Axial Position */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 text-xs font-mono">
        <div className="p-2 bg-[#080A0D] border border-[#1E2533]">
          <span className="text-[10px] text-slate-500 uppercase block">Axial Pos (z)</span>
          <span className="font-bold text-slate-100">
            {(currentPoint.z * 1000).toFixed(1)} mm
          </span>
          <span className="text-[9px] text-[#00D8F6] block">
            {(currentPoint.zNormalized * 100).toFixed(0)}% L
          </span>
        </div>

        <div className="p-2 bg-[#080A0D] border border-[#1E2533]">
          <span className="text-[10px] text-slate-500 uppercase block">Temperature T</span>
          <span className="font-bold text-[#F59E0B]">
            {currentPoint.temperature.toFixed(1)} K
          </span>
          <span className="text-[9px] text-slate-400 block">
            ({(currentPoint.temperature - 273.15).toFixed(1)} °C)
          </span>
        </div>

        <div className="p-2 bg-[#080A0D] border border-[#1E2533]">
          <span className="text-[10px] text-slate-500 uppercase block">Pressure P</span>
          <span className="font-bold text-[#38BDF8]">
            {(currentPoint.pressure / 1e5).toFixed(2)} bar
          </span>
          <span className="text-[9px] text-slate-500 block">
            -{(currentPoint.deltaP / 1e3).toFixed(1)} kPa
          </span>
        </div>

        <div className="p-2 bg-[#080A0D] border border-[#1E2533]">
          <span className="text-[10px] text-slate-500 uppercase block">Conversion X_A</span>
          <span className="font-bold text-[#10B981]">
            {(currentPoint.conversion * 100).toFixed(1)}%
          </span>
          <span className="text-[9px] text-slate-500 block">N₂ reacted</span>
        </div>

        <div className="p-2 bg-[#080A0D] border border-[#1E2533]">
          <span className="text-[10px] text-slate-500 uppercase block">Ammonia y_NH3</span>
          <span className="font-bold text-[#F59E0B]">
            {(currentPoint.yNH3 * 100).toFixed(2)}%
          </span>
          <span className="text-[9px] text-slate-500 block">mol fraction</span>
        </div>

        <div className="p-2 bg-[#080A0D] border border-[#1E2533]">
          <span className="text-[10px] text-slate-500 uppercase block">Reaction Rate</span>
          <span className="font-bold text-slate-100">
            {currentPoint.reactionRate.toExponential(2)}
          </span>
          <span className="text-[9px] text-slate-500 block">mol/(kg·s)</span>
        </div>

        <div className="p-2 bg-[#080A0D] border border-[#1E2533]">
          <span className="text-[10px] text-slate-500 uppercase block">Effectiveness η</span>
          <span
            className={`font-bold ${
              currentPoint.effectiveness >= 0.95 ? 'text-[#10B981]' : 'text-[#EF4444]'
            }`}
          >
            {(currentPoint.effectiveness * 100).toFixed(1)}%
          </span>
          <span className="text-[9px] text-slate-500 block">
            Φ = {currentPoint.weiszPrater.toFixed(3)}
          </span>
        </div>
      </div>
    </div>
  );
};
