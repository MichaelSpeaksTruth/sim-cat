import React, { useState, useMemo } from 'react';
import { SimulationResult } from '../types/eurokin';
import { Layers, ZoomIn, Activity, Flame, Wind, ArrowDown, Play, Pause } from 'lucide-react';
import { MathView } from './MathView';

interface ReactorVisualizerProps {
  simulation: SimulationResult;
}

export const ReactorVisualizer: React.FC<ReactorVisualizerProps> = ({ simulation }) => {
  const [activeTab, setActiveTab] = useState<'bed' | 'pellet' | 'profiles'>('bed');
  const [animationEnabled, setAnimationEnabled] = useState(true);

  const { inputs, hydrodynamics, transport, criteria } = simulation;
  const bDilution = transport.volumetricDilutionFraction;

  // Generate deterministic particle positions for the bed packing graphic
  const particles = useMemo(() => {
    const list: Array<{ x: number; y: number; r: number; isInert: boolean; id: number; delay: number }> = [];
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
        const delay = pseudoRandom() * 2.5;
        list.push({ x, y, r, isInert, id: row * cols + col, delay });
      }
    }
    return list;
  }, [bDilution]);

  // Generate flowing tracer fluid packets traveling through the void channels
  const tracers = useMemo(() => {
    return [
      { id: 1, x: 42, delay: 0.0, speed: 2.2 },
      { id: 2, x: 58, delay: 0.7, speed: 2.4 },
      { id: 3, x: 74, delay: 1.4, speed: 2.1 },
      { id: 4, x: 88, delay: 0.3, speed: 2.3 },
      { id: 5, x: 104, delay: 1.1, speed: 2.0 },
      { id: 6, x: 118, delay: 1.8, speed: 2.5 },
      { id: 7, x: 134, delay: 0.5, speed: 2.2 },
      { id: 8, x: 150, delay: 1.3, speed: 2.4 },
      { id: 9, x: 50, delay: 1.9, speed: 2.3 },
      { id: 10, x: 80, delay: 0.9, speed: 2.1 },
      { id: 11, x: 112, delay: 0.2, speed: 2.2 },
      { id: 12, x: 142, delay: 1.6, speed: 2.5 },
    ];
  }, []);

  return (
    <div className="bg-[#0A0D12] border border-[#1E2533] overflow-hidden flex flex-col">
      <style>{`
        @keyframes streamlineFlow {
          from {
            stroke-dashoffset: 0;
          }
          to {
            stroke-dashoffset: -32;
          }
        }
        @keyframes tracerFall {
          0% {
            transform: translateY(0px);
            opacity: 0;
          }
          10% {
            opacity: 0.9;
          }
          85% {
            opacity: 0.9;
          }
          100% {
            transform: translateY(240px);
            opacity: 0;
          }
        }
        @keyframes feedArrowPulse {
          0%, 100% {
            transform: translateY(0px);
            opacity: 0.6;
          }
          50% {
            transform: translateY(3px);
            opacity: 1;
          }
        }
        @keyframes catSurfaceTurnover {
          0%, 100% {
            opacity: 0.92;
          }
          50% {
            opacity: 1;
            filter: drop-shadow(0 0 2.5px rgba(37,99,235,0.7));
          }
        }
        @keyframes radialFilmFlux {
          0% {
            stroke-dashoffset: 20;
            opacity: 0.4;
          }
          50% {
            opacity: 1;
          }
          100% {
            stroke-dashoffset: 0;
            opacity: 0.4;
          }
        }
        .animate-streamline {
          animation: streamlineFlow 1.8s linear infinite;
        }
        .animate-streamline-fast {
          animation: streamlineFlow 1.3s linear infinite;
        }
        .animate-streamline-slow {
          animation: streamlineFlow 2.4s linear infinite;
        }
        .animate-feed-arrow {
          animation: feedArrowPulse 1.4s ease-in-out infinite;
        }
      `}</style>

      {/* Top Header Bar */}
      <div className="px-4 py-2.5 bg-[#141922] border-b border-[#1E2533] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-[#00D8F6]" />
          <span className="font-mono font-bold text-xs tracking-wider uppercase text-slate-100">
            Reactor Cross-Section & Microkinetics
          </span>
          <span className="text-[11px] px-2 py-0.5 bg-[#0A0D12] text-slate-300 border border-[#1E2533] font-mono">
            d_t = {(inputs.tubeDiameter * 1000).toFixed(1)} mm | L = {(inputs.bedHeight * 1000).toFixed(1)} mm
          </span>
        </div>

        {/* Tab Controls & Animation Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAnimationEnabled(!animationEnabled)}
            title={animationEnabled ? 'Pause Flow Animation' : 'Start Flow Animation'}
            className={`px-2 py-1 text-[11px] font-mono flex items-center gap-1 border transition-colors ${
              animationEnabled
                ? 'bg-[#00D8F6]/10 text-[#00D8F6] border-[#00D8F6]/30'
                : 'bg-[#141922] text-slate-400 border-[#1E2533]'
            }`}
          >
            {animationEnabled ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            <span>{animationEnabled ? 'Flow: Active' : 'Flow: Paused'}</span>
          </button>

          <div className="flex bg-[#141922] p-0.5 border border-[#1E2533] text-xs font-mono">
            <button
              onClick={() => setActiveTab('bed')}
              className={`px-3 py-1 font-bold uppercase tracking-wider transition-all ${
                activeTab === 'bed'
                  ? 'bg-[#00D8F6] text-[#080A0D]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Packed Bed 2D
            </button>
            <button
              onClick={() => setActiveTab('pellet')}
              className={`px-3 py-1 font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                activeTab === 'pellet'
                  ? 'bg-[#00D8F6] text-[#080A0D]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ZoomIn className="w-3.5 h-3.5" />
              Pellet Film
            </button>
            <button
              onClick={() => setActiveTab('profiles')}
              className={`px-3 py-1 font-bold uppercase tracking-wider transition-all ${
                activeTab === 'profiles'
                  ? 'bg-[#00D8F6] text-[#080A0D]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Gradients
            </button>
          </div>
        </div>
      </div>

      {/* Main Viewport */}
      <div className="p-4 grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
        {/* Visual Canvas / SVG */}
        <div className="lg:col-span-7 flex justify-center items-center bg-[#080A0D] p-3 border border-[#1E2533] min-h-[340px] relative overflow-hidden">
          {activeTab === 'bed' && (
            <div className="flex flex-col items-center">
              {/* Syngas Feed Inflow Vector */}
              <div className="flex items-center gap-2 mb-2 text-xs font-mono text-blue-700 font-semibold">
                <span className={animationEnabled ? 'animate-feed-arrow' : ''}>
                  <ArrowDown className="w-3.5 h-3.5" />
                </span>
                <span>Feed: u₀ = {hydrodynamics.superficialVelocity.toFixed(4)} m/s</span>
                <span className={animationEnabled ? 'animate-feed-arrow' : ''}>
                  <ArrowDown className="w-3.5 h-3.5" />
                </span>
              </div>

              {/* Reactor Tube Wall & Particle Packing Canvas */}
              <div className="relative">
                <svg
                  width="200"
                  height="280"
                  viewBox="0 0 200 280"
                  className="overflow-visible drop-shadow-sm select-none"
                >
                  <defs>
                    {/* Metal Reactor Wall Texture */}
                    <linearGradient id="tubeWallGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#94a3b8" />
                      <stop offset="50%" stopColor="#cbd5e1" />
                      <stop offset="100%" stopColor="#94a3b8" />
                    </linearGradient>

                    {/* Catalyst Active Pellet Gradient */}
                    <radialGradient id="catPelletGrad" cx="35%" cy="35%" r="65%">
                      <stop offset="0%" stopColor="#38bdf8" />
                      <stop offset="55%" stopColor="#1d4ed8" />
                      <stop offset="100%" stopColor="#1e3a8a" />
                    </radialGradient>

                    {/* Inert Diluent (SiC) Pellet Gradient */}
                    <radialGradient id="inertPelletGrad" cx="35%" cy="35%" r="65%">
                      <stop offset="0%" stopColor="#e2e8f0" />
                      <stop offset="70%" stopColor="#94a3b8" />
                      <stop offset="100%" stopColor="#64748b" />
                    </radialGradient>

                    {/* Fluid Tracer Glow */}
                    <radialGradient id="fluidTracerGlow" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#38bdf8" stopOpacity="1" />
                      <stop offset="70%" stopColor="#0284c7" stopOpacity="0.8" />
                      <stop offset="100%" stopColor="#0369a1" stopOpacity="0" />
                    </radialGradient>
                  </defs>

                  {/* Left Tube Wall */}
                  <rect x="12" y="10" width="12" height="260" rx="3" fill="url(#tubeWallGrad)" stroke="#64748b" strokeWidth="1" />

                  {/* Right Tube Wall */}
                  <rect x="176" y="10" width="12" height="260" rx="3" fill="url(#tubeWallGrad)" stroke="#64748b" strokeWidth="1" />

                  {/* Inner Bed Fluid Domain */}
                  <rect x="24" y="15" width="152" height="250" fill="#f8fafc" stroke="#e2e8f0" />

                  {/* Fluid Dynamics: Tortuous Interstitial Streamlines */}
                  <g opacity={animationEnabled ? 0.75 : 0.35}>
                    <path
                      d="M 44 15 Q 40 50, 48 85 T 41 155 T 48 215 T 44 265"
                      fill="none"
                      stroke="#38bdf8"
                      strokeWidth="1.2"
                      strokeDasharray="5 7"
                      className={animationEnabled ? 'animate-streamline-slow' : ''}
                    />
                    <path
                      d="M 68 15 Q 74 48, 66 100 T 73 165 T 67 225 T 70 265"
                      fill="none"
                      stroke="#0284c7"
                      strokeWidth="1.4"
                      strokeDasharray="6 8"
                      className={animationEnabled ? 'animate-streamline' : ''}
                    />
                    <path
                      d="M 100 15 Q 94 60, 106 115 T 95 180 T 104 235 T 100 265"
                      fill="none"
                      stroke="#2563eb"
                      strokeWidth="1.6"
                      strokeDasharray="6 8"
                      className={animationEnabled ? 'animate-streamline-fast' : ''}
                    />
                    <path
                      d="M 132 15 Q 138 52, 127 105 T 134 170 T 128 230 T 132 265"
                      fill="none"
                      stroke="#0284c7"
                      strokeWidth="1.4"
                      strokeDasharray="6 8"
                      className={animationEnabled ? 'animate-streamline' : ''}
                    />
                    <path
                      d="M 156 15 Q 151 45, 159 90 T 153 155 T 158 215 T 155 265"
                      fill="none"
                      stroke="#38bdf8"
                      strokeWidth="1.2"
                      strokeDasharray="5 7"
                      className={animationEnabled ? 'animate-streamline-slow' : ''}
                    />
                  </g>

                  {/* Catalyst & Inert Pellets */}
                  {particles.map((p) => (
                    <circle
                      key={p.id}
                      cx={p.x}
                      cy={p.y}
                      r={p.r}
                      fill={p.isInert ? 'url(#inertPelletGrad)' : 'url(#catPelletGrad)'}
                      stroke={p.isInert ? '#475569' : '#1e3a8a'}
                      strokeWidth="0.8"
                      style={
                        !p.isInert && animationEnabled
                          ? {
                              animation: `catSurfaceTurnover 2.6s ease-in-out infinite`,
                              animationDelay: `${p.delay}s`,
                            }
                          : undefined
                      }
                      className="transition-transform duration-200 hover:scale-125 cursor-pointer"
                    >
                      <title>{p.isInert ? 'Inert SiC Diluent' : 'Active Ammonia Catalyst Pellet'}</title>
                    </circle>
                  ))}

                  {/* Flowing Gas Tracer Particles */}
                  {animationEnabled && (
                    <g className="flow-tracers pointer-events-none">
                      {tracers.map((t) => (
                        <circle
                          key={t.id}
                          cx={t.x}
                          cy={20}
                          r="2.2"
                          fill="url(#fluidTracerGlow)"
                          stroke="#38bdf8"
                          strokeWidth="0.5"
                          style={{
                            animation: `tracerFall ${t.speed}s linear infinite`,
                            animationDelay: `${t.delay}s`,
                          }}
                        />
                      ))}
                    </g>
                  )}
                </svg>

                {/* Dimension Annotations */}
                <div className="absolute -left-10 top-1/2 -translate-y-1/2 -rotate-90 text-[10px] font-mono text-slate-500 whitespace-nowrap">
                  Bed L = {(inputs.bedHeight * 1000).toFixed(0)} mm
                </div>
                <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] font-mono text-slate-500 whitespace-nowrap">
                  Tube D_t = {(inputs.tubeDiameter * 1000).toFixed(1)} mm
                </div>
              </div>

              {/* Effluent Outflow Vector */}
              <div className="flex items-center gap-2 mt-4 text-xs font-mono text-slate-600">
                <span className={animationEnabled ? 'animate-feed-arrow' : ''}>
                  <ArrowDown className="w-3.5 h-3.5" />
                </span>
                <span>
                  Effluent: X_A = {(inputs.conversion * 100).toFixed(1)}% | ΔP = {(simulation.criteria.find(c => c.id === 'pressure_drop')?.calculatedValue || 0).toFixed(0)} Pa
                </span>
                <span className={animationEnabled ? 'animate-feed-arrow' : ''}>
                  <ArrowDown className="w-3.5 h-3.5" />
                </span>
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
                <rect x="10" y="10" width="260" height="240" rx="8" fill="#f8fafc" stroke="#cbd5e1" strokeDasharray="3 3" />
                <text x="25" y="32" fill="#475569" fontSize="10" fontFamily="monospace">
                  Bulk Gas: C_A,b = {transport.bulkConcentration.toFixed(1)} mol/m³
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
                  className={animationEnabled ? 'animate-streamline' : ''}
                />
                <text x="140" y="52" textAnchor="middle" fill="#2563eb" fontSize="10" fontFamily="monospace" fontWeight="bold">
                  Stagnant Gas Film (δ_film)
                </text>

                {/* Radial Inward Diffusion Flux Lines */}
                <g opacity="0.6">
                  <line x1="62" y1="135" x2="84" y2="135" stroke="#2563eb" strokeWidth="1.5" strokeDasharray="3 2" className={animationEnabled ? 'animate-streamline' : ''} />
                  <line x1="218" y1="135" x2="196" y2="135" stroke="#2563eb" strokeWidth="1.5" strokeDasharray="3 2" className={animationEnabled ? 'animate-streamline' : ''} />
                  <line x1="140" y1="57" x2="140" y2="79" stroke="#2563eb" strokeWidth="1.5" strokeDasharray="3 2" className={animationEnabled ? 'animate-streamline' : ''} />
                  <line x1="140" y1="213" x2="140" y2="191" stroke="#2563eb" strokeWidth="1.5" strokeDasharray="3 2" className={animationEnabled ? 'animate-streamline' : ''} />
                </g>

                {/* Solid Porous Catalyst Pellet */}
                <circle
                  cx="140"
                  cy="135"
                  r="56"
                  fill="url(#pelletCoreLight)"
                  stroke="#1e40af"
                  strokeWidth="2"
                  style={
                    animationEnabled
                      ? {
                          animation: 'catSurfaceTurnover 3s ease-in-out infinite',
                        }
                      : undefined
                  }
                />

                {/* Center Core Annotation */}
                <circle cx="140" cy="135" r="4" fill="#1e3a8a" />
                <text x="140" y="139" textAnchor="middle" fill="#ffffff" fontSize="9" fontFamily="monospace">
                  r=0
                </text>
                <text x="140" y="165" textAnchor="middle" fill="#ffffff" fontSize="10" fontFamily="monospace" fontWeight="bold">
                  Porous Catalyst
                </text>
                <text x="140" y="178" textAnchor="middle" fill="#e0f2fe" fontSize="9" fontFamily="monospace">
                  d_p = {(inputs.particleDiameter * 1e6).toFixed(0)} µm
                </text>
              </svg>
            </div>
          )}

          {activeTab === 'profiles' && (
            <div className="w-full max-w-[340px] space-y-3 font-mono text-xs">
              <div className="p-3 bg-[#141922] border border-[#1E2533] space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-semibold">Centerline Hotspot (ΔT_rad):</span>
                  <span className="font-bold text-slate-100">
                    {simulation.transport.observedVolumetricRate > 0
                      ? (simulation.criteria.find(c => c.id === 'radial_heat_transfer')?.calculatedValue || 0).toFixed(3)
                      : 0}{' '}
                    K
                  </span>
                </div>
                <div className="flex justify-between items-center text-[11px] text-slate-500">
                  <span>Mears Maximum Limit:</span>
                  <span>{(simulation.criteria.find(c => c.id === 'radial_heat_transfer')?.limitValue || 0).toFixed(3)} K</span>
                </div>
              </div>

              <div className="p-3 bg-[#141922] border border-[#1E2533] space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-semibold">Boundary Film Jump (ΔT_film):</span>
                  <span className="font-bold text-slate-100">
                    {(simulation.criteria.find(c => c.id === 'external_heat_transfer')?.calculatedValue || 0).toFixed(4)} K
                  </span>
                </div>
                <div className="flex justify-between items-center text-[11px] text-slate-500">
                  <span>Mears Film Limit:</span>
                  <span>{(simulation.criteria.find(c => c.id === 'external_heat_transfer')?.limitValue || 0).toFixed(3)} K</span>
                </div>
              </div>

              <div className="p-3 bg-[#141922] border border-[#1E2533] space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-semibold">Effectiveness Factor (η):</span>
                  <span className="font-bold text-[#00D8F6]">{(simulation.transport.effectivenessFactor * 100).toFixed(1)}%</span>
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
            <div className="p-2.5 bg-[#141922] border border-[#1E2533]">
              <span className="text-[10px] text-slate-500 block uppercase">Reynolds Number</span>
              <span className="text-sm font-bold text-slate-200">{hydrodynamics.reynoldsNumber.toFixed(2)}</span>
              <span className="text-[10px] text-slate-500 block">Laminar (Re &lt; 2000)</span>
            </div>

            <div className="p-2.5 bg-[#141922] border border-[#1E2533]">
              <span className="text-[10px] text-slate-500 block uppercase">Superficial Velocity</span>
              <span className="text-sm font-bold text-[#00D8F6]">{hydrodynamics.superficialVelocity.toFixed(4)}</span>
              <span className="text-[10px] text-slate-500 block">m/s</span>
            </div>

            <div className="p-2.5 bg-[#141922] border border-[#1E2533]">
              <span className="text-[10px] text-slate-500 block uppercase">Gas Density (ρ_G)</span>
              <span className="text-sm font-bold text-slate-200">{hydrodynamics.gasDensity.toFixed(3)}</span>
              <span className="text-[10px] text-slate-500 block">kg/m³ (at P, T)</span>
            </div>

            <div className="p-2.5 bg-[#141922] border border-[#1E2533]">
              <span className="text-[10px] text-slate-500 block uppercase">Bodenstein Number</span>
              <span className="text-sm font-bold text-slate-200">{hydrodynamics.bodensteinNumber.toFixed(2)}</span>
              <span className="text-[10px] text-slate-500 block">Bo (Wakao Form)</span>
            </div>
          </div>

          {/* Visual Legend */}
          <div className="p-3 bg-[#141922] border border-[#1E2533] space-y-2">
            <span className="text-[11px] font-bold text-slate-300 block font-sans">Visual Packing Legend:</span>
            <div className="flex items-center gap-4 text-slate-400 text-[11px]">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 bg-[#00D8F6] border border-[#00D8F6]"></span>
                <span>Active Catalyst ({((1 - bDilution) * 100).toFixed(0)}%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 bg-slate-500 border border-slate-600"></span>
                <span>Inert Diluent ({(bDilution * 100).toFixed(0)}%)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

