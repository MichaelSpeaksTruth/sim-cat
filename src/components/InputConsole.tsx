import React, { useState } from 'react';
import { ReactorInputs } from '../types/eurokin';
import { PRESET_SCENARIOS } from '../lib/presets';
import { BULK_GAS_CONFIGS, BulkGasType, computeAuditedNistAmmoniaProperties, computeNistAmmoniaKinetics } from '../lib/nistAmmoniaData';
import {
  Sliders,
  RotateCcw,
  RefreshCw,
  Check,
  AlertCircle,
} from 'lucide-react';

interface InputConsoleProps {
  inputs: ReactorInputs;
  onChange: (inputs: ReactorInputs) => void;
  onReset: () => void;
  isDirty?: boolean;
}

export const InputConsole: React.FC<InputConsoleProps> = ({ inputs, onChange, onReset, isDirty }) => {
  const [activeCategory, setActiveCategory] = useState<'operating' | 'kinetics' | 'gas' | 'dilution' | 'all'>('operating');
  const [syncNotice, setSyncNotice] = useState(false);
  const [kineticsNotice, setKineticsNotice] = useState(false);

  const updateField = (field: keyof ReactorInputs, value: any) => {
    onChange({
      ...inputs,
      [field]: typeof value === 'number' && isNaN(value) ? 0 : value,
    });
  };

  const handleNistSync = () => {
    const nist = computeAuditedNistAmmoniaProperties(
      inputs.temperature,
      inputs.totalPressure,
      inputs.bulkGasType || 'syngas_stoichiometric',
      inputs.reactantMoleFraction
    );

    const computedDeff = nist.molecularDiffusivity * (inputs.pelletPorosity / Math.max(inputs.pelletTortuosity, 1.0));

    onChange({
      ...inputs,
      gasMolecularWeight: nist.molarMassKgMol,
      gasViscosity: nist.viscosity,
      gasHeatCapacity: nist.heatCapacity,
      gasConductivity: nist.thermalConductivity,
      molecularDiffusivity: nist.molecularDiffusivity,
      effectiveDiffusivity: computedDeff,
      reactionEnthalpy: nist.reactionEnthalpy,
    });

    setSyncNotice(true);
    setTimeout(() => setSyncNotice(false), 2000);
  };

  const handleKineticsSync = () => {
    const kin = computeNistAmmoniaKinetics(
      inputs.temperature,
      inputs.totalPressure,
      inputs.bulkGasType || 'syngas_stoichiometric',
      inputs.reactantMoleFraction
    );

    onChange({
      ...inputs,
      reactionRate: kin.reactionRate,
      reactionOrder: kin.reactionOrder,
      activationEnergy: kin.activationEnergy,
    });

    setKineticsNotice(true);
    setTimeout(() => setKineticsNotice(false), 2000);
  };

  // Validation warnings
  const validationWarnings: string[] = [];
  if (inputs.reactionOrder <= 0) validationWarnings.push('Reaction order (n) must be strictly > 0 for pressure-drop limit and Carberry criterion.');
  if (inputs.bedPorosity <= 0 || inputs.bedPorosity >= 1) validationWarnings.push('Bed void fraction (ε_b) must be between 0 and 1.');
  if (inputs.reactantMoleFraction <= 0 || inputs.reactantMoleFraction > 1) validationWarnings.push('Feed mole fraction (y_A) must be between 0 and 1.');
  if (inputs.conversion <= 0 || inputs.conversion >= 1) validationWarnings.push('Conversion (X) must be between 0 and 1.');
  if (inputs.totalPressure <= 0) validationWarnings.push('Total pressure must be positive.');

  return (
    <div className="bg-[#0A0D12] border border-[#1E2533] flex flex-col select-none">
      {/* Console Header */}
      <div className="p-3.5 bg-[#080B10] border-b border-[#1E2533] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-[#00D8F6]" />
          <div>
            <h3 className="font-bold text-xs tracking-wider uppercase font-mono text-slate-100">
              Reactor & Kinetic Controls (24 Primary Inputs)
            </h3>
          </div>
        </div>

        {/* Industrial Regime Indicator & Reset */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-[#12161E] border border-[#252E3E] text-slate-300 text-[10px] font-mono">
            <span className="w-2 h-2 bg-[#10B981]"></span>
            <span>Haber-Bosch Synthesis (Promoted Fe)</span>
          </div>

          <button
            onClick={onReset}
            title="Reset parameters to industrial baseline (400 °C, 100 bar)"
            className="flex items-center gap-1 px-2 py-0.5 bg-[#12161E] hover:bg-[#1A202A] text-slate-400 hover:text-slate-100 border border-[#252E3E] text-[10px] font-mono transition-colors"
          >
            <RotateCcw className="w-3 h-3 text-slate-500" />
            <span>Reset Baseline</span>
          </button>
        </div>
      </div>

      {/* Bulk Gas Feed Quick Control */}
      <div className="px-3.5 py-2 bg-[#0E131A] border-b border-[#1E2533] flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
        <div className="flex items-center gap-2">
          <span className="text-slate-400 text-[11px]">Bulk Gas Feed:</span>
          <select
            value={inputs.bulkGasType || 'syngas_stoichiometric'}
            onChange={(e) => updateField('bulkGasType', e.target.value as BulkGasType)}
            className="bg-[#12161E] border border-[#252E3E] px-2 py-0.5 text-xs font-mono font-bold text-[#00D8F6] focus:outline-none focus:border-[#00D8F6]"
          >
            {Object.values(BULK_GAS_CONFIGS)
              .filter(cfg => cfg.id.startsWith('syngas'))
              .map((cfg) => (
                <option key={cfg.id} value={cfg.id}>
                  {cfg.name}
                </option>
              ))}
          </select>
        </div>

        <button
          onClick={handleNistSync}
          title="Auto-calculate gas physical properties from NIST WebBook at current T and P"
          className="flex items-center gap-1.5 px-2.5 py-0.5 bg-[#141A24] hover:bg-[#1E2533] text-[#00D8F6] text-[10px] font-mono font-bold border border-[#252E3E] transition-colors"
        >
          {syncNotice ? (
            <>
              <Check className="w-3 h-3 text-[#10B981]" />
              <span>NIST Props Synced</span>
            </>
          ) : (
            <>
              <RefreshCw className="w-3 h-3 text-[#00D8F6]" />
              <span>Sync NIST Gas Props</span>
            </>
          )}
        </button>
      </div>

      {/* Validation Warning Alert if any */}
      {validationWarnings.length > 0 && (
        <div className="p-3 bg-[#EF4444]/10 border-b border-[#EF4444]/30 text-[#EF4444] text-xs font-mono space-y-1">
          <div className="flex items-center gap-1.5 font-bold">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Input Validation Warning:</span>
          </div>
          <ul className="list-disc list-inside space-y-0.5 text-[10px]">
            {validationWarnings.map((w, idx) => (
              <li key={idx}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Category Navigation Tabs */}
      <div className="grid grid-cols-5 border-b border-[#1E2533] bg-[#07090D] text-[11px] font-mono">
        <button
          onClick={() => setActiveCategory('operating')}
          className={`py-2 px-1 text-center transition-all border-b-2 flex flex-col items-center justify-center ${
            activeCategory === 'operating'
              ? 'border-[#00D8F6] text-[#00D8F6] font-bold bg-[#141A24]'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>1. Operating (8)</span>
        </button>

        <button
          onClick={() => setActiveCategory('kinetics')}
          className={`py-2 px-1 text-center transition-all border-b-2 flex flex-col items-center justify-center ${
            activeCategory === 'kinetics'
              ? 'border-[#00D8F6] text-[#00D8F6] font-bold bg-[#141A24]'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>2. Kinetics (6)</span>
        </button>

        <button
          onClick={() => setActiveCategory('gas')}
          className={`py-2 px-1 text-center transition-all border-b-2 flex flex-col items-center justify-center ${
            activeCategory === 'gas'
              ? 'border-[#00D8F6] text-[#00D8F6] font-bold bg-[#141A24]'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>3. Gas Props (6)</span>
        </button>

        <button
          onClick={() => setActiveCategory('dilution')}
          className={`py-2 px-1 text-center transition-all border-b-2 flex flex-col items-center justify-center ${
            activeCategory === 'dilution'
              ? 'border-[#00D8F6] text-[#00D8F6] font-bold bg-[#141A24]'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>4. Dilution (4)</span>
        </button>

        <button
          onClick={() => setActiveCategory('all')}
          className={`py-2 px-1 text-center transition-all border-b-2 flex flex-col items-center justify-center ${
            activeCategory === 'all'
              ? 'border-[#00D8F6] text-[#00D8F6] font-bold bg-[#141A24]'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>All 24</span>
        </button>
      </div>

      {/* Fields Body */}
      <div className="p-4 space-y-4 max-h-[580px] overflow-y-auto">
        {/* CATEGORY 1: OPERATING AND REACTOR PARAMETERS (8 inputs) */}
        {(activeCategory === 'operating' || activeCategory === 'all') && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-200 border-b border-[#1E2533] pb-1">
              <span className="w-4 h-4 bg-[#141A24] text-[#00D8F6] border border-[#252E3E] flex items-center justify-center text-[10px]">1</span>
              <span>1. Operating & Reactor Parameters (Inputs 1 to 8)</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* 1. Bed Temperature, T */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-slate-400">1. Bed Temperature, T</span>
                  <span className="text-[#F59E0B] font-bold">{(inputs.temperature - 273.15).toFixed(1)} °C</span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="5"
                    value={inputs.temperature}
                    onChange={(e) => updateField('temperature', parseFloat(e.target.value))}
                    className="w-full bg-[#12161E] border border-[#252E3E] px-3 py-1.5 text-xs font-mono text-slate-100 focus:outline-none focus:border-[#00D8F6]"
                  />
                  <span className="absolute right-3 top-1.5 text-xs font-mono text-slate-500">K</span>
                </div>
              </div>

              {/* 2. Total Pressure, P */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-slate-400">2. Total Pressure, P</span>
                  <span className="text-[#38BDF8] font-bold">{(inputs.totalPressure / 100000).toFixed(1)} bar</span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="100000"
                    value={inputs.totalPressure}
                    onChange={(e) => updateField('totalPressure', parseFloat(e.target.value))}
                    className="w-full bg-[#12161E] border border-[#252E3E] px-3 py-1.5 text-xs font-mono text-slate-100 focus:outline-none focus:border-[#00D8F6]"
                  />
                  <span className="absolute right-3 top-1.5 text-xs font-mono text-slate-500">Pa</span>
                </div>
              </div>

              {/* 3. Gas Mass Flow Rate, ṁ */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-slate-400">3. Gas Mass Flow Rate, ṁ</span>
                  <span className="text-slate-500">{(inputs.feedFlow * 1e6).toFixed(1)} mg/s</span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="1e-6"
                    value={inputs.feedFlow}
                    onChange={(e) => updateField('feedFlow', parseFloat(e.target.value))}
                    className="w-full bg-[#12161E] border border-[#252E3E] px-3 py-1.5 text-xs font-mono text-slate-100 focus:outline-none focus:border-[#00D8F6]"
                  />
                  <span className="absolute right-3 top-1.5 text-xs font-mono text-slate-500">kg/s</span>
                </div>
              </div>

              {/* 4. Catalyst Bed Length, L */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-slate-400">4. Bed Length, L</span>
                  <span className="text-slate-500">{(inputs.bedHeight * 1000).toFixed(1)} mm</span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="0.005"
                    value={inputs.bedHeight}
                    onChange={(e) => updateField('bedHeight', parseFloat(e.target.value))}
                    className="w-full bg-[#12161E] border border-[#252E3E] px-3 py-1.5 text-xs font-mono text-slate-100 focus:outline-none focus:border-[#00D8F6]"
                  />
                  <span className="absolute right-3 top-1.5 text-xs font-mono text-slate-500">m</span>
                </div>
              </div>

              {/* 5. Tube Inner Diameter, D_t */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-slate-400">5. Tube Inner Diameter, D_t</span>
                  <span className="text-slate-500">{(inputs.tubeDiameter * 1000).toFixed(1)} mm</span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="0.001"
                    value={inputs.tubeDiameter}
                    onChange={(e) => updateField('tubeDiameter', parseFloat(e.target.value))}
                    className="w-full bg-[#12161E] border border-[#252E3E] px-3 py-1.5 text-xs font-mono text-slate-100 focus:outline-none focus:border-[#00D8F6]"
                  />
                  <span className="absolute right-3 top-1.5 text-xs font-mono text-slate-500">m</span>
                </div>
              </div>

              {/* 6. Catalyst Pellet Diameter, d_p */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-slate-400">6. Pellet Diameter, d_p</span>
                  <span className="text-slate-500">{(inputs.particleDiameter * 1e6).toFixed(0)} µm</span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="0.00005"
                    value={inputs.particleDiameter}
                    onChange={(e) => updateField('particleDiameter', parseFloat(e.target.value))}
                    className="w-full bg-[#12161E] border border-[#252E3E] px-3 py-1.5 text-xs font-mono text-slate-100 focus:outline-none focus:border-[#00D8F6]"
                  />
                  <span className="absolute right-3 top-1.5 text-xs font-mono text-slate-500">m</span>
                </div>
              </div>

              {/* 7. Bed Void Fraction, ε_b */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-slate-400">7. Bed Void Fraction, ε_b</span>
                  <span className="text-slate-500">{(inputs.bedPorosity * 100).toFixed(0)}%</span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="0.02"
                    min="0.05"
                    max="0.95"
                    value={inputs.bedPorosity}
                    onChange={(e) => updateField('bedPorosity', parseFloat(e.target.value))}
                    className="w-full bg-[#12161E] border border-[#252E3E] px-3 py-1.5 text-xs font-mono text-slate-100 focus:outline-none focus:border-[#00D8F6]"
                  />
                  <span className="absolute right-3 top-1.5 text-xs font-mono text-slate-500">[-]</span>
                </div>
              </div>

              {/* 8. Catalyst Pellet Density, ρ_cat */}
              <div className="space-y-1">
                <label className="text-xs font-mono text-slate-400">8. Catalyst Density, ρ_cat</label>
                <div className="relative">
                  <input
                    type="number"
                    step="50"
                    value={inputs.catalystDensity}
                    onChange={(e) => updateField('catalystDensity', parseFloat(e.target.value))}
                    className="w-full bg-[#12161E] border border-[#252E3E] px-3 py-1.5 text-xs font-mono text-slate-100 focus:outline-none focus:border-[#00D8F6]"
                  />
                  <span className="absolute right-3 top-1.5 text-xs font-mono text-slate-500">kg/m³</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CATEGORY 2: REACTION AND KINETIC PARAMETERS (6 inputs) */}
        {(activeCategory === 'kinetics' || activeCategory === 'all') && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between gap-2 border-b border-[#1E2533] pb-1">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-200">
                <span className="w-4 h-4 bg-[#141A24] text-[#00D8F6] border border-[#252E3E] flex items-center justify-center text-[10px]">2</span>
                <span>2. Reaction & Kinetic Parameters (Inputs 9 to 14)</span>
              </div>
              <button
                type="button"
                onClick={handleKineticsSync}
                className="px-2 py-0.5 bg-[#141A24] hover:bg-[#1E2533] text-[#00D8F6] text-[10px] font-mono font-bold border border-[#252E3E] transition-colors"
              >
                {kineticsNotice ? 'Kinetics Evaluated!' : 'Auto-Fit via Dyson-Baddour'}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* 9. Observed Reaction Rate, r_m */}
              <div className="space-y-1">
                <label className="text-xs font-mono text-slate-400">9. Observed Rate, r_m</label>
                <div className="relative">
                  <input
                    type="number"
                    step="1e-5"
                    value={inputs.reactionRate}
                    onChange={(e) => updateField('reactionRate', parseFloat(e.target.value))}
                    className="w-full bg-[#12161E] border border-[#252E3E] px-3 py-1.5 text-xs font-mono text-slate-100 focus:outline-none focus:border-[#00D8F6]"
                  />
                  <span className="absolute right-3 top-1.5 text-xs font-mono text-slate-500">mol/(kg·s)</span>
                </div>
              </div>

              {/* 10. Reaction Order, n */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-slate-400">10. Reaction Order, n</span>
                  <span className="text-slate-500">{inputs.reactionOrder <= 0 ? 'Must be > 0' : 'Valid'}</span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="0.01"
                    value={inputs.reactionOrder}
                    onChange={(e) => updateField('reactionOrder', parseFloat(e.target.value))}
                    className="w-full bg-[#12161E] border border-[#252E3E] px-3 py-1.5 text-xs font-mono text-slate-100 focus:outline-none focus:border-[#00D8F6]"
                  />
                  <span className="absolute right-3 top-1.5 text-xs font-mono text-slate-500">[-]</span>
                </div>
              </div>

              {/* 11. Activation Energy, E_a */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-slate-400">11. Activation Energy, E_a</span>
                  <span className="text-slate-500">{(inputs.activationEnergy / 1000).toFixed(1)} kJ/mol</span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="1000"
                    value={inputs.activationEnergy}
                    onChange={(e) => updateField('activationEnergy', parseFloat(e.target.value))}
                    className="w-full bg-[#12161E] border border-[#252E3E] px-3 py-1.5 text-xs font-mono text-slate-100 focus:outline-none focus:border-[#00D8F6]"
                  />
                  <span className="absolute right-3 top-1.5 text-xs font-mono text-slate-500">J/mol</span>
                </div>
              </div>

              {/* 12. Reaction Enthalpy, |ΔH_r| */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-slate-400">12. Reaction Enthalpy, |ΔH_r|</span>
                  <span className="text-[#F59E0B] font-bold">{(inputs.reactionEnthalpy / 1000).toFixed(1)} kJ/mol</span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="500"
                    value={inputs.reactionEnthalpy}
                    onChange={(e) => updateField('reactionEnthalpy', parseFloat(e.target.value))}
                    className="w-full bg-[#12161E] border border-[#252E3E] px-3 py-1.5 text-xs font-mono text-slate-100 focus:outline-none focus:border-[#00D8F6]"
                  />
                  <span className="absolute right-3 top-1.5 text-xs font-mono text-slate-500">J/mol</span>
                </div>
              </div>

              {/* 13. Feed Mole Fraction, y_A */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-slate-400">13. Reactant Mole Fraction, y_A</span>
                  <span className="text-slate-500">{(inputs.reactantMoleFraction * 100).toFixed(1)} mol%</span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0.0001"
                    max="1.0"
                    value={inputs.reactantMoleFraction}
                    onChange={(e) => updateField('reactantMoleFraction', parseFloat(e.target.value))}
                    className="w-full bg-[#12161E] border border-[#252E3E] px-3 py-1.5 text-xs font-mono text-slate-100 focus:outline-none focus:border-[#00D8F6]"
                  />
                  <span className="absolute right-3 top-1.5 text-xs font-mono text-slate-500">[-]</span>
                </div>
              </div>

              {/* 14. Target Conversion, X */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-slate-400">14. Target Conversion, X</span>
                  <span className="text-[#10B981] font-bold">{(inputs.conversion * 100).toFixed(1)}%</span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="0.02"
                    min="0.001"
                    max="0.999"
                    value={inputs.conversion}
                    onChange={(e) => updateField('conversion', parseFloat(e.target.value))}
                    className="w-full bg-[#12161E] border border-[#252E3E] px-3 py-1.5 text-xs font-mono text-slate-100 focus:outline-none focus:border-[#00D8F6]"
                  />
                  <span className="absolute right-3 top-1.5 text-xs font-mono text-slate-500">[-]</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CATEGORY 3: GAS MIXTURE PHYSICAL PROPERTIES (6 inputs) */}
        {(activeCategory === 'gas' || activeCategory === 'all') && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between border-b border-[#1E2533] pb-1">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-200">
                <span className="w-4 h-4 bg-[#141A24] text-[#00D8F6] border border-[#252E3E] flex items-center justify-center text-[10px]">3</span>
                <span>3. Gas Mixture Physical Properties (Inputs 15 to 20 via NIST)</span>
              </div>
              <span className="text-[10px] font-mono text-[#00D8F6]">NIST SRD 69 Mapped</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* 15. Gas Molecular Weight, M_g */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-slate-400">15. Mean Molar Mass, M_g</span>
                  <span className="text-slate-500">{(inputs.gasMolecularWeight * 1000).toFixed(3)} g/mol</span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="0.0001"
                    value={inputs.gasMolecularWeight}
                    onChange={(e) => updateField('gasMolecularWeight', parseFloat(e.target.value))}
                    className="w-full bg-[#12161E] border border-[#252E3E] px-3 py-1.5 text-xs font-mono text-slate-100 focus:outline-none focus:border-[#00D8F6]"
                  />
                  <span className="absolute right-3 top-1.5 text-xs font-mono text-slate-500">kg/mol</span>
                </div>
              </div>

              {/* 16. Dynamic Gas Viscosity, μ_g */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-slate-400">16. Viscosity, μ_g</span>
                  <span className="text-slate-500">{(inputs.gasViscosity * 1e6).toFixed(2)} µPa·s</span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="1e-7"
                    value={inputs.gasViscosity}
                    onChange={(e) => updateField('gasViscosity', parseFloat(e.target.value))}
                    className="w-full bg-[#12161E] border border-[#252E3E] px-3 py-1.5 text-xs font-mono text-slate-100 focus:outline-none focus:border-[#00D8F6]"
                  />
                  <span className="absolute right-3 top-1.5 text-xs font-mono text-slate-500">kg/(m·s)</span>
                </div>
              </div>

              {/* 17. Gas Specific Heat Capacity, C_p,g */}
              <div className="space-y-1">
                <label className="text-xs font-mono text-slate-400">17. Heat Capacity, C_p,g</label>
                <div className="relative">
                  <input
                    type="number"
                    step="50"
                    value={inputs.gasHeatCapacity}
                    onChange={(e) => updateField('gasHeatCapacity', parseFloat(e.target.value))}
                    className="w-full bg-[#12161E] border border-[#252E3E] px-3 py-1.5 text-xs font-mono text-slate-100 focus:outline-none focus:border-[#00D8F6]"
                  />
                  <span className="absolute right-3 top-1.5 text-xs font-mono text-slate-500">J/(kg·K)</span>
                </div>
              </div>

              {/* 18. Gas Thermal Conductivity, k_g */}
              <div className="space-y-1">
                <label className="text-xs font-mono text-slate-400">18. Thermal Conductivity, k_g</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.005"
                    value={inputs.gasConductivity}
                    onChange={(e) => updateField('gasConductivity', parseFloat(e.target.value))}
                    className="w-full bg-[#12161E] border border-[#252E3E] px-3 py-1.5 text-xs font-mono text-slate-100 focus:outline-none focus:border-[#00D8F6]"
                  />
                  <span className="absolute right-3 top-1.5 text-xs font-mono text-slate-500">W/(m·K)</span>
                </div>
              </div>

              {/* 19. Binary Molecular Diffusivity, D_AB */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-slate-400">19. Binary Diffusivity, D_AB</span>
                  <span className="text-slate-500">Fuller method</span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="1e-8"
                    value={inputs.molecularDiffusivity}
                    onChange={(e) => updateField('molecularDiffusivity', parseFloat(e.target.value))}
                    className="w-full bg-[#12161E] border border-[#252E3E] px-3 py-1.5 text-xs font-mono text-slate-100 focus:outline-none focus:border-[#00D8F6]"
                  />
                  <span className="absolute right-3 top-1.5 text-xs font-mono text-slate-500">m²/s</span>
                </div>
              </div>

              {/* 20. Effective Pore Diffusivity, D_eff */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-slate-400">20. Effective Diffusivity, D_eff</span>
                  <span className="text-slate-500">Bosanquet pore</span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="1e-8"
                    value={inputs.effectiveDiffusivity}
                    onChange={(e) => updateField('effectiveDiffusivity', parseFloat(e.target.value))}
                    className="w-full bg-[#12161E] border border-[#252E3E] px-3 py-1.5 text-xs font-mono text-slate-100 focus:outline-none focus:border-[#00D8F6]"
                  />
                  <span className="absolute right-3 top-1.5 text-xs font-mono text-slate-500">m²/s</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CATEGORY 4: INERT BED DILUTION PARAMETERS (4 inputs) */}
        {(activeCategory === 'dilution' || activeCategory === 'all') && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between border-b border-[#1E2533] pb-1">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-200">
                <span className="w-4 h-4 bg-[#141A24] text-[#00D8F6] border border-[#252E3E] flex items-center justify-center text-[10px]">4</span>
                <span>4. Inert Bed Dilution Parameters (Inputs 21 to 24)</span>
              </div>
              <span className="text-[10px] font-mono text-slate-500">Berger et al. Criterion</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* 21. Catalyst Loaded Mass, W_cat */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-slate-400">21. Catalyst Mass, W_cat</span>
                  <span className="text-slate-500">{(inputs.catalystMass * 1e6).toFixed(0)} mg</span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="0.00005"
                    value={inputs.catalystMass}
                    onChange={(e) => updateField('catalystMass', parseFloat(e.target.value))}
                    className="w-full bg-[#12161E] border border-[#252E3E] px-3 py-1.5 text-xs font-mono text-slate-100 focus:outline-none focus:border-[#00D8F6]"
                  />
                  <span className="absolute right-3 top-1.5 text-xs font-mono text-slate-500">kg</span>
                </div>
              </div>

              {/* 22. Inert Diluent (SiC) Mass, W_dil */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-slate-400">22. Inert Mass, W_dil (SiC)</span>
                  <span className="text-slate-500">{(inputs.inertMass * 1e6).toFixed(0)} mg</span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="0.00005"
                    value={inputs.inertMass}
                    onChange={(e) => updateField('inertMass', parseFloat(e.target.value))}
                    className="w-full bg-[#12161E] border border-[#252E3E] px-3 py-1.5 text-xs font-mono text-slate-100 focus:outline-none focus:border-[#00D8F6]"
                  />
                  <span className="absolute right-3 top-1.5 text-xs font-mono text-slate-500">kg</span>
                </div>
              </div>

              {/* 23. Inert Particle Density, ρ_dil */}
              <div className="space-y-1">
                <label className="text-xs font-mono text-slate-400">23. Inert Density, ρ_dil (SiC)</label>
                <div className="relative">
                  <input
                    type="number"
                    step="100"
                    value={inputs.inertDensity}
                    onChange={(e) => updateField('inertDensity', parseFloat(e.target.value))}
                    className="w-full bg-[#12161E] border border-[#252E3E] px-3 py-1.5 text-xs font-mono text-slate-100 focus:outline-none focus:border-[#00D8F6]"
                  />
                  <span className="absolute right-3 top-1.5 text-xs font-mono text-slate-500">kg/m³</span>
                </div>
              </div>

              {/* 24. Diluted Bed Conversion, X_dil */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-slate-400">24. Diluted Conversion, X_dil</span>
                  <span className="text-slate-500">{(inputs.dilutedConversion * 100).toFixed(1)}%</span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="0.02"
                    value={inputs.dilutedConversion}
                    onChange={(e) => updateField('dilutedConversion', parseFloat(e.target.value))}
                    className="w-full bg-[#12161E] border border-[#252E3E] px-3 py-1.5 text-xs font-mono text-slate-100 focus:outline-none focus:border-[#00D8F6]"
                  />
                  <span className="absolute right-3 top-1.5 text-xs font-mono text-slate-500">[-]</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
