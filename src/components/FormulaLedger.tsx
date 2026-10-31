import React, { useState } from 'react';
import { SimulationResult } from '../types/eurokin';
import { MathView } from './MathView';
import { BookOpen, Search, Copy, Check, Filter } from 'lucide-react';

interface FormulaLedgerProps {
  simulation: SimulationResult;
}

interface FormulaEntry {
  id: string;
  category: 'Hydrodynamics' | 'Mass Transfer' | 'Heat Transfer' | 'Diffusivity' | 'Kinetics';
  title: string;
  source: string;
  description: string;
  latexFormula: string;
  liveSubstitution: string;
  variableDefinitions: Array<{ symbol: string; meaning: string; unit: string }>;
}

export const FormulaLedger: React.FC<FormulaLedgerProps> = ({ simulation }) => {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { inputs, hydrodynamics, transport } = simulation;

  const copyLatex = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formulas: FormulaEntry[] = [
    {
      id: 'ergun',
      category: 'Hydrodynamics',
      title: 'Ergun Bed Pressure Drop & Modified Friction Factor',
      source: 'Ergun S. (1952), Chem. Eng. Progr. 48, 89-92',
      description: 'Calculates the hydrodynamic pressure drop across packed beds of spheres or irregular granules, combining laminar viscous drag and turbulent kinetic losses.',
      latexFormula: String.raw`\frac{\Delta P}{h_{\text{bed}}} = \frac{f_m \, \rho_G \, u_0^2}{d_p}, \quad f_m = \left(\frac{1 - \varepsilon_b}{\varepsilon_b^3}\right)\left[1.75 + 150 \frac{1 - \varepsilon_b}{Re}\right]`,
      liveSubstitution: String.raw`\frac{\Delta P}{${inputs.bedHeight}} = \frac{${hydrodynamics.ergunFrictionFactor.toFixed(2)} \cdot ${hydrodynamics.gasDensity.toFixed(3)} \cdot (${hydrodynamics.superficialVelocity.toFixed(3)})^2}{${inputs.particleDiameter}} \implies \Delta P = ${(simulation.criteria.find(c => c.id === 'pressure_drop')?.calculatedValue || 0).toFixed(1)} \, \text{Pa}`,
      variableDefinitions: [
        { symbol: 'f_m', meaning: 'Modified Ergun friction factor', unit: '[-]' },
        { symbol: 'u_0', meaning: 'Superficial gas velocity', unit: 'm/s' },
        { symbol: 'Re', meaning: 'Pellet Reynolds number = (d_p * rho_G * u_0) / mu_G', unit: '[-]' },
        { symbol: '\\varepsilon_b', meaning: 'Bed porosity / void fraction', unit: '[-]' }
      ]
    },
    {
      id: 'axial_mears',
      category: 'Hydrodynamics',
      title: 'Axial Dispersion & Plug Flow Criterion',
      source: 'Mears D.E. (1971), Gierman H. (1988), Wakao et al. (1979)',
      description: 'Limits the degree of axial backmixing to prevent deviation from ideal plug flow (< 5% rate perturbation). Evaluates Bodenstein number via Wakao correlation.',
      latexFormula: String.raw`\frac{h_{\text{bed}}}{d_p} > \frac{8}{Bo} \, n \ln\left(\frac{1}{1 - X_A}\right), \quad \frac{1}{Bo} = \frac{\varepsilon_b}{\tau_b \, Re \, Sc} + 0.5`,
      liveSubstitution: String.raw`\frac{${inputs.bedHeight}}{${inputs.particleDiameter}} = ${(inputs.bedHeight / inputs.particleDiameter).toFixed(1)} > \frac{8}{${hydrodynamics.bodensteinNumber.toFixed(2)}} \cdot ${inputs.reactionOrder} \cdot \ln\left(\frac{1}{1 - ${inputs.conversion}}\right) = ${(simulation.criteria.find(c => c.id === 'axial_dispersion')?.limitValue || 0).toFixed(2)}`,
      variableDefinitions: [
        { symbol: 'Bo', meaning: 'Particle Bodenstein number (axial Peclet number Pe_p)', unit: '[-]' },
        { symbol: '\\tau_b', meaning: 'Bed tortuosity = 1 / sqrt(eps_b)', unit: '[-]' },
        { symbol: 'Sc', meaning: 'Schmidt number = mu_G / (rho_G * D_mol)', unit: '[-]' },
        { symbol: 'X_A', meaning: 'Fractional conversion of key reactant', unit: '[-]' }
      ]
    },
    {
      id: 'carberry',
      category: 'Mass Transfer',
      title: 'External Gas-Film Mass Transfer (Carberry Criterion)',
      source: 'Mears D.E. (1971), Wakao et al. (1979)',
      description: 'Assesses whether concentration gradient across the laminar gas boundary layer surrounding catalyst pellets suppresses intrinsic kinetics.',
      latexFormula: String.raw`Ca = \frac{R_{v,A}^{\text{obs}}}{k_g \, a_v \, C_{A,b}} < \frac{0.05}{n}, \quad Sh = 2.0 + 1.1 \, Re^{0.6} \, Sc^{1/3}`,
      liveSubstitution: String.raw`Ca = \frac{${transport.observedVolumetricRate.toFixed(2)}}{${transport.externalMassTransferCoeff.toFixed(4)} \cdot ${(6.0 / inputs.particleDiameter).toFixed(0)} \cdot ${transport.bulkConcentration.toFixed(3)}} = ${(simulation.criteria.find(c => c.id === 'external_mass_transfer')?.calculatedValue || 0).toFixed(4)} < ${(0.05 / inputs.reactionOrder).toFixed(3)}`,
      variableDefinitions: [
        { symbol: 'Ca', meaning: 'Carberry number (relative concentration drop)', unit: '[-]' },
        { symbol: 'k_g', meaning: 'External mass transfer coefficient = (Sh * D_mol) / d_p', unit: 'm/s' },
        { symbol: 'a_v', meaning: 'Specific external surface area = 6 / d_p', unit: 'm²/m³_pellet' },
        { symbol: 'C_{A,b}', meaning: 'Bulk gas reactant concentration = (y_A * P) / (R * T)', unit: 'mol/m³' }
      ]
    },
    {
      id: 'weisz_prater',
      category: 'Mass Transfer',
      title: 'Internal Pore Diffusion (Weisz-Prater Modulus & Effectiveness)',
      source: 'Froment & Bischoff (1990), Anderson & Pratt (1985)',
      description: 'Estimates internal pore diffusion resistance without requiring a priori knowledge of the intrinsic rate constant. Evaluates internal effectiveness factor η.',
      latexFormula: String.raw`\Phi = \frac{n + 1}{2} \frac{R_{v,A}^{\text{obs}} (d_p / 6)^2}{D_{A,\text{eff}} \, C_{A,s}} < 0.08, \quad \eta = \frac{1}{\phi}\left[\frac{1}{\tanh(3\phi)} - \frac{1}{3\phi}\right]`,
      liveSubstitution: String.raw`\Phi = \frac{${inputs.reactionOrder} + 1}{2} \cdot \frac{${transport.observedVolumetricRate.toFixed(2)} \cdot (${(inputs.particleDiameter / 6).toFixed(5)})^2}{${inputs.effectiveDiffusivity} \cdot ${transport.bulkConcentration.toFixed(3)}} = ${(simulation.criteria.find(c => c.id === 'internal_diffusion')?.calculatedValue || 0).toFixed(4)} < 0.080`,
      variableDefinitions: [
        { symbol: '\\Phi', meaning: 'Weisz-Prater modulus', unit: '[-]' },
        { symbol: '\\phi', meaning: 'Thiele modulus ≈ sqrt(Phi)', unit: '[-]' },
        { symbol: '\\eta', meaning: 'Internal pellet effectiveness factor', unit: '[-]' },
        { symbol: 'D_{A,eff}', meaning: 'Effective intraparticle diffusivity', unit: 'm²/s' }
      ]
    },
    {
      id: 'mears_film_heat',
      category: 'Heat Transfer',
      title: 'External Film Heat Transfer Limitation',
      source: 'Mears D.E. (1971), J. Catal. 20, 127-131',
      description: 'Ensures temperature jump across the fluid boundary layer surrounding catalyst particles does not induce an apparent activation energy shift of > 5%.',
      latexFormula: String.raw`\Delta T_{\text{film}} = \frac{R_{v,A}^{\text{obs}} |\Delta_r H| \, d_p}{6 \, \alpha_p} < \frac{0.05 \, R \, T_G^2}{E_a}, \quad Nu = 2.0 + 1.1 \, Re^{0.6} \, Pr^{1/3}`,
      liveSubstitution: String.raw`\Delta T_{\text{film}} = \frac{${transport.observedVolumetricRate.toFixed(2)} \cdot ${inputs.reactionEnthalpy} \cdot ${inputs.particleDiameter}}{6 \cdot ${transport.particleHeatTransferCoeff.toFixed(2)}} = ${(simulation.criteria.find(c => c.id === 'external_heat_transfer')?.calculatedValue || 0).toFixed(4)} \, \text{K} < ${(simulation.criteria.find(c => c.id === 'external_heat_transfer')?.limitValue || 0).toFixed(3)} \, \text{K}`,
      variableDefinitions: [
        { symbol: '\\Delta T_{\\text{film}}', meaning: 'Gas-film temperature drop', unit: 'K' },
        { symbol: '\\alpha_p', meaning: 'Pellet-to-gas heat transfer coefficient', unit: 'W/(m²·K)' },
        { symbol: 'Nu', meaning: 'Nusselt number', unit: '[-]' },
        { symbol: 'E_a', meaning: 'Apparent activation energy', unit: 'J/mol' }
      ]
    },
    {
      id: 'mears_radial_heat',
      category: 'Heat Transfer',
      title: 'Radial Bed Heat Transfer (Specchia Correlation)',
      source: 'Mears D.E. (1971), Specchia V. et al. (1980)',
      description: 'Governs radial heat dissipation from the bed centerline to the reactor tube wall, utilizing effective radial thermal conductivity λ_er.',
      latexFormula: String.raw`\Delta T_{\text{rad}} = \frac{R_{v,A}^{\text{obs}} |\Delta_r H| (1 - \varepsilon_b)(1 - b) d_t^2}{32 \, \lambda_{\text{er}}} < \frac{0.05 \, R \, T_w^2}{E_a}`,
      liveSubstitution: String.raw`\Delta T_{\text{rad}} = \frac{${transport.observedVolumetricRate.toFixed(2)} \cdot ${inputs.reactionEnthalpy} \cdot (1 - ${inputs.bedPorosity}) \cdot (1 - ${transport.volumetricDilutionFraction.toFixed(2)}) \cdot (${inputs.tubeDiameter})^2}{32 \cdot ${transport.radialThermalConductivity.toFixed(3)}} = ${(simulation.criteria.find(c => c.id === 'radial_heat_transfer')?.calculatedValue || 0).toFixed(4)} \, \text{K}`,
      variableDefinitions: [
        { symbol: '\\Delta T_{\\text{rad}}', meaning: 'Bed radial temperature gradient', unit: 'K' },
        { symbol: 'b', meaning: 'Volumetric inert dilution fraction', unit: '[-]' },
        { symbol: '\\lambda_{\\text{er}}', meaning: 'Effective radial thermal conductivity', unit: 'W/(m·K)' },
        { symbol: 'd_t', meaning: 'Reactor tube internal diameter', unit: 'm' }
      ]
    },
    {
      id: 'berger_dilution',
      category: 'Hydrodynamics',
      title: 'Inert Bed Dilution Criterion (Bed Homogeneity)',
      source: 'Berger R.J., Pérez-Ramírez J. et al. (2002), Chem. Eng. Sci. 57, 4921-4932',
      description: 'Prevents catalytic activity maldistribution and gas channeling caused by excessive dilution with inert material.',
      latexFormula: String.raw`\Delta = \left(\frac{b}{1 - b}\right) \frac{X_{\text{dil}} \, d_p}{2 \, h_{\text{bed}}} < 0.05, \quad b = \frac{W_{\text{dil}} / \rho_{\text{dil}}}{W_{\text{cat}} / \rho_{\text{cat}} + W_{\text{dil}} / \rho_{\text{dil}}}`,
      liveSubstitution: String.raw`\Delta = \left(\frac{${transport.volumetricDilutionFraction.toFixed(3)}}{1 - ${transport.volumetricDilutionFraction.toFixed(3)}}\right) \frac{${inputs.dilutedConversion} \cdot ${inputs.particleDiameter}}{2 \cdot ${inputs.bedHeight}} = ${(simulation.criteria.find(c => c.id === 'inert_dilution')?.calculatedValue || 0).toFixed(4)} < 0.050`,
      variableDefinitions: [
        { symbol: 'b', meaning: 'Volume fraction of inert particles in solid bed', unit: '[-]' },
        { symbol: '\\Delta', meaning: 'Relative conversion deviation from homogeneous bed', unit: '[-]' },
        { symbol: 'X_{dil}', meaning: 'Conversion achieved with diluted bed', unit: '[-]' }
      ]
    },
    {
      id: 'knudsen_pore',
      category: 'Diffusivity',
      title: 'Knudsen Pore Diffusivity & Bosanquet Equation',
      source: 'Satterfield C.N. (1970), Mass Transfer in Heterogeneous Catalysis',
      description: 'Accounts for molecular wall collisions inside narrow catalyst pores (pore radius r < 10 nm) combined with bulk molecular diffusion.',
      latexFormula: String.raw`D_{A,K} = \frac{2}{3} \bar{r} \sqrt{\frac{8 R T}{\pi M_A}}, \quad \bar{r} = \frac{2 \varepsilon_p}{\rho_p \, S_{\text{BET}}}, \quad \frac{1}{D_{A,\text{eff}}} = \frac{\tau_p}{\varepsilon_p}\left[\frac{1}{D_{A,m}} + \frac{1}{D_{A,K}}\right]`,
      liveSubstitution: String.raw`\bar{r} = \frac{2 \cdot ${inputs.pelletPorosity}}{${inputs.catalystDensity} \cdot S_{\text{BET}}}, \quad D_{A,K} = \frac{2}{3} \bar{r} \sqrt{\frac{8 \cdot 8.314 \cdot ${inputs.temperature}}{\pi \cdot ${inputs.gasMolecularWeight}}}`,
      variableDefinitions: [
        { symbol: 'D_{A,K}', meaning: 'Knudsen diffusivity in pore', unit: 'm²/s' },
        { symbol: '\\bar{r}', meaning: 'Mean cylindrical pore radius', unit: 'm' },
        { symbol: 'S_{BET}', meaning: 'Specific internal surface area', unit: 'm²/kg' },
        { symbol: '\\tau_p', meaning: 'Pore tortuosity factor', unit: '[-]' }
      ]
    }
  ];

  const filtered = formulas.filter((f) => {
    const matchesCat = activeCategory === 'all' || f.category === activeCategory;
    const matchesSearch =
      f.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.source.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="bg-white rounded-xl shadow-xs border border-slate-200/80 p-4 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200/80">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-blue-600" />
          <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-900">
            SIM-CAT Mathematical Framework & Formula Ledger
          </h3>
        </div>

        {/* Search Input */}
        <div className="relative min-w-[260px]">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
          <input
            type="text"
            placeholder="Search formulas, Mears, Ergun, Carberry..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#141922] border border-slate-200/80 pl-8 pr-3 py-1.5 text-xs font-mono text-slate-800 placeholder:text-slate-600 focus:outline-none focus:border-blue-600"
          />
        </div>
      </div>

      {/* Filter Category Chips */}
      <div className="flex flex-wrap gap-1 text-xs font-mono">
        {['all', 'Hydrodynamics', 'Mass Transfer', 'Heat Transfer', 'Diffusivity'].map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1 font-bold uppercase tracking-wider transition-colors ${
              activeCategory === cat
                ? 'bg-[#00D8F6] text-[#080A0D]'
                : 'bg-[#141922] text-slate-500 hover:text-slate-800 border border-slate-200/80'
            }`}
          >
            {cat === 'all' ? 'All Governing Equations' : cat}
          </button>
        ))}
      </div>

      {/* Formula Cards Grid */}
      <div className="grid grid-cols-1 gap-3">
        {filtered.map((item) => (
          <div
            key={item.id}
            className="p-4 bg-[#141922] border border-slate-200/80 space-y-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-mono px-2 py-0.5 bg-blue-50 text-blue-700 text-blue-600 border border-blue-600/30 font-semibold uppercase">
                    {item.category}
                  </span>
                  <span className="text-[11px] font-mono text-slate-500">{item.source}</span>
                </div>
                <h4 className="font-mono text-xs font-bold text-slate-900">{item.title}</h4>
              </div>

              <button
                onClick={() => copyLatex(item.id, item.latexFormula)}
                title="Copy LaTeX formula to clipboard"
                className="flex items-center gap-1 px-2.5 py-1 bg-white rounded-xl shadow-xs hover:bg-[#1E2533] text-slate-700 text-xs font-mono border border-slate-200/80 transition-colors"
              >
                {copiedId === item.id ? (
                  <>
                    <Check className="w-3 h-3 text-[#10B981]" />
                    <span className="text-[#10B981]">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3 text-slate-500" />
                    <span>Copy LaTeX</span>
                  </>
                )}
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed font-sans">{item.description}</p>

            {/* LaTeX Display */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 overflow-x-auto text-blue-600 text-center font-mono">
              <MathView math={item.latexFormula} block={true} />
            </div>

            {/* Live Substitution */}
            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/80 text-xs font-mono">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">
                Live Simulation Substitution:
              </span>
              <div className="overflow-x-auto text-[#F59E0B]">
                <MathView math={item.liveSubstitution} block={true} />
              </div>
            </div>

            {/* Variable Table */}
            <div className="pt-2 border-t border-slate-200/80">
              <div className="text-[10px] uppercase font-mono text-slate-500 mb-1.5">Nomenclature:</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono">
                {item.variableDefinitions.map((v, idx) => (
                  <div key={idx} className="flex items-baseline gap-2 bg-slate-50 rounded-lg p-1.5 border border-slate-200/80">
                    <span className="text-blue-600 font-bold shrink-0">
                      <MathView math={v.symbol} />:
                    </span>
                    <span className="text-slate-700 font-sans">{v.meaning}</span>
                    <span className="text-slate-500 ml-auto shrink-0 font-mono">[{v.unit}]</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
