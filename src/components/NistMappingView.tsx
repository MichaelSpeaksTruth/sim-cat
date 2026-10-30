import React, { useState } from 'react';
import {
  NIST_AMMONIA,
  NIST_NITROGEN,
  NIST_HYDROGEN,
  NIST_HELIUM,
  NIST_ARGON,
  BULK_GAS_CONFIGS,
  BulkGasType,
  computeAuditedNistAmmoniaProperties,
  computeNistAmmoniaKinetics,
  calculateNistCp,
  calculateAmmoniaReactionEnthalpy,
  calculatePureViscosity,
  calculatePureConductivity,
} from '../lib/nistAmmoniaData';
import { ReactorInputs } from '../types/eurokin';
import { MathView } from './MathView';
import { Database, Check, RefreshCw, ExternalLink, ShieldCheck, BookOpen, Layers, Thermometer, Gauge, Activity, Zap } from 'lucide-react';

interface NistMappingViewProps {
  currentInputs: ReactorInputs;
  onApplyNistProperties: (updatedProps: Partial<ReactorInputs>) => void;
}

export const NistMappingView: React.FC<NistMappingViewProps> = ({ currentInputs, onApplyNistProperties }) => {
  const [testTemp, setTestTemp] = useState<number>(currentInputs.temperature);
  const [testPressure, setTestPressure] = useState<number>(currentInputs.totalPressure);
  const [testBulkGas, setTestBulkGas] = useState<BulkGasType>(currentInputs.bulkGasType || 'syngas_stoichiometric');
  const [appliedNotice, setAppliedNotice] = useState(false);
  const [activeTab, setActiveTab] = useState<'thermophysics' | 'kinetics'>('thermophysics');

  const nistCalculated = computeAuditedNistAmmoniaProperties(testTemp, testPressure, testBulkGas, currentInputs.reactantMoleFraction);
  const nistKinetics = computeNistAmmoniaKinetics(testTemp, testPressure, testBulkGas, currentInputs.reactantMoleFraction);

  const handleApplyAll = () => {
    onApplyNistProperties({
      bulkGasType: testBulkGas,
      temperature: testTemp,
      totalPressure: testPressure,
      gasMolecularWeight: nistCalculated.molarMassKgMol,
      gasViscosity: nistCalculated.viscosity,
      gasHeatCapacity: nistCalculated.heatCapacity,
      gasConductivity: nistCalculated.thermalConductivity,
      molecularDiffusivity: nistCalculated.molecularDiffusivity,
      reactionEnthalpy: nistCalculated.reactionEnthalpy,
      reactionRate: nistKinetics.reactionRate,
      reactionOrder: nistKinetics.reactionOrder,
      activationEnergy: nistKinetics.activationEnergy,
    });
    setAppliedNotice(true);
    setTimeout(() => setAppliedNotice(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-blue-100 text-blue-800 border border-blue-200">
              NIST REFERENCE THERMOPHYSICS & KINETICS
            </span>
            <span className="text-xs text-slate-500 font-mono">
              Primary System: Ammonia Synthesis & Cracking (0.5 N₂ + 1.5 H₂ ⇌ NH₃)
            </span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 mt-1">
            Audited Thermophysical & Reaction Kinetics Mapping Engine
          </h2>
          <p className="text-xs text-slate-600 mt-1 max-w-4xl leading-relaxed">
            Both thermophysical transport properties (heat capacity, viscosity, thermal conductivity, binary diffusivity, reaction enthalpy) and chemical kinetic mechanisms (Dyson & Baddour, Temkin-Pyzhev rate law, Arrhenius activation energies, and equilibrium constant $K_p$) are mapped directly from NIST Standard Reference Databases and verified industrial kinetics literature.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={handleApplyAll}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono font-bold transition-all shadow-xs ${
              appliedNotice
                ? 'bg-emerald-600 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {appliedNotice ? (
              <>
                <Check className="w-4 h-4" />
                <span>Thermophysics & Kinetics Applied!</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                <span>Sync All to Current Model</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Sub-view Switcher Tabs */}
      <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-mono max-w-fit">
        <button
          onClick={() => setActiveTab('thermophysics')}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg font-bold transition-all ${
            activeTab === 'thermophysics'
              ? 'bg-white text-blue-700 shadow-2xs border border-slate-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          <span>Thermophysical Properties (NIST SRD 69)</span>
        </button>

        <button
          onClick={() => setActiveTab('kinetics')}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg font-bold transition-all ${
            activeTab === 'kinetics'
              ? 'bg-white text-blue-700 shadow-2xs border border-slate-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>Ammonia Reaction Kinetics (Temkin-Pyzhev / Dyson-Baddour)</span>
        </button>
      </div>

      {/* Interactive State Sliders (Common to both tabs) */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <Gauge className="w-4 h-4 text-blue-600" />
            <h3 className="font-bold text-sm text-slate-900">
              Process Operating State Controller
            </h3>
          </div>
          <span className="text-xs font-mono text-slate-500">
            Dynamically recalculates all thermodynamic and kinetic constants
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Temperature Slider */}
          <div className="space-y-1.5 bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-slate-700 font-semibold">Temperature (T)</span>
              <span className="text-blue-700 font-bold">{testTemp.toFixed(1)} K ({(testTemp - 273.15).toFixed(1)} °C)</span>
            </div>
            <input
              type="range"
              min="300"
              max="900"
              step="5"
              value={testTemp}
              onChange={(e) => setTestTemp(parseFloat(e.target.value))}
              className="w-full accent-blue-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-400">
              <span>300 K (27 °C)</span>
              <span>600 K (327 °C)</span>
              <span>900 K (627 °C)</span>
            </div>
          </div>

          {/* Pressure Slider */}
          <div className="space-y-1.5 bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-slate-700 font-semibold">Total Pressure (P)</span>
              <span className="text-blue-700 font-bold">{(testPressure / 1e5).toFixed(1)} bar ({testPressure.toExponential(2)} Pa)</span>
            </div>
            <input
              type="range"
              min="100000"
              max="20000000"
              step="500000"
              value={testPressure}
              onChange={(e) => setTestPressure(parseFloat(e.target.value))}
              className="w-full accent-blue-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-400">
              <span>1 bar (Atmospheric)</span>
              <span>100 bar (Industrial)</span>
              <span>200 bar</span>
            </div>
          </div>

          {/* Bulk Gas Selector */}
          <div className="space-y-1.5 bg-slate-50 p-3 rounded-lg border border-slate-200">
            <label className="text-xs font-semibold text-slate-700 block font-mono">
              Bulk Gas / Carrier Feed
            </label>
            <select
              value={testBulkGas}
              onChange={(e) => setTestBulkGas(e.target.value as BulkGasType)}
              className="w-full bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-600"
            >
              {Object.values(BULK_GAS_CONFIGS).map((cfg) => (
                <option key={cfg.id} value={cfg.id}>
                  {cfg.name}
                </option>
              ))}
            </select>
            <span className="text-[11px] text-slate-500 block leading-tight">
              {BULK_GAS_CONFIGS[testBulkGas]?.description}
            </span>
          </div>
        </div>
      </div>

      {/* TAB 1: THERMOPHYSICAL PROPERTIES */}
      {activeTab === 'thermophysics' && (
        <div className="space-y-6">
          {/* Calculated Output Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-3 bg-white border border-slate-200 rounded-lg shadow-xs">
              <span className="text-[11px] font-mono text-slate-500 block">Mean Molar Mass (M)</span>
              <span className="text-sm font-bold font-mono text-slate-900">
                {(nistCalculated.molarMassKgMol * 1000).toFixed(3)} g/mol
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">NIST Standard</span>
            </div>

            <div className="p-3 bg-white border border-slate-200 rounded-lg shadow-xs">
              <span className="text-[11px] font-mono text-slate-500 block">Gas Mixture Density (ρ_G)</span>
              <span className="text-sm font-bold font-mono text-slate-900">
                {nistCalculated.gasDensity.toFixed(3)} kg/m³
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Ideal Gas Law at (T, P)</span>
            </div>

            <div className="p-3 bg-white border border-slate-200 rounded-lg shadow-xs">
              <span className="text-[11px] font-mono text-slate-500 block">Heat Capacity (c_p)</span>
              <span className="text-sm font-bold font-mono text-slate-900">
                {nistCalculated.heatCapacity.toFixed(1)} J/(kg·K)
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Shomate 5-Term Poly</span>
            </div>

            <div className="p-3 bg-white border border-slate-200 rounded-lg shadow-xs">
              <span className="text-[11px] font-mono text-slate-500 block">Gas Viscosity (μ_G)</span>
              <span className="text-sm font-bold font-mono text-slate-900">
                {(nistCalculated.viscosity * 1e6).toFixed(2)} µPa·s
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Wilke Collision Form</span>
            </div>

            <div className="p-3 bg-white border border-slate-200 rounded-lg shadow-xs">
              <span className="text-[11px] font-mono text-slate-500 block">Conductivity (λ_G)</span>
              <span className="text-sm font-bold font-mono text-slate-900">
                {nistCalculated.thermalConductivity.toFixed(4)} W/(m·K)
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Mason & Saxena</span>
            </div>

            <div className="p-3 bg-white border border-slate-200 rounded-lg shadow-xs">
              <span className="text-[11px] font-mono text-slate-500 block">Reaction Enthalpy (|Δ_r H|)</span>
              <span className="text-sm font-bold font-mono text-slate-900">
                {(nistCalculated.reactionEnthalpy / 1000).toFixed(2)} kJ/mol
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Kirchhoff Integr. at T</span>
            </div>
          </div>

          {/* Detailed Species Database Table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-blue-600" />
                <h3 className="font-bold text-sm text-slate-900">
                  NIST Standard Reference Substances & Physical Constants
                </h3>
              </div>
              <span className="text-xs font-mono text-slate-500">
                NIST Standard Reference Database 69 (SRD 69)
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/70 text-slate-700 font-mono border-b border-slate-200">
                    <th className="py-2.5 px-4 font-semibold">Substance Name</th>
                    <th className="py-2.5 px-4 font-semibold">Formula & CAS</th>
                    <th className="py-2.5 px-4 font-semibold">Molar Mass (M)</th>
                    <th className="py-2.5 px-4 font-semibold">Δ_f H°₂₉₈ (kJ/mol)</th>
                    <th className="py-2.5 px-4 font-semibold">Shomate Range (K)</th>
                    <th className="py-2.5 px-4 font-semibold">L-J σ (Å) / ε/k (K)</th>
                    <th className="py-2.5 px-4 font-semibold">Diffusion Vol. v_i</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-800 font-mono">
                  {[NIST_AMMONIA, NIST_NITROGEN, NIST_HYDROGEN, NIST_HELIUM, NIST_ARGON].map((sub) => (
                    <tr key={sub.casNumber} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-4 font-semibold text-slate-900 font-sans">
                        {sub.name}
                      </td>
                      <td className="py-2.5 px-4 text-slate-600">
                        <span className="font-bold text-slate-900">{sub.chemicalFormula}</span> [{sub.casNumber}]
                      </td>
                      <td className="py-2.5 px-4">
                        {(sub.molarMassKgMol * 1000).toFixed(4)} g/mol
                      </td>
                      <td className="py-2.5 px-4">
                        {(sub.standardEnthalpyFormation298 / 1000).toFixed(2)}
                      </td>
                      <td className="py-2.5 px-4">
                        {sub.shomate.tMin} – {sub.shomate.tMax} K
                      </td>
                      <td className="py-2.5 px-4">
                        {sub.lennardJonesSigma.toFixed(2)} Å / {sub.lennardJonesEpsilonK.toFixed(1)} K
                      </td>
                      <td className="py-2.5 px-4">
                        {sub.fullerDiffusionVolume.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: AMMONIA REACTION KINETICS REGISTRY */}
      {activeTab === 'kinetics' && (
        <div className="space-y-6">
          {/* Reaction Kinetics Telemetry Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-3 bg-white border border-slate-200 rounded-lg shadow-xs">
              <span className="text-[11px] font-mono text-slate-500 block">Measured Rate (r_m)</span>
              <span className="text-sm font-bold font-mono text-slate-900">
                {nistKinetics.reactionRate.toExponential(3)}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">mol/(kg-cat·s)</span>
            </div>

            <div className="p-3 bg-white border border-slate-200 rounded-lg shadow-xs">
              <span className="text-[11px] font-mono text-slate-500 block">Activation Energy (E_a)</span>
              <span className="text-sm font-bold font-mono text-slate-900">
                {(nistKinetics.activationEnergy / 1000).toFixed(1)} kJ/mol
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Promoted Fe Catalyst</span>
            </div>

            <div className="p-3 bg-white border border-slate-200 rounded-lg shadow-xs">
              <span className="text-[11px] font-mono text-slate-500 block">Apparent Order (n)</span>
              <span className="text-sm font-bold font-mono text-slate-900">
                {nistKinetics.reactionOrder.toFixed(1)}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Temkin Pseudo-Order</span>
            </div>

            <div className="p-3 bg-white border border-slate-200 rounded-lg shadow-xs">
              <span className="text-[11px] font-mono text-slate-500 block">Synthesis Const (k₁)</span>
              <span className="text-sm font-bold font-mono text-slate-900">
                {nistKinetics.rateConstantK1.toExponential(2)}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">mol/(kg·s·atm)</span>
            </div>

            <div className="p-3 bg-white border border-slate-200 rounded-lg shadow-xs">
              <span className="text-[11px] font-mono text-slate-500 block">Equilibrium K_p(T)</span>
              <span className="text-sm font-bold font-mono text-slate-900">
                {nistKinetics.equilibriumConstantKp.toExponential(2)}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">atm⁻¹ (NIST Gibbs)</span>
            </div>

            <div className="p-3 bg-white border border-slate-200 rounded-lg shadow-xs">
              <span className="text-[11px] font-mono text-slate-500 block">Equilibrium X_eq</span>
              <span className="text-sm font-bold font-mono text-emerald-700">
                {(nistKinetics.equilibriumConversionXeq * 100).toFixed(1)}%
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Max Thermodynamic Cap</span>
            </div>
          </div>

          {/* Governing Kinetic Equation Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-blue-600" />
                <h3 className="font-bold text-sm text-slate-900">
                  {nistKinetics.kineticModelName}
                </h3>
              </div>
              <span className="text-xs font-mono text-slate-500">
                Validated for Promoted Magnetite/Wüstite Iron Catalysts (KM1 / Topsøe)
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-center font-mono text-slate-900">
              <MathView math={nistKinetics.rateEquationLatex} displayMode />
            </div>

            <div className="space-y-1.5 pt-2 text-xs font-mono text-slate-600">
              <span className="text-slate-800 font-bold block font-sans">Model Parameters & Arrhenius Constants:</span>
              <ul className="list-disc list-inside space-y-1 text-slate-600">
                {nistKinetics.notes.map((note, idx) => (
                  <li key={idx}>{note}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
