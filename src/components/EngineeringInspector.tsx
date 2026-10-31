import React, { useState } from 'react';
import { ReactorInputs, SimulationResult } from '../types/eurokin';
import {
  Layers,
  Cpu,
  Gauge,
  Flame,
  Wind,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  ChevronLeft,
  X,
  Sliders
} from 'lucide-react';

interface EngineeringInspectorProps {
  simulation: SimulationResult;
  inputs: ReactorInputs;
  onUpdateInput: (field: keyof ReactorInputs, value: number) => void;
  isOpen: boolean;
  onToggle: () => void;
  isDirty: boolean;
}

type InspectorTab = 'reactor' | 'catalyst' | 'fluid' | 'thermal';

export const EngineeringInspector: React.FC<EngineeringInspectorProps> = ({
  simulation,
  inputs,
  onUpdateInput,
  isOpen,
  onToggle,
  isDirty,
}) => {
  const [activeTab, setActiveTab] = useState<InspectorTab>('reactor');
  const { hydrodynamics, transport, criteria } = simulation;

  if (!isOpen) {
    return (
      <div className="hidden lg:flex flex-col items-center justify-start py-4 bg-white border-l border-slate-200/90 w-11 shrink-0 select-none shadow-xs">
        <button
          onClick={onToggle}
          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          title="Open Engineering Inspector"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest mt-8 rotate-90 whitespace-nowrap font-semibold">
          Inspector
        </span>
      </div>
    );
  }

  return (
    <aside className="w-[320px] lg:w-[340px] bg-white border-l border-slate-200/90 flex flex-col justify-between shrink-0 select-none z-20 overflow-y-auto shadow-xs">
      <div>
        {/* Header */}
        <div className="h-14 border-b border-slate-200/90 px-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-600" />
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-slate-900">
              Inspector
            </span>
          </div>

          <div className="flex items-center gap-2">
            {isDirty && (
              <span className="text-[10px] font-mono px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-semibold">
                DIRTY
              </span>
            )}
            <button
              onClick={onToggle}
              className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="Close Inspector"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="p-2 border-b border-slate-200/90 bg-slate-50/70">
          <div className="grid grid-cols-4 gap-1 p-1 bg-slate-200/60 rounded-lg text-xs font-medium">
            <button
              onClick={() => setActiveTab('reactor')}
              className={`py-1.5 rounded-md text-center transition-all cursor-pointer ${
                activeTab === 'reactor'
                  ? 'bg-white text-slate-900 font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Vessel
            </button>
            <button
              onClick={() => setActiveTab('catalyst')}
              className={`py-1.5 rounded-md text-center transition-all cursor-pointer ${
                activeTab === 'catalyst'
                  ? 'bg-white text-slate-900 font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Pellet
            </button>
            <button
              onClick={() => setActiveTab('fluid')}
              className={`py-1.5 rounded-md text-center transition-all cursor-pointer ${
                activeTab === 'fluid'
                  ? 'bg-white text-slate-900 font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Gas
            </button>
            <button
              onClick={() => setActiveTab('thermal')}
              className={`py-1.5 rounded-md text-center transition-all cursor-pointer ${
                activeTab === 'thermal'
                  ? 'bg-white text-amber-700 font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Thermal
            </button>
          </div>
        </div>

        {/* Tab 1: Reactor Vessel Details */}
        {activeTab === 'reactor' && (
          <div className="p-4 space-y-4 text-xs font-mono">
            <div>
              <span className="text-[10px] uppercase text-slate-400 font-bold tracking-wider block mb-1.5">
                Fixed-Bed Dimensions
              </span>
              <div className="bg-slate-50/80 rounded-lg border border-slate-200/80 p-3 divide-y divide-slate-200/60 space-y-1.5">
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-500 font-sans">Length (L)</span>
                  <span className="text-slate-900 font-bold font-mono">{(inputs.bedHeight * 1000).toFixed(1)} mm</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-500 font-sans">Tube Inner Dia (Dt)</span>
                  <span className="text-slate-900 font-bold font-mono">{(inputs.tubeDiameter * 1000).toFixed(1)} mm</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-500 font-sans">Aspect Ratio (L/dp)</span>
                  <span className="text-blue-700 font-semibold font-mono">{(inputs.bedHeight / inputs.particleDiameter).toFixed(1)} (≥ 50)</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-500 font-sans">Wall Ratio (Dt/dp)</span>
                  <span className="text-blue-700 font-semibold font-mono">{(inputs.tubeDiameter / inputs.particleDiameter).toFixed(1)} (≥ 8)</span>
                </div>
              </div>
            </div>

            <div>
              <span className="text-[10px] uppercase text-slate-400 font-bold tracking-wider block mb-1.5">
                Hydrodynamic State
              </span>
              <div className="bg-slate-50/80 rounded-lg border border-slate-200/80 p-3 divide-y divide-slate-200/60 space-y-1.5">
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-500 font-sans">Gas Density (ρ_G)</span>
                  <span className="text-slate-900 font-mono">{hydrodynamics.gasDensity.toFixed(3)} kg/m³</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-500 font-sans">Superficial Vel (u_0)</span>
                  <span className="text-slate-900 font-mono">{(hydrodynamics.superficialVelocity * 1000).toFixed(2)} mm/s</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-500 font-sans">Reynolds (Re_p)</span>
                  <span className="text-slate-900 font-mono">{hydrodynamics.reynoldsNumber.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-500 font-sans">Bodenstein (Bo)</span>
                  <span className="text-slate-900 font-mono">{hydrodynamics.bodensteinNumber.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div>
              <span className="text-[10px] uppercase text-slate-400 font-bold tracking-wider block mb-1.5">
                Pressure Drop (Ergun)
              </span>
              <div className="bg-slate-50/80 rounded-lg border border-slate-200/80 p-3 divide-y divide-slate-200/60 space-y-1.5">
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-500 font-sans">Calculated ΔP</span>
                  <span className="text-slate-900 font-bold font-mono">{(simulation.totalDeltaP / 1e3).toFixed(2)} kPa</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-500 font-sans">Isobaric Limit (20%/n)</span>
                  <span className="text-slate-500 font-mono">{((0.2 * inputs.totalPressure / inputs.reactionOrder) / 1e3).toFixed(1)} kPa</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Catalyst Pellet */}
        {activeTab === 'catalyst' && (
          <div className="p-4 space-y-4 text-xs font-mono">
            <div>
              <span className="text-[10px] uppercase text-slate-400 font-bold tracking-wider block mb-1.5">
                Pellet Morphology
              </span>
              <div className="bg-slate-50/80 rounded-lg border border-slate-200/80 p-3 divide-y divide-slate-200/60 space-y-1.5">
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-500 font-sans">Diameter (dp)</span>
                  <span className="text-slate-900 font-bold font-mono">{(inputs.particleDiameter * 1e6).toFixed(0)} µm</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-500 font-sans">Pellet Porosity (ε_p)</span>
                  <span className="text-slate-900 font-mono">{inputs.pelletPorosity.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-500 font-sans">Tortuosity (τ_p)</span>
                  <span className="text-slate-900 font-mono">{inputs.pelletTortuosity.toFixed(1)}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-500 font-sans">Pellet Density</span>
                  <span className="text-slate-900 font-mono">{inputs.catalystDensity.toFixed(0)} kg/m³</span>
                </div>
              </div>
            </div>

            <div>
              <span className="text-[10px] uppercase text-slate-400 font-bold tracking-wider block mb-1.5">
                Transport Diagnostics
              </span>
              <div className="bg-slate-50/80 rounded-lg border border-slate-200/80 p-3 divide-y divide-slate-200/60 space-y-1.5">
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-500 font-sans">Effectiveness (η)</span>
                  <span className="text-emerald-700 font-bold font-mono">{(transport.effectivenessFactor * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-500 font-sans">Weisz-Prater (Φ)</span>
                  <span className="text-blue-700 font-semibold font-mono">{Math.pow(transport.thieleModulus, 2).toFixed(4)} (&lt; 0.08)</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-500 font-sans">Carberry (Ca)</span>
                  <span className="text-blue-700 font-semibold font-mono">
                    {(criteria.find(c => c.id === 'external_mass_transfer')?.calculatedValue || 0).toFixed(5)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Fluid Gas Properties */}
        {activeTab === 'fluid' && (
          <div className="p-4 space-y-4 text-xs font-mono">
            <div>
              <span className="text-[10px] uppercase text-slate-400 font-bold tracking-wider block mb-1.5">
                Gas Transport Properties
              </span>
              <div className="bg-slate-50/80 rounded-lg border border-slate-200/80 p-3 divide-y divide-slate-200/60 space-y-1.5">
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-500 font-sans">Mean Molar Mass</span>
                  <span className="text-slate-900 font-mono">{(inputs.gasMolecularWeight * 1000).toFixed(3)} g/mol</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-500 font-sans">Viscosity (μ_g)</span>
                  <span className="text-slate-900 font-mono">{(inputs.gasViscosity * 1e6).toFixed(2)} µPa·s</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-500 font-sans">Heat Capacity (Cp)</span>
                  <span className="text-slate-900 font-mono">{inputs.gasHeatCapacity.toFixed(0)} J/(kg·K)</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-500 font-sans">Conductivity (k_g)</span>
                  <span className="text-slate-900 font-mono">{inputs.gasConductivity.toFixed(3)} W/(m·K)</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-500 font-sans">Diffusivity (D_AB)</span>
                  <span className="text-slate-900 font-mono">{inputs.molecularDiffusivity.toExponential(2)} m²/s</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Thermal & Cooling */}
        {activeTab === 'thermal' && (
          <div className="p-4 space-y-4 text-xs font-mono">
            <div>
              <span className="text-[10px] uppercase text-slate-400 font-bold tracking-wider block mb-1.5">
                Thermal Balance
              </span>
              <div className="bg-slate-50/80 rounded-lg border border-slate-200/80 p-3 divide-y divide-slate-200/60 space-y-1.5">
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-500 font-sans">Inlet Temperature</span>
                  <span className="text-slate-900 font-bold font-mono">{inputs.temperature.toFixed(1)} K</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-500 font-sans">Peak Hotspot (T_max)</span>
                  <span className="text-amber-700 font-bold font-mono">{simulation.maxTemperature.toFixed(1)} K</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-500 font-sans">Cooling Wall (T_wall)</span>
                  <span className="text-slate-700 font-mono">{(inputs.wallTemperature ?? inputs.temperature - 15).toFixed(1)} K</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-500 font-sans">Cooling Coeff (U)</span>
                  <span className="text-slate-700 font-mono">{(inputs.coolingCoefficientU ?? 280).toFixed(0)} W/(m²·K)</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
