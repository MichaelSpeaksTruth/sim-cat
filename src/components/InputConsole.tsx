import React, { useState } from 'react';
import { ReactorInputs } from '../types/eurokin';
import { PRESET_SCENARIOS } from '../lib/presets';
import { BULK_GAS_CONFIGS, BulkGasType, computeAuditedNistAmmoniaProperties, computeNistAmmoniaKinetics } from '../lib/nistAmmoniaData';
import {
  Sliders,
  RotateCcw,
  Sparkles,
  Thermometer,
  Layers,
  FlaskConical,
  Activity,
  RefreshCw,
  Info,
  Check,
  AlertCircle,
  HelpCircle,
  ListOrdered
} from 'lucide-react';

interface InputConsoleProps {
  inputs: ReactorInputs;
  onChange: (inputs: ReactorInputs) => void;
  onReset: () => void;
}

export const InputConsole: React.FC<InputConsoleProps> = ({ inputs, onChange, onReset }) => {
  const [activeCategory, setActiveCategory] = useState<'operating' | 'kinetics' | 'gas' | 'dilution' | 'all'>('operating');
  const [selectedPreset, setSelectedPreset] = useState<string>(PRESET_SCENARIOS[0].id);
  const [syncNotice, setSyncNotice] = useState(false);

  const updateField = (field: keyof ReactorInputs, value: any) => {
    onChange({
      ...inputs,
      [field]: typeof value === 'number' && isNaN(value) ? 0 : value,
    });
  };

  const handlePresetChange = (presetId: string) => {
    setSelectedPreset(presetId);
    const found = PRESET_SCENARIOS.find(p => p.id === presetId);
    if (found) {
      onChange({ ...found.inputs });
    }
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

  const [kineticsNotice, setKineticsNotice] = useState(false);

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
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col">
      {/* Console Header */}
      <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-blue-600" />
          <div>
            <h3 className="font-bold text-xs tracking-wider uppercase text-slate-800">
              Reactor & Kinetic Parameters (24 Inputs)
            </h3>
          </div>
        </div>

        {/* Preset Selector */}
        <div className="flex items-center gap-2">
          <select
            value={selectedPreset}
            onChange={(e) => handlePresetChange(e.target.value)}
            className="bg-white border border-slate-300 rounded-md px-2.5 py-1 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-600 transition-colors shadow-2xs max-w-[210px] truncate"
            title="Select Ammonia preset scenario"
          >
            {PRESET_SCENARIOS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <button
            onClick={onReset}
            title="Reset parameters to defaults"
            className="p-1.5 rounded-md bg-white hover:bg-slate-100 text-slate-600 border border-slate-300 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Bulk Gas Feed Quick Control */}
      <div className="px-4 py-2.5 bg-blue-50/40 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-mono text-slate-500 font-semibold">Bulk Gas:</span>
          <select
            value={inputs.bulkGasType || 'syngas_stoichiometric'}
            onChange={(e) => updateField('bulkGasType', e.target.value as BulkGasType)}
            className="bg-white border border-slate-300 rounded px-2 py-0.5 text-xs font-mono font-bold text-blue-900 focus:outline-none focus:border-blue-600"
          >
            {Object.values(BULK_GAS_CONFIGS).map((cfg) => (
              <option key={cfg.id} value={cfg.id}>
                {cfg.name}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={handleNistSync}
          title="Auto-calculate gas physical properties (15-20) from NIST WebBook at current T and P"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-white hover:bg-blue-50 text-blue-700 font-mono text-[11px] font-bold border border-blue-200 transition-colors shadow-2xs"
        >
          {syncNotice ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span>Gas Props Synced</span>
            </>
          ) : (
            <>
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Sync NIST Gas Props</span>
            </>
          )}
        </button>
      </div>

      {/* Validation Warning Alert if any */}
      {validationWarnings.length > 0 && (
        <div className="p-3 bg-amber-50 border-b border-amber-200 text-amber-800 text-xs font-mono space-y-1">
          <div className="flex items-center gap-1.5 font-bold">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            <span>Input Validation Warning:</span>
          </div>
          <ul className="list-disc list-inside space-y-0.5 text-[11px]">
            {validationWarnings.map((w, idx) => (
              <li key={idx}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Category Navigation Tabs (The 4 Official Industrial Categories) */}
      <div className="grid grid-cols-5 border-b border-slate-200 bg-slate-100/70 text-[11px] font-mono">
        <button
          onClick={() => setActiveCategory('operating')}
          className={`py-2 px-1 text-center transition-all border-b-2 flex flex-col items-center justify-center ${
            activeCategory === 'operating'
              ? 'border-blue-600 text-blue-700 font-bold bg-white'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>1. Operating (8)</span>
        </button>

        <button
          onClick={() => setActiveCategory('kinetics')}
          className={`py-2 px-1 text-center transition-all border-b-2 flex flex-col items-center justify-center ${
            activeCategory === 'kinetics'
              ? 'border-blue-600 text-blue-700 font-bold bg-white'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>2. Kinetics (6)</span>
        </button>

        <button
          onClick={() => setActiveCategory('gas')}
          className={`py-2 px-1 text-center transition-all border-b-2 flex flex-col items-center justify-center ${
            activeCategory === 'gas'
              ? 'border-blue-600 text-blue-700 font-bold bg-white'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>3. Gas Props (6)</span>
        </button>

        <button
          onClick={() => setActiveCategory('dilution')}
          className={`py-2 px-1 text-center transition-all border-b-2 flex flex-col items-center justify-center ${
            activeCategory === 'dilution'
              ? 'border-blue-600 text-blue-700 font-bold bg-white'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>4. Dilution (4)</span>
        </button>

        <button
          onClick={() => setActiveCategory('all')}
          className={`py-2 px-1 text-center transition-all border-b-2 flex flex-col items-center justify-center ${
            activeCategory === 'all'
              ? 'border-blue-600 text-blue-700 font-bold bg-white'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>All 24</span>
        </button>
      </div>

      {/* Fields Body */}
      <div className="p-4 space-y-4 max-h-[600px] overflow-y-auto">
        {/* CATEGORY 1: OPERATING AND REACTOR PARAMETERS (8 inputs) */}
        {(activeCategory === 'operating' || activeCategory === 'all') && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-800 border-b border-slate-200 pb-1">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center text-[11px]">1</span>
              <span>1. Operating & Reactor Parameters (Inputs 1 to 8)</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* 1. Bed Temperature, T */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-slate-700 font-medium">1. Bed Temperature, T</span>
                  <span className="text-blue-700 font-bold">{(inputs.temperature - 273.15).toFixed(1)} °C</span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="5"
                    value={inputs.temperature}
                    onChange={(e) => updateField('temperature', parseFloat(e.target.value))}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                  <span className="absolute right-3 top-1.5 text-xs font-mono text-slate-400">K</span>
                </div>
              </div>

              {/* 2. Total Pressure, P */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-slate-700 font-medium">2. Total Pressure, P</span>
                  <span className="text-blue-700 font-bold">{(inputs.totalPressure / 100000).toFixed(1)} bar</span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="100000"
                    value={inputs.totalPressure}
                    onChange={(e) => updateField('totalPressure', parseFloat(e.target.value))}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                  <span className="absolute right-3 top-1.5 text-xs font-mono text-slate-400">Pa</span>
                </div>
              </div>

              {/* 3. Gas Mass Flow Rate, ṁ */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-slate-700 font-medium">3. Gas Mass Flow Rate, ṁ</span>
                  <span className="text-slate-500">{(inputs.feedFlow * 1e6).toFixed(1)} mg/s</span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="1e-6"
                    value={inputs.feedFlow}
                    onChange={(e) => updateField('feedFlow', parseFloat(e.target.value))}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                  <span className="absolute right-3 top-1.5 text-xs font-mono text-slate-400">kg/s</span>
                </div>
              </div>

              {/* 4. Catalyst Bed Length, L */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-slate-700 font-medium">4. Bed Length, L</span>
                  <span className="text-slate-500">{(inputs.bedHeight * 1000).toFixed(1)} mm</span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="0.005"
                    value={inputs.bedHeight}
                    onChange={(e) => updateField('bedHeight', parseFloat(e.target.value))}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                  <span className="absolute right-3 top-1.5 text-xs font-mono text-slate-400">m</span>
                </div>
              </div>

              {/* 5. Tube Inner Diameter, D_t */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-slate-700 font-medium">5. Tube Inner Diameter, D_t</span>
                  <span className="text-slate-500">{(inputs.tubeDiameter * 1000).toFixed(1)} mm</span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="0.001"
                    value={inputs.tubeDiameter}
                    onChange={(e) => updateField('tubeDiameter', parseFloat(e.target.value))}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                  <span className="absolute right-3 top-1.5 text-xs font-mono text-slate-400">m</span>
                </div>
              </div>

              {/* 6. Catalyst Pellet Diameter, d_p */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-slate-700 font-medium">6. Pellet Diameter, d_p</span>
                  <span className="text-slate-500">{(inputs.particleDiameter * 1e6).toFixed(0)} µm</span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="0.00005"
                    value={inputs.particleDiameter}
                    onChange={(e) => updateField('particleDiameter', parseFloat(e.target.value))}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                  <span className="absolute right-3 top-1.5 text-xs font-mono text-slate-400">m</span>
                </div>
              </div>

              {/* 7. Bed Void Fraction, ε_b */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-slate-700 font-medium">7. Bed Void Fraction, ε_b</span>
                  <span className="text-slate-500">{(inputs.bedPorosity * 100).toFixed(0)}% void</span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="0.02"
                    min="0.05"
                    max="0.95"
                    value={inputs.bedPorosity}
                    onChange={(e) => updateField('bedPorosity', parseFloat(e.target.value))}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                  <span className="absolute right-3 top-1.5 text-xs font-mono text-slate-400">[-]</span>
                </div>
              </div>

              {/* 8. Catalyst Pellet Density, ρ_cat */}
              <div className="space-y-1">
                <label className="text-xs font-mono text-slate-700 font-medium">8. Catalyst Density, ρ_cat</label>
                <div className="relative">
                  <input
                    type="number"
                    step="50"
                    value={inputs.catalystDensity}
                    onChange={(e) => updateField('catalystDensity', parseFloat(e.target.value))}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                  <span className="absolute right-3 top-1.5 text-xs font-mono text-slate-400">kg/m³</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CATEGORY 2: REACTION AND KINETIC PARAMETERS (6 inputs) */}
        {(activeCategory === 'kinetics' || activeCategory === 'all') && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-1">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-800">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center text-[11px]">2</span>
                <span>2. Reaction & Kinetic Parameters (Inputs 9 to 14)</span>
              </div>
              <button
                type="button"
                onClick={handleKineticsSync}
                title="Auto-estimate r_m, n, and E_a using Dyson & Baddour (1968) / Temkin-Pyzhev rate law"
                className="px-2 py-0.5 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 text-[10px] font-mono font-bold border border-blue-200 transition-colors"
              >
                {kineticsNotice ? 'Kinetics Evaluated!' : 'Auto-Fit via Dyson-Baddour'}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* 9. Observed Reaction Rate, r_m */}
              <div className="space-y-1">
                <label className="text-xs font-mono text-slate-700 font-medium">9. Observed Rate, r_m</label>
                <div className="relative">
                  <input
                    type="number"
                    step="1e-5"
                    value={inputs.reactionRate}
                    onChange={(e) => updateField('reactionRate', parseFloat(e.target.value))}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                  <span className="absolute right-3 top-1.5 text-xs font-mono text-slate-400">mol/(kg·s)</span>
                </div>
              </div>

              {/* 10. Reaction Order, n */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-slate-700 font-medium">10. Reaction Order, n</span>
                  <span className="text-slate-500 font-semibold">{inputs.reactionOrder <= 0 ? 'Invalid (Must be > 0)' : 'Valid'}</span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="0.01"
                    value={inputs.reactionOrder}
                    onChange={(e) => updateField('reactionOrder', parseFloat(e.target.value))}
                    className={`w-full bg-white border rounded-lg px-3 py-1.5 text-xs font-mono text-slate-900 focus:outline-none ${
                      inputs.reactionOrder <= 0 ? 'border-rose-500' : 'border-slate-300 focus:border-blue-600'
                    }`}
                  />
                  <span className="absolute right-3 top-1.5 text-xs font-mono text-slate-400">[-]</span>
                </div>
              </div>

              {/* 11. Activation Energy, E_a */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-slate-700 font-medium">11. Activation Energy, E_a</span>
                  <span className="text-slate-500">{(inputs.activationEnergy / 1000).toFixed(1)} kJ/mol</span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="5000"
                    value={inputs.activationEnergy}
                    onChange={(e) => updateField('activationEnergy', parseFloat(e.target.value))}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                  <span className="absolute right-3 top-1.5 text-xs font-mono text-slate-400">J/mol</span>
                </div>
              </div>

              {/* 12. Reaction Enthalpy, ΔH_r */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-slate-700 font-medium">12. Reaction Enthalpy, |ΔH_r|</span>
                  <span className="text-slate-500">{(inputs.reactionEnthalpy / 1000).toFixed(1)} kJ/mol</span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="1000"
                    value={inputs.reactionEnthalpy}
                    onChange={(e) => updateField('reactionEnthalpy', parseFloat(e.target.value))}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                  <span className="absolute right-3 top-1.5 text-xs font-mono text-slate-400">J/mol</span>
                </div>
              </div>

              {/* 13. Reactant Mole Fraction in Feed, y_A */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-slate-700 font-medium">13. Reactant Mole Frac., y_A</span>
                  <span className="text-slate-500">{(inputs.reactantMoleFraction * 100).toFixed(2)} mol%</span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="0.005"
                    min="0.0001"
                    max="1.0"
                    value={inputs.reactantMoleFraction}
                    onChange={(e) => updateField('reactantMoleFraction', parseFloat(e.target.value))}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                  <span className="absolute right-3 top-1.5 text-xs font-mono text-slate-400">[-]</span>
                </div>
              </div>

              {/* 14. Reactant Conversion, X */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-slate-700 font-medium">14. Reactant Conversion, X</span>
                  <span className="text-emerald-700 font-bold">{(inputs.conversion * 100).toFixed(1)}%</span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0.001"
                    max="0.999"
                    value={inputs.conversion}
                    onChange={(e) => updateField('conversion', parseFloat(e.target.value))}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                  <span className="absolute right-3 top-1.5 text-xs font-mono text-slate-400">[-]</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CATEGORY 3: GAS-PHASE PHYSICAL PROPERTIES (6 inputs) */}
        {(activeCategory === 'gas' || activeCategory === 'all') && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-800 border-b border-slate-200 pb-1">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center text-[11px]">3</span>
              <span>3. Gas-Phase Physical Properties (Inputs 15 to 20)</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* 15. Mean Molecular Weight, M_g */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-slate-700 font-medium">15. Mean Mol. Weight, M_g</span>
                  <span className="text-slate-500">{(inputs.gasMolecularWeight * 1000).toFixed(2)} g/mol</span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="0.0005"
                    value={inputs.gasMolecularWeight}
                    onChange={(e) => updateField('gasMolecularWeight', parseFloat(e.target.value))}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                  <span className="absolute right-3 top-1.5 text-xs font-mono text-slate-400">kg/mol</span>
                </div>
              </div>

              {/* 16. Gas Viscosity, μ_g */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-slate-700 font-medium">16. Gas Viscosity, μ_g</span>
                  <span className="text-slate-500">{(inputs.gasViscosity * 1e6).toFixed(1)} µPa·s</span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="1e-6"
                    value={inputs.gasViscosity}
                    onChange={(e) => updateField('gasViscosity', parseFloat(e.target.value))}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                  <span className="absolute right-3 top-1.5 text-xs font-mono text-slate-400">kg/(m·s)</span>
                </div>
              </div>

              {/* 17. Gas Heat Capacity, C_{p,g} */}
              <div className="space-y-1">
                <label className="text-xs font-mono text-slate-700 font-medium">17. Heat Capacity, C_p,g</label>
                <div className="relative">
                  <input
                    type="number"
                    step="100"
                    value={inputs.gasHeatCapacity}
                    onChange={(e) => updateField('gasHeatCapacity', parseFloat(e.target.value))}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                  <span className="absolute right-3 top-1.5 text-xs font-mono text-slate-400">J/(kg·K)</span>
                </div>
              </div>

              {/* 18. Gas Thermal Conductivity, k_g */}
              <div className="space-y-1">
                <label className="text-xs font-mono text-slate-700 font-medium">18. Thermal Cond., k_g</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    value={inputs.gasConductivity}
                    onChange={(e) => updateField('gasConductivity', parseFloat(e.target.value))}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                  <span className="absolute right-3 top-1.5 text-xs font-mono text-slate-400">W/(m·K)</span>
                </div>
              </div>

              {/* 19. Molecular Diffusivity, D_AB */}
              <div className="space-y-1">
                <label className="text-xs font-mono text-slate-700 font-medium">19. Gas Diffusivity, D_AB</label>
                <div className="relative">
                  <input
                    type="number"
                    step="1e-6"
                    value={inputs.molecularDiffusivity}
                    onChange={(e) => updateField('molecularDiffusivity', parseFloat(e.target.value))}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                  <span className="absolute right-3 top-1.5 text-xs font-mono text-slate-400">m²/s</span>
                </div>
              </div>

              {/* 20. Effective Pore Diffusivity, D_eff */}
              <div className="space-y-1">
                <label className="text-xs font-mono text-slate-700 font-medium">20. Pore Diffusivity, D_eff</label>
                <div className="relative">
                  <input
                    type="number"
                    step="1e-7"
                    value={inputs.effectiveDiffusivity}
                    onChange={(e) => updateField('effectiveDiffusivity', parseFloat(e.target.value))}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                  <span className="absolute right-3 top-1.5 text-xs font-mono text-slate-400">m²/s</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CATEGORY 4: INERT-BED DILUTION PARAMETERS (4 inputs) */}
        {(activeCategory === 'dilution' || activeCategory === 'all') && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-800 border-b border-slate-200 pb-1">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center text-[11px]">4</span>
              <span>4. Inert-Bed Dilution Parameters (Inputs 21 to 24)</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* 21. Catalyst Mass, W_cat */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-slate-700 font-medium">21. Catalyst Mass, W_cat</span>
                  <span className="text-slate-500">{(inputs.catalystMass * 1e6).toFixed(1)} mg</span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="0.00005"
                    value={inputs.catalystMass}
                    onChange={(e) => updateField('catalystMass', parseFloat(e.target.value))}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                  <span className="absolute right-3 top-1.5 text-xs font-mono text-slate-400">kg</span>
                </div>
              </div>

              {/* 22. Inert Diluent Mass, W_dil */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-slate-700 font-medium">22. Inert Mass, W_dil</span>
                  <span className="text-slate-500">{(inputs.inertMass * 1e6).toFixed(1)} mg</span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="0.00005"
                    value={inputs.inertMass}
                    onChange={(e) => updateField('inertMass', parseFloat(e.target.value))}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                  <span className="absolute right-3 top-1.5 text-xs font-mono text-slate-400">kg</span>
                </div>
              </div>

              {/* 23. Inert Particle Density, ρ_dil */}
              <div className="space-y-1">
                <label className="text-xs font-mono text-slate-700 font-medium">23. Inert Density, ρ_dil (SiC)</label>
                <div className="relative">
                  <input
                    type="number"
                    step="100"
                    value={inputs.inertDensity}
                    onChange={(e) => updateField('inertDensity', parseFloat(e.target.value))}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                  <span className="absolute right-3 top-1.5 text-xs font-mono text-slate-400">kg/m³</span>
                </div>
              </div>

              {/* 24. Diluted Bed Conversion, X_dil */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-slate-700 font-medium">24. Diluted Conversion, X_dil</span>
                  <span className="text-slate-500">{(inputs.dilutedConversion * 100).toFixed(1)}%</span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="0.02"
                    min="0.001"
                    max="0.999"
                    value={inputs.dilutedConversion}
                    onChange={(e) => updateField('dilutedConversion', parseFloat(e.target.value))}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                  <span className="absolute right-3 top-1.5 text-xs font-mono text-slate-400">[-]</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Info Callout */}
      <div className="p-3 bg-slate-50 border-t border-slate-200 text-[11px] font-mono text-slate-500 flex items-center justify-between">
        <span>Note: All secondary quantities (C_A,b, ρ_G, u₀, Re, Sc, Pr, Sh, Nu, Ca, Φ, ΔP) are calculated by the program.</span>
      </div>
    </div>
  );
};
