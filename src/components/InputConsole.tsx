import React, { useState } from 'react';
import { ReactorInputs } from '../types/eurokin';
import { PRESET_SCENARIOS } from '../lib/presets';
import { Settings2, RotateCcw, Sparkles, Sliders, Thermometer, ShieldAlert, Check } from 'lucide-react';

interface InputConsoleProps {
  inputs: ReactorInputs;
  onChange: (inputs: ReactorInputs) => void;
  onReset: () => void;
}

export const InputConsole: React.FC<InputConsoleProps> = ({ inputs, onChange, onReset }) => {
  const [activeCategory, setActiveCategory] = useState<'operating' | 'geometry' | 'catalyst' | 'kinetics'>('operating');
  const [selectedPreset, setSelectedPreset] = useState<string>('benchmark_n2o');

  const updateField = (field: keyof ReactorInputs, value: number) => {
    onChange({
      ...inputs,
      [field]: isNaN(value) ? 0 : value,
    });
  };

  const handlePresetChange = (presetId: string) => {
    setSelectedPreset(presetId);
    const found = PRESET_SCENARIOS.find(p => p.id === presetId);
    if (found) {
      onChange({ ...found.inputs });
    }
  };

  return (
    <div className="bg-[#0f141d] border border-slate-800/80 rounded-xl overflow-hidden shadow-2xl flex flex-col">
      {/* Console Header */}
      <div className="p-4 bg-[#131924] border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-amber-400" />
          <h3 className="font-semibold text-xs tracking-wider uppercase text-slate-100">
            Reactor & Kinetic Parameter Console
          </h3>
        </div>

        {/* Preset Selector */}
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <select
            value={selectedPreset}
            onChange={(e) => handlePresetChange(e.target.value)}
            className="bg-[#0b0e14] border border-slate-700/80 rounded-md px-2.5 py-1 text-xs font-medium text-slate-200 focus:outline-none focus:border-amber-500 transition-colors"
          >
            {PRESET_SCENARIOS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <button
            onClick={onReset}
            title="Reset parameters to standard reference benchmark"
            className="p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-100 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Category Navigation Tabs */}
      <div className="grid grid-cols-4 border-b border-slate-800 bg-[#0b0e14] text-xs font-mono">
        <button
          onClick={() => setActiveCategory('operating')}
          className={`py-2.5 px-3 text-center transition-all border-b-2 flex items-center justify-center gap-1.5 ${
            activeCategory === 'operating'
              ? 'border-amber-500 text-amber-300 font-bold bg-[#131924]'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Thermometer className="w-3.5 h-3.5" />
          <span>Operating</span>
        </button>

        <button
          onClick={() => setActiveCategory('geometry')}
          className={`py-2.5 px-3 text-center transition-all border-b-2 flex items-center justify-center gap-1.5 ${
            activeCategory === 'geometry'
              ? 'border-amber-500 text-amber-300 font-bold bg-[#131924]'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Geometry</span>
        </button>

        <button
          onClick={() => setActiveCategory('catalyst')}
          className={`py-2.5 px-3 text-center transition-all border-b-2 flex items-center justify-center gap-1.5 ${
            activeCategory === 'catalyst'
              ? 'border-amber-500 text-amber-300 font-bold bg-[#131924]'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>Catalyst & Dilution</span>
        </button>

        <button
          onClick={() => setActiveCategory('kinetics')}
          className={`py-2.5 px-3 text-center transition-all border-b-2 flex items-center justify-center gap-1.5 ${
            activeCategory === 'kinetics'
              ? 'border-amber-500 text-amber-300 font-bold bg-[#131924]'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>Kinetics & Gas</span>
        </button>
      </div>

      {/* Fields Body */}
      <div className="p-4 space-y-4">
        {activeCategory === 'operating' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Bed Temperature */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-slate-300 font-sans font-medium">Bed Temperature (T)</span>
                <span className="text-slate-400">{(inputs.temperature - 273.15).toFixed(1)} °C</span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  step="5"
                  value={inputs.temperature}
                  onChange={(e) => updateField('temperature', parseFloat(e.target.value))}
                  className="w-full bg-[#0a0d14] border border-slate-700/80 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-amber-500"
                />
                <span className="absolute right-3 top-2 text-xs font-mono text-slate-500">K</span>
              </div>
            </div>

            {/* Total Pressure */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-slate-300 font-sans font-medium">Total Pressure (P_tot)</span>
                <span className="text-slate-400">{(inputs.totalPressure / 100000).toFixed(2)} bar</span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  step="10000"
                  value={inputs.totalPressure}
                  onChange={(e) => updateField('totalPressure', parseFloat(e.target.value))}
                  className="w-full bg-[#0a0d14] border border-slate-700/80 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-amber-500"
                />
                <span className="absolute right-3 top-2 text-xs font-mono text-slate-500">Pa</span>
              </div>
            </div>

            {/* Mass Flow Rate */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-slate-300 font-sans font-medium">Feed Flow Rate (ṁ)</span>
                <span className="text-slate-400">{(inputs.feedFlow * 1e6).toFixed(2)} mg/s</span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  step="1e-7"
                  value={inputs.feedFlow}
                  onChange={(e) => updateField('feedFlow', parseFloat(e.target.value))}
                  className="w-full bg-[#0a0d14] border border-slate-700/80 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-amber-500"
                />
                <span className="absolute right-3 top-2 text-xs font-mono text-slate-500">kg/s</span>
              </div>
            </div>

            {/* Reactant Conversion */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-slate-300 font-sans font-medium">Reactant Conversion (X_A)</span>
                <span className="text-amber-400 font-bold">{(inputs.conversion * 100).toFixed(1)}%</span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  step="0.05"
                  min="0.01"
                  max="0.99"
                  value={inputs.conversion}
                  onChange={(e) => updateField('conversion', parseFloat(e.target.value))}
                  className="w-full bg-[#0a0d14] border border-slate-700/80 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-amber-500"
                />
                <span className="absolute right-3 top-2 text-xs font-mono text-slate-500">[-]</span>
              </div>
            </div>

            {/* Reactant Mole Fraction */}
            <div className="space-y-1 md:col-span-2">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-slate-300 font-sans font-medium">Reactant Mole Fraction in Feed (y_A)</span>
                <span className="text-slate-400">{(inputs.reactantMoleFraction * 100).toFixed(3)} mol%</span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  step="0.0001"
                  value={inputs.reactantMoleFraction}
                  onChange={(e) => updateField('reactantMoleFraction', parseFloat(e.target.value))}
                  className="w-full bg-[#0a0d14] border border-slate-700/80 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-amber-500"
                />
                <span className="absolute right-3 top-2 text-xs font-mono text-slate-500">mol/mol</span>
              </div>
            </div>
          </div>
        )}

        {activeCategory === 'geometry' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Bed Height */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-slate-300 font-sans font-medium">Bed Length (h_bed)</span>
                <span className="text-slate-400">{(inputs.bedHeight * 1000).toFixed(1)} mm</span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  step="0.005"
                  value={inputs.bedHeight}
                  onChange={(e) => updateField('bedHeight', parseFloat(e.target.value))}
                  className="w-full bg-[#0a0d14] border border-slate-700/80 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-amber-500"
                />
                <span className="absolute right-3 top-2 text-xs font-mono text-slate-500">m</span>
              </div>
            </div>

            {/* Tube Inner Diameter */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-slate-300 font-sans font-medium">Tube Diameter (d_t)</span>
                <span className="text-slate-400">{(inputs.tubeDiameter * 1000).toFixed(1)} mm</span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  step="0.001"
                  value={inputs.tubeDiameter}
                  onChange={(e) => updateField('tubeDiameter', parseFloat(e.target.value))}
                  className="w-full bg-[#0a0d14] border border-slate-700/80 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-amber-500"
                />
                <span className="absolute right-3 top-2 text-xs font-mono text-slate-500">m</span>
              </div>
            </div>

            {/* Catalyst Pellet Diameter */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-slate-300 font-sans font-medium">Pellet Diameter (d_p)</span>
                <span className="text-slate-400">{(inputs.particleDiameter * 1e6).toFixed(0)} µm</span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  step="0.0001"
                  value={inputs.particleDiameter}
                  onChange={(e) => updateField('particleDiameter', parseFloat(e.target.value))}
                  className="w-full bg-[#0a0d14] border border-slate-700/80 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-amber-500"
                />
                <span className="absolute right-3 top-2 text-xs font-mono text-slate-500">m</span>
              </div>
            </div>

            {/* Bed Porosity */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-slate-300 font-sans font-medium">Bed Void Fraction (ε_b)</span>
                <span className="text-slate-400">{(inputs.bedPorosity * 100).toFixed(0)}% void</span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  step="0.02"
                  min="0.2"
                  max="0.8"
                  value={inputs.bedPorosity}
                  onChange={(e) => updateField('bedPorosity', parseFloat(e.target.value))}
                  className="w-full bg-[#0a0d14] border border-slate-700/80 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-amber-500"
                />
                <span className="absolute right-3 top-2 text-xs font-mono text-slate-500">[-]</span>
              </div>
            </div>
          </div>
        )}

        {activeCategory === 'catalyst' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Catalyst Pellet Density */}
            <div className="space-y-1">
              <label className="text-xs font-mono text-slate-300">Catalyst Density (ρ_cat)</label>
              <div className="relative">
                <input
                  type="number"
                  step="50"
                  value={inputs.catalystDensity}
                  onChange={(e) => updateField('catalystDensity', parseFloat(e.target.value))}
                  className="w-full bg-[#0a0d14] border border-slate-700/80 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-amber-500"
                />
                <span className="absolute right-3 top-2 text-xs font-mono text-slate-500">kg/m³</span>
              </div>
            </div>

            {/* Catalyst Mass */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-slate-300 font-sans font-medium">Catalyst Mass (W_cat)</span>
                <span className="text-slate-400">{(inputs.catalystMass * 1e6).toFixed(1)} mg</span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  step="0.00001"
                  value={inputs.catalystMass}
                  onChange={(e) => updateField('catalystMass', parseFloat(e.target.value))}
                  className="w-full bg-[#0a0d14] border border-slate-700/80 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-amber-500"
                />
                <span className="absolute right-3 top-2 text-xs font-mono text-slate-500">kg</span>
              </div>
            </div>

            {/* Inert Diluent Mass */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-slate-300 font-sans font-medium">Inert Diluent Mass (W_inert)</span>
                <span className="text-slate-400">{(inputs.inertMass * 1e6).toFixed(1)} mg</span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  step="0.00005"
                  value={inputs.inertMass}
                  onChange={(e) => updateField('inertMass', parseFloat(e.target.value))}
                  className="w-full bg-[#0a0d14] border border-slate-700/80 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-amber-500"
                />
                <span className="absolute right-3 top-2 text-xs font-mono text-slate-500">kg</span>
              </div>
            </div>

            {/* Inert Particle Density */}
            <div className="space-y-1">
              <label className="text-xs font-mono text-slate-300">Inert Density (ρ_inert, e.g. SiC)</label>
              <div className="relative">
                <input
                  type="number"
                  step="100"
                  value={inputs.inertDensity}
                  onChange={(e) => updateField('inertDensity', parseFloat(e.target.value))}
                  className="w-full bg-[#0a0d14] border border-slate-700/80 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-amber-500"
                />
                <span className="absolute right-3 top-2 text-xs font-mono text-slate-500">kg/m³</span>
              </div>
            </div>

            {/* Effective Diffusivity */}
            <div className="space-y-1">
              <label className="text-xs font-mono text-slate-300">Effective Pore Diffusivity (D_eff)</label>
              <div className="relative">
                <input
                  type="number"
                  step="1e-7"
                  value={inputs.effectiveDiffusivity}
                  onChange={(e) => updateField('effectiveDiffusivity', parseFloat(e.target.value))}
                  className="w-full bg-[#0a0d14] border border-slate-700/80 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-amber-500"
                />
                <span className="absolute right-3 top-2 text-xs font-mono text-slate-500">m²/s</span>
              </div>
            </div>

            {/* Diluted Conversion */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-slate-300 font-sans font-medium">Diluted Conversion (X_dil)</span>
                <span className="text-slate-400">{(inputs.dilutedConversion * 100).toFixed(1)}%</span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  step="0.05"
                  value={inputs.dilutedConversion}
                  onChange={(e) => updateField('dilutedConversion', parseFloat(e.target.value))}
                  className="w-full bg-[#0a0d14] border border-slate-700/80 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-amber-500"
                />
                <span className="absolute right-3 top-2 text-xs font-mono text-slate-500">[-]</span>
              </div>
            </div>
          </div>
        )}

        {activeCategory === 'kinetics' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Observed Reaction Rate */}
            <div className="space-y-1">
              <label className="text-xs font-mono text-slate-300">Observed Reaction Rate (r_obs)</label>
              <div className="relative">
                <input
                  type="number"
                  step="1e-5"
                  value={inputs.reactionRate}
                  onChange={(e) => updateField('reactionRate', parseFloat(e.target.value))}
                  className="w-full bg-[#0a0d14] border border-slate-700/80 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-amber-500"
                />
                <span className="absolute right-3 top-2 text-xs font-mono text-slate-500">mol/(kg·s)</span>
              </div>
            </div>

            {/* Reaction Order */}
            <div className="space-y-1">
              <label className="text-xs font-mono text-slate-300">Reaction Order (n)</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  value={inputs.reactionOrder}
                  onChange={(e) => updateField('reactionOrder', parseFloat(e.target.value))}
                  className="w-full bg-[#0a0d14] border border-slate-700/80 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-amber-500"
                />
                <span className="absolute right-3 top-2 text-xs font-mono text-slate-500">[-]</span>
              </div>
            </div>

            {/* Activation Energy */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-slate-300 font-sans font-medium">Activation Energy (E_a)</span>
                <span className="text-slate-400">{(inputs.activationEnergy / 1000).toFixed(1)} kJ/mol</span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  step="5000"
                  value={inputs.activationEnergy}
                  onChange={(e) => updateField('activationEnergy', parseFloat(e.target.value))}
                  className="w-full bg-[#0a0d14] border border-slate-700/80 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-amber-500"
                />
                <span className="absolute right-3 top-2 text-xs font-mono text-slate-500">J/mol</span>
              </div>
            </div>

            {/* Reaction Enthalpy */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-slate-300 font-sans font-medium">Reaction Enthalpy (|Δ_r H|)</span>
                <span className="text-slate-400">{(inputs.reactionEnthalpy / 1000).toFixed(1)} kJ/mol</span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  step="5000"
                  value={inputs.reactionEnthalpy}
                  onChange={(e) => updateField('reactionEnthalpy', parseFloat(e.target.value))}
                  className="w-full bg-[#0a0d14] border border-slate-700/80 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-amber-500"
                />
                <span className="absolute right-3 top-2 text-xs font-mono text-slate-500">J/mol</span>
              </div>
            </div>

            {/* Gas Molecular Weight */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-slate-300 font-sans font-medium">Gas Mean Molar Mass (M_gas)</span>
                <span className="text-slate-400">{(inputs.gasMolecularWeight * 1000).toFixed(1)} g/mol</span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  step="0.001"
                  value={inputs.gasMolecularWeight}
                  onChange={(e) => updateField('gasMolecularWeight', parseFloat(e.target.value))}
                  className="w-full bg-[#0a0d14] border border-slate-700/80 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-amber-500"
                />
                <span className="absolute right-3 top-2 text-xs font-mono text-slate-500">kg/mol</span>
              </div>
            </div>

            {/* Gas Viscosity */}
            <div className="space-y-1">
              <label className="text-xs font-mono text-slate-300">Gas Viscosity (μ_G)</label>
              <div className="relative">
                <input
                  type="number"
                  step="1e-6"
                  value={inputs.gasViscosity}
                  onChange={(e) => updateField('gasViscosity', parseFloat(e.target.value))}
                  className="w-full bg-[#0a0d14] border border-slate-700/80 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-amber-500"
                />
                <span className="absolute right-3 top-2 text-xs font-mono text-slate-500">kg/(m·s)</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
