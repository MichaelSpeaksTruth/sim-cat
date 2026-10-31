import React from 'react';
import { ReactorSuitabilityAssessment } from '../types/eurokin';
import { CheckCircle2, AlertTriangle, XCircle, ArrowRight, Factory, Gauge, Wrench } from 'lucide-react';

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
      badgeBg: 'bg-[#10B981]/15 text-[#10B981] border-[#10B981]/40',
      bannerBg: 'bg-[#10B981]/5 border-[#10B981]/20',
      icon: <CheckCircle2 className="w-5 h-5 text-[#10B981]" />,
      label: 'FIXED-BED PACKED REACTOR VIABLE',
    },
    FEASIBLE_WITH_CAUTION: {
      badgeBg: 'bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/40',
      bannerBg: 'bg-[#F59E0B]/5 border-[#F59E0B]/20',
      icon: <AlertTriangle className="w-5 h-5 text-[#F59E0B]" />,
      label: 'FEASIBLE WITH GEOMETRIC ADJUSTMENTS',
    },
    NOT_RECOMMENDED: {
      badgeBg: 'bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/40',
      bannerBg: 'bg-[#EF4444]/5 border-[#EF4444]/20',
      icon: <XCircle className="w-5 h-5 text-[#EF4444]" />,
      label: 'PACKED-BED NOT RECOMMENDED (RE-ENGINEERING REQUIRED)',
    },
  }[overallFeasibility];

  const verdictBadge = (verdict: string) => {
    switch (verdict) {
      case 'EXCELLENT':
        return <span className="px-2 py-0.5 text-[10px] font-mono font-semibold bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30">EXCELLENT</span>;
      case 'ACCEPTABLE':
        return <span className="px-2 py-0.5 text-[10px] font-mono font-semibold bg-[#00D8F6]/15 text-[#00D8F6] border border-[#00D8F6]/30">ACCEPTABLE</span>;
      case 'RESTRICTIVE':
        return <span className="px-2 py-0.5 text-[10px] font-mono font-semibold bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30">RESTRICTIVE</span>;
      case 'CRITICAL':
      default:
        return <span className="px-2 py-0.5 text-[10px] font-mono font-semibold bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30">BREACHED</span>;
    }
  };

  return (
    <div className="bg-[#0A0D12] border border-[#1E2533] overflow-hidden">
      {/* Header Banner */}
      <div className={`p-4 border-b border-[#1E2533] ${feasibilityStyles.bannerBg} flex flex-col md:flex-row md:items-center justify-between gap-3`}>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#12161E] border border-[#252E3E]">
            <Factory className="w-5 h-5 text-[#00D8F6]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-slate-400">
                Reactor Architecture Assessment
              </span>
              <span className={`px-2 py-0.5 text-[10px] font-mono font-bold border ${feasibilityStyles.badgeBg}`}>
                {feasibilityStyles.label}
              </span>
            </div>
            <h3 className="text-sm font-bold text-slate-100 mt-0.5">
              {summaryHeadline}
            </h3>
          </div>
        </div>

        {/* Primary Recommended Configuration */}
        <div className="flex flex-col md:items-end bg-[#12161E] px-3.5 py-2 border border-[#252E3E]">
          <span className="text-[10px] font-mono uppercase text-slate-500 font-medium">Recommended Architecture:</span>
          <span className="font-bold text-xs text-slate-100 flex items-center gap-1.5 mt-0.5">
            <span className="w-2 h-2 bg-[#00D8F6]" />
            {recommendedType}
          </span>
          <span className="text-[10px] text-slate-400 font-mono mt-0.5">
            Alternative: {secondaryOption}
          </span>
        </div>
      </div>

      {/* 4 Multi-Dimensional Evaluation Cards */}
      <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 bg-[#080B10] border-b border-[#1E2533]">
        {dimensions.map((dim) => (
          <div key={dim.name} className="bg-[#0D121A] p-3 border border-[#1C2533] space-y-2 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="text-xs font-semibold text-slate-200 line-clamp-1">{dim.name}</span>
                {verdictBadge(dim.verdict)}
              </div>
              <div className="flex justify-between items-baseline text-xs font-mono mt-1">
                <span className="text-slate-500 text-[11px]">{dim.diagnosticMetric}:</span>
                <span className="text-slate-200 font-bold">{dim.currentValueFormatted}</span>
              </div>
              <div className="flex justify-between items-baseline text-[10px] font-mono mt-0.5">
                <span className="text-slate-500">Threshold:</span>
                <span className="text-slate-400">{dim.recommendedLimit}</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 font-sans border-t border-[#171E2A] pt-2 mt-2 leading-relaxed">
              {dim.explanation}
            </p>
          </div>
        ))}
      </div>

      {/* Actionable Engineering Remediation Steps */}
      <div className="p-4 bg-[#0A0D12]">
        <div className="flex items-center gap-2 mb-2 text-xs font-mono text-slate-300 font-bold uppercase tracking-wider">
          <Wrench className="w-3.5 h-3.5 text-[#00D8F6]" />
          <span>Actionable Engineering Remediation Steps:</span>
        </div>
        <div className="space-y-1.5">
          {actionableEngineeringSteps.map((step, idx) => (
            <div key={idx} className="flex items-start gap-2 text-xs font-mono text-slate-300 bg-[#0E131A] p-2 border border-[#1E2533]">
              <ArrowRight className="w-3.5 h-3.5 text-[#00D8F6] shrink-0 mt-0.5" />
              <span>{step}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
