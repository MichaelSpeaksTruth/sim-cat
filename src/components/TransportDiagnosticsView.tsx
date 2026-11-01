import React, { useState } from 'react';
import { SimulationResult, DiagnosticCriterion } from '../types/eurokin';
import { DiagnosticCard } from './DiagnosticCard';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Layers,
  Wind,
  Gauge,
  Flame,
  BookOpen,
  Info,
  ShieldAlert,
} from 'lucide-react';

interface TransportDiagnosticsViewProps {
  simulation: SimulationResult;
}

export const TransportDiagnosticsView: React.FC<TransportDiagnosticsViewProps> = ({
  simulation,
}) => {
  const [activeTab, setActiveTab] = useState<'matrix' | 'hydrodynamics' | 'mass_transfer' | 'heat_transfer' | 'diffusivity' | 'applicability' | 'provenance'>('matrix');
  const [showDisclaimer, setShowDisclaimer] = useState(false);

  const { criteria, transportAssessment, hydrodynamics, transport, inputs } = simulation;
  const assessment = transportAssessment;

  const passedCount = criteria.filter(c => (c.status ?? (c.passed ? 'PASS' : 'FAIL')) === 'PASS').length;
  const warningCount = criteria.filter(c => c.status === 'WARNING').length;
  const failedCount = criteria.filter(c => (c.status ?? (c.passed ? 'PASS' : 'FAIL')) === 'FAIL').length;
  const outOfRangeCount = criteria.filter(c => c.status === 'OUTSIDE_CORRELATION_VALIDITY').length;
  const notEvalCount = criteria.filter(c => c.status === 'NOT_EVALUATED').length;

  const fmt = (v: number, p = 3) => {
    if (Math.abs(v) >= 1e4 || (Math.abs(v) < 1e-3 && v !== 0)) {
      return v.toExponential(p);
    }
    return v.toFixed(p);
  };

  return (
    <div className="space-y-4">
      {/* 1. OVERALL TRANSPORT ASSESSMENT BANNER */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200/80 p-4 text-xs font-mono">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 pb-3 mb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-600" />
            <span className="font-bold text-slate-900 uppercase tracking-wide text-sm">
              EUROKIN Transport Limitations & Intrinsic Kinetics Assessment
            </span>
          </div>

          <div className="flex items-center gap-2">
            {assessment?.overallStatus === 'VALID_INTRINSIC' ? (
              <span className="px-2.5 py-1 text-xs font-bold font-mono bg-emerald-50 text-emerald-700 border border-emerald-300 rounded-md flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                OVERALL STATUS: VALID INTRINSIC KINETICS REGIME
              </span>
            ) : assessment?.overallStatus === 'CORRELATION_EXTRAPOLATION' ? (
              <span className="px-2.5 py-1 text-xs font-bold font-mono bg-purple-50 text-purple-700 border border-purple-200 rounded-md flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-purple-600" />
                OVERALL STATUS: CORRELATION EXTRAPOLATION DETECTED
              </span>
            ) : (
              <span className="px-2.5 py-1 text-xs font-bold font-mono bg-red-50 text-red-700 border border-red-300 rounded-md flex items-center gap-1.5">
                <XCircle className="w-3.5 h-3.5" />
                OVERALL STATUS: TRANSPORT LIMITED (MASKED INTRINSIC KINETICS)
              </span>
            )}
          </div>
        </div>

        {/* Status Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 my-2 text-center">
          <div className="bg-slate-50 rounded-lg border border-slate-200/80 py-1.5 px-2">
            <div className="text-slate-500 text-[10px] uppercase font-semibold">Passed Checks</div>
            <div className="text-[#10B981] font-bold text-sm mt-0.5">{passedCount}</div>
          </div>
          <div className="bg-slate-50 rounded-lg border border-slate-200/80 py-1.5 px-2">
            <div className="text-slate-500 text-[10px] uppercase font-semibold">Warnings</div>
            <div className="text-amber-500 font-bold text-sm mt-0.5">{warningCount}</div>
          </div>
          <div className="bg-slate-50 rounded-lg border border-slate-200/80 py-1.5 px-2">
            <div className="text-slate-500 text-[10px] uppercase font-semibold">Breaches (Fail)</div>
            <div className="text-rose-500 font-bold text-sm mt-0.5">{failedCount}</div>
          </div>
          <div className="bg-slate-50 rounded-lg border border-slate-200/80 py-1.5 px-2">
            <div className="text-slate-500 text-[10px] uppercase font-semibold">Out of Correlation</div>
            <div className="text-purple-600 font-bold text-sm mt-0.5">{outOfRangeCount}</div>
          </div>
          <div className="bg-slate-50 rounded-lg border border-slate-200/80 py-1.5 px-2 col-span-2 sm:col-span-1">
            <div className="text-slate-500 text-[10px] uppercase font-semibold">Not Evaluated</div>
            <div className="text-slate-500 font-bold text-sm mt-0.5">{notEvalCount}</div>
          </div>
        </div>

        {/* Compact Scientific Integrity Disclaimer with Expandable Notes */}
        <div className="mt-2.5 p-2 bg-slate-50 border border-slate-200/80 rounded-lg text-[11px] text-slate-600 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <ShieldAlert className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="truncate">
              <strong className="text-slate-800">EUROKIN Acceptance Criterion:</strong> Intrinsic kinetics screening threshold &lt; 5% perturbation on apparent reaction rate.
            </span>
          </div>
          <button
            onClick={() => setShowDisclaimer(!showDisclaimer)}
            className="text-blue-600 hover:text-blue-800 font-semibold shrink-0 cursor-pointer text-[10px] uppercase font-mono px-2 py-0.5 rounded hover:bg-blue-50 transition-colors"
          >
            {showDisclaimer ? 'Hide Details' : 'Consortial Notes'}
          </button>
        </div>

        {showDisclaimer && (
          <div className="mt-1.5 p-2.5 bg-amber-50/70 border border-amber-200 rounded-lg text-[11px] text-amber-900 leading-relaxed font-sans animate-in fade-in duration-200">
            <strong className="font-semibold text-amber-950">Notice & Scope:</strong> The EUROKIN guide serves strictly as an engineering screening assessment for verifying intrinsic kinetic measurements.
            Passing individual 1D screening criteria does <em>not</em> guarantee negligible combined 2D/3D transport limitations or commercial scale-up safety.
          </div>
        )}
      </div>

      {/* NAVIGATION TABS */}
      <div className="flex border-b border-slate-200/80 gap-1 overflow-x-auto text-xs font-mono">
        <button
          onClick={() => setActiveTab('matrix')}
          className={`px-3 py-2 border-b-2 font-semibold transition-colors ${
            activeTab === 'matrix'
              ? 'border-blue-600 text-blue-600 bg-blue-50 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Diagnostic Matrix ({criteria.length})
        </button>
        <button
          onClick={() => setActiveTab('hydrodynamics')}
          className={`px-3 py-2 border-b-2 font-semibold transition-colors ${
            activeTab === 'hydrodynamics'
              ? 'border-blue-600 text-blue-600 bg-blue-50 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Hydrodynamics & Pressure Drop
        </button>
        <button
          onClick={() => setActiveTab('mass_transfer')}
          className={`px-3 py-2 border-b-2 font-semibold transition-colors ${
            activeTab === 'mass_transfer'
              ? 'border-blue-600 text-blue-600 bg-blue-50 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Mass Transfer & Diffusion
        </button>
        <button
          onClick={() => setActiveTab('heat_transfer')}
          className={`px-3 py-2 border-b-2 font-semibold transition-colors ${
            activeTab === 'heat_transfer'
              ? 'border-blue-600 text-blue-600 bg-blue-50 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Thermal Non-Uniformity
        </button>
        <button
          onClick={() => setActiveTab('diffusivity')}
          className={`px-3 py-2 border-b-2 font-semibold transition-colors ${
            activeTab === 'diffusivity'
              ? 'border-blue-600 text-blue-600 bg-blue-50 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Effective Diffusivity Framework
        </button>
        <button
          onClick={() => setActiveTab('applicability')}
          className={`px-3 py-2 border-b-2 font-semibold transition-colors ${
            activeTab === 'applicability'
              ? 'border-blue-600 text-blue-600 bg-blue-50 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Correlation Applicability Matrix
        </button>
        <button
          onClick={() => setActiveTab('provenance')}
          className={`px-3 py-2 border-b-2 font-semibold transition-colors ${
            activeTab === 'provenance'
              ? 'border-blue-600 text-blue-600 bg-blue-50 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Literature Provenance & Rules
        </button>
      </div>

      {/* TAB 1: DIAGNOSTIC MATRIX (CARDS) */}
      {activeTab === 'matrix' && (
        <div className="space-y-4">
          <div
            className="grid gap-3.5"
            style={{
              gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))',
            }}
          >
            {criteria.map((c) => (
              <DiagnosticCard key={c.id} criterion={c} />
            ))}
          </div>

          {/* Combined Interactions Section */}
          {assessment?.combinedInteractions && assessment.combinedInteractions.length > 0 && (
            <div className="p-3 bg-amber-50/60 rounded-lg border border-amber-600/40 text-xs font-mono space-y-2">
              <div className="flex items-center gap-1.5 text-amber-400 font-bold uppercase">
                <AlertTriangle className="w-4 h-4" />
                Interacting Transport Phenomena & Combined Multi-Dimensional Effects
              </div>
              <ul className="list-disc list-inside space-y-1 text-slate-700 text-[11px]">
                {assessment.combinedInteractions.map((ci: string, idx: number) => (
                  <li key={idx}>{ci}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: HYDRODYNAMICS & PRESSURE DROP */}
      {activeTab === 'hydrodynamics' && (
        <div className="bg-white rounded-xl shadow-xs border border-slate-200/80 p-4 text-xs font-mono space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Gauge className="w-4 h-4 text-blue-600" />
            Packed-Bed Hydrodynamics & Pressure Drop Analysis (Ergun 1952)
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="bg-slate-50 rounded-lg border border-slate-200/60 p-3 space-y-1">
              <span className="text-[10px] text-slate-500 uppercase">Superficial Velocity (u0)</span>
              <div className="text-base font-bold text-slate-900">{fmt(hydrodynamics.superficialVelocity)} m/s</div>
              <span className="text-[10px] text-slate-500">Bed area: {fmt(hydrodynamics.bedCrossSection, 6)} m²</span>
            </div>
            <div className="bg-slate-50 rounded-lg border border-slate-200/60 p-3 space-y-1">
              <span className="text-[10px] text-slate-500 uppercase">Pellet Reynolds Number (Re)</span>
              <div className="text-base font-bold text-slate-900">{fmt(hydrodynamics.reynoldsNumber, 2)}</div>
              <span className={hydrodynamics.reynoldsValid ? 'text-emerald-400 text-[10px]' : 'text-purple-400 text-[10px]'}>
                {hydrodynamics.reynoldsValid ? 'Valid Ergun Regime [0.1, 1000]' : 'Outside Valid Ergun Range'}
              </span>
            </div>
            <div className="bg-slate-50 rounded-lg border border-slate-200/60 p-3 space-y-1">
              <span className="text-[10px] text-slate-500 uppercase">Ergun Friction Factor (fm)</span>
              <div className="text-base font-bold text-slate-900">{fmt(hydrodynamics.ergunFrictionFactor, 2)}</div>
              <span className="text-[10px] text-slate-500">Void fraction: {inputs.bedPorosity}</span>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/60 space-y-2">
            <h4 className="font-bold text-slate-800">Pressure Drop Evaluation Summary</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
              <div>
                <span className="text-slate-500 block">Total Bed Drop:</span>
                <span className="font-bold text-slate-900">{fmt(simulation.totalDeltaP, 1)} Pa</span>
              </div>
              <div>
                <span className="text-slate-500 block">Relative Drop:</span>
                <span className="font-bold text-slate-900">{((simulation.totalDeltaP / inputs.totalPressure) * 100).toFixed(3)} %</span>
              </div>
              <div>
                <span className="text-slate-500 block">Allowable Limit:</span>
                <span className="font-bold text-slate-900">{((0.2 / Math.max(inputs.reactionOrder, 0.01)) * 100).toFixed(1)} %</span>
              </div>
              <div>
                <span className="text-slate-500 block">Hydraulic Regime:</span>
                <span className={hydrodynamics.reynoldsNumber < 10 ? 'text-blue-400' : hydrodynamics.reynoldsNumber < 200 ? 'text-emerald-400' : 'text-amber-400'}>
                  {hydrodynamics.reynoldsNumber < 10 ? 'Laminar (Kozeny-Carman)' : hydrodynamics.reynoldsNumber < 200 ? 'Intermediate Transition' : 'Inertial Dominant'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: MASS TRANSFER & DIFFUSION */}
      {activeTab === 'mass_transfer' && (
        <div className="bg-white rounded-xl shadow-xs border border-slate-200/80 p-4 text-xs font-mono space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Wind className="w-4 h-4 text-blue-600" />
            Interphase Gas-Film & Intraparticle Pore Diffusion
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* External Film */}
            <div className="bg-slate-50 rounded-lg border border-slate-200/60 p-3 space-y-2">
              <h4 className="font-bold text-slate-800 text-xs border-b border-slate-200/60 pb-1">
                External Gas-Film Mass Transfer (Carberry)
              </h4>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-500 block">Sherwood Number (Sh):</span>
                  <span className="font-bold text-slate-900">{fmt(hydrodynamics.sherwoodNumber, 2)}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Schmidt Number (Sc):</span>
                  <span className="font-bold text-slate-900">{fmt(hydrodynamics.schmidtNumber, 2)}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Transfer Coeff (kg):</span>
                  <span className="font-bold text-slate-900">{fmt(transport.externalMassTransferCoeff, 4)} m/s</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Specific Area (av):</span>
                  <span className="font-bold text-slate-900">{fmt(transport.specificSurfaceArea, 1)} m²/m³</span>
                </div>
              </div>
              <div className="p-2 bg-slate-100 text-[10px] text-slate-500">
                Wakao Sherwood correlation: Sh = 2.0 + 1.1 Re^0.6 Sc^0.33. Applicable for 0.1 &lt; Re &lt; 100.
              </div>
            </div>

            {/* Internal Diffusion */}
            <div className="bg-slate-50 rounded-lg border border-slate-200/60 p-3 space-y-2">
              <h4 className="font-bold text-slate-800 text-xs border-b border-slate-200/60 pb-1">
                Intraparticle Pore Diffusion (Weisz-Prater)
              </h4>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-500 block">Weisz-Prater Modulus (Phi):</span>
                  <span className="font-bold text-slate-900">{fmt(Math.pow(transport.thieleModulus, 2), 4)}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Weisz Limit:</span>
                  <span className="font-bold text-slate-900">&lt; 0.080</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Thiele Modulus (phi):</span>
                  <span className="font-bold text-slate-900">{fmt(transport.thieleModulus, 3)}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Effectiveness Factor (eta):</span>
                  <span className="font-bold text-slate-900">{(transport.effectivenessFactor * 100).toFixed(1)} %</span>
                </div>
              </div>
              <div className="p-2 bg-slate-100 text-[10px] text-slate-500">
                Froment &amp; Bischoff 1st-order analytical effectiveness factor: eta = (1/phi) * (coth(3 phi) - 1/(3 phi)).
                Analytical disclaimer: Exact reversible Temkin kinetics require numerical boundary value solution.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: THERMAL NON-UNIFORMITY */}
      {activeTab === 'heat_transfer' && (
        <div className="bg-white rounded-xl shadow-xs border border-slate-200/80 p-4 text-xs font-mono space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Flame className="w-4 h-4 text-amber-400" />
            Thermal Gradient Analysis & Hotspot Diagnostics
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="bg-slate-50 rounded-lg border border-slate-200/60 p-3 space-y-1">
              <span className="text-[10px] text-slate-500 uppercase">Boundary Film Drop (Delta Tfilm)</span>
              <div className="text-base font-bold text-slate-900">
                {fmt(criteria.find(c => c.id === 'external_heat_transfer')?.calculatedValue ?? 0, 3)} K
              </div>
              <span className="text-[10px] text-slate-500">
                Limit: &lt; {fmt(criteria.find(c => c.id === 'external_heat_transfer')?.limitValue ?? 0, 2)} K
              </span>
            </div>
            <div className="bg-slate-50 rounded-lg border border-slate-200/60 p-3 space-y-1">
              <span className="text-[10px] text-slate-500 uppercase">Radial Gradient (Delta Trad)</span>
              <div className="text-base font-bold text-slate-900">
                {fmt(criteria.find(c => c.id === 'radial_heat_transfer')?.calculatedValue ?? 0, 3)} K
              </div>
              <span className="text-[10px] text-slate-500">
                Limit: &lt; {fmt(criteria.find(c => c.id === 'radial_heat_transfer')?.limitValue ?? 0, 2)} K
              </span>
            </div>
            <div className="bg-slate-50 rounded-lg border border-slate-200/60 p-3 space-y-1">
              <span className="text-[10px] text-slate-500 uppercase">Intraparticle Drop (Delta Tint)</span>
              <div className="text-base font-bold text-slate-900">
                {fmt(criteria.find(c => c.id === 'intraparticle_heat')?.calculatedValue ?? 0, 4)} K
              </div>
              <span className="text-[10px] text-slate-500">
                Limit: &lt; {fmt(criteria.find(c => c.id === 'intraparticle_heat')?.limitValue ?? 0, 2)} K
              </span>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/60 space-y-2">
            <h4 className="font-bold text-slate-800">Thermal Properties & Dispersion Coeffs</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
              <div>
                <span className="text-slate-500 block">Radial Conductivity (lambda_er):</span>
                <span className="font-bold text-slate-900">{fmt(transport.radialThermalConductivity, 3)} W/(m·K)</span>
              </div>
              <div>
                <span className="text-slate-500 block">Pellet Effective Cond (lambda_p):</span>
                <span className="font-bold text-slate-900">{fmt(transport.effectivePelletThermalCond, 3)} W/(m·K)</span>
              </div>
              <div>
                <span className="text-slate-500 block">Prandtl Number (Pr):</span>
                <span className="font-bold text-slate-900">{fmt(hydrodynamics.prandtlNumber, 2)}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Nusselt Number (Nu):</span>
                <span className="font-bold text-slate-900">{fmt(hydrodynamics.nusseltNumber, 2)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: EFFECTIVE DIFFUSIVITY FRAMEWORK */}
      {activeTab === 'diffusivity' && (
        <div className="bg-white rounded-xl shadow-xs border border-slate-200/80 p-4 text-xs font-mono space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-600" />
            Multicomponent Molecular &amp; Knudsen Effective Diffusivity
          </h3>

          {assessment?.diffusivity && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-slate-50 rounded-lg border border-slate-200/60 p-3 space-y-2">
                <h4 className="font-bold text-slate-800 border-b border-slate-200/60 pb-1">
                  Pore &amp; Binary Diffusion Components
                </h4>
                <div className="space-y-1.5 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Binary Molecular Diffusivity (D_mol):</span>
                    <span className="font-bold text-slate-900">{fmt(assessment.diffusivity.molecularDiffusivityM2S, 3)} m²/s</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Knudsen Diffusivity (D_K, 10 nm pore):</span>
                    <span className="font-bold text-slate-900">{fmt(assessment.diffusivity.knudsenDiffusivityM2S, 3)} m²/s</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Bosanquet Combination Diffusivity (D_comb):</span>
                    <span className="font-bold text-slate-900">{fmt(assessment.diffusivity.combinedBosanquetDiffusivityM2S, 3)} m²/s</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200/60 pt-1">
                    <span className="text-blue-600 font-bold">Effective Pellet Diffusivity (D_eff):</span>
                    <span className="font-bold text-blue-600">{fmt(assessment.diffusivity.effectivePelletDiffusivityM2S, 3)} m²/s</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 rounded-lg border border-slate-200/60 p-3 space-y-2">
                <h4 className="font-bold text-slate-800 border-b border-slate-200/60 pb-1">
                  Pellet Geometry &amp; Porous Structure
                </h4>
                <div className="space-y-1.5 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Pellet Porosity (epsilon_p):</span>
                    <span className="font-bold text-slate-900">{assessment.diffusivity.pelletPorosity.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Pellet Tortuosity (tau_p):</span>
                    <span className="font-bold text-slate-900">{assessment.diffusivity.pelletTortuosity.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Structure Ratio (eps_p / tau_p):</span>
                    <span className="font-bold text-slate-900">{(assessment.diffusivity.pelletPorosity / assessment.diffusivity.pelletTortuosity).toFixed(3)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Nominal Mesopore Diameter:</span>
                    <span className="font-bold text-slate-900">{(assessment.diffusivity.meanPoreDiameterM * 1e9).toFixed(1)} nm</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {assessment?.diffusivity?.highPressureWarning && (
            <div className="p-3 bg-purple-50 rounded-lg border border-purple-200 text-purple-800 text-[11px] flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-purple-900">High-Pressure Dense Gas Fuller Correlation Disclaimer:</span>{' '}
                {assessment.diffusivity.highPressureWarning}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 6: CORRELATION APPLICABILITY MATRIX */}
      {activeTab === 'applicability' && (
        <div className="bg-white rounded-xl shadow-xs border border-slate-200/80 p-4 text-xs font-mono space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-600" />
            Correlation Applicability Windows &amp; Boundary Verification
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[11px]">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 uppercase text-[10px]">
                  <th className="py-2 px-3">Correlation / Law</th>
                  <th className="py-2 px-3">Documented Range</th>
                  <th className="py-2 px-3">Current Operating Value</th>
                  <th className="py-2 px-3">Status</th>
                  <th className="py-2 px-3">Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="py-2.5 px-3 font-bold text-slate-800">Ergun Pressure Drop</td>
                  <td className="py-2.5 px-3 text-slate-500">0.1 &lt; Re &lt; 1000</td>
                  <td className="py-2.5 px-3 font-mono text-slate-900">Re = {fmt(hydrodynamics.reynoldsNumber, 2)}</td>
                  <td className="py-2.5 px-3">
                    <span className={`px-2 py-0.5 text-[9px] font-bold border rounded-md ${hydrodynamics.reynoldsValid ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : 'bg-purple-50 text-purple-700 border-purple-200'}`}>
                      {hydrodynamics.reynoldsValid ? 'COMPLIANT' : 'OUTSIDE VALID RANGE'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-500">Ergun (1952)</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-bold text-slate-800">Wakao Sherwood Mass Transfer</td>
                  <td className="py-2.5 px-3 text-slate-500">0.1 &lt; Re &lt; 100</td>
                  <td className="py-2.5 px-3 font-mono text-slate-900">Re = {fmt(hydrodynamics.reynoldsNumber, 2)}</td>
                  <td className="py-2.5 px-3">
                    <span className={`px-2 py-0.5 text-[9px] font-bold border rounded-md ${hydrodynamics.reynoldsNumber >= 0.1 && hydrodynamics.reynoldsNumber <= 100 ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                      {hydrodynamics.reynoldsNumber >= 0.1 && hydrodynamics.reynoldsNumber <= 100 ? 'COMPLIANT' : 'EXTRAPOLATED (Re > 100)'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-500">Wakao et al. (1978)</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-bold text-slate-800">Specchia Radial Conductivity</td>
                  <td className="py-2.5 px-3 text-slate-500">40 &lt; Re &lt; 10,000</td>
                  <td className="py-2.5 px-3 font-mono text-slate-900">Re = {fmt(hydrodynamics.reynoldsNumber, 2)}</td>
                  <td className="py-2.5 px-3">
                    <span className={`px-2 py-0.5 text-[9px] font-bold border rounded-md ${hydrodynamics.reynoldsNumber >= 40 && hydrodynamics.reynoldsNumber <= 10000 ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : 'bg-purple-50 text-purple-700 border-purple-200'}`}>
                      {hydrodynamics.reynoldsNumber >= 40 && hydrodynamics.reynoldsNumber <= 10000 ? 'COMPLIANT' : 'OUTSIDE VALID RANGE'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-500">Specchia et al. (1980)</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-bold text-slate-800">Chu &amp; Ng Radial Wall Effect</td>
                  <td className="py-2.5 px-3 text-slate-500">Dt / dp &gt; 8.0</td>
                  <td className="py-2.5 px-3 font-mono text-slate-900">Dt/dp = {(inputs.tubeDiameter / inputs.particleDiameter).toFixed(1)}</td>
                  <td className="py-2.5 px-3">
                    <span className={`px-2 py-0.5 text-[9px] font-bold border rounded-md ${inputs.tubeDiameter / inputs.particleDiameter > 8.0 ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : 'bg-red-50 text-red-700 border-red-300'}`}>
                      {inputs.tubeDiameter / inputs.particleDiameter > 8.0 ? 'COMPLIANT' : 'WALL CHANNELLING RISK'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-500">Chu &amp; Ng (1989)</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-bold text-slate-800">Fuller Diffusion Volumes</td>
                  <td className="py-2.5 px-3 text-slate-500">P &lt; 10 bar (non-polar)</td>
                  <td className="py-2.5 px-3 font-mono text-slate-900">P = {(inputs.totalPressure / 1e5).toFixed(1)} bar</td>
                  <td className="py-2.5 px-3">
                    <span className={`px-2 py-0.5 text-[9px] font-bold border rounded-md ${inputs.totalPressure <= 1.0e6 ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                      {inputs.totalPressure <= 1.0e6 ? 'COMPLIANT' : 'HIGH-PRESSURE WARNING'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-500">Fuller et al. (1966)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 7: LITERATURE PROVENANCE */}
      {activeTab === 'provenance' && (
        <div className="bg-white rounded-xl shadow-xs border border-slate-200/80 p-4 text-xs font-mono space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-blue-600" />
            Authoritative Materials, Literature Citations &amp; Assumptions
          </h3>

          <div className="space-y-3 text-[11px] text-slate-700 leading-relaxed">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/60">
              <span className="font-bold text-slate-900 block mb-1">1. EUROKIN Consortium Fixed-Bed Transport Limitations Guide (2012)</span>
              <span>
                Standard European industry reference for identifying transport disguises when measuring heterogeneous catalytic kinetics.
                Criteria define boundary thresholds ensuring &lt; 5% perturbation on apparent conversion rate.
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/60">
              <span className="font-bold text-slate-900 block mb-1">2. Temkin &amp; Pyzhev (1940) / Dyson &amp; Baddour (1968)</span>
              <span>
                Canonical reversible kinetic model for ammonia synthesis over promoted magnetite catalysts:
                r = 2 k1 (p_N2 p_H2^1.5 / p_NH3) [1 - (Q / Kp)^2]. Forward activation energy Ea = 87,090 J/mol.
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/60">
              <span className="font-bold text-slate-900 block mb-1">3. NIST Standard Reference Database 69 (Chemistry WebBook)</span>
              <span>
                Authoritative source for Shomate gas-phase thermochemical polynomials, standard formation enthalpies,
                absolute standard entropies, and Lennard-Jones collision parameters for all 6 registered species.
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/60">
              <span className="font-bold text-slate-900 block mb-1">4. Peng &amp; Robinson (1976) Equation of State</span>
              <span>
                Cubic real-gas EOS with literature binary interaction parameters k_ij and temperature-dependent mixture attraction parameter da_mix/dT.
                Coupled into both hydrodynamics and axial energy conservation balances.
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
