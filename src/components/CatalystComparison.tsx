import React, { useState, useMemo } from 'react';
import { ReactorInputs, SimulationResult } from '../types/eurokin';
import { runEurokinSimulation } from '../lib/eurokinEngine';
import { Split, Layers, CheckCircle2, AlertTriangle, ArrowRight, TrendingUp, Info } from 'lucide-react';

interface CatalystComparisonProps {
  baseInputs: ReactorInputs;
  baseResult: SimulationResult;
}

interface CatalystOption {
  id: string;
  name: string;
  catalystType: string;
  description: string;
  dp: number;
  density: number;
  porosity: number;
  tortuosity: number;
  thermalCond: number;
  rateFactor: number;
  color: string;
}

export const CatalystComparison: React.FC<CatalystComparisonProps> = ({
  baseInputs,
  baseResult,
}) => {
  const catalystPresets: CatalystOption[] = [
    {
      id: 'promoted_magnetite',
      name: 'Promoted Magnetite Fe₃O₄ (Baseline)',
      catalystType: 'K₂O-Al₂O₃-CaO Promoted Iron',
      description: 'Standard industrial commercial benchmark. Balanced activity, high thermal sintering stability.',
      dp: baseInputs.particleDiameter,
      density: baseInputs.catalystDensity,
      porosity: baseInputs.pelletPorosity,
      tortuosity: baseInputs.pelletTortuosity,
      thermalCond: baseInputs.catalystThermalCond,
      rateFactor: 1.0,
      color: '#00D8F6',
    },
    {
      id: 'promoted_wustite',
      name: 'Promoted Wüstite Fe₁₋ₓO (High Activity)',
      catalystType: 'Top-tier Promoted Wüstite',
      description: 'Pre-reduced wüstite phase offering higher turnover rates at low to moderate temperatures.',
      dp: baseInputs.particleDiameter,
      density: 2900.0,
      porosity: 0.42,
      tortuosity: 2.8,
      thermalCond: 1.65,
      rateFactor: 1.45,
      color: '#F59E0B',
    },
    {
      id: 'ruthenium_carbon',
      name: 'Ruthenium on Carbon (Ru/C)',
      catalystType: 'Precious Metal Supported Catalyst',
      description: 'Exceptional turnover at lower temperatures (350–380 °C), resistant to hydrogen poisoning.',
      dp: 0.00025, // 250 µm
      density: 1200.0,
      porosity: 0.55,
      tortuosity: 3.5,
      thermalCond: 0.45,
      rateFactor: 2.1,
      color: '#10B981',
    },
    {
      id: 'unpromoted_iron',
      name: 'Unpromoted Sintered Iron (Unpromoted)',
      catalystType: 'Low-cost pure iron',
      description: 'Lacks structural and electronic promoters. Prone to severe thermal sintering and pore collapse.',
      dp: 0.0008, // 800 µm large pellet
      density: 3500.0,
      porosity: 0.25,
      tortuosity: 5.5,
      thermalCond: 2.8,
      rateFactor: 0.35,
      color: '#EF4444',
    },
  ];

  const [selectedCatAId, setSelectedCatAId] = useState<string>('promoted_magnetite');
  const [selectedCatBId, setSelectedCatBId] = useState<string>('promoted_wustite');

  const catA = catalystPresets.find((c) => c.id === selectedCatAId) || catalystPresets[0];
  const catB = catalystPresets.find((c) => c.id === selectedCatBId) || catalystPresets[1];

  // Evaluate simulations for both catalysts under identical operating conditions
  const resultA = useMemo(() => {
    const inputsA: ReactorInputs = {
      ...baseInputs,
      particleDiameter: catA.dp,
      catalystDensity: catA.density,
      pelletPorosity: catA.porosity,
      pelletTortuosity: catA.tortuosity,
      catalystThermalCond: catA.thermalCond,
      reactionRate: baseInputs.reactionRate * catA.rateFactor,
    };
    return runEurokinSimulation(inputsA);
  }, [baseInputs, catA]);

  const resultB = useMemo(() => {
    const inputsB: ReactorInputs = {
      ...baseInputs,
      particleDiameter: catB.dp,
      catalystDensity: catB.density,
      pelletPorosity: catB.porosity,
      pelletTortuosity: catB.tortuosity,
      catalystThermalCond: catB.thermalCond,
      reactionRate: baseInputs.reactionRate * catB.rateFactor,
    };
    return runEurokinSimulation(inputsB);
  }, [baseInputs, catB]);

  // Delta calculations
  const deltaConversion = (resultB.outletConversion - resultA.outletConversion) * 100;
  const deltaAmmonia = resultB.ammoniaProductionRateKgH - resultA.ammoniaProductionRateKgH;
  const deltaDeltaP = resultB.totalDeltaP - resultA.totalDeltaP;
  const deltaMaxT = resultB.maxTemperature - resultA.maxTemperature;
  const deltaEta = (resultB.transport.effectivenessFactor - resultA.transport.effectivenessFactor) * 100;

  return (
    <div className="bg-white rounded-xl shadow-xs border border-slate-200/80 p-5 space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200/80">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-slate-100 border border-slate-300 text-blue-600">
            <Split className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <span>Dual-Catalyst Performance Comparison Workspace</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 font-sans">
              Compare kinetic turnover, intraparticle effectiveness factor, hotspot formation, and transport limitations under identical reactor operating conditions (T, P, mass flow).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-slate-500">Operating Regime:</span>
          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-300">
            {(baseInputs.totalPressure / 1e5).toFixed(0)} bar / {(baseInputs.temperature - 273.15).toFixed(0)} °C
          </span>
        </div>
      </div>

      {/* Catalyst Selector Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Catalyst A Selector */}
        <div className="bg-slate-50 rounded-lg border border-slate-200/80 p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase font-bold text-blue-600 flex items-center gap-1.5">
              <span className="w-2 h-2 bg-blue-600" />
              Configuration A (Reference)
            </span>
            <span className="text-[10px] font-mono text-slate-500">
              {resultA.overallStatus === 'VALID_INTRINSIC' ? 'INTRINSIC VALID' : 'TRANSPORT LIMITED'}
            </span>
          </div>

          <select
            value={selectedCatAId}
            onChange={(e) => setSelectedCatAId(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 px-2.5 py-1.5 text-xs font-mono text-slate-800 focus:outline-none focus:border-blue-600"
          >
            {catalystPresets.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-slate-500 font-sans">{catA.description}</p>
        </div>

        {/* Catalyst B Selector */}
        <div className="bg-slate-50 rounded-lg border border-slate-200/80 p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase font-bold text-[#F59E0B] flex items-center gap-1.5">
              <span className="w-2 h-2 bg-[#F59E0B]" />
              Configuration B (Test Variant)
            </span>
            <span className="text-[10px] font-mono text-slate-500">
              {resultB.overallStatus === 'VALID_INTRINSIC' ? 'INTRINSIC VALID' : 'TRANSPORT LIMITED'}
            </span>
          </div>

          <select
            value={selectedCatBId}
            onChange={(e) => setSelectedCatBId(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 px-2.5 py-1.5 text-xs font-mono text-slate-800 focus:outline-none focus:border-[#F59E0B]"
          >
            {catalystPresets.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-slate-500 font-sans">{catB.description}</p>
        </div>
      </div>

      {/* Comparative Metrics Table with Delta Badges */}
      <div className="border border-slate-200/80 overflow-x-auto">
        <table className="w-full text-left text-xs font-mono">
          <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-500 uppercase text-[10px]">
            <tr>
              <th className="p-3">Performance Metric</th>
              <th className="p-3 text-blue-600">Catalyst A ({catA.name.split(' (')[0]})</th>
              <th className="p-3 text-[#F59E0B]">Catalyst B ({catB.name.split(' (')[0]})</th>
              <th className="p-3 text-right">Differential Δ (B - A)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-800">
            <tr>
              <td className="p-3 text-slate-500 font-medium">Ammonia Production Rate</td>
              <td className="p-3 font-bold">{resultA.ammoniaProductionRateKgH.toFixed(3)} kg/h</td>
              <td className="p-3 font-bold">{resultB.ammoniaProductionRateKgH.toFixed(3)} kg/h</td>
              <td className="p-3 text-right">
                <span
                  className={`px-2 py-0.5 text-[10px] border ${
                    deltaAmmonia >= 0
                      ? 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/30'
                      : 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/30'
                  }`}
                >
                  {deltaAmmonia >= 0 ? '+' : ''}{deltaAmmonia.toFixed(3)} kg/h
                </span>
              </td>
            </tr>

            <tr>
              <td className="p-3 text-slate-500 font-medium">Nitrogen Conversion (X_N2)</td>
              <td className="p-3">{(resultA.outletConversion * 100).toFixed(2)}%</td>
              <td className="p-3">{(resultB.outletConversion * 100).toFixed(2)}%</td>
              <td className="p-3 text-right">
                <span
                  className={`px-2 py-0.5 text-[10px] border ${
                    deltaConversion >= 0
                      ? 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/30'
                      : 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/30'
                  }`}
                >
                  {deltaConversion >= 0 ? '+' : ''}{deltaConversion.toFixed(2)}% pts
                </span>
              </td>
            </tr>

            <tr>
              <td className="p-3 text-slate-500 font-medium">Pellet Effectiveness Factor (η)</td>
              <td className="p-3">{(resultA.transport.effectivenessFactor * 100).toFixed(1)}%</td>
              <td className="p-3">{(resultB.transport.effectivenessFactor * 100).toFixed(1)}%</td>
              <td className="p-3 text-right">
                <span className="px-2 py-0.5 text-[10px] border bg-slate-100 text-slate-700 border-slate-300">
                  {deltaEta >= 0 ? '+' : ''}{deltaEta.toFixed(1)}%
                </span>
              </td>
            </tr>

            <tr>
              <td className="p-3 text-slate-500 font-medium">Peak Bed Temperature (T_max)</td>
              <td className="p-3">{resultA.maxTemperature.toFixed(1)} K</td>
              <td className="p-3">{resultB.maxTemperature.toFixed(1)} K</td>
              <td className="p-3 text-right">
                <span
                  className={`px-2 py-0.5 text-[10px] border ${
                    Math.abs(deltaMaxT) > 20
                      ? 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/30'
                      : 'bg-slate-100 text-slate-700 border-slate-300'
                  }`}
                >
                  {deltaMaxT >= 0 ? '+' : ''}{deltaMaxT.toFixed(1)} K
                </span>
              </td>
            </tr>

            <tr>
              <td className="p-3 text-slate-500 font-medium">Total Bed Pressure Drop (ΔP)</td>
              <td className="p-3">{(resultA.totalDeltaP / 1e3).toFixed(1)} kPa</td>
              <td className="p-3">{(resultB.totalDeltaP / 1e3).toFixed(1)} kPa</td>
              <td className="p-3 text-right">
                <span
                  className={`px-2 py-0.5 text-[10px] border ${
                    deltaDeltaP > 5000
                      ? 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/30'
                      : 'bg-slate-100 text-slate-700 border-slate-300'
                  }`}
                >
                  {deltaDeltaP >= 0 ? '+' : ''}{(deltaDeltaP / 1e3).toFixed(1)} kPa
                </span>
              </td>
            </tr>

            <tr>
              <td className="p-3 text-slate-500 font-medium">Eurokin Criteria Passed</td>
              <td className="p-3 font-bold text-blue-600">
                {resultA.passedCount} / {resultA.totalCount} Pass
              </td>
              <td className="p-3 font-bold text-[#F59E0B]">
                {resultB.passedCount} / {resultB.totalCount} Pass
              </td>
              <td className="p-3 text-right">
                <span className="px-2 py-0.5 text-[10px] border bg-slate-100 text-slate-700 border-slate-300">
                  Δ {resultB.passedCount - resultA.passedCount} checks
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
