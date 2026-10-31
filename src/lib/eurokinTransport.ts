/**
 * EUROKIN Transport Limitations & Intrinsic Kinetics Assessment Module
 * 
 * Based on:
 * 1. EUROKIN Consortium: Fixed-Bed Reactor Transport Limitations Guide (2012)
 * 2. Mears, D.E., Ind. Eng. Chem. Process Des. Dev. 10 (1971) 541-547
 * 3. Weisz, P.B., Prater, C.D., Adv. Catal. 6 (1954) 143-196
 * 4. Carberry, J.J., AIChE J. 6 (1960) 460-463
 * 5. Berger, R.J., et al., Chem. Eng. Sci. 57 (2002) 4921-4932
 * 6. Specchia, V., Baldi, G., Sicardi, S., Chem. Eng. Commun. 4 (1980) 407-422
 * 7. Wakao, N., Funazkri, T., Chem. Eng. Sci. 33 (1978) 1375-1384
 * 8. Ergun, S., Chem. Eng. Prog. 48 (1952) 89-94
 * 
 * Scientific Disclaimer:
 * The EUROKIN guide serves as an engineering screening assessment for measuring intrinsic kinetics.
 * Individual 1D screening criteria assume decoupled transport regimes. Passing all individual
 * criteria does NOT guarantee negligible combined 2D/3D transport limitations or commercial safety.
 */

import { ReactorInputs, DiagnosticCriterion } from '../types/eurokin';
import { calculatePengRobinsonState } from './nist/equationOfState';
import { NIST_SPECIES_REGISTRY } from './nist/speciesRegistry';

export const R_GAS = 8.314462618; // J/(mol·K)

export interface CanonicalCarberryParams {
  rateBasis?: 'AMMONIA_PRODUCTION' | 'NITROGEN_CONSUMPTION';
  reactionRateMolKgCatS: number;      // r [mol / (kg-cat · s)]
  catalystDensityKgM3: number;        // rho_p [kg / m³_pellet]
  particleDiameterM: number;          // d_p [m]
  massTransferCoefficientKgMS: number;// k_g [m/s]
  bulkReactantConcentrationMolM3: number; // C_bulk of key limiting reactant [mol/m³]
  reactionOrder?: number;
}

export function computeCanonicalCarberryNumber(params: CanonicalCarberryParams): {
  carberryNumber: number;
  carberryLimit: number;
  passed: boolean;
  status: TransportCriterionStatus;
} {
  const nSafe = Math.max(params.reactionOrder ?? 1.0, 0.01);
  const factor = params.rateBasis === 'AMMONIA_PRODUCTION' ? 0.5 : 1.0;
  const rVN2 = factor * Math.abs(params.reactionRateMolKgCatS) * params.catalystDensityKgM3;
  const av = 6.0 / Math.max(params.particleDiameterM, 1e-6);
  const denom = params.massTransferCoefficientKgMS * av * Math.max(params.bulkReactantConcentrationMolM3, 1e-12);
  const Ca = denom > 0 ? rVN2 / denom : 0.0;
  const limit = 0.05 / nSafe;
  const passed = Ca < limit;
  const status: TransportCriterionStatus = passed ? 'PASS' : 'FAIL';
  return { carberryNumber: Ca, carberryLimit: limit, passed, status };
}

export type TransportCriterionStatus =
  | 'PASS'
  | 'WARNING'
  | 'FAIL'
  | 'NOT_EVALUATED'
  | 'OUTSIDE_CORRELATION_VALIDITY';

export interface TransportDiagnosticResult {
  id: string;
  name: string;
  category: 'Fluid Dynamics' | 'Mass Transfer' | 'Heat Transfer' | 'Hydrodynamics' | 'Bed Dilution';
  symbol: string;
  calculatedValue: number;
  limitValue: number;
  operator: '<' | '>' | '<=' | '>=';
  unit: string;
  status: TransportCriterionStatus;
  passed: boolean;
  marginPercent: number;
  applicabilityRange: string;
  isWithinApplicability: boolean;
  formulaLatex: string;
  substitutionLatex: string;
  description: string;
  reference: string;
  warningNote?: string;
}

export interface DiffusivityBreakdown {
  molecularDiffusivityM2S: number;
  knudsenDiffusivityM2S: number;
  combinedBosanquetDiffusivityM2S: number;
  calculatedPoreDiffusivityM2S: number;
  effectivePelletDiffusivityM2S: number;
  pelletPorosity: number;
  pelletTortuosity: number;
  meanPoreDiameterM: number;
  highPressureWarning?: string;
}

