import React from 'react';
import { ReactorSuitabilityAssessment } from '../types/eurokin';
import { CheckCircle2, AlertTriangle, XCircle, ArrowRight, Activity, Wrench, ShieldCheck, Factory, Gauge } from 'lucide-react';

interface ReactorSuggestionCardProps {
  suitability: ReactorSuitabilityAssessment;
}

export const ReactorSuggestionCard: React.FC<ReactorSuggestionCardProps> = ({ suitability }) => {
  const {
    recommendedType,
    secondaryOption,
    overallFeasibility,
    summaryHeadline,
    dimensions,
    actionableEngineeringSteps,
  } = suitability;

  const feasibilityStyles = {
    HIGHLY_FEASIBLE: {
      badgeBg: 'bg-emerald-50 text-emerald-800 border-emerald-300',
      bannerBg: 'bg-emerald-50/60 border-emerald-200',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-600" />,
      label: 'FIXED-BED PACKED REACTOR VIABLE',
    },
    FEASIBLE_WITH_CAUTION: {
      badgeBg: 'bg-amber-50 text-amber-800 border-amber-300',
      bannerBg: 'bg-amber-50/60 border-amber-200',
      icon: <AlertTriangle className="w-5 h-5 text-amber-600" />,
      label: 'FEASIBLE WITH GEOMETRIC ADJUSTMENTS',
    },
    NOT_RECOMMENDED: {
      badgeBg: 'bg-rose-50 text-rose-800 border-rose-300',
      bannerBg: 'bg-rose-50/60 border-rose-200',
      icon: <XCircle className="w-5 h-5 text-rose-600" />,
      label: 'PACKED-BED NOT RECOMMENDED (RE-ENGINEERING REQUIRED)',
    },
  }[overallFeasibility];

  const verdictBadge = (verdict: string) => {
    switch (verdict) {
      case 'EXCELLENT':
        return <span className="px-2 py-0.5 text-[11px] font-mono font-semibold rounded bg-emerald-100 text-emerald-800 border border-emerald-200">EXCELLENT</span>;
      case 'ACCEPTABLE':
        return <span className="px-2 py-0.5 text-[11px] font-mono font-semibold rounded bg-blue-100 text-blue-800 border border-blue-200">ACCEPTABLE</span>;
      case 'RESTRICTIVE':
        return <span className="px-2 py-0.5 text-[11px] font-mono font-semibold rounded bg-amber-100 text-amber-800 border border-amber-200">RESTRICTIVE</span>;
      case 'CRITICAL':
      default:
        return <span className="px-2 py-0.5 text-[11px] font-mono font-semibold rounded bg-rose-100 text-rose-800 border border-rose-200">BREACHED</span>;
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      {/* Header Banner */}
      <div className={`p-4 border-b border-slate-200 ${feasibilityStyles.bannerBg} flex flex-col md:flex-row md:items-center justify-between gap-3`}>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-white border border-slate-200 shadow-xs">
            <Factory className="w-5 h-5 text-slate-700" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold tracking-wider uppercase text-slate-500">
                Front-Page Architecture & Hydraulic Decision Engine
              </span>
              <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold border ${feasibilityStyles.badgeBg}`}>
                {feasibilityStyles.label}
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-900 mt-0.5">
              {summaryHeadline}
            </h3>
          </div>
        </div>

        {/* Primary Recommended Configuration */}
        <div className="flex flex-col md:items-end bg-white px-3.5 py-2 rounded-lg border border-slate-200 shadow-xs">
          <span className="text-[11px] font-mono uppercase text-slate-500 font-medium">Primary Reactor Suggestion:</span>
          <span className="font-bold text-sm text-slate-900 flex items-center gap-1.5 mt-0.5">
            <span className="w-2 h-2 rounded-full bg-blue-600 inline-block"></span>
            {recommendedType}
          </span>
          <span className="text-[11px] text-slate-500 font-mono">
            Alternative: {secondaryOption}
          </span>
        </div>
      </div>

      {/* 4 Multi-Dimensional Evaluation Cards */}
      <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5 bg-slate-50/50 border-b border-slate-200">
        {dimensions.map((dim) => (
          <div key={dim.name} className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs space-y-2 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-xs font-semibold text-slate-800 line-clamp-1">{dim.name}</span>
                {verdictBadge(dim.verdict)}
              </div>
              <div className="flex justify-between items-baseline text-xs font-mono mt-1">
                <span className="text-slate-500">{dim.diagnosticMetric}:</span>
                <span className="font-bold text-slate-900">{dim.currentValueFormatted}</span>
              </div>
              <div className="flex justify-between items-baseline text-[11px] font-mono text-slate-500">
                <span>Threshold:</span>
                <span>{dim.recommendedLimit}</span>
              </div>
            </div>

            {/* Progress / Safety Margin Bar */}
            <div className="space-y-1">
              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    dim.score >= 70 ? 'bg-emerald-500' : dim.score >= 40 ? 'bg-amber-500' : 'bg-rose-500'
                  }`}
                  style={{ width: `${Math.max(5, Math.min(100, dim.score))}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-600 leading-tight">
                {dim.explanation}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Actionable Engineering Remediation Knobs */}
      <div className="p-4 bg-white flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
        <div className="flex items-start gap-2.5">
          <div className="p-1.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 mt-0.5 shrink-0">
            <Wrench className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="font-bold text-slate-900 block font-mono text-xs uppercase tracking-wide">
              Engineering Tuning Knobs for Ammonia Synthesis:
            </span>
            <ul className="list-disc list-inside text-slate-600 mt-1 space-y-0.5 text-xs">
              {actionableEngineeringSteps.map((step, idx) => (
                <li key={idx} className="leading-relaxed">
                  {step}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
