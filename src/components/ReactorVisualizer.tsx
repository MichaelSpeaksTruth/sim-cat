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
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col">
      {/* Top Header Bar */}
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-blue-600" />
          <span className="font-bold text-xs tracking-wider uppercase text-slate-800">
            Reactor Cross-Section & Pellet Microkinetics
          </span>
          <span className="text-[11px] px-2 py-0.5 rounded bg-white text-slate-600 border border-slate-200 font-mono">
            d_t = {(inputs.tubeDiameter * 1000).toFixed(1)} mm | L = {(inputs.bedHeight * 1000).toFixed(1)} mm
          </span>
        </div>

        {/* Tab Controls */}
        <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-medium">
          <button
            onClick={() => setActiveTab('bed')}
            className={`px-3 py-1 rounded-md transition-all ${
              activeTab === 'bed'
                ? 'bg-white text-blue-700 font-bold border border-slate-200 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Packed Bed 2D
          </button>
          <button
            onClick={() => setActiveTab('pellet')}
            className={`px-3 py-1 rounded-md transition-all flex items-center gap-1.5 ${
              activeTab === 'pellet'
                ? 'bg-white text-blue-700 font-bold border border-slate-200 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ZoomIn className="w-3.5 h-3.5" />
            Pellet & Film Boundary
          </button>
          <button
            onClick={() => setActiveTab('profiles')}
            className={`px-3 py-1 rounded-md transition-all ${
              activeTab === 'profiles'
                ? 'bg-white text-blue-700 font-bold border border-slate-200 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Concentration / Temp Gradient
          </button>
        </div>
      </div>

      {/* Main Viewport */}
      <div className="p-4 grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
        {/* Visual Canvas / SVG */}
        <div className="lg:col-span-7 flex justify-center items-center bg-slate-50/70 rounded-lg p-3 border border-slate-200 min-h-[340px] relative overflow-hidden">
          {activeTab === 'bed' && (
            <div className="flex flex-col items-center">
              {/* Syngas Feed Inflow Vector */}
              <div className="flex items-center gap-2 mb-2 text-xs font-mono text-blue-700 font-semibold animate-pulse">
                <ArrowDown className="w-4 h-4" />
                <span>Bulk Syngas Feed (u₀ = {hydrodynamics.superficialVelocity.toFixed(3)} m/s)</span>
                <ArrowDown className="w-4 h-4" />
              </div>

              {/* Reactor Tube Wall & Particle Packing Canvas */}
              <div className="relative">
                <svg
                  width="200"
                  height="280"
                  viewBox="0 0 200 280"
                  className="overflow-visible drop-shadow-sm"
                >
                  <defs>
                    {/* Metal Reactor Wall Texture */}
                    <linearGradient id="tubeWallGradLight" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#94a3b8" />
                      <stop offset="50%" stopColor="#cbd5e1" />
                      <stop offset="100%" stopColor="#94a3b8" />
                    </linearGradient>

                    {/* Catalyst Active Pellet Gradient */}
                    <radialGradient id="catPelletGradLight" cx="35%" cy="35%" r="65%">
                      <stop offset="0%" stopColor="#3b82f6" />
                      <stop offset="60%" stopColor="#1d4ed8" />
                      <stop offset="100%" stopColor="#1e3a8a" />
                    </radialGradient>

                    {/* Inert Diluent (SiC) Pellet Gradient */}
                    <radialGradient id="inertPelletGradLight" cx="35%" cy="35%" r="65%">
                      <stop offset="0%" stopColor="#cbd5e1" />
                      <stop offset="70%" stopColor="#94a3b8" />
                      <stop offset="100%" stopColor="#64748b" />
                    </radialGradient>
                  </defs>

                  {/* Left Tube Wall */}
                  <rect x="12" y="10" width="12" height="260" rx="3" fill="url(#tubeWallGradLight)" stroke="#64748b" strokeWidth="1" />

                  {/* Right Tube Wall */}
                  <rect x="176" y="10" width="12" height="260" rx="3" fill="url(#tubeWallGradLight)" stroke="#64748b" strokeWidth="1" />

                  {/* Inner Bed Fluid Domain */}
                  <rect x="24" y="15" width="152" height="250" fill="#f8fafc" stroke="#e2e8f0" />

                  {/* Particles */}
                  {particles.map((p) => (
                    <circle
                      key={p.id}
                      cx={p.x}
                      cy={p.y}
                      r={p.r}
                      fill={p.isInert ? 'url(#inertPelletGradLight)' : 'url(#catPelletGradLight)'}
                      stroke={p.isInert ? '#475569' : '#1e3a8a'}
                      strokeWidth="0.8"
                      className="transition-transform duration-200 hover:scale-125 cursor-pointer"
                    />
                  ))}
                </svg>

                {/* Dimension Annotations */}
                <div className="absolute -left-10 top-1/2 -translate-y-1/2 -rotate-90 text-[10px] font-mono text-slate-500 whitespace-nowrap">
                  Bed L = {(inputs.bedHeight * 1000).toFixed(0)} mm
                </div>
                <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] font-mono text-slate-500 whitespace-nowrap">
                  Tube dt = {(inputs.tubeDiameter * 1000).toFixed(1)} mm
                </div>
              </div>

              {/* Effluent Outflow Vector */}
              <div className="flex items-center gap-2 mt-4 text-xs font-mono text-slate-600">
                <ArrowDown className="w-3.5 h-3.5" />
                <span>Effluent: X_A = {(inputs.conversion * 100).toFixed(1)}%</span>
                <ArrowDown className="w-3.5 h-3.5" />
              </div>
            </div>
          )}

          {activeTab === 'pellet' && (
            <div className="flex flex-col items-center justify-center p-2">
              <svg width="280" height="260" viewBox="0 0 280 260">
                <defs>
                  <radialGradient id="pelletCoreLight" cx="40%" cy="40%" r="60%">
                    <stop offset="0%" stopColor="#bfdbfe" />
                    <stop offset="60%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#1d4ed8" />
                  </radialGradient>
                </defs>

                {/* Bulk Gas Atmosphere */}
                <rect x="10" y="10" width="260" height="240" rx="8" fill="#f1f5f9" stroke="#cbd5e1" strokeDasharray="3 3" />
                <text x="25" y="32" fill="#475569" fontSize="10" fontFamily="monospace">
                  Bulk Syngas: C_A,b = {transport.bulkConcentration.toFixed(1)} mol/m³
                </text>

                {/* Gas Boundary Film */}
                <circle
                  cx="140"
                  cy="135"
                  r="78"
                  fill="rgba(59, 130, 246, 0.08)"
                  stroke="#3b82f6"
                  strokeWidth="1.5"
                  strokeDasharray="4 3"
                />
                <text x="140" y="52" textAnchor="middle" fill="#2563eb" fontSize="10" fontFamily="monospace" fontWeight="bold">
                  Stagnant Gas Film Boundary (δ_film)
                </text>

                {/* Solid Porous Catalyst Pellet */}
                <circle
                  cx="140"
                  cy="135"
                  r="56"
                  fill="url(#pelletCoreLight)"
                  stroke="#1e40af"
                  strokeWidth="2"
                />

                {/* Center Core Annotation */}
                <circle cx="140" cy="135" r="4" fill="#1e3a8a" />
                <text x="140" y="139" textAnchor="middle" fill="#ffffff" fontSize="9" fontFamily="monospace">
                  r=0
                </text>
                <text x="140" y="165" textAnchor="middle" fill="#ffffff" fontSize="10" fontFamily="monospace" fontWeight="bold">
                  Porous Matrix
                </text>
                <text x="140" y="178" textAnchor="middle" fill="#e0f2fe" fontSize="9" fontFamily="monospace">
                  d_p = {(inputs.particleDiameter * 1e6).toFixed(0)} µm
                </text>
              </svg>
            </div>
          )}

          {activeTab === 'profiles' && (
            <div className="w-full max-w-[340px] space-y-3 font-mono text-xs">
              <div className="p-3 bg-white rounded border border-slate-200 shadow-2xs space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 font-semibold">Centerline Temp Hotspot (ΔT_rad):</span>
                  <span className="font-bold text-slate-900">{simulation.transport.observedVolumetricRate > 0 ? (simulation.criteria.find(c => c.id === 'radial_heat_transfer')?.calculatedValue || 0).toFixed(3) : 0} K</span>
                </div>
                <div className="flex justify-between items-center text-[11px] text-slate-500">
                  <span>Mears Maximum Limit:</span>
                  <span>{(simulation.criteria.find(c => c.id === 'radial_heat_transfer')?.limitValue || 0).toFixed(3)} K</span>
                </div>
              </div>

              <div className="p-3 bg-white rounded border border-slate-200 shadow-2xs space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 font-semibold">Boundary Film Temp Jump (ΔT_film):</span>
                  <span className="font-bold text-slate-900">{(simulation.criteria.find(c => c.id === 'external_heat_transfer')?.calculatedValue || 0).toFixed(4)} K</span>
                </div>
                <div className="flex justify-between items-center text-[11px] text-slate-500">
                  <span>Mears Film Maximum:</span>
                  <span>{(simulation.criteria.find(c => c.id === 'external_heat_transfer')?.limitValue || 0).toFixed(3)} K</span>
                </div>
              </div>

              <div className="p-3 bg-white rounded border border-slate-200 shadow-2xs space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 font-semibold">Pellet Effectiveness Factor (η):</span>
                  <span className="font-bold text-blue-700">{(simulation.transport.effectivenessFactor * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between items-center text-[11px] text-slate-500">
                  <span>Thiele Modulus (ϕ):</span>
                  <span>{simulation.transport.thieleModulus.toFixed(3)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Info Legend & Hydrodynamic State */}
        <div className="lg:col-span-5 space-y-3 font-mono text-xs">
          {/* Key Flow & Transport Metrics Grid */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="text-[10px] text-slate-500 block uppercase">Reynolds Number</span>
              <span className="text-sm font-bold text-slate-900">{hydrodynamics.reynoldsNumber.toFixed(2)}</span>
              <span className="text-[10px] text-slate-500 block">Laminar (Re &lt; 2000)</span>
            </div>

            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="text-[10px] text-slate-500 block uppercase">Superficial Velocity</span>
              <span className="text-sm font-bold text-slate-900">{hydrodynamics.superficialVelocity.toFixed(4)}</span>
              <span className="text-[10px] text-slate-500 block">m/s</span>
            </div>

            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="text-[10px] text-slate-500 block uppercase">Gas Density (ρ_G)</span>
              <span className="text-sm font-bold text-slate-900">{hydrodynamics.gasDensity.toFixed(3)}</span>
              <span className="text-[10px] text-slate-500 block">kg/m³ (at P, T)</span>
            </div>

            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="text-[10px] text-slate-500 block uppercase">Bodenstein Number</span>
              <span className="text-sm font-bold text-slate-900">{hydrodynamics.bodensteinNumber.toFixed(2)}</span>
              <span className="text-[10px] text-slate-500 block">Bo (Wakao Form)</span>
            </div>
          </div>

          {/* Visual Legend */}
          <div className="p-3 bg-slate-50/70 border border-slate-200 rounded-lg space-y-2">
            <span className="text-[11px] font-bold text-slate-700 block font-sans">Visual Packing Legend:</span>
            <div className="flex items-center gap-4 text-slate-600 text-[11px]">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-blue-600 border border-blue-800"></span>
                <span>Active Ammonia Catalyst ({((1 - bDilution) * 100).toFixed(0)}%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-slate-400 border border-slate-600"></span>
                <span>Inert SiC Diluent ({(bDilution * 100).toFixed(0)}%)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
