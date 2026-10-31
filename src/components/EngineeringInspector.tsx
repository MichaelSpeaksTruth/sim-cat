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
  const { hydrodynamics, transport, criteria, overallStatus } = simulation;

  if (!isOpen) {
    return (
      <div className="hidden lg:flex flex-col items-center justify-start py-4 bg-[#0A0D12] border-l border-[#1E2533] w-10 shrink-0 select-none">
        <button
          onClick={onToggle}
          className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-[#141A24] border border-[#1E2533] transition-colors"
          title="Open Engineering Inspector"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mt-8 rotate-90 whitespace-nowrap">
          Inspector Panel
        </span>
      </div>
    );
  }

  return (
    <aside className="w-[320px] bg-[#0A0D12] border-l border-[#1E2533] flex flex-col justify-between shrink-0 select-none z-20 overflow-y-auto">
      <div>
        {/* Header */}
        <div className="h-14 border-b border-[#1E2533] px-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-[#00D8F6]" />
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-slate-100">
              Engineering Inspector
            </span>
          </div>

          <div className="flex items-center gap-1">
            {isDirty && (
              <span className="text-[9px] font-mono px-1.5 py-0.5 bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/40">
                DIRTY
              </span>
            )}
            <button
              onClick={onToggle}
              className="p-1 text-slate-400 hover:text-slate-100 hover:bg-[#141A24] border border-transparent hover:border-[#1E2533]"
              title="Close Inspector"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="grid grid-cols-4 border-b border-[#1E2533] bg-[#07090D] text-[10px] font-mono">
          <button
            onClick={() => setActiveTab('reactor')}
            className={`py-2 text-center border-r border-[#1E2533] transition-colors ${
              activeTab === 'reactor'
                ? 'bg-[#141A24] text-[#00D8F6] font-bold border-b-2 border-b-[#00D8F6]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Vessel
          </button>
          <button
            onClick={() => setActiveTab('catalyst')}
            className={`py-2 text-center border-r border-[#1E2533] transition-colors ${
              activeTab === 'catalyst'
                ? 'bg-[#141A24] text-[#00D8F6] font-bold border-b-2 border-b-[#00D8F6]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Pellet
          </button>
          <button
            onClick={() => setActiveTab('fluid')}
            className={`py-2 text-center border-r border-[#1E2533] transition-colors ${
              activeTab === 'fluid'
                ? 'bg-[#141A24] text-[#00D8F6] font-bold border-b-2 border-b-[#00D8F6]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Gas
          </button>
          <button
            onClick={() => setActiveTab('thermal')}
            className={`py-2 text-center transition-colors ${
              activeTab === 'thermal'
                ? 'bg-[#141A24] text-[#F59E0B] font-bold border-b-2 border-b-[#F59E0B]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Thermal
          </button>
        </div>

        {/* Tab 1: Reactor Vessel Details */}
        {activeTab === 'reactor' && (
          <div className="p-4 space-y-4 text-xs font-mono">
            <div>
              <span className="text-[10px] uppercase text-slate-500 font-bold block mb-1">
                Fixed-Bed Dimensions
              </span>
              <div className="space-y-1.5 border border-[#1E2533] bg-[#080A0D] p-2.5">
                <div className="flex justify-between py-0.5 border-b border-[#141A24]">
                  <span className="text-slate-400">Length (L):</span>
                  <span className="text-slate-200 font-bold">{(inputs.bedHeight * 1000).toFixed(1)} mm</span>
                </div>
                <div className="flex justify-between py-0.5 border-b border-[#141A24]">
                  <span className="text-slate-400">Tube Inner Dia (Dt):</span>
                  <span className="text-slate-200 font-bold">{(inputs.tubeDiameter * 1000).toFixed(1)} mm</span>
                </div>
                <div className="flex justify-between py-0.5 border-b border-[#141A24]">
                  <span className="text-slate-400">Aspect Ratio (L/dp):</span>
                  <span className="text-[#00D8F6]">{(inputs.bedHeight / inputs.particleDiameter).toFixed(1)} (≥ 50)</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-400">Wall Ratio (Dt/dp):</span>
                  <span className="text-[#00D8F6]">{(inputs.tubeDiameter / inputs.particleDiameter).toFixed(1)} (≥ 8)</span>
                </div>
              </div>
            </div>

            <div>
              <span className="text-[10px] uppercase text-slate-500 font-bold block mb-1">
                Hydrodynamic State
              </span>
              <div className="space-y-1.5 border border-[#1E2533] bg-[#080A0D] p-2.5">
                <div className="flex justify-between py-0.5 border-b border-[#141A24]">
                  <span className="text-slate-400">Gas Density (ρ_G):</span>
                  <span className="text-slate-200">{hydrodynamics.gasDensity.toFixed(3)} kg/m³</span>
                </div>
                <div className="flex justify-between py-0.5 border-b border-[#141A24]">
                  <span className="text-slate-400">Superficial Vel (u_0):</span>
                  <span className="text-slate-200">{(hydrodynamics.superficialVelocity * 1000).toFixed(2)} mm/s</span>
                </div>
                <div className="flex justify-between py-0.5 border-b border-[#141A24]">
                  <span className="text-slate-400">Reynolds (Re_p):</span>
                  <span className="text-slate-200">{hydrodynamics.reynoldsNumber.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-400">Bodenstein (Bo):</span>
                  <span className="text-slate-200">{hydrodynamics.bodensteinNumber.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div>
              <span className="text-[10px] uppercase text-slate-500 font-bold block mb-1">
                Pressure Drop (Ergun)
              </span>
              <div className="space-y-1.5 border border-[#1E2533] bg-[#080A0D] p-2.5">
                <div className="flex justify-between py-0.5 border-b border-[#141A24]">
                  <span className="text-slate-400">Calculated ΔP:</span>
                  <span className="text-slate-200 font-bold">{(simulation.totalDeltaP / 1e3).toFixed(2)} kPa</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-400">Isobaric Limit (20%/n):</span>
                  <span className="text-slate-400">{((0.2 * inputs.totalPressure / inputs.reactionOrder) / 1e3).toFixed(1)} kPa</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Catalyst Pellet */}
        {activeTab === 'catalyst' && (
          <div className="p-4 space-y-4 text-xs font-mono">
            <div>
              <span className="text-[10px] uppercase text-slate-500 font-bold block mb-1">
                Pellet Morphology
              </span>
              <div className="space-y-1.5 border border-[#1E2533] bg-[#080A0D] p-2.5">
                <div className="flex justify-between py-0.5 border-b border-[#141A24]">
                  <span className="text-slate-400">Diameter (dp):</span>
                  <span className="text-slate-200">{(inputs.particleDiameter * 1e6).toFixed(0)} µm</span>
                </div>
                <div className="flex justify-between py-0.5 border-b border-[#141A24]">
                  <span className="text-slate-400">Pellet Porosity (ε_p):</span>
                  <span className="text-slate-200">{inputs.pelletPorosity.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-0.5 border-b border-[#141A24]">
                  <span className="text-slate-400">Tortuosity (τ_p):</span>
                  <span className="text-slate-200">{inputs.pelletTortuosity.toFixed(1)}</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-400">Pellet Density:</span>
                  <span className="text-slate-200">{inputs.catalystDensity.toFixed(0)} kg/m³</span>
                </div>
              </div>
            </div>

            <div>
              <span className="text-[10px] uppercase text-slate-500 font-bold block mb-1">
                Transport Diagnostics
              </span>
              <div className="space-y-1.5 border border-[#1E2533] bg-[#080A0D] p-2.5">
                <div className="flex justify-between py-0.5 border-b border-[#141A24]">
                  <span className="text-slate-400">Effectiveness (η):</span>
                  <span className="text-[#10B981] font-bold">{(transport.effectivenessFactor * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between py-0.5 border-b border-[#141A24]">
                  <span className="text-slate-400">Weisz-Prater (Φ):</span>
                  <span className="text-[#00D8F6]">{Math.pow(transport.thieleModulus, 2).toFixed(4)} (&lt; 0.08)</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-400">Carberry (Ca):</span>
                  <span className="text-[#00D8F6]">
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
              <span className="text-[10px] uppercase text-slate-500 font-bold block mb-1">
                NIST Gas Transport Properties
              </span>
              <div className="space-y-1.5 border border-[#1E2533] bg-[#080A0D] p-2.5">
                <div className="flex justify-between py-0.5 border-b border-[#141A24]">
                  <span className="text-slate-400">Mean Molar Mass:</span>
                  <span className="text-slate-200">{(inputs.gasMolecularWeight * 1000).toFixed(3)} g/mol</span>
                </div>
                <div className="flex justify-between py-0.5 border-b border-[#141A24]">
                  <span className="text-slate-400">Viscosity (μ_g):</span>
                  <span className="text-slate-200">{(inputs.gasViscosity * 1e6).toFixed(2)} µPa·s</span>
                </div>
                <div className="flex justify-between py-0.5 border-b border-[#141A24]">
                  <span className="text-slate-400">Heat Capacity (Cp):</span>
                  <span className="text-slate-200">{inputs.gasHeatCapacity.toFixed(0)} J/(kg·K)</span>
                </div>
                <div className="flex justify-between py-0.5 border-b border-[#141A24]">
                  <span className="text-slate-400">Conductivity (k_g):</span>
                  <span className="text-slate-200">{inputs.gasConductivity.toFixed(3)} W/(m·K)</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-400">Diffusivity (D_AB):</span>
                  <span className="text-slate-200">{inputs.molecularDiffusivity.toExponential(2)} m²/s</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Thermal & Cooling */}
        {activeTab === 'thermal' && (
          <div className="p-4 space-y-4 text-xs font-mono">
            <div>
              <span className="text-[10px] uppercase text-slate-500 font-bold block mb-1">
                Thermal Balance
              </span>
              <div className="space-y-1.5 border border-[#1E2533] bg-[#080A0D] p-2.5">
                <div className="flex justify-between py-0.5 border-b border-[#141A24]">
                  <span className="text-slate-400">Inlet Temperature:</span>
                  <span className="text-slate-200">{inputs.temperature.toFixed(1)} K</span>
                </div>
                <div className="flex justify-between py-0.5 border-b border-[#141A24]">
                  <span className="text-slate-400">Peak Hotspot (T_max):</span>
                  <span className="text-[#F59E0B] font-bold">{simulation.maxTemperature.toFixed(1)} K</span>
                </div>
                <div className="flex justify-between py-0.5 border-b border-[#141A24]">
                  <span className="text-slate-400">Cooling Wall (T_wall):</span>
                  <span className="text-slate-300">{(inputs.wallTemperature ?? inputs.temperature - 15).toFixed(1)} K</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-400">Cooling Coeff (U):</span>
                  <span className="text-slate-300">{(inputs.coolingCoefficientU ?? 280).toFixed(0)} W/(m²·K)</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Status Pill */}
      <div className="p-3 border-t border-[#1E2533] bg-[#070A0E] text-[10px] font-mono text-slate-500">
        <span>SIM-CAT Scientific Inspector • Grounded in Eurokin & NIST SRD 69</span>
      </div>
    </aside>
  );
};
