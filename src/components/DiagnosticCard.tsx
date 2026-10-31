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
    'Fluid Dynamics': 'bg-[#00D8F6]/10 text-[#00D8F6] border-[#00D8F6]/30',
    'Mass Transfer': 'bg-[#38BDF8]/10 text-[#38BDF8] border-[#38BDF8]/30',
    'Heat Transfer': 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/30',
    'Hydrodynamics': 'bg-[#2DD4BF]/10 text-[#2DD4BF] border-[#2DD4BF]/30',
    'Bed Dilution': 'bg-[#A855F7]/10 text-[#A855F7] border-[#A855F7]/30',
    'Custom Criterion': 'bg-[#3B82F6]/10 text-[#3B82F6] border-[#3B82F6]/30',
  };

  return (
    <div
      className={`border transition-all duration-150 bg-[#0B0E14] overflow-hidden ${
        passed
          ? 'border-[#1E2533] hover:border-[#2C374A]'
          : 'border-[#EF4444]/60 bg-[#EF4444]/5 hover:border-[#EF4444]'
      }`}
    >
      {/* Top Header */}
      <div className="p-3.5">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span
                className={`text-[9px] font-mono px-2 py-0.5 border font-semibold ${
                  categoryColors[category] || 'bg-[#141A24] text-slate-400 border-[#252E3E]'
                }`}
              >
                {category}
              </span>
              {isCustom && (
                <span className="text-[9px] font-mono px-1.5 py-0.5 bg-[#00D8F6]/15 text-[#00D8F6] font-bold border border-[#00D8F6]/40">
                  CUSTOM
                </span>
              )}
              <span className="text-[10px] font-mono text-slate-500">
                Ref: {reference.split(',')[0]}
              </span>
            </div>
            <h4 className="font-bold text-xs text-slate-100 flex items-center gap-1.5">
              <span>{name}</span>
              <span className="text-xs font-mono text-slate-400 font-normal">
                (<MathView math={symbol} />)
              </span>
            </h4>
          </div>

          {/* Status Badge */}
          {(() => {
            const st = criterion.status ?? (passed ? 'PASS' : 'FAIL');
            if (st === 'PASS') {
              return (
                <div className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono font-bold border shrink-0 bg-[#10B981]/15 text-[#10B981] border-[#10B981]/40">
                  <CheckCircle2 className="w-3 h-3 text-[#10B981]" />
                  <span>PASS</span>
                </div>
              );
            }
            if (st === 'WARNING') {
              return (
                <div className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono font-bold border shrink-0 bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/40">
                  <AlertTriangle className="w-3 h-3 text-[#F59E0B]" />
                  <span>WARNING</span>
                </div>
              );
            }
            if (st === 'OUTSIDE_CORRELATION_VALIDITY') {
              return (
                <div className="flex items-center gap-1 px-2 py-0.5 text-[9px] font-mono font-bold border shrink-0 bg-purple-950/40 text-purple-300 border-purple-500/50">
                  <AlertTriangle className="w-3 h-3 text-purple-400" />
                  <span>OUTSIDE CORRELATION VALIDITY</span>
                </div>
              );
            }
            if (st === 'NOT_EVALUATED') {
              return (
                <div className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono font-bold border shrink-0 bg-slate-800/40 text-slate-400 border-slate-700">
                  <span>NOT EVALUATED</span>
                </div>
              );
            }
            return (
              <div className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono font-bold border shrink-0 bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/40">
                <XCircle className="w-3 h-3 text-[#EF4444]" />
                <span>FAIL</span>
              </div>
            );
          })()}
        </div>

        {criterion.warningNote && (
          <div className="mb-2 p-1.5 bg-amber-950/20 border border-amber-600/30 text-[10px] font-mono text-amber-300 flex items-start gap-1.5">
            <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
            <span>{criterion.warningNote}</span>
          </div>
        )}

        {criterion.applicabilityRange && (
          <div className="mb-2 text-[10px] font-mono text-slate-400 flex items-center gap-1.5">
            <span className="text-slate-500 uppercase text-[9px]">Applicability:</span>
            <span className={criterion.isWithinApplicability === false ? 'text-purple-300 font-semibold' : 'text-slate-300'}>
              {criterion.applicabilityRange}
            </span>
          </div>
        )}

        {/* Calculated vs Threshold Comparison */}
        <div className="grid grid-cols-2 gap-2 p-2 bg-[#080B10] border border-[#171E2A] text-xs font-mono my-2.5">
          <div>
            <span className="text-[10px] text-slate-500 uppercase block">Calculated</span>
            <div className="font-bold text-slate-100 truncate">
              {fmt(calculatedValue)} <span className="text-[10px] text-slate-400">{unit}</span>
            </div>
          </div>

          <div>
            <span className="text-[10px] text-slate-500 uppercase block">Threshold Limit</span>
            <div className="font-bold text-slate-300 truncate">
              {operator} {fmt(limitValue)} <span className="text-[10px] text-slate-400">{unit}</span>
            </div>
          </div>
        </div>

        {/* Safety Margin Progress Bar */}
        <div className="space-y-1">
          <div className="flex justify-between items-center text-[10px] font-mono">
            <span className="text-slate-500">Safety Tolerance Margin:</span>
            <span
              className={`font-bold ${
                passed ? 'text-[#10B981]' : 'text-[#EF4444]'
              }`}
            >
              {marginPercent > 0 ? `+${marginPercent.toFixed(1)}%` : `${marginPercent.toFixed(1)}%`}
            </span>
          </div>

          <div className="w-full h-1 bg-[#141A24] overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                passed ? 'bg-[#10B981]' : 'bg-[#EF4444]'
              }`}
              style={{ width: `${Math.min(100, Math.max(5, Math.abs(marginPercent)))}%` }}
            />
          </div>
        </div>

        {/* Expand / Collapse Button */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full mt-2.5 pt-2 border-t border-[#171E2A] flex items-center justify-between text-[10px] font-mono text-slate-400 hover:text-slate-200 transition-colors"
        >
          <span className="flex items-center gap-1">
            <BookOpen className="w-3 h-3 text-[#00D8F6]" />
            <span>Mathematical Derivation & Substitution</span>
          </span>
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {/* Expanded Mathematical Substitution Drawer */}
      {expanded && (
        <div className="p-3 bg-[#080B10] border-t border-[#171E2A] space-y-2 text-xs font-mono">
          <div>
            <span className="text-[9px] text-slate-500 uppercase tracking-wider block mb-1">
              Governing Equation:
            </span>
            <div className="p-2 bg-[#05070A] border border-[#171E2A] overflow-x-auto text-slate-200 text-center">
              <MathView math={formulaLatex} block={true} />
            </div>
          </div>

          <div>
            <span className="text-[9px] text-slate-500 uppercase tracking-wider block mb-1">
              Live Numerical Substitution:
            </span>
            <div className="p-2 bg-[#05070A] border border-[#171E2A] overflow-x-auto text-[#00D8F6] text-center text-[11px]">
              <MathView math={substitutionLatex} block={true} />
            </div>
          </div>

          <p className="text-[11px] text-slate-400 font-sans leading-relaxed pt-1">
            {description}
          </p>
        </div>
      )}
    </div>
  );
};
