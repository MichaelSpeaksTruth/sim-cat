import React, { useState } from 'react';
import { DiagnosticCriterion } from '../types/eurokin';
import { CheckCircle2, XCircle, ChevronDown, ChevronUp, BookOpen, AlertTriangle } from 'lucide-react';
import { MathView } from './MathView';

interface DiagnosticCardProps {
  criterion: DiagnosticCriterion;
}

export const DiagnosticCard: React.FC<DiagnosticCardProps> = ({ criterion }) => {
  const [expanded, setExpanded] = useState(false);

  const {
    name,
    category,
    symbol,
    calculatedValue,
    limitValue,
    operator,
    unit,
    passed,
    marginPercent,
    formulaLatex,
    substitutionLatex,
    description,
    reference,
    isCustom,
  } = criterion;

  const fmt = (v: number) => {
    if (Math.abs(v) >= 1e4 || (Math.abs(v) < 1e-3 && v !== 0)) {
      return v.toExponential(3);
    }
    return v.toFixed(4);
  };

  const categoryColors: Record<string, string> = {
    'Fluid Dynamics': 'bg-sky-50 text-sky-800 border-sky-200',
    'Mass Transfer': 'bg-indigo-50 text-indigo-800 border-indigo-200',
    'Heat Transfer': 'bg-amber-50 text-amber-900 border-amber-200',
    'Hydrodynamics': 'bg-teal-50 text-teal-800 border-teal-200',
    'Bed Dilution': 'bg-purple-50 text-purple-800 border-purple-200',
    'Custom Criterion': 'bg-blue-50 text-blue-800 border-blue-200',
  };

  return (
    <div
      className={`rounded-xl border transition-all duration-200 bg-white overflow-hidden shadow-xs ${
        passed
          ? 'border-slate-200 hover:border-slate-300'
          : 'border-rose-300 bg-rose-50/20 hover:border-rose-400'
      }`}
    >
      {/* Top Header */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded border font-semibold ${
                  categoryColors[category] || 'bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                {category}
              </span>
              {isCustom && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-bold border border-blue-200">
                  CUSTOM
                </span>
              )}
              <span className="text-[11px] font-mono text-slate-500">
                Ref: {reference}
              </span>
            </div>
            <h4 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
              <span>{name}</span>
              <span className="text-xs font-mono text-slate-500 font-normal">
                (<MathView math={symbol} />)
              </span>
            </h4>
          </div>

          {/* Status Badge */}
          <div className="shrink-0">
            <span
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-mono font-bold tracking-wide uppercase border ${
                passed
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : 'bg-rose-50 text-rose-800 border-rose-300'
              }`}
            >
              {passed ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> PASS
                </>
              ) : (
                <>
                  <XCircle className="w-3.5 h-3.5 text-rose-600" /> FAIL
                </>
              )}
            </span>
          </div>
        </div>

        {/* Value vs Limit Readout */}
        <div className="grid grid-cols-2 gap-2 mt-3 p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs font-mono">
          <div>
            <span className="text-[11px] text-slate-500 block">Evaluated Value:</span>
            <span className="font-bold text-slate-900 text-sm">
              {fmt(calculatedValue)} <span className="text-xs font-normal text-slate-500">{unit}</span>
            </span>
          </div>
          <div>
            <span className="text-[11px] text-slate-500 block">Required Limit:</span>
            <span className="font-semibold text-slate-700 text-sm">
              {operator} {fmt(limitValue)} <span className="text-xs font-normal text-slate-500">{unit}</span>
            </span>
          </div>
        </div>

        {/* Safety Margin Meter */}
        <div className="mt-3 space-y-1">
          <div className="flex justify-between items-center text-[11px] font-mono">
            <span className="text-slate-500">Safety Margin:</span>
            <span
              className={`font-bold ${
                passed ? 'text-emerald-700' : 'text-rose-700'
              }`}
            >
              {marginPercent > 0 ? `+${marginPercent.toFixed(1)}% Safe` : `${marginPercent.toFixed(1)}% Violated`}
            </span>
          </div>

          <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                passed ? 'bg-emerald-500' : 'bg-rose-500'
              }`}
              style={{
                width: `${Math.min(100, Math.max(5, passed ? Math.min(100, marginPercent) : Math.max(5, 100 + marginPercent)))}%`,
              }}
            />
          </div>
        </div>

        {/* Compact Physical Meaning */}
        <p className="mt-2.5 text-xs text-slate-600 leading-relaxed">
          {description}
        </p>

        {/* Expand Details Toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-3 w-full pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-mono text-slate-500 hover:text-slate-800 transition-colors"
        >
          <span className="flex items-center gap-1 font-medium">
            <BookOpen className="w-3.5 h-3.5 text-blue-600" />
            {expanded ? 'Hide Mathematical Proof' : 'View Formula & Substitution'}
          </span>
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Expanded Accordion: LaTeX & Substitution */}
      {expanded && (
        <div className="p-4 bg-slate-50/80 border-t border-slate-200 space-y-3 text-xs">
          <div>
            <span className="text-[11px] font-mono text-slate-500 block uppercase font-semibold">
              Governing Mathematical Formula:
            </span>
            <div className="p-2 bg-white rounded border border-slate-200 overflow-x-auto text-slate-900 mt-1">
              <MathView math={formulaLatex} displayMode />
            </div>
          </div>

          <div>
            <span className="text-[11px] font-mono text-slate-500 block uppercase font-semibold">
              Substitution with Active Reactor Parameters:
            </span>
            <div className="p-2 bg-white rounded border border-slate-200 overflow-x-auto font-mono text-slate-800 mt-1">
              <MathView math={substitutionLatex} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
