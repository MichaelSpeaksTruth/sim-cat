import React, { useState } from 'react';
import { CustomCriterionDefinition, SimulationResult } from '../types/eurokin';
import { MathView } from './MathView';
import {
  Code2,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  BookOpen,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';

interface CustomFormulaStudioProps {
  customCriteria: CustomCriterionDefinition[];
  onUpdateCriteria: (criteria: CustomCriterionDefinition[]) => void;
  simulation: SimulationResult;
}

export const CustomFormulaStudio: React.FC<CustomFormulaStudioProps> = ({
  customCriteria,
  onUpdateCriteria,
  simulation,
}) => {
  const [activeTab, setActiveTab] = useState<'custom_builder' | 'formula_audit'>('custom_builder');

  // Form state for creating a new custom criterion
  const [newCriterion, setNewCriterion] = useState<Partial<CustomCriterionDefinition>>({
    name: 'Strict Isothermal Boundary Guard (1% rate perturbation)',
    category: 'Heat Transfer',
    symbol: String.raw`\Delta T_{\text{film, strict}}`,
    operator: '<',
    limitValue: 0.85,
    unit: 'K',
    description: 'Enforces an ultra-strict 1% tolerance on apparent activation energy rather than the standard 5% limit.',
    reference: 'Mears (1971) modified for high-precision kinetics',
    expression: 'deltaTfilm',
    formulaLatex: String.raw`\Delta T_{\text{film}} < \frac{0.01 \, R \, T_G^2}{E_a}`,
    enabled: true,
  });

  const [testResult, setTestResult] = useState<{ val: number; pass: boolean; err?: string } | null>(null);

  // Available variables scope for custom expression evaluation
  const availableVariables = [
    { name: 'T', desc: 'Bed Temperature [K]' },
    { name: 'P', desc: 'Total Pressure [Pa]' },
    { name: 'feedFlow', desc: 'Mass Flow Rate [kg/s]' },
    { name: 'L', desc: 'Bed Length / Height [m]' },
    { name: 'dt', desc: 'Tube Inner Diameter [m]' },
    { name: 'dp', desc: 'Catalyst Pellet Diameter [m]' },
    { name: 'epsB', desc: 'Bed Porosity [-]' },
    { name: 'rVobs', desc: 'Volumetric Reaction Rate [mol/(m³_cat·s)]' },
    { name: 'Re', desc: 'Reynolds Number [-]' },
    { name: 'Sc', desc: 'Schmidt Number [-]' },
    { name: 'Pr', desc: 'Prandtl Number [-]' },
    { name: 'Bo', desc: 'Bodenstein Number [-]' },
    { name: 'carberryNum', desc: 'Carberry Number (Ca) [-]' },
    { name: 'weiszPrater', desc: 'Weisz-Prater Modulus (Phi) [-]' },
    { name: 'deltaTfilm', desc: 'External Film Temp Rise [K]' },
    { name: 'deltaTrad', desc: 'Radial Temp Rise [K]' },
    { name: 'deltaTint', desc: 'Intraparticle Temp Rise [K]' },
    { name: 'pressureDrop', desc: 'Ergun Pressure Drop [Pa]' },
    { name: 'Ea', desc: 'Activation Energy [J/mol]' },
    { name: 'dHr', desc: 'Reaction Enthalpy [J/mol]' },
    { name: 'kg', desc: 'External Mass Transfer Coeff [m/s]' },
    { name: 'alphaP', desc: 'Particle Heat Transfer Coeff [W/(m²·K)]' },
    { name: 'eta', desc: 'Internal Pellet Effectiveness Factor [-]' },
  ];

  const handleTestExpression = () => {
    try {
      const scope = {
        T: simulation.inputs.temperature,
        P: simulation.inputs.totalPressure,
        feedFlow: simulation.inputs.feedFlow,
        L: simulation.inputs.bedHeight,
        dt: simulation.inputs.tubeDiameter,
        dp: simulation.inputs.particleDiameter,
        epsB: simulation.inputs.bedPorosity,
        rVobs: simulation.transport.observedVolumetricRate,
        Re: simulation.hydrodynamics.reynoldsNumber,
        Sc: simulation.hydrodynamics.schmidtNumber,
        Pr: simulation.hydrodynamics.prandtlNumber,
        Bo: simulation.hydrodynamics.bodensteinNumber,
        carberryNum: simulation.criteria.find(c => c.id === 'external_mass_transfer')?.calculatedValue || 0,
        weiszPrater: simulation.criteria.find(c => c.id === 'internal_diffusion')?.calculatedValue || 0,
        deltaTfilm: simulation.criteria.find(c => c.id === 'external_heat_transfer')?.calculatedValue || 0,
        deltaTrad: simulation.criteria.find(c => c.id === 'radial_heat_transfer')?.calculatedValue || 0,
        deltaTint: simulation.criteria.find(c => c.id === 'intraparticle_heat')?.calculatedValue || 0,
        pressureDrop: simulation.criteria.find(c => c.id === 'pressure_drop')?.calculatedValue || 0,
        Ea: simulation.inputs.activationEnergy,
        dHr: simulation.inputs.reactionEnthalpy,
        kg: simulation.transport.externalMassTransferCoeff,
        alphaP: simulation.transport.particleHeatTransferCoeff,
        eta: simulation.transport.effectivenessFactor,
        Math,
      };

      const fn = new Function(...Object.keys(scope), `return (${newCriterion.expression || '0'});`);
      const val = Number(fn(...Object.values(scope)));
      
      let pass = false;
      const lim = newCriterion.limitValue || 0;
      if (newCriterion.operator === '<') pass = val < lim;
      else if (newCriterion.operator === '<=') pass = val <= lim;
      else if (newCriterion.operator === '>') pass = val > lim;
      else if (newCriterion.operator === '>=') pass = val >= lim;

      setTestResult({ val, pass });
    } catch (err: any) {
      setTestResult({ val: 0, pass: false, err: err?.message || 'Syntax error in expression' });
    }
  };

  const handleAddCriterion = () => {
    if (!newCriterion.name || !newCriterion.expression) return;
    const item: CustomCriterionDefinition = {
      id: `custom_${Date.now()}`,
      name: newCriterion.name || 'Custom Rule',
      category: newCriterion.category || 'Custom Criterion',
      symbol: newCriterion.symbol || String.raw`C_{\text{custom}}`,
      operator: newCriterion.operator || '<',
      limitValue: Number(newCriterion.limitValue) || 0,
      unit: newCriterion.unit || '[-]',
      description: newCriterion.description || 'User-defined custom diagnostic condition.',
      reference: newCriterion.reference || 'User Rule',
      expression: newCriterion.expression || '0',
      formulaLatex: newCriterion.formulaLatex || newCriterion.expression || '',
      enabled: true,
    };
    onUpdateCriteria([...customCriteria, item]);
    setTestResult(null);
  };

  const handleDeleteCriterion = (id: string) => {
    onUpdateCriteria(customCriteria.filter(c => c.id !== id));
  };

  const handleToggleCriterion = (id: string) => {
    onUpdateCriteria(
      customCriteria.map(c => c.id === id ? { ...c, enabled: !c.enabled } : c)
    );
  };

  // Pre-configured custom templates
  const applyTemplate = (tpl: Partial<CustomCriterionDefinition>) => {
    setNewCriterion({ ...newCriterion, ...tpl });
    setTestResult(null);
  };

  return (
    <div className="space-y-4">
      {/* Top Header & Tab Switching */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200/80 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-blue-50 text-blue-700 text-blue-600 border border-blue-600/30">
              FORMULA AUDIT & CUSTOM CRITERIA STUDIO
            </span>
          </div>
          <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-slate-900 mt-1">
            Audited Kinetic Diagnostic Equations & Custom Formula Authoring
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-4xl leading-relaxed">
            Audit the mathematical and dimensional integrity of all 9 Eurokin criteria, or author custom algebraic diagnostic rules with live execution against simulation state.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex bg-[#141922] p-0.5 border border-slate-200/80 text-xs font-mono">
          <button
            onClick={() => setActiveTab('custom_builder')}
            className={`px-3 py-1 font-bold uppercase tracking-wider transition-all ${
              activeTab === 'custom_builder'
                ? 'bg-blue-600 text-white'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Custom Formula Builder ({customCriteria.length})
          </button>
          <button
            onClick={() => setActiveTab('formula_audit')}
            className={`px-3 py-1 font-bold uppercase tracking-wider transition-all ${
              activeTab === 'formula_audit'
                ? 'bg-blue-600 text-white'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Formal 9-Criteria Audit
          </button>
        </div>
      </div>

      {activeTab === 'custom_builder' && (
        <div className="space-y-4">
          {/* Custom Formula Creator Form */}
          <div className="bg-white rounded-xl shadow-xs border border-slate-200/80 p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-blue-600" />
                <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-900">
                  Define New Custom Diagnostic Rule
                </h3>
              </div>
              <span className="text-[11px] font-mono text-slate-500">
                Safely evaluated in real-time alongside standard Eurokin matrix
              </span>
            </div>

            {/* Quick Templates */}
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <span className="text-slate-500 font-mono text-[11px] uppercase tracking-wider font-semibold">Quick Presets:</span>
              <button
                type="button"
                onClick={() => applyTemplate({
                  name: 'Strict 1% Isothermal Film Limit',
                  symbol: String.raw`\Delta T_{\text{film,1\%}}`,
                  category: 'Heat Transfer',
                  expression: 'deltaTfilm',
                  operator: '<',
                  limitValue: 0.50,
                  unit: 'K',
                  description: 'Ultra-strict isothermal film jump limit for ultra-sensitive microkinetics.',
                  formulaLatex: String.raw`\Delta T_{\text{film}} < 0.50\,\text{K}`,
                })}
                className="px-2.5 py-1 bg-[#141922] hover:bg-[#1E2533] text-slate-700 border border-slate-200/80 font-mono text-[11px]"
              >
                + 1% Film Jump Guard
              </button>
              <button
                type="button"
                onClick={() => applyTemplate({
                  name: 'Severe Centerline Hotspot Guard',
                  symbol: String.raw`\Delta T_{\text{rad,max}}`,
                  category: 'Heat Transfer',
                  expression: 'deltaTrad',
                  operator: '<',
                  limitValue: 1.5,
                  unit: 'K',
                  description: 'Hard ceiling on radial centerline temperature rise to prevent catalyst sintering.',
                  formulaLatex: String.raw`\Delta T_{\text{rad}} < 1.50\,\text{K}`,
                })}
                className="px-2.5 py-1 bg-[#141922] hover:bg-[#1E2533] text-slate-700 border border-slate-200/80 font-mono text-[11px]"
              >
                + Max 1.5 K Radial Hotspot
              </button>
              <button
                type="button"
                onClick={() => applyTemplate({
                  name: 'Strict 5% Pressure Drop Ratio',
                  symbol: String.raw`\Delta P / P_{\text{tot}}`,
                  category: 'Hydrodynamics',
                  expression: 'pressureDrop / P',
                  operator: '<',
                  limitValue: 0.05,
                  unit: '[-]',
                  description: 'Restricts total bed pressure loss to under 5% for precise isobaric kinetics.',
                  formulaLatex: String.raw`\frac{\Delta P}{P_{\text{tot}}} < 0.05`,
                })}
                className="px-2.5 py-1 bg-[#141922] hover:bg-[#1E2533] text-slate-700 border border-slate-200/80 font-mono text-[11px]"
              >
                + ΔP / P &lt; 5% Isobaric Guard
              </button>
            </div>

            {/* Inputs Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-[11px] font-mono text-slate-500 uppercase">Rule / Criterion Name</label>
                <input
                  type="text"
                  value={newCriterion.name || ''}
                  onChange={(e) => setNewCriterion({ ...newCriterion, name: e.target.value })}
                  className="w-full bg-[#141922] border border-slate-200/80 px-3 py-1.5 text-xs font-mono text-slate-800 focus:outline-none focus:border-blue-600"
                  placeholder="e.g. Strict Isothermal Film Jump"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-mono text-slate-500 uppercase">Category</label>
                <select
                  value={newCriterion.category}
                  onChange={(e) => setNewCriterion({ ...newCriterion, category: e.target.value as any })}
                  className="w-full bg-[#141922] border border-slate-200/80 px-3 py-1.5 text-xs font-mono text-slate-800 focus:outline-none focus:border-blue-600"
                >
                  <option value="Fluid Dynamics">Fluid Dynamics</option>
                  <option value="Mass Transfer">Mass Transfer</option>
                  <option value="Heat Transfer">Heat Transfer</option>
                  <option value="Hydrodynamics">Hydrodynamics</option>
                  <option value="Bed Dilution">Bed Dilution</option>
                  <option value="Custom Criterion">Custom Criterion</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-mono text-slate-500 uppercase">LaTeX Math Symbol</label>
                <input
                  type="text"
                  value={newCriterion.symbol || ''}
                  onChange={(e) => setNewCriterion({ ...newCriterion, symbol: e.target.value })}
                  className="w-full bg-[#141922] border border-slate-200/80 px-3 py-1.5 text-xs font-mono text-slate-800 focus:outline-none focus:border-blue-600"
                  placeholder="e.g. \Delta T_{film,strict}"
                />
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="text-[11px] font-mono text-slate-500 uppercase">
                  Algebraic Expression (JavaScript Syntax)
                </label>
                <input
                  type="text"
                  value={newCriterion.expression || ''}
                  onChange={(e) => setNewCriterion({ ...newCriterion, expression: e.target.value })}
                  className="w-full bg-[#141922] border border-slate-200/80 px-3 py-1.5 text-xs font-mono text-blue-600 focus:outline-none focus:border-blue-600 font-bold"
                  placeholder="e.g. deltaTfilm or (pressureDrop / P)"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-slate-500 uppercase">Operator & Limit</label>
                  <div className="flex gap-1.5">
                    <select
                      value={newCriterion.operator}
                      onChange={(e) => setNewCriterion({ ...newCriterion, operator: e.target.value as any })}
                      className="w-16 bg-[#141922] border border-slate-200/80 px-2 py-1.5 text-xs font-mono text-slate-800 focus:outline-none focus:border-blue-600"
                    >
                      <option value="<">&lt;</option>
                      <option value="<=">&le;</option>
                      <option value=">">&gt;</option>
                      <option value=">=">&ge;</option>
                    </select>
                    <input
                      type="number"
                      step="any"
                      value={newCriterion.limitValue ?? 0}
                      onChange={(e) => setNewCriterion({ ...newCriterion, limitValue: parseFloat(e.target.value) })}
                      className="w-full bg-[#141922] border border-slate-200/80 px-2 py-1.5 text-xs font-mono text-slate-800 focus:outline-none focus:border-blue-600"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-slate-500 uppercase">Unit</label>
                  <input
                    type="text"
                    value={newCriterion.unit || ''}
                    onChange={(e) => setNewCriterion({ ...newCriterion, unit: e.target.value })}
                    className="w-full bg-[#141922] border border-slate-200/80 px-3 py-1.5 text-xs font-mono text-slate-800 focus:outline-none focus:border-blue-600"
                    placeholder="e.g. K, Pa, [-]"
                  />
                </div>
              </div>
            </div>

            {/* Test and Add Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200/80">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleTestExpression}
                  className="px-3.5 py-1.5 bg-[#141922] hover:bg-[#1E2533] text-slate-800 text-xs font-mono font-semibold border border-slate-200/80 transition-colors"
                >
                  Evaluate Live Expression
                </button>

                {testResult && (
                  <div className="flex items-center gap-2 text-xs font-mono">
                    {testResult.err ? (
                      <span className="text-[#EF4444] flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {testResult.err}
                      </span>
                    ) : (
                      <span className={`flex items-center gap-1.5 px-2.5 py-0.5 border font-bold ${
                        testResult.pass ? 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/30' : 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/30'
                      }`}>
                        {testResult.pass ? <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" /> : <XCircle className="w-3.5 h-3.5 text-[#EF4444]" />}
                        Value = {testResult.val.toExponential(3)} {newCriterion.unit} ({testResult.pass ? 'PASS' : 'FAIL'})
                      </span>
                    )}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={handleAddCriterion}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 text-white text-xs font-mono font-bold uppercase tracking-wider transition-colors hover:bg-[#33E0F8]"
              >
                <Plus className="w-4 h-4" />
                <span>Add Criterion to Live Matrix</span>
              </button>
            </div>

            {/* Available Scope Cheat-Sheet */}
            <details className="text-xs text-slate-500 pt-1">
              <summary className="cursor-pointer font-mono font-semibold text-slate-700 hover:text-slate-900">
                Show Available Simulation Variables & Scope ({availableVariables.length} parameters)
              </summary>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 pt-2 text-[11px] font-mono">
                {availableVariables.map((v) => (
                  <div key={v.name} className="p-1.5 bg-[#141922] border border-slate-200/80">
                    <span className="font-bold text-blue-600">{v.name}</span>
                    <span className="text-slate-500 block text-[10px] truncate">{v.desc}</span>
                  </div>
                ))}
              </div>
            </details>
          </div>

          {/* Active Custom Criteria List */}
          <div className="bg-white rounded-xl shadow-xs border border-slate-200/80 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200/80 bg-[#141922] flex items-center justify-between">
              <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-900">
                Active Custom Diagnostic Rules ({customCriteria.length})
              </h3>
              <span className="text-[11px] font-mono text-slate-500">
                Injected into main diagnostic matrix & report audit
              </span>
            </div>

            {customCriteria.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs font-mono">
                No custom criteria added yet. Use the builder above or click a preset to add custom rules.
              </div>
            ) : (
              <div className="divide-y divide-[#1E2533]">
                {customCriteria.map((crit) => (
                  <div key={crit.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-[#141922]/50">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono px-2 py-0.5 bg-blue-50 text-blue-700 text-blue-600 border border-blue-600/30 font-semibold">
                          {crit.category}
                        </span>
                        <h4 className="font-mono text-xs font-bold text-slate-800">
                          {crit.name}
                        </h4>
                        <span className="text-xs font-mono text-slate-500">
                          (<MathView math={crit.symbol} />)
                        </span>
                      </div>
                      <div className="text-xs font-mono text-slate-700 flex items-center gap-2">
                        <span className="bg-[#141922] px-2 py-0.5 border border-slate-200/80">
                          Expression: {crit.expression} {crit.operator} {crit.limitValue} {crit.unit}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        {crit.description}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleToggleCriterion(crit.id)}
                        className={`p-1.5 text-xs font-mono flex items-center gap-1 border ${
                          crit.enabled
                            ? 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/30'
                            : 'bg-[#141922] text-slate-500 border-slate-200/80'
                        }`}
                        title={crit.enabled ? 'Enabled in simulation' : 'Disabled'}
                      >
                        {crit.enabled ? <ToggleRight className="w-4 h-4 text-[#10B981]" /> : <ToggleLeft className="w-4 h-4 text-slate-500" />}
                        <span>{crit.enabled ? 'ACTIVE' : 'MUTED'}</span>
                      </button>

                      <button
                        onClick={() => handleDeleteCriterion(crit.id)}
                        className="p-1.5 text-[#EF4444] hover:bg-[#EF4444]/10 border border-[#EF4444]/30 transition-colors"
                        title="Delete criterion"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'formula_audit' && (
        <div className="bg-white rounded-xl shadow-xs border border-slate-200/80 p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-600" />
              <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-900">
                Formal Mathematical & Dimensional Audit (The 9 Core Criteria)
              </h3>
            </div>
            <span className="text-[11px] font-mono text-slate-500">
              Eurokin Consortium Standard Protocol for Fixed-Bed Intrinsic Kinetics
            </span>
          </div>

          <div className="space-y-4">
            {simulation.criteria.filter(c => !c.isCustom).map((c, idx) => (
              <div key={c.id} className="p-4 border border-slate-200/80 bg-[#141922] space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 bg-blue-50 text-blue-700 text-blue-600 border border-blue-600/30 font-bold font-mono text-xs flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <h4 className="font-mono text-xs font-bold text-slate-800">
                      {c.name}
                    </h4>
                    <span className="text-[11px] font-mono text-slate-500">
                      [Ref: {c.reference}]
                    </span>
                  </div>
                  <span className={`px-2 py-0.5 text-[11px] font-mono font-bold border ${
                    c.passed ? 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/30' : 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/30'
                  }`}>
                    {c.passed ? 'PASSED' : 'VIOLATED'} ({c.marginPercent > 0 ? `+${c.marginPercent.toFixed(1)}%` : `${c.marginPercent.toFixed(1)}%`})
                  </span>
                </div>

                {/* Mathematical Formulation */}
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/80 text-center font-mono">
                  <MathView math={c.formulaLatex} displayMode />
                </div>

                {/* Live substitution */}
                <div className="text-xs font-mono text-slate-700 bg-slate-50 rounded-lg p-2 border border-slate-200/80 overflow-x-auto">
                  <span className="text-slate-500 font-semibold block text-[10px] uppercase tracking-wider">Live Substitution with Active Parameters:</span>
                  <MathView math={c.substitutionLatex} />
                </div>

                <p className="text-xs text-slate-500 leading-relaxed font-sans">
                  {c.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