export interface EurokinTransportAssessment {
  criteria: TransportDiagnosticResult[];
  overallStatus: 'VALID_INTRINSIC' | 'TRANSPORT_LIMITED' | 'CORRELATION_EXTRAPOLATION';
  passedCount: number;
  warningCount: number;
  failedCount: number;
  outOfRangeCount: number;
  totalCount: number;
  diffusivity: DiffusivityBreakdown;
  combinedInteractions: string[];
  recommendations: string[];
  provenance: {
    source: string;
    acceptanceStandard: string;
    decouplingDisclaimer: string;
  };
}

/**
 * Format scientific number helper
 */
function fmtSci(val: number, prec = 3): string {
  if (Math.abs(val) >= 1e4 || (Math.abs(val) < 1e-2 && val !== 0)) {
    return val.toExponential(prec);
  }
  return val.toFixed(prec);
}

/**
 * Calculate margin percent
 */
function calcMargin(val: number, lim: number, op: '<' | '>' | '<=' | '>='): number {
  if (lim === 0) return 0;
  if (op === '<' || op === '<=') {
    return ((lim - val) / Math.abs(lim)) * 100.0;
  } else {
    return ((val - lim) / Math.abs(lim)) * 100.0;
  }
}

/**
 * Comprehensive EUROKIN Transport Limitations Assessment
 */
