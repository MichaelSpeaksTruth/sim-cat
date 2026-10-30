import React, { useState } from 'react';
import { DiagnosticCriterion } from '../types/eurokin';
import { CheckCircle2, XCircle, ChevronDown, ChevronUp, BookOpen, AlertTriangle, ShieldCheck } from 'lucide-react';
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
    warningNote,
  } = criterion;

  const fmt = (v: number) => {
    if (Math.abs(v) >= 1e4 || (Math.abs(v) < 1e-3 && v !== 0)) {
      return v.toExponential(3);
    }
    return v.toFixed(4);
  };

  // Clamped margin for visual bar (0 to 100%)
  const barPercent = Math.min(100, Math.max(0, passed ? Math.min(100, marginPercent) : Math.max(0, 100 + marginPercent)));

  const categoryColors: Record<string, string> = {
    'Fluid Dynamics': 'bg-sky-950/60 text-sky-400 border-sky-800/60',
    'Mass Transfer': 'bg-indigo-950/60 text-indigo-400 border-indigo-800/60',
    'Heat Transfer': 'bg-amber-950/60 text-amber-400 border-amber-800/60',
    'Hydrodynamics': 'bg-teal-950/60 text-teal-400 border-teal-800/60',
    'Bed Dilution': 'bg-purple-950/60 text-purple-400 border-purple-800/60',
  };

  return (
    <div
      className={`rounded-xl border transition-all duration-200 overflow-hidden ${
        passed
          ? 'bg-[#0e131d]/90 border-slate-800/90 hover:border-slate-700'
          : 'bg-[#180f14]/90 border-rose-900/60 hover:border-rose-700 shadow-rose-950/20'
      }`}
    >
      {/* Top Header */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                  categoryColors[category] || 'bg-slate-800 text-slate-300 border-slate-700'
                }`}
              >
                {category}
              </span>
              <span className="text-[11px] font-mono text-slate-500">
                Ref: {reference}
              </span>
            </div>
            <h4 className="font-semibold text-sm text-slate-100 flex items-center gap-1.5">
              <span>{name}</span>
              <span className="text-xs font-mono text-slate-400 font-normal">
                (<MathView math={symbol} />)
              </span>
            </h4>
          </div>

          {/* Status Badge */}
          <div className="flex items-center gap-2 shrink-0">
            <span
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-mono font-bold tracking-wide uppercase border ${
                passed
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-600/60 shadow-[0_0_12px_rgba(16,185,129,0.15)]'
                  : 'bg-rose-950/90 text-rose-300 border-rose-600/70 shadow-[0_0_12px_rgba(244,63,94,0.25)]'
              }`}
            >
              {passed ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> PASS
                </>
              ) : (
                <>
                  <XCircle className="w-3.5 h-3.5 text-rose-400" /> FAIL
                </>
              )}
            </span>
          </div>
        </div>

        {/* Primary Formula Display */}
        <div className="my-2.5 px-3 py-2 rounded-lg bg-[#070a10] border border-slate-800/80 flex items-center justify-between overflow-x-auto">
          <div className="text-xs text-slate-300">
            <MathView math={formulaLatex} block={false} />
          </div>
        </div>

        {/* Calculated Value vs Required Threshold */}
        <div className="grid grid-cols-2 gap-2 my-3 p-2.5 rounded-lg bg-[#0a0e16] border border-slate-800/50 text-xs font-mono">
          <div>
            <div className="text-slate-500 text-[10px] uppercase tracking-wider">Calculated Value</div>
            <div className="text-sm font-bold text-slate-100 mt-0.5">
              {fmt(calculatedValue)} <span className="text-slate-400 text-xs font-normal">{unit}</span>
            </div>
          </div>
          <div>
            <div className="text-slate-500 text-[10px] uppercase tracking-wider">Required Threshold</div>
            <div className="text-sm font-semibold text-amber-300 mt-0.5">
              {operator} {fmt(limitValue)} <span className="text-slate-400 text-xs font-normal">{unit}</span>
            </div>
          </div>
        </div>

        {/* Safety Margin Telemetry Bar */}
        <div className="space-y-1 mb-2">
          <div className="flex justify-between items-center text-[10px] font-mono">
            <span className="text-slate-400 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-slate-500" /> Safety Margin
            </span>
            <span
              className={`font-semibold ${
                passed ? 'text-emerald-400' : 'text-rose-400 font-bold'
              }`}
            >
              {marginPercent > 0 ? `+${marginPercent.toFixed(1)}% Safe` : `${marginPercent.toFixed(1)}% Limit Exceeded`}
            </span>
          </div>
          <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
            <div
              className={`h-full transition-all duration-300 ${
                passed ? 'bg-gradient-to-r from-emerald-600 to-emerald-400' : 'bg-rose-500'
              }`}
              style={{ width: `${passed ? Math.min(100, Math.max(8, barPercent)) : 100}%` }}
            />
          </div>
        </div>

        {/* Description brief */}
        <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed mt-1">
          {description}
        </p>

        {/* Accordion Toggle for Detailed Numerical Substitution */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-3 w-full py-1.5 px-2 rounded-md bg-slate-900/70 hover:bg-slate-800/70 border border-slate-800 text-[11px] font-mono text-slate-400 hover:text-slate-200 flex items-center justify-between transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-amber-400" />
            {expanded ? 'Hide Numerical Substitution' : 'Inspect Evaluated Derivation'}
          </span>
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Expanded Derivation Ledger */}
      {expanded && (
        <div className="px-4 py-3 bg-[#07090e] border-t border-slate-800/90 text-xs font-mono space-y-2.5">
          <div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">
              Evaluated Equation with Live Variable Substitution:
            </div>
            <div className="p-2.5 rounded bg-[#0b0e17] border border-slate-800/90 text-amber-200 text-xs overflow-x-auto">
              <MathView math={substitutionLatex} block={true} />
            </div>
          </div>

          <div className="text-[11px] text-slate-400 space-y-1">
            <div className="font-sans font-semibold text-slate-300">Technical Criterion Context:</div>
            <p className="font-sans leading-relaxed">{description}</p>
          </div>

          {warningNote && (
            <div className="p-2 rounded bg-amber-950/40 border border-amber-800/50 text-amber-300 text-[11px] flex items-start gap-1.5 font-sans">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
              <span>{warningNote}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
