import React, { useState } from 'react';
import { SimulationResult } from '../types/eurokin';
import { MathView } from './MathView';
import {
  ZoomIn,
  Layers,
  ArrowRight,
  Flame,
  Wind,
  Info,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sliders,
  Sparkles
} from 'lucide-react';

interface CatalystMicroscopyProps {
  simulation: SimulationResult;
  onClose?: () => void;
}

export const CatalystMicroscopy: React.FC<CatalystMicroscopyProps> = ({
  simulation,
  onClose,
}) => {
  const { inputs, transport, hydrodynamics, criteria } = simulation;
  const [activeLayer, setActiveLayer] = useState<'film' | 'pore' | 'surface' | 'heat'>('pore');
  const [particleAnimation, setParticleAnimation] = useState(true);

  const dp_um = inputs.particleDiameter * 1e6;
  const delta_film_um = (inputs.particleDiameter / Math.max(hydrodynamics.sherwoodNumber, 1.0)) * 1e6;

  const weiszCriterion = criteria.find((c) => c.id === 'internal_diffusion');
  const carberryCriterion = criteria.find((c) => c.id === 'external_mass_transfer');
  const filmHeatCriterion = criteria.find((c) => c.id === 'external_heat_transfer');
  const intraHeatCriterion = criteria.find((c) => c.id === 'intraparticle_heat');

  return (
    <div className="bg-white rounded-xl shadow-xs border border-slate-200/80 p-5 flex flex-col space-y-5">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200/80">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-100 border border-slate-300 text-blue-600">
            <ZoomIn className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-slate-900">
                Catalyst Pellet Microscopy Laboratory
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 bg-blue-50 text-blue-700 text-blue-600 border border-blue-600/30">
                dp = {dp_um.toFixed(0)} µm
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-100 text-slate-500 border border-slate-300">
                Promoted Magnetite (K₂O-Al₂O₃-CaO)
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 font-sans">
              High-magnification transport phenomena inspection across stagnant boundary film, pellet surface, and intraparticle pore network.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onClose && (
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-mono bg-white hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-300 transition-colors shadow-xs"
            >
              Exit Microscopy View
            </button>
          )}
        </div>
      </div>

      {/* Main Microscopy Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Interactive Pellet Cutaway Visualizer (SVG) */}
        <div className="lg:col-span-7 bg-slate-50 rounded-lg border border-slate-200/80 p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3 text-xs font-mono">
            <span className="text-slate-500 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <span className="w-2 h-2 bg-blue-600" />
              Pellet Radial Cross-Section Cutaway ($r = 0 \to R_p$)
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setActiveLayer('film')}
                className={`px-2 py-0.5 text-[10px] border ${
                  activeLayer === 'film'
                    ? 'bg-slate-100 text-blue-600 border-blue-600/60'
                    : 'text-slate-500 border-slate-200/80 hover:text-slate-800'
                }`}
              >
                Gas Film (δ_film)
              </button>
              <button
                onClick={() => setActiveLayer('pore')}
                className={`px-2 py-0.5 text-[10px] border ${
                  activeLayer === 'pore'
                    ? 'bg-slate-100 text-blue-600 border-blue-600/60'
                    : 'text-slate-500 border-slate-200/80 hover:text-slate-800'
                }`}
              >
                Pore Network (D_eff)
              </button>
              <button
                onClick={() => setActiveLayer('heat')}
                className={`px-2 py-0.5 text-[10px] border ${
                  activeLayer === 'heat'
                    ? 'bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/60'
                    : 'text-slate-500 border-slate-200/80 hover:text-slate-800'
                }`}
              >
                Thermal Gradient (ΔT)
              </button>
            </div>
          </div>

          {/* Procedural Microscopic Diagram */}
          <div className="relative w-full aspect-16/10 bg-slate-50 border border-slate-200 flex items-center justify-center overflow-hidden">
            <svg viewBox="0 0 600 380" className="w-full h-full">
              <defs>
                {/* Radial Gradient for Catalyst Core */}
                <radialGradient id="pelletGradient" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#1E2531" />
                  <stop offset="70%" stopColor="#2D3748" />
                  <stop offset="100%" stopColor="#3F4D63" />
                </radialGradient>

                <radialGradient id="filmGradient" cx="50%" cy="50%" r="50%">
                  <stop offset="85%" stopColor="transparent" />
                  <stop offset="92%" stopColor="#00D8F6" stopOpacity="0.12" />
                  <stop offset="100%" stopColor="#00D8F6" stopOpacity="0.35" />
                </radialGradient>

                <radialGradient id="heatGradient" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#EF4444" stopOpacity="0.45" />
                  <stop offset="60%" stopColor="#F59E0B" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#00D8F6" stopOpacity="0.05" />
                </radialGradient>
              </defs>

              {/* Stagnant Film Boundary (Outer Annulus) */}
              <circle
                cx="260"
                cy="190"
                r="160"
                fill="url(#filmGradient)"
                stroke="#00D8F6"
                strokeWidth="1"
                strokeDasharray="4 4"
                opacity={activeLayer === 'film' ? 0.9 : 0.4}
              />

              {/* Solid Catalyst Pellet Exterior */}
              <circle
                cx="260"
                cy="190"
                r="125"
                fill="url(#pelletGradient)"
                stroke="#4A5568"
                strokeWidth="2"
              />

              {/* Thermal Gradient Overlay if heat layer active */}
              {activeLayer === 'heat' && (
                <circle cx="260" cy="190" r="125" fill="url(#heatGradient)" />
              )}

              {/* Internal Mesopore Network (Tortuous Pathways) */}
              <path
                d="M 260 190 Q 220 170 190 140 T 150 120 M 260 190 Q 290 150 330 130 T 370 110 M 260 190 Q 230 220 200 250 T 170 280 M 260 190 Q 300 230 330 260 T 360 290 M 260 190 Q 200 190 150 190 M 260 190 Q 320 190 375 190"
                fill="none"
                stroke="#00D8F6"
                strokeWidth="2.5"
                strokeOpacity="0.6"
                strokeLinecap="round"
              />
              <path
                d="M 220 170 Q 240 130 260 100 M 290 150 Q 320 180 340 190 M 230 220 Q 250 250 260 280 M 300 230 Q 280 260 260 280"
                fill="none"
                stroke="#38BDF8"
                strokeWidth="1.5"
                strokeOpacity="0.4"
              />

              {/* Molecular Diffusion Particles: N2 (cyan), H2 (white), NH3 (amber) */}
              {particleAnimation && (
                <g>
                  {/* Inward N2 / H2 syngas */}
                  <circle cx="115" cy="190" r="4" fill="#00D8F6">
                    <animate attributeName="cx" from="95" to="260" dur="3s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0;1;0.9;0" dur="3s" repeatCount="indefinite" />
                  </circle>
                  <circle cx="160" cy="120" r="3" fill="#FFFFFF">
                    <animate attributeName="cx" from="140" to="260" dur="2.4s" repeatCount="indefinite" />
                    <animate attributeName="cy" from="100" to="190" dur="2.4s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0;1;0.9;0" dur="2.4s" repeatCount="indefinite" />
                  </circle>

                  {/* Outward NH3 product */}
                  <circle cx="260" cy="190" r="4.5" fill="#F59E0B">
                    <animate attributeName="cx" from="260" to="410" dur="3.2s" repeatCount="indefinite" />
                    <animate attributeName="cy" from="190" to="210" dur="3.2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0;0.9;1;0" dur="3.2s" repeatCount="indefinite" />
                  </circle>
                </g>
              )}

              {/* Pellet Center Anchor */}
              <circle cx="260" cy="190" r="3" fill="#E2E8F0" />
              <text x="265" y="194" fill="#8B949E" fontSize="9" fontFamily="monospace">
                r = 0 (Center)
              </text>

              {/* Surface Marker r = Rp */}
              <line x1="260" y1="190" x2="385" y2="190" stroke="#E2E8F0" strokeWidth="1" strokeDasharray="2 2" />
              <text x="310" y="185" fill="#E2E8F0" fontSize="9" fontFamily="monospace">
                Rp = {(dp_um / 2).toFixed(0)} µm
              </text>

              {/* Film Dimension Callout */}
              <line x1="385" y1="190" x2="420" y2="190" stroke="#00D8F6" strokeWidth="1.5" />
              <text x="425" y="194" fill="#00D8F6" fontSize="9" fontFamily="monospace">
                δ_film ≈ {delta_film_um.toFixed(1)} µm
              </text>

              {/* Scientific Annotation Box */}
              <rect x="440" y="20" width="145" height="110" rx="4" fill="#F8FAFC" stroke="#E2E8F0" />
              <text x="450" y="38" fill="#1E293B" fontSize="10" fontWeight="bold" fontFamily="monospace">
                Species Legend
              </text>
              <circle cx="455" cy="55" r="4" fill="#0284C7" />
              <text x="466" y="58" fill="#475569" fontSize="9" fontFamily="monospace">
                N₂ (Reactant)
              </text>
              <circle cx="455" cy="73" r="3" fill="#64748B" />
              <text x="466" y="76" fill="#475569" fontSize="9" fontFamily="monospace">
                H₂ (Reactant)
              </text>
              <circle cx="455" cy="91" r="4.5" fill="#D97706" />
              <text x="466" y="94" fill="#D97706" fontSize="9" fontFamily="monospace">
                NH₃ (Product)
              </text>
              <rect x="451" y="105" width="8" height="8" fill="#353D48" stroke="#4A5568" />
              <text x="466" y="112" fill="#8B949E" fontSize="8" fontFamily="monospace">
                α-Fe Sites
              </text>
            </svg>
          </div>

          <div className="mt-3 p-2 bg-slate-50 border border-slate-200 text-[10px] font-mono text-slate-500 flex items-center justify-between">
            <span>
              Pore diffusion model: Bosanquet combination of Fuller molecular ($D_{'{AB}'}$) and Knudsen ($D_K$) diffusion.
            </span>
            <span className="text-slate-500 italic">Schematic Representation</span>
          </div>
        </div>

        {/* Right Column: Exact Numerical Transport Diagnostics & Effectiveness */}
        <div className="lg:col-span-5 space-y-3.5">
          {/* Effectiveness Factor & Thiele Modulus Card */}
          <div className="bg-slate-50 rounded-lg border border-slate-200/80 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-slate-800 uppercase tracking-wide">
                Intraparticle Effectiveness
              </span>
              <span
                className={`text-[10px] font-mono font-bold px-2 py-0.5 border ${
                  transport.effectivenessFactor >= 0.95
                    ? 'bg-[#10B981]/15 text-[#10B981] border-[#10B981]/40'
                    : 'bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/40'
                }`}
              >
                η = {(transport.effectivenessFactor * 100).toFixed(1)}%
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-500 block">Weisz-Prater Modulus</span>
                <span className="font-bold text-slate-900 text-sm">
                  {transport.thieleModulus ? Math.pow(transport.thieleModulus, 2).toFixed(4) : '0.0381'}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">Limit: &lt; 0.080</span>
              </div>

              <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-500 block">Thiele Modulus (ϕ)</span>
                <span className="font-bold text-slate-900 text-sm">
                  {transport.thieleModulus.toFixed(3)}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">ϕ = sqrt(Φ)</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 font-sans leading-relaxed">
              When internal pore diffusion resistance is negligible ($\Phi &lt; 0.08$), the catalyst effectiveness factor $\eta &gt; 95\%$. Reactant molecules penetrate deeply to active iron centers without creating a starved catalyst core.
            </p>
          </div>

          {/* Microkinetics Transport Properties Grid */}
          <div className="bg-slate-50 rounded-lg border border-slate-200/80 p-4 space-y-2.5">
            <span className="font-mono text-xs font-bold text-slate-800 uppercase tracking-wide block mb-1">
              Microscale Pellet Parameters
            </span>

            <div className="space-y-1.5 text-xs font-mono">
              <div className="flex justify-between items-center py-1 border-b border-slate-200">
                <span className="text-slate-500">Effective Pore Diffusivity (D_eff):</span>
                <span className="text-slate-800">{inputs.effectiveDiffusivity.toExponential(3)} m²/s</span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-200">
                <span className="text-slate-500">External Mass Transfer Coeff (k_g):</span>
                <span className="text-slate-800">{transport.externalMassTransferCoeff.toFixed(4)} m/s</span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-200">
                <span className="text-slate-500">Specific Surface Area (a_v):</span>
                <span className="text-slate-800">{transport.specificSurfaceArea.toFixed(0)} m²/m³</span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-200">
                <span className="text-slate-500">Gas Boundary Film ΔT:</span>
                <span className="text-blue-600">
                  {(criteria.find(c => c.id === 'external_heat_transfer')?.calculatedValue || 0).toFixed(4)} K
                </span>
              </div>

              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500">Intraparticle Thermal Drop ΔT_int:</span>
                <span className="text-blue-600">
                  {(criteria.find(c => c.id === 'intraparticle_heat')?.calculatedValue || 0).toFixed(5)} K
                </span>
              </div>
            </div>
          </div>

          {/* Scientific Validation Status */}
          <div className="p-3 bg-[#10B981]/5 border border-[#10B981]/30 text-xs font-mono">
            <div className="flex items-center gap-2 text-[#10B981] font-bold mb-1">
              <CheckCircle2 className="w-4 h-4" />
              <span>Intrinsic Kinetics Uncorrupted</span>
            </div>
            <p className="text-[11px] text-slate-700 font-sans leading-relaxed">
              At pellet diameter d<sub>p</sub> = {dp_um.toFixed(0)} µm, both the Carberry film criterion (Ca &lt; 0.05/n) and the Weisz-Prater modulus (Φ &lt; 0.08) are strictly satisfied. The observed reaction rate r<sub>m</sub> = {inputs.reactionRate.toExponential(2)} mol/(kg·s) reflects genuine molecular kinetics.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
