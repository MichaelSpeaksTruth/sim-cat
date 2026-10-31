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
import { Database, Check, RefreshCw, Gauge, Zap, FileSpreadsheet, ShieldCheck, ExternalLink, Download } from 'lucide-react';

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
        uncertainty: sp.molarMass.uncertainty,
      },
      {
        species: sp.name,
        formula: sp.chemicalFormula,
        cas: sp.casNumber,
        propertyName: 'Std Formation Enthalpy (298.15 K)',
        symbol: sp.standardEnthalpyFormation298.symbol,
        value: (sp.standardEnthalpyFormation298.value / 1000).toFixed(2),
        units: 'kJ/mol',
        source: sp.standardEnthalpyFormation298.sourceOrganization,
        url: sp.standardEnthalpyFormation298.sourceUrl,
        status: sp.standardEnthalpyFormation298.status,
        uncertainty: sp.standardEnthalpyFormation298.uncertainty,
      },
      {
        species: sp.name,
        formula: sp.chemicalFormula,
        cas: sp.casNumber,
        propertyName: 'Std Absolute Entropy (298.15 K)',
        symbol: sp.standardEntropy298.symbol,
        value: sp.standardEntropy298.value.toFixed(2),
        units: 'J/(mol·K)',
        source: sp.standardEntropy298.sourceOrganization,
        url: sp.standardEntropy298.sourceUrl,
        status: sp.standardEntropy298.status,
        uncertainty: sp.standardEntropy298.uncertainty,
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
    <div className="bg-white rounded-xl shadow-xs border border-slate-200/80 p-5 space-y-5">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-[#00D8F6]/10 text-blue-600 border border-blue-600/30">
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
            Authoritative thermodynamic properties, Peng-Robinson (1976) real-gas compressibility Z(T,P), Dyson & Baddour industrial kinetics, and complete provenance metadata directly traceable to NIST Standard Reference Database 69.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleExportProvenanceSnapshot}
            className="flex items-center gap-2 px-3 py-2 text-xs font-mono font-bold uppercase tracking-wider bg-[#141922] hover:bg-[#1E2533] text-slate-800 border border-slate-200/80 transition-colors"
          >
            {snapshotExported ? (
              <>
                <Check className="w-3.5 h-3.5 text-[#10B981]" />
                <span className="text-[#10B981]">Exported!</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5 text-blue-600" />
                <span>Export Provenance JSON</span>
              </>
            )}
          </button>

          <button
            onClick={handleApplyAll}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider border transition-all ${
              appliedNotice
                ? 'bg-[#10B981] text-[#080A0D] border-[#10B981]'
                : 'bg-[#00D8F6] hover:bg-[#38BDF8] text-[#080A0D] border-blue-600'
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
      <div className="flex bg-[#07090D] border border-slate-200/80 text-xs font-mono max-w-fit">
        <button
          onClick={() => setActiveTab('thermophysics')}
          className={`flex items-center gap-1.5 px-4 py-2 transition-all ${
            activeTab === 'thermophysics'
              ? 'bg-slate-100 text-blue-600 font-bold border-b-2 border-b-[#00D8F6]'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          <span>Thermophysical Properties (NIST SRD 69)</span>
        </button>

        <button
          onClick={() => setActiveTab('kinetics')}
          className={`flex items-center gap-1.5 px-4 py-2 transition-all ${
            activeTab === 'kinetics'
              ? 'bg-slate-100 text-blue-600 font-bold border-b-2 border-b-[#00D8F6]'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>Ammonia Kinetics & Equilibrium</span>
        </button>

        <button
          onClick={() => setActiveTab('provenance')}
          className={`flex items-center gap-1.5 px-4 py-2 transition-all ${
            activeTab === 'provenance'
              ? 'bg-slate-100 text-blue-600 font-bold border-b-2 border-b-[#00D8F6]'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Data Provenance & Audit Registry ({provenanceRows.length})</span>
        </button>
      </div>

      {/* Operating State Controller */}
      <div className="bg-[#080A0D] border border-slate-200/80 p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-200/80 pb-2 text-xs font-mono">
          <div className="flex items-center gap-2">
            <Gauge className="w-4 h-4 text-blue-600" />
            <h3 className="font-bold text-slate-900 uppercase tracking-wide">
              NIST Process Conditions Controller & Real-Gas PR-EOS
            </h3>
          </div>
          <span className="text-[10px] text-slate-500">
            Real Gas Z = {prState.compressibilityFactorZ.toFixed(3)} | Density ρ = {prState.densityKgM3.toFixed(2)} kg/m³
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Temperature Slider */}
          <div className="space-y-1.5 bg-[#0E131A] p-3 border border-[#1C2533]">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-slate-500">Temperature (T)</span>
              <span className="text-[#F59E0B] font-bold">{testTemp.toFixed(1)} K ({(testTemp - 273.15).toFixed(1)} °C)</span>
            </div>
            <input
              type="range"
              min="300"
              max="900"
              step="5"
              value={testTemp}
              onChange={(e) => setTestTemp(parseFloat(e.target.value))}
              className="w-full accent-[#00D8F6] cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-500">
              <span>300 K</span>
              <span>600 K</span>
              <span>900 K</span>
            </div>
          </div>

          {/* Pressure Slider */}
          <div className="space-y-1.5 bg-[#0E131A] p-3 border border-[#1C2533]">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-slate-500">Total Pressure (P)</span>
              <span className="text-[#38BDF8] font-bold">{(testPressure / 1e5).toFixed(1)} bar</span>
            </div>
            <input
              type="range"
              min="100000"
              max="25000000"
              step="500000"
              value={testPressure}
              onChange={(e) => setTestPressure(parseFloat(e.target.value))}
              className="w-full accent-[#00D8F6] cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-500">
              <span>1 bar</span>
              <span>100 bar</span>
              <span>250 bar (Industrial High-P)</span>
            </div>
          </div>

          {/* Bulk Gas Selector */}
          <div className="space-y-1.5 bg-[#0E131A] p-3 border border-[#1C2533]">
            <label className="text-xs text-slate-500 block font-mono">
              Feed Composition & Inerts
            </label>
            <select
              value={testBulkGas}
              onChange={(e) => setTestBulkGas(e.target.value as BulkGasType)}
              className="w-full bg-slate-50 border border-slate-300 px-2.5 py-1.5 text-xs font-mono text-slate-800 focus:outline-none focus:border-blue-600"
            >
              {Object.values(BULK_GAS_CONFIGS).map((cfg) => (
                <option key={cfg.id} value={cfg.id}>
                  {cfg.name}
                </option>
              ))}
            </select>
            <span className="text-[10px] text-slate-500 block leading-tight font-sans">
              {BULK_GAS_CONFIGS[testBulkGas]?.description}
            </span>
          </div>
        </div>
      </div>

      {/* TAB 1: THERMOPHYSICAL PROPERTIES */}
      {activeTab === 'thermophysics' && (
        <div className="space-y-5">
          {/* Calculated Output Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs font-mono">
            <div className="p-3 bg-[#080A0D] border border-slate-200/80">
              <span className="text-[10px] text-slate-500 block uppercase">Mean Molar Mass</span>
              <span className="text-sm font-bold text-slate-900">
                {(nistCalculated.molarMassKgMol * 1000).toFixed(3)} g/mol
              </span>
              <span className="text-[9px] text-slate-500 block mt-0.5">NIST SRD 69</span>
            </div>

            <div className="p-3 bg-[#080A0D] border border-slate-200/80">
              <span className="text-[10px] text-slate-500 block uppercase">Real Gas Density</span>
              <span className="text-sm font-bold text-blue-600">
                {prState.densityKgM3.toFixed(3)} kg/m³
              </span>
              <span className="text-[9px] text-slate-500 block mt-0.5">Peng-Robinson (Z = {prState.compressibilityFactorZ.toFixed(3)})</span>
            </div>

            <div className="p-3 bg-[#080A0D] border border-slate-200/80">
              <span className="text-[10px] text-slate-500 block uppercase">Heat Capacity (c_p)</span>
              <span className="text-sm font-bold text-slate-900">
                {nistCalculated.heatCapacity.toFixed(1)} J/(kg·K)
              </span>
              <span className="text-[9px] text-slate-500 block mt-0.5">Shomate Polynomial</span>
            </div>

            <div className="p-3 bg-[#080A0D] border border-slate-200/80">
              <span className="text-[10px] text-slate-500 block uppercase">Gas Viscosity (μ_G)</span>
              <span className="text-sm font-bold text-slate-900">
                {(nistCalculated.viscosity * 1e6).toFixed(2)} µPa·s
              </span>
              <span className="text-[9px] text-slate-500 block mt-0.5">Wilke Formulation</span>
            </div>

            <div className="p-3 bg-[#080A0D] border border-slate-200/80">
              <span className="text-[10px] text-slate-500 block uppercase">Conductivity (λ_G)</span>
              <span className="text-sm font-bold text-slate-900">
                {nistCalculated.thermalConductivity.toFixed(4)} W/(m·K)
              </span>
              <span className="text-[9px] text-slate-500 block mt-0.5">Mason & Saxena</span>
            </div>

            <div className="p-3 bg-[#080A0D] border border-slate-200/80">
              <span className="text-[10px] text-slate-500 block uppercase">Reaction Enthalpy</span>
              <span className="text-sm font-bold text-slate-900">
                {(nistCalculated.reactionEnthalpy / 1000).toFixed(2)} kJ/mol
              </span>
              <span className="text-[9px] text-slate-500 block mt-0.5">Kirchhoff Integration</span>
            </div>
          </div>

          {/* Detailed Species Database Table */}
          <div className="border border-slate-200/80 overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#0D121A] border-b border-slate-200/80 text-slate-500 uppercase text-[10px]">
                <tr>
                  <th className="p-3">Species</th>
                  <th className="p-3">Formula & CAS</th>
                  <th className="p-3">Molar Mass</th>
                  <th className="p-3">Critical (T_c / P_c)</th>
                  <th className="p-3">Acentric (ω)</th>
                  <th className="p-3">Δ_f H°₂₉₈</th>
                  <th className="p-3">Shomate Range</th>
                  <th className="p-3">NIST Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#171E2A] text-slate-800">
                {allSpeciesKeys.map((k) => {
                  const sub = NIST_SPECIES_REGISTRY[k];
                  return (
                    <tr key={sub.casNumber} className="hover:bg-[#0E131A]">
                      <td className="p-3 font-bold text-slate-900 font-sans">{sub.name}</td>
                      <td className="p-3 text-slate-500">
                        <span className="font-bold text-blue-600">{sub.chemicalFormula}</span> [{sub.casNumber}]
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
                          className="text-blue-600 hover:underline flex items-center gap-1"
                        >
                          <span>WebBook</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: AMMONIA REACTION KINETICS */}
      {activeTab === 'kinetics' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs font-mono">
            <div className="p-3 bg-[#080A0D] border border-slate-200/80">
              <span className="text-[10px] text-slate-500 block uppercase">Intrinsic Rate (r_m)</span>
              <span className="text-sm font-bold text-slate-900">
                {nistKinetics.reactionRate.toExponential(3)}
              </span>
              <span className="text-[9px] text-slate-500 block mt-0.5">mol/(kg-cat·s)</span>
            </div>

            <div className="p-3 bg-[#080A0D] border border-slate-200/80">
              <span className="text-[10px] text-slate-500 block uppercase">Activation Energy</span>
              <span className="text-sm font-bold text-slate-900">
                {(nistKinetics.activationEnergy / 1000).toFixed(1)} kJ/mol
              </span>
              <span className="text-[9px] text-slate-500 block mt-0.5">Promoted Fe Catalyst</span>
            </div>

            <div className="p-3 bg-[#080A0D] border border-slate-200/80">
              <span className="text-[10px] text-slate-500 block uppercase">Apparent Order (n)</span>
              <span className="text-sm font-bold text-slate-900">
                {nistKinetics.reactionOrder.toFixed(1)}
              </span>
              <span className="text-[9px] text-slate-500 block mt-0.5">Temkin Pseudo-Order</span>
            </div>

            <div className="p-3 bg-[#080A0D] border border-slate-200/80">
              <span className="text-[10px] text-slate-500 block uppercase">Synthesis Const (k₁)</span>
              <span className="text-sm font-bold text-slate-900">
                {nistKinetics.rateConstantK1.toExponential(2)}
              </span>
              <span className="text-[9px] text-slate-500 block mt-0.5">kmol/(m³·h·atm)</span>
            </div>

            <div className="p-3 bg-[#080A0D] border border-slate-200/80">
              <span className="text-[10px] text-slate-500 block uppercase">Equilibrium K_p(T)</span>
              <span className="text-sm font-bold text-slate-900">
                {nistKinetics.equilibriumConstantKp.toExponential(2)}
              </span>
              <span className="text-[9px] text-slate-500 block mt-0.5">atm⁻¹ (NIST Gibbs)</span>
            </div>

            <div className="p-3 bg-[#080A0D] border border-slate-200/80">
              <span className="text-[10px] text-slate-500 block uppercase">Equilibrium X_eq</span>
              <span className="text-sm font-bold text-[#10B981]">
                {(nistKinetics.equilibriumConversionXeq * 100).toFixed(1)}%
              </span>
              <span className="text-[9px] text-slate-500 block mt-0.5">Max Thermodynamic Cap</span>
            </div>
          </div>

          {/* Governing Equation Card */}
          <div className="bg-[#080A0D] border border-slate-200/80 p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-2 text-xs font-mono">
              <span className="font-bold text-slate-900 uppercase">
                {nistKinetics.kineticModelName}
              </span>
              <span className="text-[10px] text-slate-500">
                Thermodynamic Consistency Enforced: Net Rate r → 0 as Q → K_p
              </span>
            </div>

            <div className="p-3 bg-[#05070A] border border-slate-200/60 text-center font-mono text-slate-900 overflow-x-auto">
              <MathView math={nistKinetics.rateEquationLatex} block />
            </div>

            <div className="space-y-1 pt-1 text-xs font-mono text-slate-500">
              <span className="text-slate-700 font-bold block">Model Parameters & Arrhenius Constants:</span>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-500">
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
          <div className="flex items-center justify-between flex-wrap gap-2 text-xs font-mono">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-slate-500 text-[11px] uppercase mr-1">Classification:</span>
              {(['all', 'evaluated', 'experimental', 'correlated', 'calculated'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setProvenanceFilter(filter)}
                  className={`px-2.5 py-1 uppercase text-[10px] font-bold border transition-colors ${
                    provenanceFilter === filter
                      ? 'bg-[#00D8F6] text-[#080A0D] border-blue-600'
                      : 'bg-[#141922] text-slate-500 border-slate-200/80 hover:text-slate-800'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>

            <span className="text-[11px] text-slate-500">
              Showing {filteredProvenance.length} audited property parameters
            </span>
          </div>

          {/* Full Audited Provenance Table */}
          <div className="border border-slate-200/80 overflow-x-auto max-h-[500px]">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#0D121A] border-b border-slate-200/80 text-slate-500 uppercase text-[10px] sticky top-0">
                <tr>
                  <th className="p-2.5">Species</th>
                  <th className="p-2.5">Property</th>
                  <th className="p-2.5">Symbol</th>
                  <th className="p-2.5">Audited Value</th>
                  <th className="p-2.5">Units</th>
                  <th className="p-2.5">Classification</th>
                  <th className="p-2.5">Reported Uncertainty</th>
                  <th className="p-2.5">Authoritative Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#171E2A] text-slate-800">
                {filteredProvenance.map((row, idx) => (
                  <tr key={idx} className="hover:bg-[#0E131A]">
                    <td className="p-2.5 font-bold text-slate-900">
                      {row.formula} <span className="text-[10px] text-slate-500 font-normal">({row.species})</span>
                    </td>
                    <td className="p-2.5 font-sans">{row.propertyName}</td>
                    <td className="p-2.5 text-blue-600 font-bold">
                      <MathView math={row.symbol} />
                    </td>
                    <td className="p-2.5 font-bold text-slate-900">{row.value}</td>
                    <td className="p-2.5 text-slate-500">{row.units}</td>
                    <td className="p-2.5">
                      <span className={`px-2 py-0.5 text-[9px] uppercase font-bold border ${
                        row.status === 'evaluated'
                          ? 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/30'
                          : row.status === 'experimental'
                          ? 'bg-[#00D8F6]/10 text-blue-600 border-blue-600/30'
                          : 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/30'
                      }`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="p-2.5 text-[11px] text-slate-500">
                      {row.uncertainty || 'Evaluated standard'}
                    </td>
                    <td className="p-2.5">
                      <a
                        href={row.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 hover:underline flex items-center gap-1 text-[11px]"
                      >
                        <span className="truncate max-w-[180px]">{row.source}</span>
                        <ExternalLink className="w-3 h-3 shrink-0" />
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
