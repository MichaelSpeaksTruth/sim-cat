import React, { useState, useMemo } from 'react';
import { SimulationResult } from '../types/eurokin';
import { Layers, ZoomIn, Info, Activity, Flame, Wind, ArrowDown } from 'lucide-react';
import { MathView } from './MathView';

interface ReactorVisualizerProps {
  simulation: SimulationResult;
}

export const ReactorVisualizer: React.FC<ReactorVisualizerProps> = ({ simulation }) => {
  const [activeTab, setActiveTab] = useState<'bed' | 'pellet' | 'profiles'>('bed');
  const [hoveredZone, setHoveredZone] = useState<string | null>(null);

  const { inputs, hydrodynamics, transport, criteria } = simulation;
  const bDilution = transport.volumetricDilutionFraction;

  // Generate deterministic particle positions for the bed packing graphic
  const particles = useMemo(() => {
    const list: Array<{ x: number; y: number; r: number; isInert: boolean; id: number }> = [];
    const rows = 18;
    const cols = 9;
    let seed = 42;
    const pseudoRandom = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const jitterX = (pseudoRandom() - 0.5) * 5;
        const jitterY = (pseudoRandom() - 0.5) * 4;
        const x = 32 + (col * 15.5) + jitterX;
        const y = 28 + (row * 13.5) + jitterY;
        const isInert = pseudoRandom() < bDilution;
        const r = 5.2 + (pseudoRandom() - 0.5) * 1.5;
        list.push({ x, y, r, isInert, id: row * cols + col });
      }
    }
    return list;
  }, [bDilution]);

  const carberryCrit = criteria.find(c => c.id === 'external_mass_transfer');
  const weiszCrit = criteria.find(c => c.id === 'internal_diffusion');
  const filmHeatCrit = criteria.find(c => c.id === 'external_heat_transfer');

  return (
    <div className="bg-[#0f141d] border border-slate-800/80 rounded-xl overflow-hidden shadow-2xl flex flex-col">
      {/* Top Header Bar */}
      <div className="px-4 py-3 bg-[#131924] border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-amber-400" />
          <span className="font-semibold text-xs tracking-wider uppercase text-slate-200">
            Reactor Cross-Section & Pellet Microkinetics
          </span>
          <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
            d_t = {(inputs.tubeDiameter * 1000).toFixed(1)} mm | L = {(inputs.bedHeight * 1000).toFixed(1)} mm
          </span>
        </div>

        {/* Tab Controls */}
        <div className="flex bg-[#0b0e14] p-0.5 rounded-lg border border-slate-800 text-xs font-medium">
          <button
            onClick={() => setActiveTab('bed')}
            className={`px-3 py-1 rounded-md transition-all ${
              activeTab === 'bed'
                ? 'bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Packed Bed 2D
          </button>
          <button
            onClick={() => setActiveTab('pellet')}
            className={`px-3 py-1 rounded-md transition-all flex items-center gap-1.5 ${
              activeTab === 'pellet'
                ? 'bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ZoomIn className="w-3.5 h-3.5" />
            Pellet & Film Boundary
          </button>
          <button
            onClick={() => setActiveTab('profiles')}
            className={`px-3 py-1 rounded-md transition-all ${
              activeTab === 'profiles'
                ? 'bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Concentration / Temp Gradient
          </button>
        </div>
      </div>

      {/* Main Viewport */}
      <div className="p-4 grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
        {/* Visual Canvas / SVG */}
        <div className="lg:col-span-7 flex justify-center items-center bg-[#07090e] rounded-lg p-3 border border-slate-800/70 min-h-[340px] relative overflow-hidden">
          {activeTab === 'bed' && (
            <div className="relative w-full max-w-[320px] flex flex-col items-center">
              {/* Flow In indicator */}
              <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 mb-1">
                <Wind className="w-3.5 h-3.5 animate-pulse" />
                <span>Gas Feed u₀ = {hydrodynamics.superficialVelocity.toFixed(3)} m/s</span>
                <ArrowDown className="w-3 h-3 text-cyan-400" />
              </div>

              <svg viewBox="0 0 190 280" className="w-full max-h-[300px] drop-shadow-lg select-none">
                <defs>
                  <linearGradient id="wallGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#334155" />
                    <stop offset="50%" stopColor="#64748b" />
                    <stop offset="100%" stopColor="#1e293b" />
                  </linearGradient>
                  <radialGradient id="catGrad" cx="35%" cy="35%" r="65%">
                    <stop offset="0%" stopColor="#fbbf24" />
                    <stop offset="60%" stopColor="#d97706" />
                    <stop offset="100%" stopColor="#78350f" />
                  </radialGradient>
                  <radialGradient id="inertGrad" cx="35%" cy="35%" r="65%">
                    <stop offset="0%" stopColor="#94a3b8" />
                    <stop offset="60%" stopColor="#475569" />
                    <stop offset="100%" stopColor="#1e293b" />
                  </radialGradient>
                  <pattern id="gridPattern" width="10" height="10" patternUnits="userSpaceOnUse">
                    <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#1e293b" strokeWidth="0.5" />
                  </pattern>
                </defs>

                {/* Reactor Tube Background Grid */}
                <rect x="20" y="15" width="150" height="250" fill="#0b0e14" />
                <rect x="20" y="15" width="150" height="250" fill="url(#gridPattern)" opacity="0.4" />

                {/* Left Tube Wall */}
                <rect x="14" y="10" width="8" height="260" rx="2" fill="url(#wallGrad)" />
                {/* Right Tube Wall */}
                <rect x="168" y="10" width="8" height="260" rx="2" fill="url(#wallGrad)" />

                {/* Thermowell or Centerline */}
                <line x1="95" y1="12" x2="95" y2="268" stroke="#38bdf8" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />

                {/* Bed Support Mesh Bottom */}
                <rect x="22" y="260" width="146" height="4" fill="#64748b" stroke="#94a3b8" strokeWidth="0.5" />

                {/* Particles Rendering */}
                {particles.map((p) => (
                  <circle
                    key={p.id}
                    cx={p.x}
                    cy={p.y}
                    r={p.r}
                    fill={p.isInert ? "url(#inertGrad)" : "url(#catGrad)"}
                    stroke={p.isInert ? "#64748b" : "#b45309"}
                    strokeWidth="0.6"
                    className="transition-transform hover:scale-125 cursor-pointer"
                    onMouseEnter={() => setHoveredZone(p.isInert ? 'Inert SiC Diluent' : 'Active Catalyst Pellet')}
                    onMouseLeave={() => setHoveredZone(null)}
                  />
                ))}

                {/* Dimension Arrows */}
                <line x1="22" y1="275" x2="168" y2="275" stroke="#94a3b8" strokeWidth="1" markerEnd="url(#arrow)" />
                <text x="95" y="278" fill="#cbd5e1" fontSize="7" textAnchor="middle" fontFamily="sans-serif">
                  dt = {(inputs.tubeDiameter * 1000).toFixed(0)} mm
                </text>
              </svg>

              {/* Bed Stats Bar */}
              <div className="flex items-center justify-between w-full mt-2 text-[11px] font-mono text-slate-400 bg-slate-900/80 px-3 py-1.5 rounded border border-slate-800">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
                  <span>Active Cat ({( (1 - bDilution) * 100 ).toFixed(1)}%)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-500 inline-block"></span>
                  <span>Inert SiC ({(bDilution * 100).toFixed(1)}%)</span>
                </div>
                <span className="text-amber-400 font-semibold">{hoveredZone || 'Hover particle'}</span>
              </div>
            </div>
          )}

          {activeTab === 'pellet' && (
            <div className="w-full flex flex-col items-center justify-center p-2">
              <svg viewBox="0 0 320 230" className="w-full max-h-[260px] select-none">
                <defs>
                  <radialGradient id="macroPellet" cx="40%" cy="40%" r="60%">
                    <stop offset="0%" stopColor="#f59e0b" />
                    <stop offset="70%" stopColor="#b45309" />
                    <stop offset="100%" stopColor="#451a03" />
                  </radialGradient>
                  <radialGradient id="filmZone" cx="50%" cy="50%" r="50%">
                    <stop offset="70%" stopColor="#0284c7" stopOpacity="0.0" />
                    <stop offset="90%" stopColor="#0284c7" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.4" />
                  </radialGradient>
                </defs>

                {/* Bulk Gas Region */}
                <rect x="5" y="5" width="310" height="220" fill="#090d16" rx="8" />

                {/* Stagnant Film Boundary Ring */}
                <circle cx="160" cy="115" r="94" fill="url(#filmZone)" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="4 3" />

                {/* Catalyst Solid Pellet */}
                <circle cx="160" cy="115" r="68" fill="url(#macroPellet)" stroke="#fbbf24" strokeWidth="2" />

                {/* Pore channels inside pellet */}
                <path d="M 120 115 Q 140 100 160 115 T 195 105" fill="none" stroke="#78350f" strokeWidth="2.5" strokeDasharray="2 2" />
                <path d="M 160 70 Q 155 95 160 115 T 170 160" fill="none" stroke="#78350f" strokeWidth="2.5" strokeDasharray="2 2" />

                {/* Annotations */}
                <text x="160" y="118" fill="#fef3c7" fontSize="10" fontWeight="bold" textAnchor="middle">
                  Pellet Core
                </text>
                <text x="160" y="132" fill="#fed7aa" fontSize="8" textAnchor="middle" fontFamily="monospace">
                  dp = {(inputs.particleDiameter * 1e6).toFixed(0)} µm
                </text>

                {/* Film annotation */}
                <line x1="228" y1="115" x2="254" y2="115" stroke="#38bdf8" strokeWidth="1.5" />
                <text x="260" y="112" fill="#38bdf8" fontSize="8" fontWeight="semibold">
                  Gas Film δ
                </text>
                <text x="260" y="122" fill="#94a3b8" fontSize="7" fontFamily="monospace">
                  kg = {transport.externalMassTransferCoeff.toFixed(4)} m/s
                </text>

                {/* Bulk gas label */}
                <text x="20" y="30" fill="#94a3b8" fontSize="9">
                  Bulk Gas (CA,b = {transport.bulkConcentration.toFixed(3)} mol/m³)
                </text>
                <text x="20" y="44" fill="#e2e8f0" fontSize="8" fontFamily="monospace">
                  Re = {hydrodynamics.reynoldsNumber.toFixed(2)} | Sh = {hydrodynamics.sherwoodNumber.toFixed(2)}
                </text>

                {/* Flux arrows entering pellet */}
                <path d="M 85 90 L 105 100" stroke="#f59e0b" strokeWidth="1.5" markerEnd="url(#arrow)" />
                <text x="50" y="85" fill="#f59e0b" fontSize="8">Reactant Flux</text>

                {/* Heat dissipation arrow */}
                <path d="M 160 52 L 160 28" stroke="#f43f5e" strokeWidth="1.5" />
                <text x="165" y="38" fill="#f43f5e" fontSize="8">Exothermic Heat Release</text>
              </svg>
              <div className="text-[11px] text-slate-400 mt-2 text-center">
                Boundary layer mass transfer (Carberry) occurs across δ; internal diffusion (Weisz-Prater) occurs within porous network.
              </div>
            </div>
          )}

          {activeTab === 'profiles' && (
            <div className="w-full flex flex-col items-center justify-center p-2">
              <svg viewBox="0 0 320 220" className="w-full max-h-[260px] select-none font-mono">
                {/* Background */}
                <rect x="10" y="10" width="300" height="200" fill="#0a0e17" rx="6" />

                {/* Axes */}
                <line x1="50" y1="170" x2="280" y2="170" stroke="#475569" strokeWidth="1.2" />
                <line x1="50" y1="30" x2="50" y2="170" stroke="#475569" strokeWidth="1.2" />

                {/* Axis Labels */}
                <text x="165" y="195" fill="#94a3b8" fontSize="9" textAnchor="middle">
                  Dimensionless Pellet Radius (r / R)
                </text>
                <text x="25" y="100" fill="#94a3b8" fontSize="8" transform="rotate(-90 25 100)" textAnchor="middle">
                  Concentration / Temp
                </text>

                {/* Center and surface ticks */}
                <text x="50" y="182" fill="#64748b" fontSize="8" textAnchor="middle">0 (Core)</text>
                <text x="220" y="182" fill="#64748b" fontSize="8" textAnchor="middle">1 (Surface)</text>
                <text x="270" y="182" fill="#64748b" fontSize="8" textAnchor="middle">Bulk</text>

                {/* Surface demarcation line */}
                <line x1="220" y1="35" x2="220" y2="170" stroke="#334155" strokeDasharray="3 3" />

                {/* Concentration Profile CA(r) Curve */}
                {/* Surface to center: drops based on Thiele modulus / Weisz-Prater */}
                {(() => {
                  const dropFactor = Math.min(0.85, transport.thieleModulus * 0.4);
                  const ySurf = 70;
                  const yCenter = ySurf + (160 - ySurf) * dropFactor;
                  const yBulk = 55;
                  return (
                    <>
                      {/* Film drop: Bulk to Surface */}
                      <line x1="270" y1={yBulk} x2="220" y2={ySurf} stroke="#38bdf8" strokeWidth="2" />
                      {/* Pellet profile: parabolic drop to center */}
                      <path
                        d={`M 220 ${ySurf} Q 135 ${yCenter} 50 ${yCenter}`}
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth="2.5"
                      />
                      <circle cx="270" cy={yBulk} r="3" fill="#38bdf8" />
                      <circle cx="220" cy={ySurf} r="3" fill="#fbbf24" />
                      <circle cx="50" cy={yCenter} r="3" fill="#f59e0b" />
                      <text x="110" y={yCenter - 8} fill="#f59e0b" fontSize="8">
                        CA(r) inside pore
                      </text>
                    </>
                  );
                })()}

                {/* Temperature Profile Curve (Exothermic case rise) */}
                <path
                  d="M 50 120 Q 140 125 220 135 L 270 145"
                  fill="none"
                  stroke="#f43f5e"
                  strokeWidth="1.8"
                  strokeDasharray="4 2"
                />
                <text x="110" y="145" fill="#f43f5e" fontSize="8">
                  T(r) thermal profile
                </text>
              </svg>
              <div className="text-[11px] text-slate-400 mt-2 text-center">
                Pellet effectiveness factor: <span className="text-amber-300 font-bold font-mono">{(transport.effectivenessFactor * 100).toFixed(1)}%</span> | Thiele modulus <span className="font-mono text-cyan-300">φ = {transport.thieleModulus.toFixed(3)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Right Telemetry Column */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-3">
          {/* Hydrodynamic Telemetry Box */}
          <div className="bg-[#0b0f17] border border-slate-800 p-3 rounded-lg text-xs font-mono space-y-2">
            <div className="flex items-center justify-between text-slate-400 pb-1.5 border-b border-slate-800/80">
              <span className="flex items-center gap-1.5 font-sans font-semibold text-slate-200">
                <Wind className="w-3.5 h-3.5 text-cyan-400" /> Bed Hydrodynamics
              </span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                hydrodynamics.reynoldsValid ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-rose-950 text-rose-400 border border-rose-800'
              }`}>
                {hydrodynamics.reynoldsValid ? 'Re in Valid Window' : 'Re Range Warning'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-[11px]">
              <div>
                <span className="text-slate-500">Reynolds (Re):</span>
                <span className="ml-1 text-slate-200 font-semibold">{hydrodynamics.reynoldsNumber.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-slate-500">Schmidt (Sc):</span>
                <span className="ml-1 text-slate-200 font-semibold">{hydrodynamics.schmidtNumber.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-slate-500">Prandtl (Pr):</span>
                <span className="ml-1 text-slate-200 font-semibold">{hydrodynamics.prandtlNumber.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-slate-500">Sherwood (Sh):</span>
                <span className="ml-1 text-cyan-300 font-semibold">{hydrodynamics.sherwoodNumber.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-slate-500">Nusselt (Nu):</span>
                <span className="ml-1 text-amber-300 font-semibold">{hydrodynamics.nusseltNumber.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-slate-500">Bodenstein (Bo):</span>
                <span className="ml-1 text-indigo-300 font-semibold">{hydrodynamics.bodensteinNumber.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Micro-kinetic Diagnostics Summary */}
          <div className="bg-[#0b0f17] border border-slate-800 p-3 rounded-lg text-xs font-mono space-y-2">
            <div className="flex items-center justify-between text-slate-400 pb-1.5 border-b border-slate-800/80">
              <span className="flex items-center gap-1.5 font-sans font-semibold text-slate-200">
                <Flame className="w-3.5 h-3.5 text-rose-400" /> Microkinetic Limiting Factors
              </span>
              <span className="text-[10px] text-slate-500">Mears / Weisz</span>
            </div>

            <div className="space-y-1.5 text-[11px]">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Pore Diffusion (Weisz-Prater):</span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${weiszCrit?.passed ? 'text-emerald-400 bg-emerald-950/60' : 'text-rose-400 bg-rose-950/60'}`}>
                  Φ = {weiszCrit?.calculatedValue.toFixed(4)} ({weiszCrit?.passed ? 'PASS' : 'FAIL'})
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Film Mass Transfer (Carberry):</span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${carberryCrit?.passed ? 'text-emerald-400 bg-emerald-950/60' : 'text-rose-400 bg-rose-950/60'}`}>
                  Ca = {carberryCrit?.calculatedValue.toFixed(4)} ({carberryCrit?.passed ? 'PASS' : 'FAIL'})
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Film Temp Drop (ΔTfilm):</span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${filmHeatCrit?.passed ? 'text-emerald-400 bg-emerald-950/60' : 'text-rose-400 bg-rose-950/60'}`}>
                  {filmHeatCrit?.calculatedValue.toFixed(4)} K ({filmHeatCrit?.passed ? 'PASS' : 'FAIL'})
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Adiabatic Temp Rise:</span>
                <span className="text-amber-300 font-semibold">{transport.adiabaticTemperatureRise.toFixed(2)} K</span>
              </div>
            </div>
          </div>

          {/* Quick Guidance Alert */}
          <div className="text-[11px] p-2.5 rounded bg-slate-900/60 border border-slate-800 text-slate-400 flex items-start gap-2">
            <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span>
              Intrinsic kinetics require all transport gradients to introduce {'<'} 5% error. Check each criterion below for full term substitutions.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
