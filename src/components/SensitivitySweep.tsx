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
      label: 'Catalyst Pellet Diameter (dp)',
      unit: 'mm',
      scale: 1e3,
      min: 0.0001, // 0.1 mm
      max: 0.0020, // 2.0 mm
      defaultTarget: baseInputs.particleDiameter,
    },
    temperature: {
      label: 'Bed Operating Temperature (T)',
      unit: 'K',
      scale: 1,
      min: 550,
      max: 750,
      defaultTarget: baseInputs.temperature,
    },
    feedFlow: {
      label: 'Feed Mass Flow Rate (ṁ)',
      unit: 'mg/s',
      scale: 1e6,
      min: Math.max(1e-6, baseInputs.feedFlow * 0.2),
      max: baseInputs.feedFlow * 3.5,
      defaultTarget: baseInputs.feedFlow,
    },
    inertMass: {
      label: 'Inert SiC Diluent Mass (W_inert)',
      unit: 'mg',
      scale: 1e6,
      min: 0.0,
      max: Math.max(1e-4, baseInputs.catalystMass * 6),
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
      const deltaTrad = result.criteria.find(c => c.id === 'radial_heat_transfer')!;

      points.push({
        rawVal: varVal,
        scaledVal: varVal * currentCfg.scale,
        overallStatus: result.overallStatus,
        passedCount: result.passedCount,
        totalCount: result.totalCount,
        weiszVal: weisz.calculatedValue,
        weiszPass: weisz.passed,
        carberryVal: carberry.calculatedValue,
        carberryPass: carberry.passed,
        deltaPVal: deltaP.calculatedValue,
        deltaPPass: deltaP.passed,
        deltaTradVal: deltaTrad.calculatedValue,
        deltaTradPass: deltaTrad.passed,
        eta: result.transport.effectivenessFactor,
      });
    }

    return points;
  }, [baseInputs, sweepVar, currentCfg]);

  const activePoint = hoverIndex !== null ? sweepData[hoverIndex] : sweepData[Math.floor(sweepData.length / 2)];

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200/80 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-blue-50 text-blue-700 text-blue-600 border border-blue-600/30">
              PARAMETRIC SENSITIVITY SWEEPS
            </span>
          </div>
          <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-slate-900 mt-1">
            Transport Limit Transition Boundaries & Safe Operating Windows
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-4xl leading-relaxed">
            Examine how catalyst pellet diameter, operating temperature, mass flow velocity, and inert bed dilution trigger transitions between intrinsic kinetics and transport-limited regimes.
          </p>
        </div>

        {/* Sweep Variable Selector Buttons */}
        <div className="flex bg-[#141922] p-0.5 border border-slate-200/80 text-xs font-mono">
          {(Object.keys(sweepConfigs) as SweepVar[]).map((vKey) => (
            <button
              key={vKey}
              onClick={() => {
                setSweepVar(vKey);
                setHoverIndex(null);
              }}
              className={`px-3 py-1 font-bold uppercase tracking-wider transition-all ${
                sweepVar === vKey
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {sweepConfigs[vKey].label.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Main Graph & Metric Readout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Interactive SVG Chart */}
        <div className="lg:col-span-8 bg-white rounded-xl shadow-xs border border-slate-200/80 p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-900">
                Pore Diffusion (Weisz-Prater Φ) & Pellet Effectiveness (η) vs {currentCfg.label}
              </h3>
            </div>
            <span className="text-[11px] font-mono text-slate-500">
              Safe limit: Φ &lt; 0.08 (η &gt; 95%)
            </span>
          </div>

          {/* SVG Plot */}
          <div className="relative h-64 w-full pt-2">
            <svg
              className="w-full h-full overflow-visible"
              viewBox="0 0 500 200"
              preserveAspectRatio="none"
            >
              {/* Grid Lines */}
              <line x1="40" y1="20" x2="480" y2="20" stroke="#1E2533" strokeWidth="1" />
              <line x1="40" y1="60" x2="480" y2="60" stroke="#1E2533" strokeWidth="1" />
              <line x1="40" y1="100" x2="480" y2="100" stroke="#1E2533" strokeWidth="1" />
              <line x1="40" y1="140" x2="480" y2="140" stroke="#1E2533" strokeWidth="1" />
              <line x1="40" y1="180" x2="480" y2="180" stroke="#252E3E" strokeWidth="1" />
              <line x1="40" y1="20" x2="40" y2="180" stroke="#252E3E" strokeWidth="1" />

              {/* 0.08 Threshold Line (Weisz-Prater limit) */}
              <line
                x1="40"
                y1="120"
                x2="480"
                y2="120"
                stroke="#EF4444"
                strokeWidth="1.5"
                strokeDasharray="4 3"
              />
              <text x="485" y="124" fill="#EF4444" fontSize="10" fontFamily="monospace">
                Φ = 0.08 Limit
              </text>

              {/* Data Curve: Weisz-Prater Modulus */}
              {sweepData.map((pt, i) => {
                if (i === 0) return null;
                const prev = sweepData[i - 1];
                const x1 = 40 + ((i - 1) / (sweepData.length - 1)) * 440;
                const y1 = Math.max(20, Math.min(180, 180 - (prev.weiszVal / 0.20) * 150));
                const x2 = 40 + (i / (sweepData.length - 1)) * 440;
                const y2 = Math.max(20, Math.min(180, 180 - (pt.weiszVal / 0.20) * 150));

                return (
                  <line
                    key={i}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="#00D8F6"
                    strokeWidth="2"
                  />
                );
              })}

              {/* Interactive Hover Nodes */}
              {sweepData.map((pt, i) => {
                const x = 40 + (i / (sweepData.length - 1)) * 440;
                const y = Math.max(20, Math.min(180, 180 - (pt.weiszVal / 0.20) * 150));

                return (
                  <circle
                    key={i}
                    cx={x}
                    cy={y}
                    r={hoverIndex === i ? 6 : 3.5}
                    fill={pt.weiszPass ? '#10B981' : '#EF4444'}
                    stroke="#080A0D"
                    strokeWidth="1.5"
                    className="cursor-pointer transition-all hover:scale-150"
                    onMouseEnter={() => setHoverIndex(i)}
                  />
                );
              })}
            </svg>
          </div>

          {/* X Axis Labels */}
          <div className="flex justify-between px-10 text-xs font-mono text-slate-500 border-t border-slate-200/80 pt-2">
            <span>Min: {currentCfg.min * currentCfg.scale} {currentCfg.unit}</span>
            <span>Target: {(currentCfg.defaultTarget * currentCfg.scale).toFixed(2)} {currentCfg.unit}</span>
            <span>Max: {currentCfg.max * currentCfg.scale} {currentCfg.unit}</span>
          </div>
        </div>

        {/* Selected Evaluation Point Telemetry */}
        <div className="lg:col-span-4 bg-white rounded-xl shadow-xs border border-slate-200/80 p-4 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
              <span className="text-[11px] font-mono uppercase text-slate-500 font-semibold">Hovered State:</span>
              <span className={`px-2 py-0.5 text-[10px] font-mono font-bold border ${
                activePoint.overallStatus === 'VALID_INTRINSIC'
                  ? 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/30'
                  : 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/30'
              }`}>
                {activePoint.passedCount} / {activePoint.totalCount} Satisfied
              </span>
            </div>

            <div className="p-3 bg-[#141922] border border-slate-200/80 space-y-2 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-slate-500">{currentCfg.label}:</span>
                <span className="font-bold text-slate-800">{activePoint.scaledVal.toFixed(3)} {currentCfg.unit}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Weisz-Prater Modulus (Φ):</span>
                <span className={`font-bold ${activePoint.weiszPass ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                  {activePoint.weiszVal.toExponential(3)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Pellet Effectiveness (η):</span>
                <span className="font-bold text-blue-600">{(activePoint.eta * 100).toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Ergun ΔP (Pressure Drop):</span>
                <span className={`font-bold ${activePoint.deltaPPass ? 'text-slate-800' : 'text-[#EF4444]'}`}>
                  {activePoint.deltaPVal.toFixed(0)} Pa
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Radial Centerline ΔT:</span>
                <span className={`font-bold ${activePoint.deltaTradPass ? 'text-slate-800' : 'text-[#EF4444]'}`}>
                  {activePoint.deltaTradVal.toFixed(3)} K
                </span>
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed bg-[#141922] p-3 border border-slate-200/80 font-mono text-[11px]">
            Hover along the chart points to inspect the critical bifurcation point where transport gradients exceed the 5% error tolerance threshold.
          </p>
        </div>
      </div>
    </div>
  );
};
