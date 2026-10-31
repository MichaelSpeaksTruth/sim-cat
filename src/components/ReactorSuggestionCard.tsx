import React from 'react';
import { ReactorSuitabilityAssessment } from '../types/eurokin';
import { CheckCircle2, AlertTriangle, XCircle, ArrowRight, Factory, Wrench } from 'lucide-react';

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
      badgeBg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      bannerBg: 'bg-emerald-50/40 border-b border-emerald-100',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-600" />,
      label: 'FIXED-BED PACKED REACTOR VIABLE',
    },
    FEASIBLE_WITH_CAUTION: {
      badgeBg: 'bg-amber-50 text-amber-800 border-amber-200',
      bannerBg: 'bg-amber-50/40 border-b border-amber-100',
      icon: <AlertTriangle className="w-5 h-5 text-amber-600" />,
      label: 'FEASIBLE WITH GEOMETRIC ADJUSTMENTS',
    },
    NOT_RECOMMENDED: {
      badgeBg: 'bg-rose-50 text-rose-800 border-rose-200',
      bannerBg: 'bg-rose-50/40 border-b border-rose-100',
      icon: <XCircle className="w-5 h-5 text-rose-600" />,
      label: 'RE-ENGINEERING REQUIRED',
    },
  }[overallFeasibility];

  const verdictBadge = (verdict: string) => {
    switch (verdict) {
      case 'EXCELLENT':
        return <span className="px-2 py-0.5 text-[10px] font-mono font-semibold rounded bg-emerald-100 text-emerald-800">EXCELLENT</span>;
      case 'ACCEPTABLE':
        return <span className="px-2 py-0.5 text-[10px] font-mono font-semibold rounded bg-blue-100 text-blue-800">ACCEPTABLE</span>;
      case 'RESTRICTIVE':
        return <span className="px-2 py-0.5 text-[10px] font-mono font-semibold rounded bg-amber-100 text-amber-800">RESTRICTIVE</span>;
      case 'CRITICAL':
      default:
        return <span className="px-2 py-0.5 text-[10px] font-mono font-semibold rounded bg-rose-100 text-rose-800">BREACHED</span>;
    }
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-xl shadow-xs overflow-hidden">
      {/* Header Banner */}
      <div className={`p-4 sm:p-5 ${feasibilityStyles.bannerBg} flex flex-col md:flex-row md:items-center justify-between gap-4`}>
        <div className="flex items-center gap-3.5">
          <div className="p-2.5 bg-white shadow-xs rounded-lg text-blue-600 border border-slate-200/60">
            <Factory className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-mono font-bold tracking-wider uppercase text-slate-500">
                Architecture Assessment
              </span>
              <span className={`px-2 py-0.5 text-[10px] font-mono font-bold border rounded-md ${feasibilityStyles.badgeBg}`}>
                {feasibilityStyles.label}
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-900 mt-0.5">
              {summaryHeadline}
            </h3>
          </div>
        </div>

        {/* Primary Recommended Configuration */}
        <div className="flex flex-col md:items-end bg-white/80 backdrop-blur-xs px-4 py-2.5 rounded-lg border border-slate-200/80 shadow-xs">
          <span className="text-[10px] uppercase text-slate-500 font-semibold tracking-wider">Recommended:</span>
          <span className="font-bold text-sm text-slate-900 flex items-center gap-1.5 mt-0.5">
            <span className="w-2 h-2 rounded-full bg-blue-600" />
            {recommendedType}
          </span>
          <span className="text-xs text-slate-500 font-mono mt-0.5">
            Alternative: {secondaryOption}
          </span>
        </div>
      </div>

      {/* 4 Multi-Dimensional Evaluation Cards */}
      <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 bg-slate-50/50 border-b border-slate-200/80">
        {dimensions.map((dim) => (
          <div key={dim.name} className="bg-white p-4 rounded-lg border border-slate-200/80 shadow-xs space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs font-bold text-slate-900 line-clamp-1">{dim.name}</span>
                {verdictBadge(dim.verdict)}
              </div>
              <div className="flex justify-between items-baseline text-xs font-mono mt-1">
                <span className="text-slate-500 font-sans">{dim.diagnosticMetric}:</span>
                <span className="text-slate-900 font-bold">{dim.currentValueFormatted}</span>
              </div>
              <div className="flex justify-between items-baseline text-[11px] font-mono mt-0.5">
                <span className="text-slate-400 font-sans">Threshold:</span>
                <span className="text-slate-600">{dim.recommendedLimit}</span>
              </div>
            </div>

            <p className="text-xs text-slate-600 font-sans border-t border-slate-100 pt-2.5 leading-relaxed">
              {dim.explanation}
            </p>
          </div>
        ))}
      </div>

      {/* Actionable Engineering Remediation Steps */}
      <div className="p-4 sm:p-5 bg-white">
        <div className="flex items-center gap-2 mb-3 text-xs font-bold uppercase tracking-wider text-slate-700">
          <Wrench className="w-4 h-4 text-blue-600" />
          <span>Actionable Engineering Steps</span>
        </div>
        <div className="space-y-2">
          {actionableEngineeringSteps.map((step, idx) => (
            <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-700 bg-slate-50 rounded-lg p-2.5 border border-slate-200/60">
              <ArrowRight className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <span>{step}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
