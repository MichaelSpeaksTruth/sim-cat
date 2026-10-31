import React, { useState } from 'react';
import { SimulationResult } from '../types/eurokin';
import { X, Copy, Check, Download, FileCheck } from 'lucide-react';

interface ReportExportModalProps {
  simulation: SimulationResult;
  onClose: () => void;
}

export const ReportExportModal: React.FC<ReportExportModalProps> = ({ simulation, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [exportFormat, setExportFormat] = useState<'markdown' | 'json'>('markdown');

  const { inputs, transport, criteria, overallStatus, passedCount, totalCount, reactorSuitability } = simulation;

  const markdownReport = `
# SIM-CAT v1.0 | RESEARCH PREVIEW (Revision 15)
### Fixed-Bed Catalytic Ammonia Synthesis Simulator & Transport Diagnostic Suite
**Scientific Status**: Verified with operational limitations | **Industrial Readiness**: Not established  
**Intended Use**: Research, education and exploratory engineering analysis only.  
**Disclaimer**: Do not use for commercial plant sizing, procurement, or safety-critical relief design.

---

**Chemical System**: Industrial Haber-Bosch Ammonia Synthesis ($0.5\\,\\text{N}_2 + 1.5\\,\\text{H}_2 \\rightleftharpoons \\text{NH}_3$)
**Thermophysical Source**: NIST Reference Thermophysics (SRD 69) & Peng-Robinson Real-Gas EOS
**Consortium Guideline**: Eurokin Intrinsic Kinetics Protocol (Screening Assessment)
**Overall Evaluation Status**: ${overallStatus} (${passedCount}/${totalCount} Criteria Satisfied)
**Reactor Suggestion**: ${reactorSuitability.recommendedType}

---

## 1. Operating & Reaction Parameters (Audited NIST Data)
- **Bulk Gas Feed Type**: ${inputs.bulkGasType}
- **Bed Temperature**: ${inputs.temperature.toFixed(2)} K (${(inputs.temperature - 273.15).toFixed(2)} °C)
- **Total Operating Pressure**: ${inputs.totalPressure.toExponential(3)} Pa (${(inputs.totalPressure / 1e5).toFixed(2)} bar)
- **Feed Mass Flow Rate**: ${(inputs.feedFlow * 1e6).toFixed(2)} mg/s
- **Reactant Fractional Conversion (X_A)**: ${(inputs.conversion * 100).toFixed(2)}%
- **Reactant Mole Fraction (y_A)**: ${(inputs.reactantMoleFraction * 100).toFixed(2)} mol%
- **Gas Mean Molar Mass**: ${(inputs.gasMolecularWeight * 1000).toFixed(3)} g/mol
- **Gas Viscosity**: ${(inputs.gasViscosity * 1e6).toFixed(2)} µPa·s
- **Gas Heat Capacity**: ${inputs.gasHeatCapacity.toFixed(1)} J/(kg·K)
- **Gas Thermal Conductivity**: ${inputs.gasConductivity.toFixed(4)} W/(m·K)
- **Reaction Enthalpy (|Δ_r H|)**: ${(inputs.reactionEnthalpy / 1000).toFixed(2)} kJ/mol

## 2. Reactor Bed Geometry & Catalyst Dilution
- **Bed Length**: ${(inputs.bedHeight * 1000).toFixed(1)} mm
- **Tube Inner Diameter**: ${(inputs.tubeDiameter * 1000).toFixed(1)} mm
- **Catalyst Pellet Diameter**: ${(inputs.particleDiameter * 1e6).toFixed(0)} µm
- **Bed Porosity (ε_b)**: ${(inputs.bedPorosity * 100).toFixed(1)}%
- **Catalyst Mass**: ${(inputs.catalystMass * 1e6).toFixed(1)} mg
- **Inert Diluent (SiC) Mass**: ${(inputs.inertMass * 1e6).toFixed(1)} mg
- **Volumetric Dilution Ratio (b)**: ${(transport.volumetricDilutionFraction * 100).toFixed(1)}%

## 3. Diagnostic Criteria Assessment Matrix (9 Core + Custom)
${criteria
  .map(
    (c, idx) =>
      `${idx + 1}. **${c.name}** [${c.category}]
   - Status: ${c.passed ? 'PASSED' : 'VIOLATED'}
   - Value: ${c.calculatedValue.toExponential(3)} ${c.unit} (Limit: ${c.operator} ${c.limitValue.toExponential(3)} ${c.unit})
   - Margin: ${c.marginPercent > 0 ? `+${c.marginPercent.toFixed(1)}%` : `${c.marginPercent.toFixed(1)}%`}
   - Formula: ${c.formulaLatex}
   - Reference: ${c.reference}`
  )
  .join('\n\n')}

## 4. Reactor Architecture & Suitability Decision
- **Recommended Architecture**: ${reactorSuitability.recommendedType}
- **Secondary Configuration**: ${reactorSuitability.secondaryOption}
- **Suitability Verdict**: ${reactorSuitability.overallFeasibility}
- **Summary**: ${reactorSuitability.summaryHeadline}

### Actionable Remediation Steps:
${reactorSuitability.actionableEngineeringSteps.map((step) => `- ${step}`).join('\n')}
`.trim();

  const handleCopy = () => {
    const textToCopy = exportFormat === 'markdown' ? markdownReport : JSON.stringify(simulation, null, 2);
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const content = exportFormat === 'markdown' ? markdownReport : JSON.stringify(simulation, null, 2);
    const filename = `simcat_ammonia_audit_${Date.now()}.${exportFormat === 'markdown' ? 'md' : 'json'}`;
    const blob = new Blob([content], { type: exportFormat === 'markdown' ? 'text/markdown' : 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-50 rounded-lg/80 backdrop-blur-xs flex items-center justify-center p-4 select-none">
      <div className="bg-white rounded-xl shadow-xs border border-slate-200/80 shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-slate-50 rounded-lg border-b border-slate-200/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-blue-600" />
            <h3 className="font-bold text-xs font-mono uppercase tracking-wider text-slate-900">
              Eurokin Diagnostic Audit Report & Export
            </h3>
          </div>

          <div className="flex items-center gap-2">
            {/* Format toggle */}
            <div className="flex bg-slate-50 border border-slate-300 text-xs font-mono">
              <button
                onClick={() => setExportFormat('markdown')}
                className={`px-3 py-1 transition-colors ${
                  exportFormat === 'markdown' ? 'bg-blue-600 text-white font-bold' : 'text-slate-500'
                }`}
              >
                Markdown
              </button>
              <button
                onClick={() => setExportFormat('json')}
                className={`px-3 py-1 transition-colors ${
                  exportFormat === 'json' ? 'bg-blue-600 text-white font-bold' : 'text-slate-500'
                }`}
              >
                JSON
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 border border-transparent hover:border-slate-300"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 flex-1 overflow-y-auto font-mono text-xs text-slate-700 bg-slate-50">
          <pre className="p-4 bg-white rounded-xl shadow-xs border border-slate-200/80 whitespace-pre-wrap select-all font-mono leading-relaxed text-slate-700">
            {exportFormat === 'markdown' ? markdownReport : JSON.stringify(simulation, null, 2)}
          </pre>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 rounded-lg border-t border-slate-200/80 flex items-center justify-between">
          <span className="text-[10px] font-mono text-slate-500">
            NIST SRD 69 & Eurokin Compliant Format
          </span>

          <div className="flex items-center gap-2 font-mono text-xs">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-[#1A202A] text-slate-700 border border-slate-300 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[#10B981]" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy to Clipboard'}</span>
            </button>

            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-[#38BDF8] text-white font-bold border border-blue-600 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Report</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