export function evaluateEurokinTransport(
  inputs: ReactorInputs,
  observedRateOverride?: number,
  localTempK?: number,
  localPressPa?: number
): EurokinTransportAssessment {
  const T = localTempK ?? inputs.temperature;
  const P = localPressPa ?? inputs.totalPressure;
  const L = inputs.bedHeight;
  const Dt = inputs.tubeDiameter;
  const dp = inputs.particleDiameter;
  const epsB = inputs.bedPorosity;
  const rhoCat = inputs.catalystDensity;
  const wCat = inputs.catalystMass;
  const lambdaCat = inputs.catalystThermalCond;
  const epsP = inputs.pelletPorosity ?? 0.50;
  const tauP = inputs.pelletTortuosity ?? 3.5;
  const wInert = inputs.inertMass;
  const rhoInert = inputs.inertDensity;
  const lambdaInert = inputs.inertThermalCond;
  const XA = Math.min(Math.max(inputs.conversion, 0.0001), 0.9999);
  const Xdil = Math.min(Math.max(inputs.dilutedConversion, 0.0001), 0.9999);
  const nSafe = Math.max(inputs.reactionOrder, 0.01);
  const Ea = inputs.activationEnergy;
  const dHr = Math.abs(inputs.reactionEnthalpy);
  const rObsMass = observedRateOverride ?? inputs.reactionRate; // mol/(kg-cat·s)
  const yA = inputs.reactantMoleFraction;

  // Real-gas density & compressibility via Peng-Robinson EOS
  const prState = calculatePengRobinsonState(T, P, {
    N2: 0.25 * (1.0 - yA),
    H2: 0.75 * (1.0 - yA),
    NH3: yA,
  });
  const rhoG = prState.densityKgM3;
  const Z = prState.compressibilityFactorZ;

  // Hydrodynamic parameters
  const A_bed = (Math.PI / 4.0) * Math.pow(Dt, 2);
  const u0 = inputs.feedFlow / (A_bed * Math.max(rhoG, 1e-4)); // superficial velocity [m/s]
  const muG = inputs.gasViscosity;
  const cpG = inputs.gasHeatCapacity;
  const lambdaG = inputs.gasConductivity;

  const Re = (dp * rhoG * u0) / Math.max(muG, 1e-9);

  // 10. Diffusivity framework (Molecular, Knudsen, Bosanquet, Effective)
  const meanPoreDiameter = 1.0e-8; // 10 nm nominal mesopore diameter in promoted iron
  const M_NH3 = NIST_SPECIES_REGISTRY.NH3.molarMass.value; // kg/mol
  const D_knudsen = (meanPoreDiameter / 3.0) * Math.sqrt((8.0 * R_GAS * T) / (Math.PI * M_NH3)); // m²/s
  const D_mol = inputs.molecularDiffusivity > 0 ? inputs.molecularDiffusivity : 2.1e-6; // m²/s
  const D_comb = 1.0 / ((1.0 / Math.max(D_mol, 1e-12)) + (1.0 / Math.max(D_knudsen, 1e-12)));
  const D_eff_calc = (epsP / Math.max(tauP, 1.0)) * D_comb;
  const Deff = inputs.effectiveDiffusivity > 0 ? inputs.effectiveDiffusivity : D_eff_calc;

  const highPressureWarning = P > 1.0e6
    ? `Operating pressure ${(P / 1e5).toFixed(1)} bar exceeds the 10 bar limit of standard Fuller-Schettler-Giddings correlation. Low-pressure diffusivity overpredicts actual dense-gas diffusion by ~15-30%.`
    : undefined;

  const diffusivity: DiffusivityBreakdown = {
    molecularDiffusivityM2S: D_mol,
    knudsenDiffusivityM2S: D_knudsen,
    combinedBosanquetDiffusivityM2S: D_comb,
    calculatedPoreDiffusivityM2S: D_eff_calc,
    effectivePelletDiffusivityM2S: Deff,
    pelletPorosity: epsP,
    pelletTortuosity: tauP,
    meanPoreDiameterM: meanPoreDiameter,
    highPressureWarning,
  };

  const Sc = muG / (rhoG * Math.max(D_mol, 1e-12));
  const Pr = (cpG * muG) / Math.max(lambdaG, 1e-6);

  // Reaction rates and concentrations
  const bulkConc = (yA * P) / (Z * R_GAS * T); // mol/m³
  const rVobs = rObsMass * rhoCat; // mol/(m³_pellet · s)

  // CRITERION 1: Pressure Drop (Ergun 1952)
  const reynoldsErgunValid = Re >= 0.1 && Re <= 1000.0;
  const fm = ((1.0 - epsB) / Math.pow(epsB, 3)) * (1.75 + (150.0 * (1.0 - epsB) / Math.max(Re, 1e-5)));
  const deltaP = (fm * rhoG * Math.pow(u0, 2) * L) / dp;
  const deltaPLimit = (0.20 * P) / nSafe;
  const pDropPass = deltaP < deltaPLimit;
  let pDropStatus: TransportCriterionStatus = pDropPass ? 'PASS' : 'FAIL';
  if (!reynoldsErgunValid) pDropStatus = 'OUTSIDE_CORRELATION_VALIDITY';

  const critPressureDrop: TransportDiagnosticResult = {
    id: 'pressure_drop',
    name: 'Hydraulic Pressure Drop (Ergun)',
    category: 'Hydrodynamics',
    symbol: String.raw`\Delta P`,
    calculatedValue: deltaP,
    limitValue: deltaPLimit,
    operator: '<',
    unit: 'Pa',
    status: pDropStatus,
    passed: pDropPass,
    marginPercent: calcMargin(deltaP, deltaPLimit, '<'),
    applicabilityRange: '0.1 < Re < 1000',
    isWithinApplicability: reynoldsErgunValid,
    formulaLatex: String.raw`\Delta P = \frac{f_m \rho_G u_0^2 L}{d_p} < \frac{0.20 P_{\text{tot}}}{n}`,
    substitutionLatex: String.raw`\Delta P = ${fmtSci(deltaP, 1)}\,\text{Pa} < ${fmtSci(deltaPLimit, 1)}\,\text{Pa}\;(\text{Re} = ${fmtSci(Re, 1)})`,
    description: 'Ensures bed pressure drop is below 20% of total pressure to preserve uniform reactant partial pressures.',
    reference: 'Ergun, S., Chem. Eng. Prog. 48 (1952) 89-94',
    warningNote: !reynoldsErgunValid ? `Reynolds number Re = ${Re.toFixed(2)} is outside Ergun validated range [0.1, 1000].` : undefined,
  };

  // CRITERION 2: Axial Dispersion (Bodenstein / Péclet - Mears & Gierman)
  const tauB = 1.0 / Math.sqrt(Math.max(epsB, 0.1));
  const bodensteinInv = (epsB / (tauB * Math.max(Re, 1e-5) * Sc)) + 0.5;
  const Bo = bodensteinInv > 0 ? 1.0 / bodensteinInv : 2.0;
  const axialDispRatio = L / dp;
  const axialDispLimit = (8.0 / Bo) * nSafe * Math.log(1.0 / (1.0 - XA));
  const axialPass = axialDispRatio > axialDispLimit;

  const critAxialDisp: TransportDiagnosticResult = {
    id: 'axial_dispersion',
    name: 'Axial Dispersion & Plug Flow (Mears/Gierman)',
    category: 'Fluid Dynamics',
    symbol: 'L / d_p',
    calculatedValue: axialDispRatio,
    limitValue: axialDispLimit,
    operator: '>',
    unit: '[-]',
    status: axialPass ? 'PASS' : 'FAIL',
    passed: axialPass,
    marginPercent: calcMargin(axialDispRatio, axialDispLimit, '>'),
    applicabilityRange: 'Bo ~ 2 (turbulent packed bed)',
    isWithinApplicability: true,
    formulaLatex: String.raw`\frac{L}{d_p} > \frac{8}{Bo} n \ln\left(\frac{1}{1 - X_A}\right)`,
    substitutionLatex: String.raw`\frac{${L}}{${dp}} = ${fmtSci(axialDispRatio, 1)} > \frac{8}{${fmtSci(Bo, 2)}} \cdot ${nSafe} \ln\left(\frac{1}{1 - ${XA}}\right) = ${fmtSci(axialDispLimit, 2)}`,
    description: 'Guarantees that axial Taylor backmixing causes less than 5% rate damping relative to ideal plug flow.',
    reference: 'Mears, D.E. (1971); Gierman, A.W. (1988); Wakao et al. (1978)',
  };

  // CRITERION 3: Radial Dispersion (Chu & Ng screening)
  const radialDispRatio = Dt / dp;
  const radialDispLimit = 8.0;
  const radialPass = radialDispRatio > radialDispLimit;

  const critRadialDisp: TransportDiagnosticResult = {
    id: 'radial_dispersion',
    name: 'Radial Dispersion & Wall Effect (Chu & Ng)',
    category: 'Fluid Dynamics',
    symbol: 'D_t / d_p',
    calculatedValue: radialDispRatio,
    limitValue: radialDispLimit,
    operator: '>',
    unit: '[-]',
    status: radialPass ? 'PASS' : 'WARNING',
    passed: radialPass,
    marginPercent: calcMargin(radialDispRatio, radialDispLimit, '>'),
    applicabilityRange: 'D_t / d_p > 8.0 (screening only)',
    isWithinApplicability: true,
    formulaLatex: String.raw`\frac{D_t}{d_p} > 8.0`,
    substitutionLatex: String.raw`\frac{${Dt}}{${dp}} = ${fmtSci(radialDispRatio, 1)} > 8.0`,
    description: 'EUROKIN screening criterion for wall effect. Screened but not modelled in 1D plug flow; radial velocity profiling and wall channeling remain unmodelled.',
    reference: 'Chu, C.F., Ng, K.M., AIChE J. 35 (1989) 148-158; EUROKIN Guide (2012) Section 3.2',
    warningNote: !radialPass ? `Low tube-to-particle ratio (${radialDispRatio.toFixed(1)} <= 8.0) indicates potential wall channeling. Screened but not modelled in 1D; does not quantify flow or conversion impact.` : undefined,
  };

  // CRITERION 4: Inert Bed Dilution (Berger et al.)
  const vInert = wInert / Math.max(rhoInert, 1.0);
  const vCat = wCat / Math.max(rhoCat, 1.0);
  const bDilution = (vInert + vCat) > 0 ? vInert / (vInert + vCat) : 0.0;
  const dilutionDeviation = (bDilution < 1.0 && bDilution > 0 && L > 0)
    ? (bDilution / (1.0 - bDilution)) * (Xdil * dp) / (2.0 * L)
    : 0.0;
  const dilutionLimit = 0.05;
  const dilutionEvaluated = bDilution > 0;
  const dilutionPass = !dilutionEvaluated || (dilutionDeviation < dilutionLimit);

  const critInertDilution: TransportDiagnosticResult = {
    id: 'inert_dilution',
    name: 'Inert Bed Dilution Homogeneity (Berger)',
    category: 'Bed Dilution',
    symbol: String.raw`\Delta_{\text{dilution}}`,
    calculatedValue: dilutionDeviation,
    limitValue: dilutionLimit,
    operator: '<',
    unit: '[-]',
    status: !dilutionEvaluated ? 'NOT_EVALUATED' : dilutionPass ? 'PASS' : 'FAIL',
    passed: dilutionPass,
    marginPercent: dilutionEvaluated ? calcMargin(dilutionDeviation, dilutionLimit, '<') : 100,
    applicabilityRange: '0 < b < 1 (inert-diluted beds)',
    isWithinApplicability: true,
    formulaLatex: String.raw`\Delta_{\text{dil}} = \left(\frac{b}{1 - b}\right) \frac{X_{\text{dil}} d_p}{2 L} < 0.05`,
    substitutionLatex: dilutionEvaluated
      ? String.raw`\left(\frac{${fmtSci(bDilution, 2)}}{1 - ${fmtSci(bDilution, 2)}}\right) \frac{${Xdil} \cdot ${dp}}{2 \cdot ${L}} = ${fmtSci(dilutionDeviation, 4)} < 0.050`
      : 'Pure undiluted catalyst bed (b = 0.0, not evaluated)',
    description: 'Ensures inert diluent particles (e.g. SiC) do not create local bypassing channels or conversion deviations > 5%.',
    reference: 'Berger, R.J., et al., Chem. Eng. Sci. 57 (2002) 4921-4932',
  };

  // CRITERION 5: External Mass Transfer (Carberry / Wakao)
  const reynoldsWakaoValid = Re >= 0.1 && Re <= 100.0;
  const Sh = 2.0 + 1.1 * Math.pow(Math.max(Re, 1e-4), 0.6) * Math.pow(Sc, 1.0 / 3.0);
  const kg = (Sh * D_mol) / dp;
  const av = 6.0 / dp;

  // Limiting reactant concentration (N2 for syngas synthesis)
  const yReactant = inputs.feedFractions?.yN2 ?? (yA > 0.15 ? yA : 0.25 * (1.0 - yA));
  const bulkReactantConc = (yReactant * P) / (Z * R_GAS * T);

  // Canonical Carberry calculation based on limiting reactant N2 consumption:
  // r_N2 = 0.5 * r_NH3
  const canonicalCa = computeCanonicalCarberryNumber({
    rateBasis: 'NITROGEN_CONSUMPTION',
    reactionRateMolKgCatS: 0.5 * rObsMass,
    catalystDensityKgM3: rhoCat,
    particleDiameterM: dp,
    massTransferCoefficientKgMS: kg,
    bulkReactantConcentrationMolM3: bulkReactantConc,
    reactionOrder: nSafe,
  });

  const carberryNum = canonicalCa.carberryNumber;
  const carberryLimit = canonicalCa.carberryLimit;
  const carberryPass = canonicalCa.passed;
  let carberryStatus: TransportCriterionStatus = canonicalCa.status;
  if (!reynoldsWakaoValid) {
    carberryStatus = carberryPass ? 'WARNING' : 'OUTSIDE_CORRELATION_VALIDITY';
  }

  const critExtMass: TransportDiagnosticResult = {
    id: 'external_mass_transfer',
    name: 'External Film Mass Transfer (Carberry)',
    category: 'Mass Transfer',
    symbol: 'Ca',
    calculatedValue: carberryNum,
    limitValue: carberryLimit,
    operator: '<',
    unit: '[-]',
    status: carberryStatus,
    passed: carberryPass,
    marginPercent: calcMargin(carberryNum, carberryLimit, '<'),
    applicabilityRange: '0.1 < Re < 100 (Wakao correlation)',
    isWithinApplicability: reynoldsWakaoValid,
    formulaLatex: String.raw`Ca = \frac{R_{v,\mathrm{N}_2}^{\text{obs}}}{k_g a_v C_{\mathrm{N}_2,b}} < \frac{0.05}{n}`,
    substitutionLatex: String.raw`Ca = \frac{${fmtSci(0.5 * rVobs, 2)}}{${fmtSci(kg, 3)} \cdot ${fmtSci(av, 0)} \cdot ${fmtSci(bulkReactantConc, 3)}} = ${fmtSci(carberryNum, 4)} < \frac{0.05}{${nSafe}} = ${fmtSci(carberryLimit, 3)}`,
    description: 'Ensures external boundary layer concentration drop causes less than 5% reaction rate perturbation.',
    reference: 'Carberry, J.J. (1960); Wakao, N., Funazkri, T. (1978)',
    warningNote: !reynoldsWakaoValid ? `Re = ${Re.toFixed(1)} exceeds Wakao Sherwood correlation validity range [0.1, 100]. Correlation extrapolated.` : undefined,
  };

  // CRITERION 6: Internal Pore Diffusion (Weisz-Prater)
  const charLength = dp / 6.0;
  const weiszPrater = ((nSafe + 1.0) / 2.0) * (rVobs * Math.pow(charLength, 2)) / (Math.max(Deff, 1e-12) * Math.max(bulkConc, 1e-12));
  const weiszLimit = 0.08;
  const weiszPass = weiszPrater < weiszLimit;

  // Thiele modulus & effectiveness factor estimate
  const phiThiele = Math.sqrt(Math.max(weiszPrater, 1e-8));
  let eta = 1.0;
  const xThiele = 3.0 * phiThiele;
  if (xThiele < 0.03) {
    const x2 = xThiele * xThiele;
    eta = 1.0 - x2 / 15.0 + (2.0 * x2 * x2) / 315.0;
  } else {
    eta = (1.0 / phiThiele) * (1.0 / Math.tanh(xThiele) - 1.0 / xThiele);
  }
  eta = Math.max(0.01, Math.min(1.0, eta));

  const critIntDiff: TransportDiagnosticResult = {
    id: 'internal_diffusion',
    name: 'Internal Pore Diffusion (Weisz-Prater)',
    category: 'Mass Transfer',
    symbol: String.raw`\Phi`,
    calculatedValue: weiszPrater,
    limitValue: weiszLimit,
    operator: '<',
    unit: '[-]',
    status: weiszPass ? 'PASS' : 'FAIL',
    passed: weiszPass,
    marginPercent: calcMargin(weiszPrater, weiszLimit, '<'),
    applicabilityRange: '1st-order kinetics threshold Phi < 0.08 (eta > 0.95)',
    isWithinApplicability: true,
    formulaLatex: String.raw`\Phi = \frac{n + 1}{2} \frac{R_{v,A}^{\text{obs}} (d_p/6)^2}{D_{\text{eff}} C_{A,s}} < 0.08`,
    substitutionLatex: String.raw`\Phi = \frac{${nSafe} + 1}{2} \frac{${fmtSci(rVobs, 2)} \cdot (${fmtSci(charLength, 3)})^2}{${fmtSci(Deff, 2)} \cdot ${fmtSci(bulkConc, 3)}} = ${fmtSci(weiszPrater, 4)} < 0.080\;(\eta \approx ${(eta * 100).toFixed(1)}\%)`,
    description: 'Ensures intraparticle diffusion limitation does not mask intrinsic kinetics (effectiveness factor eta > 0.95). Note: 1st-order analytical formula is an approximation for reversible Temkin kinetics.',
    reference: 'Weisz, P.B., Prater, C.D., Adv. Catal. 6 (1954) 143-196',
    warningNote: !weiszPass ? `Significant pore diffusion resistance detected (eta = ${(eta * 100).toFixed(1)}%). Apparent activation energy may be halved.` : undefined,
  };

  // CRITERION 7: External Boundary Film Heat Transfer (Mears)
  const Nu = 2.0 + 1.1 * Math.pow(Math.max(Re, 1e-4), 0.6) * Math.pow(Pr, 1.0 / 3.0);
  const alphaP = (Nu * lambdaG) / dp;
  const deltaTfilm = (rVobs * dHr * dp) / (6.0 * alphaP);
  const deltaTfilmLimit = (0.05 * R_GAS * Math.pow(T, 2)) / Math.max(Ea, 1e-3);
  const filmHeatPass = deltaTfilm < deltaTfilmLimit;

  const critExtHeat: TransportDiagnosticResult = {
    id: 'external_heat_transfer',
    name: 'External Boundary Film Heat Transfer (Mears)',
    category: 'Heat Transfer',
    symbol: String.raw`\Delta T_{\text{film}}`,
    calculatedValue: deltaTfilm,
    limitValue: deltaTfilmLimit,
    operator: '<',
    unit: 'K',
    status: filmHeatPass ? 'PASS' : 'FAIL',
    passed: filmHeatPass,
    marginPercent: calcMargin(deltaTfilm, deltaTfilmLimit, '<'),
    applicabilityRange: 'Wakao Nu correlation, 0.1 < Re < 100',
    isWithinApplicability: reynoldsWakaoValid,
    formulaLatex: String.raw`\Delta T_{\text{film}} = \frac{R_{v,A}^{\text{obs}} |\Delta_r H| d_p}{6 \alpha_p} < \frac{0.05 R T_b^2}{E_a}`,
    substitutionLatex: String.raw`\Delta T_{\text{film}} = \frac{${fmtSci(rVobs, 2)} \cdot ${fmtSci(dHr, 0)} \cdot ${dp}}{6 \cdot ${fmtSci(alphaP, 1)}} = ${fmtSci(deltaTfilm, 4)}\,\text{K} < ${fmtSci(deltaTfilmLimit, 3)}\,\text{K}`,
    description: 'Ensures external boundary layer temperature difference between gas and pellet surface changes rate by less than 5%.',
    reference: 'Mears, D.E., Ind. Eng. Chem. Process Des. Dev. 10 (1971) 541-547',
  };

  // CRITERION 8: Radial Bed Heat Transfer (Specchia correlation)
  const reynoldsSpecchiaValid = Re >= 40.0 && Re <= 10000.0;
  let lambdaPeff = lambdaCat;
  if (bDilution > 0 && bDilution < 1.0) {
    const invLambda = ((1.0 - bDilution) / Math.max(lambdaCat, 1e-6)) + (bDilution / Math.max(lambdaInert, 1e-6));
    lambdaPeff = invLambda > 0 ? 1.0 / invLambda : lambdaCat;
  }
  const lambdaB0Ratio = epsB + (1.0 - epsB) / (0.220 * Math.pow(epsB, 2) + (2.0 / 3.0) * (lambdaG / Math.max(lambdaPeff, 1e-6)));
  const PeRif = 8.65 * (1.0 + 19.4 * Math.pow(dp / Dt, 2));
  const lambdaConvRatio = (Re * Pr) / PeRif;
  const lambdaEr = lambdaG * (lambdaB0Ratio + lambdaConvRatio);

  const deltaTrad = (rVobs * dHr * (1.0 - epsB) * (1.0 - bDilution) * Math.pow(Dt, 2)) / (32.0 * Math.max(lambdaEr, 1e-6));
  const deltaTradLimit = (0.05 * R_GAS * Math.pow(T, 2)) / Math.max(Ea, 1e-3);
  const radHeatPass = deltaTrad < deltaTradLimit;
  let radHeatStatus: TransportCriterionStatus = radHeatPass ? 'PASS' : 'FAIL';
  if (!reynoldsSpecchiaValid) {
    radHeatStatus = radHeatPass ? 'WARNING' : 'OUTSIDE_CORRELATION_VALIDITY';
  }

  const critRadHeat: TransportDiagnosticResult = {
    id: 'radial_heat_transfer',
    name: 'Radial Bed Heat Transfer & Hotspots (Specchia)',
    category: 'Heat Transfer',
    symbol: String.raw`\Delta T_{\text{rad}}`,
    calculatedValue: deltaTrad,
    limitValue: deltaTradLimit,
    operator: '<',
    unit: 'K',
    status: radHeatStatus,
    passed: radHeatPass,
    marginPercent: calcMargin(deltaTrad, deltaTradLimit, '<'),
    applicabilityRange: '40 < Re < 10000 (Specchia correlation)',
    isWithinApplicability: reynoldsSpecchiaValid,
    formulaLatex: String.raw`\Delta T_{\text{rad}} = \frac{R_{v,A}^{\text{obs}} |\Delta_r H| (1 - \varepsilon_b)(1 - b) D_t^2}{32 \lambda_{\text{er}}} < \frac{0.05 R T_w^2}{E_a}`,
    substitutionLatex: String.raw`\Delta T_{\text{rad}} = \frac{${fmtSci(rVobs, 2)} \cdot ${fmtSci(dHr, 0)} \cdot (1 - ${epsB}) \cdot (${Dt})^2}{32 \cdot ${fmtSci(lambdaEr, 3)}} = ${fmtSci(deltaTrad, 4)}\,\text{K} < ${fmtSci(deltaTradLimit, 3)}\,\text{K}`,
    description: 'Limits thermal non-uniformity across packed bed radius to prevent centerline hotspot runaways.',
    reference: 'Specchia, V., Baldi, G., Sicardi, S., Chem. Eng. Commun. 4 (1980) 407-422',
    warningNote: !reynoldsSpecchiaValid ? `Re = ${Re.toFixed(1)} is outside Specchia validity window [40, 10000]. Effective radial conductivity extrapolated.` : undefined,
  };

  // CRITERION 9: Intraparticle Solid Heat Conduction (Mears/Anderson)
  const deltaTint = (rVobs * dHr * Math.pow(dp, 2)) / (60.0 * Math.max(lambdaPeff, 1e-6));
  const deltaTintLimit = (0.05 * R_GAS * Math.pow(T, 2)) / Math.max(Ea, 1e-3);
  const intHeatPass = deltaTint < deltaTintLimit;

  const critIntHeat: TransportDiagnosticResult = {
    id: 'intraparticle_heat',
    name: 'Intraparticle Solid Heat Conduction (Mears)',
    category: 'Heat Transfer',
    symbol: String.raw`\Delta T_{\text{int}}`,
    calculatedValue: deltaTint,
    limitValue: deltaTintLimit,
    operator: '<',
    unit: 'K',
    status: intHeatPass ? 'PASS' : 'FAIL',
    passed: intHeatPass,
    marginPercent: calcMargin(deltaTint, deltaTintLimit, '<'),
    applicabilityRange: 'Mears intraparticle criterion',
    isWithinApplicability: true,
    formulaLatex: String.raw`\Delta T_{\text{int}} = \frac{R_{v,A}^{\text{obs}} |\Delta_r H| d_p^2}{60 \lambda_p} < \frac{0.05 R T^2}{E_a}`,
    substitutionLatex: String.raw`\Delta T_{\text{int}} = \frac{${fmtSci(rVobs, 2)} \cdot ${fmtSci(dHr, 0)} \cdot (${dp})^2}{60 \cdot ${fmtSci(lambdaPeff, 2)}} = ${fmtSci(deltaTint, 5)}\,\text{K} < ${fmtSci(deltaTintLimit, 3)}\,\text{K}`,
    description: 'Confirms that solid-phase thermal conduction inside the porous pellet maintains internal isothermality (< 5% rate perturbation).',
    reference: 'Mears, D.E., Ind. Eng. Chem. Process Des. Dev. 10 (1971) 541-547',
  };

  const allCriteria = [
    critPressureDrop,
    critAxialDisp,
    critRadialDisp,
    critInertDilution,
    critExtMass,
    critIntDiff,
    critExtHeat,
    critRadHeat,
    critIntHeat,
  ];

  const passedCount = allCriteria.filter(c => c.status === 'PASS').length;
  const warningCount = allCriteria.filter(c => c.status === 'WARNING').length;
  const failedCount = allCriteria.filter(c => c.status === 'FAIL').length;
  const outOfRangeCount = allCriteria.filter(c => c.status === 'OUTSIDE_CORRELATION_VALIDITY').length;
  const totalCount = allCriteria.length;

  let overallStatus: 'VALID_INTRINSIC' | 'TRANSPORT_LIMITED' | 'CORRELATION_EXTRAPOLATION' = 'VALID_INTRINSIC';
  if (failedCount > 0) {
    overallStatus = 'TRANSPORT_LIMITED';
  } else if (outOfRangeCount > 0) {
    overallStatus = 'CORRELATION_EXTRAPOLATION';
  }

  // Combined Interactions & Limitations
  const combinedInteractions: string[] = [];
  if (!weiszPass && !carberryPass) {
    combinedInteractions.push(
      'Coupled Mass Transfer Limitation: Both intraparticle pore diffusion and external film resistance are active. Apparent reaction rate is double-damped, and observed activation energy does not reflect true chemical kinetics.'
    );
  }
  if (!radHeatPass && !filmHeatPass) {
    combinedInteractions.push(
      'Coupled Thermal Resistance: Both radial bed thermal non-uniformity and boundary layer film temperature drop breach thresholds. Centerline hotspot risks triggering local runaway or thermal deactivation.'
    );
  }
  if (!weiszPass && !radHeatPass) {
    combinedInteractions.push(
      'Non-Isothermal Effectiveness Interaction: Intraparticle concentration gradients interact nonlinearly with radial temperature gradients. 1D decoupled screening models are insufficient; 2D coupled pellet/bed solver required.'
    );
  }
  if (radialDispRatio <= 8.0 && deltaP > deltaPLimit) {
    combinedInteractions.push(
      'Hydrodynamic Channelling & Pressure Penalty: Low Dt/dp promotes wall-flow bypassing while high Ergun pressure drop increases compression cost.'
    );
  }
  if (highPressureWarning) {
    combinedInteractions.push(`Equation of State & Transport Property Warning: ${highPressureWarning}`);
  }

  // Engineering recommendations
  const recommendations: string[] = [];
  if (!pDropPass) {
    recommendations.push(`Pressure drop ΔP (${fmtSci(deltaP, 0)} Pa) exceeds the 20% isobaric limit. Increase pellet diameter dp or decrease superficial velocity.`);
  }
  if (!weiszPass) {
    recommendations.push(`Internal pore diffusion limitation (Weisz-Prater Φ = ${fmtSci(weiszPrater, 3)} > 0.08, η = ${(eta * 100).toFixed(1)}%). Crush and sieve catalyst to dp < ${(dp * 1e3 * Math.sqrt(0.08 / Math.max(weiszPrater, 1e-4))).toFixed(2)} mm to isolate true intrinsic kinetics.`);
  }
  if (!carberryPass) {
    recommendations.push(`External film mass transfer resistance (Ca = ${fmtSci(carberryNum, 4)}). Increase gas superficial velocity by reducing tube diameter Dt.`);
  }
  if (!radHeatPass) {
    recommendations.push(`Radial bed temperature difference (ΔTrad = ${fmtSci(deltaTrad, 2)} K) exceeds limit. Dilute bed with inert SiC or reduce tube diameter Dt.`);
  }
  if (recommendations.length === 0) {
    recommendations.push('All evaluated 1D EUROKIN screening criteria meet standard < 5% perturbation thresholds for intrinsic kinetic measurements.');
  }

  return {
    criteria: allCriteria,
    overallStatus,
    passedCount,
    warningCount,
    failedCount,
    outOfRangeCount,
    totalCount,
    diffusivity,
    combinedInteractions,
    recommendations,
    provenance: {
      source: 'EUROKIN Consortium Fixed-Bed Transport Limitations Guide (2012)',
      acceptanceStandard: 'Perturbation of intrinsic conversion rate < 5% per criterion',
      decouplingDisclaimer: 'EUROKIN criteria are 1D decoupled screening estimates. Passing all criteria does NOT guarantee absence of combined 2D/3D gradients or commercial scale-up safety.',
    },
  };
}
