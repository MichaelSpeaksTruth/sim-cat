import React, { useState, useMemo } from 'react';
import { ReactorInputs } from '../types/eurokin';
import { runEurokinSimulation } from '../lib/eurokinEngine';
import { TrendingUp, BarChart2, ShieldAlert, CheckCircle, Crosshair } from 'lucide-react';
import { MathView } from './MathView';

interface SensitivitySweepProps {
  baseInputs: ReactorInputs;
}

type SweepVar = 'particleDiameter' | 'temperature' | 'feedFlow' | 'inertMass';

export const SensitivitySweep: React.FC<SensitivitySweepProps> = ({ baseInputs }) => {
  const [sweepVar, setSweepVar] = useState<SweepVar>('particleDiameter');
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const sweepConfigs = {
    particleDiameter: {
      label: 'Pellet Diameter (dp)',
      unit: 'mm',
      scale: 1e3,
      min: 0.0001, // 0.1 mm
      max: 0.0020, // 2.0 mm
      defaultTarget: baseInputs.particleDiameter,
    },
    temperature: {
      label: 'Bed Temperature (T)',
      unit: 'K',
      scale: 1,
      min: 450,
      max: 750,
      defaultTarget: baseInputs.temperature,
    },
    feedFlow: {
      label: 'Feed Mass Flow (ṁ)',
      unit: 'mg/s',
      scale: 1e6,
      min: baseInputs.feedFlow * 0.2,
      max: baseInputs.feedFlow * 4.0,
      defaultTarget: baseInputs.feedFlow,
    },
    inertMass: {
      label: 'Inert Diluent Mass (W_inert)',
      unit: 'mg',
      scale: 1e6,
      min: 0.0,
      max: baseInputs.catalystMass * 10,
      defaultTarget: baseInputs.inertMass,
    },
  };

  const currentCfg = sweepConfigs[sweepVar];

  // Calculate 25 evaluation points across the sweep domain
  const sweepData = useMemo(() => {
    const steps = 24;
    const delta = (currentCfg.max - currentCfg.min) / steps;
    const points = [];

    for (let i = 0; i <= steps; i++) {
      const varVal = currentCfg.min + i * delta;
      const testInputs: ReactorInputs = {
        ...baseInputs,
        [sweepVar]: varVal,
      };

      const result = runEurokinSimulation(testInputs);
      const weisz = result.criteria.find(c => c.id === 'internal_diffusion')!;
      const carberry = result.criteria.find(c => c.id === 'external_mass_transfer')!;
      const deltaP = result.criteria.find(c => c.id === 'pressure_drop')!;
      const deltaTfilm = result.criteria.find(c => c.id === 'external_heat_transfer')!;

      points.push({
        varVal,
        dispVal: varVal * currentCfg.scale,
        allPassed: result.overallStatus === 'VALID_INTRINSIC',
        weiszVal: weisz.calculatedValue,
        weiszLimit: weisz.limitValue,
        carberryVal: carberry.calculatedValue,
        carberryLimit: carberry.limitValue,
        pressureDrop: deltaP.calculatedValue,
        pressureLimit: deltaP.limitValue,
        deltaTfilm: deltaTfilm.calculatedValue,
        deltaTfilmLimit: deltaTfilm.limitValue,
        reynolds: result.hydrodynamics.reynoldsNumber,
        effectiveness: result.transport.effectivenessFactor,
      });
    }

    return points;
  }, [baseInputs, sweepVar, currentCfg]);

  const activePoint = hoverIndex !== null ? sweepData[hoverIndex] : sweepData[Math.floor(sweepData.length / 2)];

  // SVG Chart Dimensions
  const svgWidth = 560;
  const svgHeight = 220;
  const padL = 50;
  const padR = 20;
  const padT = 25;
  const padB = 40;
  const plotW = svgWidth - padL - padR;
  const plotH = svgHeight - padT - padB;

  // Weisz-Prater curve scaling
  const maxWeisz = Math.max(0.2, ...sweepData.map(d => d.weiszVal));
  const getX = (i: number) => padL + (i / (sweepData.length - 1)) * plotW;
  const getYWeisz = (val: number) => padT + plotH - (Math.min(val, maxWeisz) / maxWeisz) * plotH;

  const weiszPath = sweepData.reduce(
    (acc, d, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${getX(i)} ${getYWeisz(d.weiszVal)}`,
    ''
  );
  const limitY = getYWeisz(0.08);

  return (
    <div className="bg-[#0f141d] border border-slate-800/80 rounded-xl overflow-hidden shadow-2xl p-5 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-amber-400" />
          <h3 className="font-semibold text-xs tracking-wider uppercase text-slate-100">
            Parametric Sensitivity & Intrinsic Operating Window
          </h3>
        </div>

        {/* Sweep Variable Buttons */}
        <div className="flex bg-[#0b0e14] p-1 rounded-lg border border-slate-800 text-xs font-mono">
          {(Object.keys(sweepConfigs) as SweepVar[]).map((v) => (
            <button
              key={v}
              onClick={() => setSweepVar(v)}
              className={`px-2.5 py-1 rounded transition-colors ${
                sweepVar === v
                  ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {v === 'particleDiameter' ? 'dp (Pellet)' : v === 'temperature' ? 'T (Bed)' : v === 'feedFlow' ? 'ṁ (Flow)' : 'W_inert (Dilution)'}
            </button>
          ))}
        </div>
      </div>

      {/* Main Interactive Chart Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
        {/* SVG Curve Viewport */}
        <div className="lg:col-span-8 bg-[#080b11] p-3 rounded-lg border border-slate-800 relative">
          <div className="flex items-center justify-between text-xs font-mono px-2 mb-1 text-slate-400">
            <span className="flex items-center gap-1.5 text-amber-300 font-medium font-sans">
              <BarChart2 className="w-3.5 h-3.5" />
              Weisz-Prater Modulus (Φ) vs {currentCfg.label}
            </span>
            <span className="text-[11px] text-slate-500">
              Safe Intrinsic Region: Φ &lt; 0.080
            </span>
          </div>

          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full select-none"
            onMouseLeave={() => setHoverIndex(null)}
          >
            {/* Safe Zone Background Fill */}
            <rect
              x={padL}
              y={limitY}
              width={plotW}
              height={padT + plotH - limitY}
              fill="#10b981"
              fillOpacity="0.08"
            />
            {/* Danger Zone Background Fill */}
            <rect
              x={padL}
              y={padT}
              width={plotW}
              height={limitY - padT}
              fill="#f43f5e"
              fillOpacity="0.06"
            />

            {/* Grid lines */}
            <line x1={padL} y1={padT + plotH} x2={padL + plotW} y2={padT + plotH} stroke="#334155" strokeWidth="1" />
            <line x1={padL} y1={padT} x2={padL} y2={padT + plotH} stroke="#334155" strokeWidth="1" />

            {/* Diagnostic Limit Line (0.080) */}
            <line
              x1={padL}
              y1={limitY}
              x2={padL + plotW}
              y2={limitY}
              stroke="#f43f5e"
              strokeWidth="1.5"
              strokeDasharray="4 3"
            />
            <text x={padL + plotW - 6} y={limitY - 5} fill="#f43f5e" fontSize="9" textAnchor="end" fontFamily="monospace">
              Diagnostic Threshold Φ = 0.080
            </text>

            {/* Weisz-Prater curve */}
            <path d={weiszPath} fill="none" stroke="#f59e0b" strokeWidth="2.5" />

            {/* Data points & hover triggers */}
            {sweepData.map((d, i) => {
              const cx = getX(i);
              const cy = getYWeisz(d.weiszVal);
              const isHovered = hoverIndex === i;
              return (
                <g key={i}>
                  <circle
                    cx={cx}
                    cy={cy}
                    r={isHovered ? 5.5 : 3}
                    fill={d.weiszVal < 0.08 ? '#10b981' : '#f43f5e'}
                    stroke="#0f141d"
                    strokeWidth="1.5"
                    className="cursor-pointer"
                    onMouseEnter={() => setHoverIndex(i)}
                  />
                  {/* Invisible broad hover column */}
                  <rect
                    x={cx - (plotW / sweepData.length) / 2}
                    y={padT}
                    width={plotW / sweepData.length}
                    height={plotH}
                    fill="transparent"
                    className="cursor-pointer"
                    onMouseEnter={() => setHoverIndex(i)}
                  />
                </g>
              );
            })}

            {/* Axis labels */}
            <text x={padL} y={padT + plotH + 16} fill="#64748b" fontSize="9" fontFamily="monospace">
              {sweepData[0].dispVal.toFixed(2)} {currentCfg.unit}
            </text>
            <text x={padL + plotW} y={padT + plotH + 16} fill="#64748b" fontSize="9" textAnchor="end" fontFamily="monospace">
              {sweepData[sweepData.length - 1].dispVal.toFixed(2)} {currentCfg.unit}
            </text>
            <text x={padL + plotW / 2} y={padT + plotH + 28} fill="#94a3b8" fontSize="10" textAnchor="middle" fontFamily="sans-serif">
              {currentCfg.label} [{currentCfg.unit}]
            </text>

            {/* Y axis tick labels */}
            <text x={padL - 6} y={padT + plotH} fill="#64748b" fontSize="8" textAnchor="end" fontFamily="monospace">0.0</text>
            <text x={padL - 6} y={limitY + 3} fill="#f43f5e" fontSize="8" textAnchor="end" fontFamily="monospace">0.08</text>
            <text x={padL - 6} y={padT + 8} fill="#64748b" fontSize="8" textAnchor="end" fontFamily="monospace">{maxWeisz.toFixed(2)}</text>
          </svg>
        </div>

        {/* Telemetry Inspection Box */}
        <div className="lg:col-span-4 bg-[#0a0e16] border border-slate-800 p-4 rounded-lg text-xs font-mono space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="flex items-center gap-1.5 font-sans font-semibold text-slate-200">
              <Crosshair className="w-3.5 h-3.5 text-amber-400" /> Inspected State
            </span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
              activePoint.allPassed
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                : 'bg-rose-950 text-rose-300 border border-rose-800'
            }`}>
              {activePoint.allPassed ? 'ALL CRITERIA PASS' : 'TRANSPORT LIMITED'}
            </span>
          </div>

          <div className="space-y-2 text-[11px]">
            <div className="flex justify-between items-center bg-[#07090e] p-2 rounded border border-slate-800/80">
              <span className="text-slate-400">{currentCfg.label}:</span>
              <span className="text-amber-300 font-bold text-sm">
                {activePoint.dispVal.toFixed(3)} {currentCfg.unit}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-400">Weisz-Prater Modulus:</span>
              <span className={`font-bold ${activePoint.weiszVal < 0.08 ? 'text-emerald-400' : 'text-rose-400'}`}>
                Φ = {activePoint.weiszVal.toFixed(4)}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-400">Pellet Effectiveness (η):</span>
              <span className="text-slate-200">{(activePoint.effectiveness * 100).toFixed(1)}%</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-400">Carberry Number (Ca):</span>
              <span className="text-slate-200">{activePoint.carberryVal.toFixed(4)}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-400">Bed Pressure Drop (ΔP):</span>
              <span className="text-slate-200">{activePoint.pressureDrop.toFixed(0)} Pa</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-400">Film Temp Rise (ΔTfilm):</span>
              <span className="text-slate-200">{activePoint.deltaTfilm.toFixed(3)} K</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-400">Reynolds Number (Re):</span>
              <span className="text-slate-200">{activePoint.reynolds.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
