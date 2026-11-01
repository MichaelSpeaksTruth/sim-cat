import React, { useState } from 'react';
import {
  BULK_GAS_CONFIGS,
  BulkGasType,
  computeAuditedNistAmmoniaProperties,
  computeNistAmmoniaKinetics,
} from '../lib/nistAmmoniaData';
import { NIST_SPECIES_REGISTRY } from '../lib/nist/speciesRegistry';
import { calculatePengRobinsonState } from '../lib/nist/equationOfState';
import { provenanceRegistry } from '../lib/nist/dataProvenanceRegistry';
import { DataStatus } from '../lib/nist/types';
import { ReactorInputs } from '../types/eurokin';
import { MathView } from './MathView';
import { Database, Check, RefreshCw, Gauge, Zap, ShieldCheck, ExternalLink, Download } from 'lucide-react';

interface NistMappingViewProps {
  currentInputs: ReactorInputs;
  onApplyNistProperties: (updatedProps: Partial<ReactorInputs>) => void;
}

export const NistMappingView: React.FC<NistMappingViewProps> = ({ currentInputs, onApplyNistProperties }) => {
  const [testTemp, setTestTemp] = useState<number>(currentInputs.temperature);
  const [testPressure, setTestPressure] = useState<number>(currentInputs.totalPressure);
  const [testBulkGas, setTestBulkGas] = useState<BulkGasType>(currentInputs.bulkGasType || 'syngas_stoichiometric');
  const [appliedNotice, setAppliedNotice] = useState(false);
  const [activeTab, setActiveTab] = useState<'thermophysics' | 'kinetics' | 'provenance'>('thermophysics');
  const [provenanceFilter, setProvenanceFilter] = useState<DataStatus | 'all'>('all');
  const [snapshotExported, setSnapshotExported] = useState(false);

  const nistCalculated = computeAuditedNistAmmoniaProperties(testTemp, testPressure, testBulkGas, currentInputs.reactantMoleFraction);
  const nistKinetics = computeNistAmmoniaKinetics(testTemp, testPressure, testBulkGas, currentInputs.reactantMoleFraction);

  // Real-gas EOS evaluation for display
  const prState = calculatePengRobinsonState(testTemp, testPressure, {
    N2: 0.25 * (1.0 - (currentInputs.reactantMoleFraction || 0.05)),
    H2: 0.75 * (1.0 - (currentInputs.reactantMoleFraction || 0.05)),
    NH3: currentInputs.reactantMoleFraction || 0.05,
  });

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

  const handleExportProvenanceSnapshot = () => {
    const snapshot = provenanceRegistry.createSnapshot(`RUN-${Date.now()}`, ['N2', 'H2', 'NH3', 'Ar', 'CH4', 'He']);
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SIMCAT-NIST-PROVENANCE-SNAPSHOT-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setSnapshotExported(true);
    setTimeout(() => setSnapshotExported(false), 2500);
  };

  // Compile full provenance table rows across all 6 species
  const allSpeciesKeys = Object.keys(NIST_SPECIES_REGISTRY) as Array<keyof typeof NIST_SPECIES_REGISTRY>;
  const provenanceRows: Array<{
    species: string;
    formula: string;
    cas: string;
    propertyName: string;
    symbol: string;
    value: string;
    units: string;
    source: string;
    url: string;
    status: DataStatus;
    uncertainty?: string;
  }> = [];

  for (const spKey of allSpeciesKeys) {
    const sp = NIST_SPECIES_REGISTRY[spKey];
    provenanceRows.push(
      {
        species: sp.name,
        formula: sp.chemicalFormula,
        cas: sp.casNumber,
        propertyName: 'Molar Mass',
        symbol: sp.molarMass.symbol,
        value: (sp.molarMass.value * 1000).toFixed(4),
        units: 'g/mol',
        source: sp.molarMass.sourceOrganization,
        url: sp.molarMass.sourceUrl,
        status: sp.molarMass.status,
      },
      {
        species: sp.name,
        formula: sp.chemicalFormula,
        cas: sp.casNumber,
        propertyName: 'Critical Temperature',
        symbol: sp.criticalTemperature.symbol,
        value: sp.criticalTemperature.value.toFixed(2),
        units: 'K',
        source: sp.criticalTemperature.sourceOrganization,
        url: sp.criticalTemperature.sourceUrl,
        status: sp.criticalTemperature.status,
        uncertainty: sp.criticalTemperature.uncertainty,
      },
      {
        species: sp.name,
        formula: sp.chemicalFormula,
        cas: sp.casNumber,
        propertyName: 'Critical Pressure',
        symbol: sp.criticalPressure.symbol,
        value: (sp.criticalPressure.value / 1e5).toFixed(2),
        units: 'bar',
        source: sp.criticalPressure.sourceOrganization,
        url: sp.criticalPressure.sourceUrl,
        status: sp.criticalPressure.status,
        uncertainty: sp.criticalPressure.uncertainty,
      },
      {
        species: sp.name,
        formula: sp.chemicalFormula,
        cas: sp.casNumber,
        propertyName: 'Acentric Factor',
        symbol: sp.acentricFactor.symbol,
        value: sp.acentricFactor.value.toFixed(3),
        units: '[-]',
        source: sp.acentricFactor.sourceOrganization,
        url: sp.acentricFactor.sourceUrl,
        status: sp.acentricFactor.status,
      },
      {
        species: sp.name,
        formula: sp.chemicalFormula,
        cas: sp.casNumber,
        propertyName: 'Shomate Heat Capacity Range',
        symbol: sp.shomateGas.symbol,
        value: `${sp.shomateGas.value.tMin} - ${sp.shomateGas.value.tMax}`,
        units: 'K',
        source: sp.shomateGas.sourceOrganization,
        url: sp.shomateGas.sourceUrl,
        status: sp.shomateGas.status,
        uncertainty: sp.shomateGas.uncertainty,
      }
    );
  }

  const filteredProvenance = provenanceFilter === 'all'
    ? provenanceRows
    : provenanceRows.filter(r => r.status === provenanceFilter);

  return (
    <div className="bg-white rounded-xl shadow-xs border border-slate-200/90 p-5 lg:p-6 space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200 rounded">
              NIST CHEMISTRY WEBBOOK (SRD 69) & PR-EOS
            </span>
            <span className="text-xs text-slate-500 font-mono">
              0.5 N₂ + 1.5 H₂ ⇌ NH₃
            </span>
          </div>
          <h2 className="text-sm font-bold text-slate-900 mt-1 uppercase font-mono tracking-wide">
            Thermophysical, Reaction Kinetics & Provenance Registry
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-4xl leading-relaxed font-sans">
            Authoritative thermodynamic properties, Peng-Robinson real-gas compressibility Z(T,P), Dyson & Baddour industrial kinetics, and complete provenance metadata directly traceable to NIST Standard Reference Database 69.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={handleExportProvenanceSnapshot}
            className="flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-xs transition-colors cursor-pointer"
          >
            {snapshotExported ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                <span className="text-emerald-700 font-semibold">Exported!</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4 text-blue-600" />
                <span>Export Provenance JSON</span>
              </>
            )}
          </button>

          <button
            onClick={handleApplyAll}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg shadow-xs transition-all cursor-pointer ${
              appliedNotice
                ? 'bg-emerald-600 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {appliedNotice ? (
              <>
                <Check className="w-4 h-4" />
                <span>Synchronized!</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                <span>Apply to Live Model</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* View Switcher Tabs */}
      <div className="flex bg-slate-100 p-1 rounded-lg text-xs font-medium gap-1 max-w-fit">
        <button
          onClick={() => setActiveTab('thermophysics')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md transition-all cursor-pointer ${
            activeTab === 'thermophysics'
              ? 'bg-white text-blue-700 font-semibold shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          <span>Thermophysical Properties</span>
        </button>

        <button
          onClick={() => setActiveTab('kinetics')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md transition-all cursor-pointer ${
            activeTab === 'kinetics'
              ? 'bg-white text-blue-700 font-semibold shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>Ammonia Kinetics</span>
        </button>

        <button
          onClick={() => setActiveTab('provenance')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md transition-all cursor-pointer ${
            activeTab === 'provenance'
              ? 'bg-white text-blue-700 font-semibold shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Data Provenance Registry ({provenanceRows.length})</span>
        </button>
      </div>

      {/* Operating State Controller */}
      <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between border-b border-slate-200/80 pb-3 gap-2">
          <div className="flex items-center gap-2">
            <Gauge className="w-4 h-4 text-blue-600" />
            <h3 className="font-bold text-xs font-mono text-slate-900 uppercase tracking-wide">
              NIST Process Conditions & Real-Gas PR-EOS
            </h3>
          </div>
          <span className="text-xs font-mono text-slate-500">
            Real Gas Z = <strong className="text-slate-800">{prState.compressibilityFactorZ.toFixed(3)}</strong> | Density ρ = <strong className="text-slate-800">{prState.densityKgM3.toFixed(2)} kg/m³</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Temperature Slider */}
          <div className="space-y-2.5 bg-white p-4 rounded-lg border border-slate-200/80 shadow-xs">
            <div className="flex justify-between items-center text-xs">
              <span className="font-medium text-slate-600">Bed Temperature (T)</span>
              <span className="text-amber-700 font-bold font-mono">
                {testTemp.toFixed(1)} K <span className="text-slate-400 font-normal">({(testTemp - 273.15).toFixed(1)} °C)</span>
              </span>
            </div>
            <input
              type="range"
              min="300"
              max="900"
              step="5"
              value={testTemp}
              onChange={(e) => setTestTemp(parseFloat(e.target.value))}
              className="w-full accent-blue-600 cursor-pointer h-2 bg-slate-100 rounded-lg appearance-none"
            />
            <div className="flex justify-between text-[11px] font-mono text-slate-400">
              <span>300 K</span>
              <span>600 K</span>
              <span>900 K</span>
            </div>
          </div>

          {/* Pressure Slider */}
          <div className="space-y-2.5 bg-white p-4 rounded-lg border border-slate-200/80 shadow-xs">
            <div className="flex justify-between items-center text-xs">
              <span className="font-medium text-slate-600">Total Pressure (P)</span>
              <span className="text-sky-700 font-bold font-mono">{(testPressure / 1e5).toFixed(1)} bar</span>
            </div>
            <input
              type="range"
              min="100000"
              max="25000000"
              step="500000"
              value={testPressure}
              onChange={(e) => setTestPressure(parseFloat(e.target.value))}
              className="w-full accent-blue-600 cursor-pointer h-2 bg-slate-100 rounded-lg appearance-none"
            />
            <div className="flex justify-between text-[11px] font-mono text-slate-400">
              <span>1 bar</span>
              <span>100 bar</span>
              <span>250 bar (High-P)</span>
            </div>
          </div>

          {/* Bulk Gas Selector */}
          <div className="space-y-2.5 bg-white p-4 rounded-lg border border-slate-200/80 shadow-xs">
            <label className="text-xs font-medium text-slate-600 block">
              Feed Composition & Inerts
            </label>
            <select
              value={testBulkGas}
              onChange={(e) => setTestBulkGas(e.target.value as BulkGasType)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-mono font-medium text-slate-800 focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              {Object.values(BULK_GAS_CONFIGS).map((cfg) => (
                <option key={cfg.id} value={cfg.id}>
                  {cfg.name}
                </option>
              ))}
            </select>
            <span className="text-xs text-slate-500 block leading-tight font-sans">
              {BULK_GAS_CONFIGS[testBulkGas]?.description}
            </span>
          </div>
        </div>
      </div>

      {/* TAB 1: THERMOPHYSICAL PROPERTIES */}
      {activeTab === 'thermophysics' && (
        <div className="space-y-5">
          {/* Calculated Output Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
            <div className="p-3 bg-white rounded-lg border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <span className="text-[11px] text-slate-500 block font-semibold uppercase tracking-wider">Mean Molar Mass</span>
              <span className="text-sm sm:text-base font-bold font-mono text-slate-900 my-0.5">
                {(nistCalculated.molarMassKgMol * 1000).toFixed(3)} g/mol
              </span>
              <span className="text-[11px] font-mono text-slate-400 block">NIST SRD 69</span>
            </div>

            <div className="p-3 bg-white rounded-lg border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <span className="text-[11px] text-slate-500 block font-semibold uppercase tracking-wider">Real Gas Density</span>
              <span className="text-sm sm:text-base font-bold font-mono text-blue-700 my-0.5">
                {prState.densityKgM3.toFixed(3)} kg/m³
              </span>
              <span className="text-[11px] font-mono text-slate-400 block">PR-EOS (Z={prState.compressibilityFactorZ.toFixed(3)})</span>
            </div>

            <div className="p-3 bg-white rounded-lg border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <span className="text-[11px] text-slate-500 block font-semibold uppercase tracking-wider">Heat Capacity (c_p)</span>
              <span className="text-sm sm:text-base font-bold font-mono text-slate-900 my-0.5">
                {nistCalculated.heatCapacity.toFixed(1)} J/(kg·K)
              </span>
              <span className="text-[11px] font-mono text-slate-400 block">Shomate Polynomial</span>
            </div>

            <div className="p-3 bg-white rounded-lg border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <span className="text-[11px] text-slate-500 block font-semibold uppercase tracking-wider">Gas Viscosity (μ_G)</span>
              <span className="text-sm sm:text-base font-bold font-mono text-slate-900 my-0.5">
                {(nistCalculated.viscosity * 1e6).toFixed(2)} µPa·s
              </span>
              <span className="text-[11px] font-mono text-slate-400 block">Wilke Formulation</span>
            </div>

            <div className="p-3 bg-white rounded-lg border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <span className="text-[11px] text-slate-500 block font-semibold uppercase tracking-wider">Conductivity (λ_G)</span>
              <span className="text-sm sm:text-base font-bold font-mono text-slate-900 my-0.5">
                {nistCalculated.thermalConductivity.toFixed(4)} W/(m·K)
              </span>
              <span className="text-[11px] font-mono text-slate-400 block">Mason & Saxena</span>
            </div>

            <div className="p-3 bg-white rounded-lg border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <span className="text-[11px] text-slate-500 block font-semibold uppercase tracking-wider">Reaction Enthalpy</span>
              <span className="text-sm sm:text-base font-bold font-mono text-slate-900 my-0.5">
                {(nistCalculated.reactionEnthalpy / 1000).toFixed(2)} kJ/mol
              </span>
              <span className="text-[11px] font-mono text-slate-400 block">Kirchhoff Integral</span>
            </div>
          </div>

          {/* Detailed Species Database Table */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between">
              <h4 className="font-bold text-xs uppercase tracking-wider font-mono text-slate-700">
                Pure Species Reference Data (NIST WebBook SRD 69)
              </h4>
              <span className="text-xs text-slate-400 font-mono">6 Components Evaluated</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[11px] font-semibold">
                  <tr>
                    <th className="p-3">Species</th>
                    <th className="p-3">Formula & CAS</th>
                    <th className="p-3">Molar Mass</th>
                    <th className="p-3">Critical (T_c / P_c)</th>
                    <th className="p-3">Acentric (ω)</th>
                    <th className="p-3">Δ_f H°₂₉₈</th>
                    <th className="p-3">Shomate Range</th>
                    <th className="p-3">Source</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {allSpeciesKeys.map((k) => {
                    const sub = NIST_SPECIES_REGISTRY[k];
                    return (
                      <tr key={sub.casNumber} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3 font-bold text-slate-900 font-sans">{sub.name}</td>
                        <td className="p-3 text-slate-500">
                          <span className="font-bold text-blue-700">{sub.chemicalFormula}</span> [{sub.casNumber}]
                        </td>
                        <td className="p-3">{(sub.molarMass.value * 1000).toFixed(3)} g/mol</td>
                        <td className="p-3">{sub.criticalTemperature.value.toFixed(1)} K / {(sub.criticalPressure.value / 1e5).toFixed(1)} bar</td>
                        <td className="p-3">{sub.acentricFactor.value.toFixed(3)}</td>
                        <td className="p-3">{(sub.standardEnthalpyFormation298.value / 1000).toFixed(1)} kJ/mol</td>
                        <td className="p-3">{sub.shomateGas.value.tMin} – {sub.shomateGas.value.tMax} K</td>
                        <td className="p-3">
                          <a
                            href={sub.webBookUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-700 hover:underline flex items-center gap-1 font-sans font-medium"
                          >
                            <span>WebBook</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: AMMONIA REACTION KINETICS */}
      {activeTab === 'kinetics' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
            <div className="p-3 bg-white rounded-lg border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <span className="text-[11px] text-slate-500 block font-semibold uppercase tracking-wider">Intrinsic Rate</span>
              <span className="text-sm sm:text-base font-bold font-mono text-slate-900 my-0.5">
                {nistKinetics.reactionRate.toExponential(3)}
              </span>
              <span className="text-[11px] font-mono text-slate-400 block">mol/(kg-cat·s)</span>
            </div>

            <div className="p-3 bg-white rounded-lg border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <span className="text-[11px] text-slate-500 block font-semibold uppercase tracking-wider">Activation Energy</span>
              <span className="text-sm sm:text-base font-bold font-mono text-slate-900 my-0.5">
                {(nistKinetics.activationEnergy / 1000).toFixed(1)} kJ/mol
              </span>
              <span className="text-[11px] font-mono text-slate-400 block">Promoted Fe Catalyst</span>
            </div>

            <div className="p-3 bg-white rounded-lg border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <span className="text-[11px] text-slate-500 block font-semibold uppercase tracking-wider">Apparent Order (n)</span>
              <span className="text-sm sm:text-base font-bold font-mono text-slate-900 my-0.5">
                {nistKinetics.reactionOrder.toFixed(1)}
              </span>
              <span className="text-[11px] font-mono text-slate-400 block">Temkin Pseudo-Order</span>
            </div>

            <div className="p-3 bg-white rounded-lg border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <span className="text-[11px] text-slate-500 block font-semibold uppercase tracking-wider">Synthesis Const (k₁)</span>
              <span className="text-sm sm:text-base font-bold font-mono text-slate-900 my-0.5">
                {nistKinetics.rateConstantK1.toExponential(2)}
              </span>
              <span className="text-[11px] font-mono text-slate-400 block">kmol/(m³·h·atm)</span>
            </div>

            <div className="p-3 bg-white rounded-lg border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <span className="text-[11px] text-slate-500 block font-semibold uppercase tracking-wider">Equilibrium K_p(T)</span>
              <span className="text-sm sm:text-base font-bold font-mono text-slate-900 my-0.5">
                {nistKinetics.equilibriumConstantKp.toExponential(2)}
              </span>
              <span className="text-[11px] font-mono text-slate-400 block">atm⁻¹ (NIST Gibbs)</span>
            </div>

            <div className="p-3 bg-white rounded-lg border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <span className="text-[11px] text-slate-500 block font-semibold uppercase tracking-wider">Equilibrium X_eq</span>
              <span className="text-sm sm:text-base font-bold font-mono text-emerald-700 my-0.5">
                {(nistKinetics.equilibriumConversionXeq * 100).toFixed(1)}%
              </span>
              <span className="text-[11px] font-mono text-slate-400 block">Max Thermodynamic Cap</span>
            </div>
          </div>

          {/* Governing Equation Card */}
          <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between border-b border-slate-200/80 pb-3 gap-2">
              <span className="font-bold text-xs font-mono text-slate-900 uppercase">
                {nistKinetics.kineticModelName}
              </span>
              <span className="text-xs font-mono text-slate-500">
                Thermodynamic Consistency Enforced: Net Rate r → 0 as Q → K_p
              </span>
            </div>

            <div className="p-4 bg-white rounded-lg border border-slate-200/80 text-center font-mono text-slate-900 overflow-x-auto shadow-xs">
              <MathView math={nistKinetics.rateEquationLatex} block />
            </div>

            <div className="space-y-1.5 pt-1 text-xs text-slate-600 font-sans">
              <span className="text-slate-800 font-bold font-mono block">Model Parameters & Arrhenius Constants:</span>
              <ul className="list-disc list-inside space-y-1 text-xs text-slate-600">
                {nistKinetics.notes.map((note, idx) => (
                  <li key={idx}>{note}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: DATA PROVENANCE & AUDIT REGISTRY */}
      {activeTab === 'provenance' && (
        <div className="space-y-4">
          {/* Provenance Filter Chips */}
          <div className="flex items-center justify-between flex-wrap gap-3 text-xs">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-slate-500 text-xs font-medium uppercase mr-1">Classification:</span>
              {(['all', 'evaluated', 'experimental', 'correlated', 'calculated'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setProvenanceFilter(filter)}
                  className={`px-3 py-1 uppercase text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    provenanceFilter === filter
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>

            <span className="text-xs font-mono text-slate-500">
              Showing {filteredProvenance.length} audited property parameters
            </span>
          </div>

          {/* Full Audited Provenance Table */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden max-h-[520px] overflow-y-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[11px] font-semibold sticky top-0 z-10">
                <tr>
                  <th className="p-3">Species</th>
                  <th className="p-3">Property</th>
                  <th className="p-3">Symbol</th>
                  <th className="p-3">Audited Value</th>
                  <th className="p-3">Units</th>
                  <th className="p-3">Classification</th>
                  <th className="p-3">Reported Uncertainty</th>
                  <th className="p-3">Authoritative Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {filteredProvenance.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3 font-bold text-slate-900">
                      {row.formula} <span className="text-[11px] text-slate-500 font-normal">({row.species})</span>
                    </td>
                    <td className="p-3 font-sans">{row.propertyName}</td>
                    <td className="p-3 text-blue-700 font-bold">
                      <MathView math={row.symbol} />
                    </td>
                    <td className="p-3 font-bold text-slate-900">{row.value}</td>
                    <td className="p-3 text-slate-500">{row.units}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 text-[10px] uppercase font-bold rounded ${
                        row.status === 'evaluated'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : row.status === 'experimental'
                          ? 'bg-blue-50 text-blue-800 border border-blue-200'
                          : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="p-3 text-xs text-slate-500">
                      {row.uncertainty || 'Evaluated standard'}
                    </td>
                    <td className="p-3">
                      <a
                        href={row.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-700 hover:underline flex items-center gap-1 text-xs font-sans font-medium"
                      >
                        <span className="truncate max-w-[180px]">{row.source}</span>
                        <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
