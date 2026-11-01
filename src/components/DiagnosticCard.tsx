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
    'Fluid Dynamics': 'bg-blue-50 text-blue-700 border-blue-200',
    'Mass Transfer': 'bg-sky-50 text-sky-700 border-sky-200',
    'Heat Transfer': 'bg-amber-50 text-amber-700 border-amber-200',
    'Hydrodynamics': 'bg-teal-50 text-teal-700 border-teal-200',
    'Bed Dilution': 'bg-purple-50 text-purple-700 border-purple-200',
    'Custom Criterion': 'bg-indigo-50 text-indigo-700 border-indigo-200',
  };

  const st = criterion.status ?? (passed ? 'PASS' : 'FAIL');

  return (
    <div
      className={`border rounded-xl transition-all duration-150 bg-white shadow-xs overflow-hidden flex flex-col justify-between h-full ${
        passed
          ? 'border-slate-200/90 hover:border-slate-300'
          : 'border-rose-300 bg-rose-50/20 hover:border-rose-400'
      }`}
    >
      {/* Top Header & Core Inspection Metrics */}
      <div className="p-4 flex flex-col justify-between flex-1">
        <div>
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded border font-semibold shrink-0 ${
                    categoryColors[category] || 'bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  {category}
                </span>
                {isCustom && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 bg-blue-50 text-blue-700 font-bold rounded border border-blue-200 shrink-0">
                    CUSTOM
                  </span>
                )}
                <span className="text-[11px] text-slate-400 font-mono truncate">
                  Ref: {reference.split(',')[0]}
                </span>
              </div>

              {/* Title with non-breaking LaTeX Symbol */}
              <h4 className="font-bold text-xs text-slate-900 leading-snug">
                <span>{name}</span>{' '}
                <span className="inline-flex items-center whitespace-nowrap text-xs font-mono text-slate-500 font-normal">
                  (<MathView math={symbol} />)
                </span>
              </h4>
            </div>

            {/* Status Badge */}
            {st === 'PASS' ? (
              <div className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>PASS</span>
              </div>
            ) : st === 'WARNING' ? (
              <div className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span>WARNING</span>
              </div>
            ) : st === 'OUTSIDE_CORRELATION_VALIDITY' ? (
              <div className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-purple-50 text-purple-700 border border-purple-200 shrink-0">
                <AlertTriangle className="w-3.5 h-3.5 text-purple-600" />
                <span>RANGE</span>
              </div>
            ) : st === 'NOT_EVALUATED' ? (
              <div className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                <span>N/E</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-rose-50 text-rose-700 border border-rose-200 shrink-0">
                <XCircle className="w-3.5 h-3.5 text-rose-600" />
                <span>FAIL</span>
              </div>
            )}
          </div>

          {criterion.warningNote && (
            <div className="mb-2 p-2 bg-amber-50 border border-amber-200 rounded-lg text-xs font-mono text-amber-800 flex items-start gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
              <span className="text-[11px] leading-tight">{criterion.warningNote}</span>
            </div>
          )}

          {criterion.applicabilityRange && (
            <div className="mb-2 text-xs font-mono text-slate-500 flex items-center gap-1.5 flex-wrap">
              <span className="text-slate-400 uppercase text-[10px] font-semibold">Applicability:</span>
              <span className={criterion.isWithinApplicability === false ? 'text-purple-700 font-semibold' : 'text-slate-700'}>
                {criterion.applicabilityRange}
              </span>
            </div>
          )}

          {/* Symmetrical Calculated vs Threshold Box with No Chopped Text */}
          <div className="grid grid-cols-2 gap-2 p-2.5 bg-slate-50 rounded-lg border border-slate-200/70 text-xs font-mono my-2.5">
            <div className="min-w-0">
              <span className="text-[10px] text-slate-500 uppercase font-bold tracking-tight block">
                Calculated
              </span>
              <div
                className="font-bold text-slate-900 text-sm mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis flex items-baseline gap-1"
                title={`${fmt(calculatedValue)} ${unit}`}
              >
                <span>{fmt(calculatedValue)}</span>
                <span className="text-xs text-slate-500 font-normal">{unit}</span>
              </div>
            </div>

            <div className="min-w-0">
              <span className="text-[10px] text-slate-500 uppercase font-bold tracking-tight block">
                Threshold Limit
              </span>
              <div
                className="font-bold text-slate-700 text-sm mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis flex items-baseline gap-1"
                title={`${operator} ${fmt(limitValue)} ${unit}`}
              >
                <span>{operator}</span>
                <span>{fmt(limitValue)}</span>
                <span className="text-xs text-slate-500 font-normal">{unit}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Safety Margin Progress Bar */}
        <div className="space-y-1 pt-1">
          <div className="flex justify-between items-center text-xs font-mono">
            <span className="text-slate-500 text-[11px]">Safety Tolerance:</span>
            <span
              className={`font-bold text-[11px] ${
                passed ? 'text-emerald-700' : 'text-rose-700'
              }`}
            >
              {marginPercent > 0 ? `+${marginPercent.toFixed(1)}%` : `${marginPercent.toFixed(1)}%`}
            </span>
          </div>

          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                passed ? 'bg-emerald-500' : 'bg-rose-500'
              }`}
              style={{ width: `${Math.min(100, Math.max(5, Math.abs(marginPercent)))}%` }}
            />
          </div>
        </div>

        {/* Expand / Collapse Button */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-mono text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
        >
          <span className="flex items-center gap-1.5 font-sans font-medium text-blue-700 text-[11px]">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Mathematical Derivation & Substitution</span>
          </span>
          {expanded ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
        </button>
      </div>

      {/* Expanded Mathematical Substitution Drawer */}
      {expanded && (
        <div className="p-3.5 bg-slate-50 border-t border-slate-200/80 space-y-2.5 text-xs font-mono">
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider block mb-1">
              Governing Equation:
            </span>
            <div className="p-2.5 bg-white rounded-lg border border-slate-200/80 overflow-x-auto text-slate-900 text-center shadow-2xs">
              <MathView math={formulaLatex} block={true} />
            </div>
          </div>

          <div>
            <span className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider block mb-1">
              Numerical Substitution:
            </span>
            <div className="p-2.5 bg-white rounded-lg border border-slate-200/80 overflow-x-auto text-blue-700 text-center text-xs shadow-2xs">
              <MathView math={substitutionLatex} block={true} />
            </div>
          </div>

          <p className="text-[11px] text-slate-600 font-sans leading-relaxed pt-0.5">
            {description}
          </p>
        </div>
      )}
    </div>
  );
};
