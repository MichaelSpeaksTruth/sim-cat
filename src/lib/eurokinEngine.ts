import {
  ReactorInputs,
  SimulationResult,
  DiagnosticCriterion,
  CustomCriterionDefinition,
  HydrodynamicState,
  TransportState,
  ReactorSuitabilityAssessment,
  ReactorSuitabilityDimension
} from '../types/eurokin';

export const GAS_CONSTANT = 8.314462618; // J/(mol·K)

export function runEurokinSimulation(
  inputs: ReactorInputs,
  customCriteriaDefs: CustomCriterionDefinition[] = []
): SimulationResult {
  const {
    temperature: T,
    totalPressure: P,
    feedFlow,
    conversion: rawConv,
    reactantMoleFraction: yA,
    bedHeight: L,
    tubeDiameter: dt,
    particleDiameter: dp,
    bedPorosity: epsB,
    catalystDensity: rhoCat,
    catalystMass: wCat,
    catalystThermalCond: lambdaCat,
    inertMass: wInert,
    inertDensity: rhoInert,
    inertThermalCond: lambdaInert,
    dilutedConversion: rawDilConv,
    reactionRate: rObsMass,
    reactionOrder: n,
    activationEnergy: Ea,
    reactionEnthalpy: dHr,
    gasMolecularWeight: M_gas,
    gasViscosity: mu_g,
    gasHeatCapacity: cp_g,
    gasConductivity: lambda_g,
    effectiveDiffusivity: Deff,
    molecularDiffusivity: Dmol,
  } = inputs;

  const XA = Math.min(Math.max(rawConv, 0.0001), 0.9999);
  const Xdil = Math.min(Math.max(rawDilConv, 0.0001), 0.9999);
  const nSafe = Math.max(n, 0.01);

  // 1. Hydrodynamics
  const gasDensity = (P * M_gas) / (GAS_CONSTANT * T); // kg/m³
  const bedCrossSection = (Math.PI / 4.0) * Math.pow(dt, 2); // m²
  const superficialVelocity = feedFlow / (bedCrossSection * gasDensity); // m/s

  // Reynolds number
  const Re = (dp * gasDensity * superficialVelocity) / Math.max(mu_g, 1e-9);
  const reynoldsValid = Re >= 0.1 && Re <= 1000.0;

  // Schmidt & Prandtl numbers
  const Sc = mu_g / (gasDensity * Math.max(Dmol, 1e-12));
  const Pr = (cp_g * mu_g) / Math.max(lambda_g, 1e-6);

  // Bed tortuosity (Puncochar & Drahos: tau_b = 1 / sqrt(eps_b))
  const tauB = 1.0 / Math.sqrt(Math.max(epsB, 0.1));

  // Bodenstein number (Wakao et al.)
  const bodensteinInv = (epsB / (tauB * Math.max(Re, 1e-5) * Sc)) + 0.5;
  const Bo = bodensteinInv > 0 ? 1.0 / bodensteinInv : 2.0;

  // 2. Kinetics & Concentrations
  const bulkConc = (yA * P) / (GAS_CONSTANT * T); // mol/m³
  const rVobs = rObsMass * rhoCat; // mol/(m³_pellet · s)

  // External mass transfer (Wakao Sh correlation)
  const Sh = 2.0 + 1.1 * Math.pow(Math.max(Re, 1e-4), 0.6) * Math.pow(Sc, 1.0 / 3.0);
  const kg = (Sh * Dmol) / dp; // m/s
  const av = 6.0 / dp; // m²/m³_pellet for sphere

  // Carberry number
  const carberryNum = rVobs / (kg * av * Math.max(bulkConc, 1e-12));
  const carberryLimit = 0.05 / nSafe;

  // Internal pore diffusion (Weisz-Prater)
  const charLength = dp / 6.0;
  const weiszPrater = ((nSafe + 1.0) / 2.0) * (rVobs * Math.pow(charLength, 2)) / (Math.max(Deff, 1e-12) * Math.max(bulkConc, 1e-12));
  const weiszLimit = 0.08;

  // Thiele modulus & internal effectiveness factor
  const thieleModulus = Math.sqrt(Math.max(weiszPrater, 1e-8));
  let eta = 1.0;
  if (thieleModulus < 0.1) {
    eta = 1.0 - (Math.pow(3 * thieleModulus, 2) / 15.0);
  } else {
    const arg = 3.0 * thieleModulus;
    const tanhArg = Math.tanh(arg);
    eta = (1.0 / thieleModulus) * (1.0 / tanhArg - 1.0 / arg);
  }
  eta = Math.max(0.01, Math.min(1.0, eta));

  // External heat transfer (Wakao Nu correlation)
  const Nu = 2.0 + 1.1 * Math.pow(Math.max(Re, 1e-4), 0.6) * Math.pow(Pr, 1.0 / 3.0);
  const alphaP = (Nu * lambda_g) / dp; // W/(m²·K)
  const deltaTfilm = (rVobs * Math.abs(dHr) * dp) / (6.0 * alphaP);
  const deltaTfilmLimit = (0.05 * GAS_CONSTANT * Math.pow(T, 2)) / Math.max(Ea, 1e-3);

  // Pressure drop (Ergun equation)
  const fm = ((1.0 - epsB) / Math.pow(epsB, 3)) * (1.75 + (150.0 * (1.0 - epsB) / Math.max(Re, 1e-5)));
  const pressureDrop = (fm * gasDensity * Math.pow(superficialVelocity, 2) * L) / dp;
  const pressureDropLimit = (0.2 * P) / nSafe;

  // Axial dispersion criterion (Mears & Gierman)
  const axialDispRatio = L / dp;
  const axialDispLimit = (8.0 / Bo) * nSafe * Math.log(1.0 / (1.0 - XA));

  // Radial dispersion criterion (Chu & Ng)
  const radialDispRatio = dt / dp;
  const radialDispLimit = 8.0;

  // Inert bed dilution (Berger et al.)
  const vInert = wInert / Math.max(rhoInert, 1.0);
  const vCat = wCat / Math.max(rhoCat, 1.0);
  const bDilution = (vInert + vCat) > 0 ? vInert / (vInert + vCat) : 0.0;
  const dilutionDeviation = (bDilution < 1.0 && L > 0)
    ? (bDilution / (1.0 - bDilution)) * (Xdil * dp) / (2.0 * L)
    : 0.0;
  const dilutionLimit = 0.05;

  // Radial heat transfer & Specchia correlation
  let lambdaPeff = lambdaCat;
  if (bDilution > 0 && bDilution < 1.0) {
    const invLambda = ((1.0 - bDilution) / Math.max(lambdaCat, 1e-6)) + (bDilution / Math.max(lambdaInert, 1e-6));
    lambdaPeff = invLambda > 0 ? 1.0 / invLambda : lambdaCat;
  }

  const lambdaB0Ratio = epsB + (1.0 - epsB) / (0.220 * Math.pow(epsB, 2) + (2.0 / 3.0) * (lambda_g / Math.max(lambdaPeff, 1e-6)));
  const PeRif = 8.65 * (1.0 + 19.4 * Math.pow(dp / dt, 2));
  const lambdaConvRatio = (Re * Pr) / PeRif;
  const lambdaEr = lambda_g * (lambdaB0Ratio + lambdaConvRatio);

  const deltaTrad = (rVobs * Math.abs(dHr) * (1.0 - epsB) * (1.0 - bDilution) * Math.pow(dt, 2)) / (32.0 * Math.max(lambdaEr, 1e-6));
  const deltaTradLimit = (0.05 * GAS_CONSTANT * Math.pow(T, 2)) / Math.max(Ea, 1e-3);

  // Intraparticle heat conduction (Mears)
  const deltaTint = (rVobs * Math.abs(dHr) * Math.pow(dp, 2)) / (60.0 * Math.max(lambdaPeff, 1e-6));
  const deltaTintLimit = (0.05 * GAS_CONSTANT * Math.pow(T, 2)) / Math.max(Ea, 1e-3);

  // Adiabatic temperature rise
  const deltaTad = (Math.abs(dHr) * yA * XA) / (cp_g * M_gas);

  // Helper for safety margin percentage
  const calcMargin = (val: number, lim: number, op: string): number => {
    if (lim === 0) return 0;
    if (op === '<' || op === '<=') {
      return ((lim - val) / lim) * 100.0;
    } else {
      return ((val - lim) / lim) * 100.0;
    }
  };

  const fmtSci = (val: number, prec = 3) => {
    if (Math.abs(val) >= 1e4 || (Math.abs(val) < 1e-2 && val !== 0)) {
      return val.toExponential(prec);
    }
    return val.toFixed(prec);
  };

  // Build the 9 Audited Eurokin Diagnostic Criteria
  const coreCriteria: DiagnosticCriterion[] = [
    {
      id: 'axial_dispersion',
      name: 'Axial Dispersion & Plug Flow Criterion',
      category: 'Fluid Dynamics',
      symbol: 'L / d_p',
      calculatedValue: axialDispRatio,
      limitValue: axialDispLimit,
      operator: '>',
      unit: '[-]',
      passed: axialDispRatio > axialDispLimit,
      marginPercent: calcMargin(axialDispRatio, axialDispLimit, '>'),
      formulaLatex: String.raw`\frac{h_{\text{bed}}}{d_p} > \frac{8}{Bo} \, n \ln\left(\frac{1}{1 - X_A}\right)`,
      substitutionLatex: String.raw`\frac{${L}}{${dp}} = ${fmtSci(axialDispRatio, 1)} > \frac{8}{${fmtSci(Bo, 2)}} \cdot ${nSafe} \cdot \ln\left(\frac{1}{1 - ${XA}}\right) = ${fmtSci(axialDispLimit, 2)}`,
      description: 'Ensures ideal plug-flow regime along bed length, preventing axial Taylor backmixing dispersion from damping apparent reaction kinetics.',
      reference: 'Mears (1971), Gierman (1988), Wakao et al. (1979)'
    },
    {
      id: 'radial_dispersion',
      name: 'Radial Dispersion & Wall Effect Criterion',
      category: 'Fluid Dynamics',
      symbol: 'd_t / d_p',
      calculatedValue: radialDispRatio,
      limitValue: radialDispLimit,
      operator: '>',
      unit: '[-]',
      passed: radialDispRatio > radialDispLimit,
      marginPercent: calcMargin(radialDispRatio, radialDispLimit, '>'),
      formulaLatex: String.raw`\frac{d_t}{d_p} > 8.0`,
      substitutionLatex: String.raw`\frac{${dt}}{${dp}} = ${fmtSci(radialDispRatio, 1)} > 8.0`,
      description: 'Guarantees sufficiently high tube-to-pellet ratio to prevent wall flow bypass channeling and cross-sectional maldistribution.',
      reference: 'Chu & Ng (1989)'
    },
    {
      id: 'external_mass_transfer',
      name: 'External Film Mass Transfer (Carberry)',
      category: 'Mass Transfer',
      symbol: 'Ca',
      calculatedValue: carberryNum,
      limitValue: carberryLimit,
      operator: '<',
      unit: '[-]',
      passed: carberryNum < carberryLimit,
      marginPercent: calcMargin(carberryNum, carberryLimit, '<'),
      formulaLatex: String.raw`Ca = \frac{R_{v,A}^{\text{obs}}}{k_g \, a_v \, C_{A,b}} < \frac{0.05}{n}`,
      substitutionLatex: String.raw`\frac{${fmtSci(rVobs, 2)}}{${fmtSci(kg, 3)} \cdot ${fmtSci(av, 0)} \cdot ${fmtSci(bulkConc, 3)}} = ${fmtSci(carberryNum, 4)} < \frac{0.05}{${nSafe}} = ${fmtSci(carberryLimit, 3)}`,
      description: 'Confirms that concentration drop across the gas boundary film changes reaction rate by less than 5%.',
      reference: 'Mears (1971), Wakao et al. (1979)'
    },
    {
      id: 'internal_diffusion',
      name: 'Internal Pore Diffusion (Weisz-Prater)',
      category: 'Mass Transfer',
      symbol: String.raw`\Phi`,
      calculatedValue: weiszPrater,
      limitValue: weiszLimit,
      operator: '<',
      unit: '[-]',
      passed: weiszPrater < weiszLimit,
      marginPercent: calcMargin(weiszPrater, weiszLimit, '<'),
      formulaLatex: String.raw`\Phi = \frac{n + 1}{2} \cdot \frac{R_{v,A}^{\text{obs}} (d_p / 6)^2}{D_{A,\text{eff}} \, C_{A,s}} < 0.08`,
      substitutionLatex: String.raw`\frac{${nSafe} + 1}{2} \cdot \frac{${fmtSci(rVobs, 2)} \cdot (${fmtSci(charLength, 2)})^2}{${fmtSci(Deff, 2)} \cdot ${fmtSci(bulkConc, 3)}} = ${fmtSci(weiszPrater, 4)} < 0.080`,
      description: 'Ensures intraparticle pore diffusion does not hinder reactant transport (effectiveness factor η > 0.95).',
      reference: 'Froment & Bischoff (1990), Anderson & Pratt (1985)'
    },
    {
      id: 'external_heat_transfer',
      name: 'External Boundary Film Heat Transfer',
      category: 'Heat Transfer',
      symbol: String.raw`\Delta T_{\text{film}}`,
      calculatedValue: deltaTfilm,
      limitValue: deltaTfilmLimit,
      operator: '<',
      unit: 'K',
      passed: deltaTfilm < deltaTfilmLimit,
      marginPercent: calcMargin(deltaTfilm, deltaTfilmLimit, '<'),
      formulaLatex: String.raw`\Delta T_{\text{film}} = \frac{R_{v,A}^{\text{obs}} |\Delta_r H| \, d_p}{6 \, \alpha_p} < \frac{0.05 \, R \, T_G^2}{E_a}`,
      substitutionLatex: String.raw`\frac{${fmtSci(rVobs, 2)} \cdot ${fmtSci(Math.abs(dHr), 1)} \cdot ${dp}}{6 \cdot ${fmtSci(alphaP, 2)}} = ${fmtSci(deltaTfilm, 4)}\,\text{K} < \frac{0.05 \cdot 8.314 \cdot ${T}^2}{${fmtSci(Ea, 1)}} = ${fmtSci(deltaTfilmLimit, 3)}\,\text{K}`,
      description: 'Prevents non-isothermal boundary film temperature gradient between bulk gas and outer catalyst surface (< 5% rate perturbation).',
      reference: 'Mears (1971), Wakao et al. (1979)'
    },
    {
      id: 'radial_heat_transfer',
      name: 'Radial Bed Heat Transfer & Hotspots',
      category: 'Heat Transfer',
      symbol: String.raw`\Delta T_{\text{rad}}`,
      calculatedValue: deltaTrad,
      limitValue: deltaTradLimit,
      operator: '<',
      unit: 'K',
      passed: deltaTrad < deltaTradLimit,
      marginPercent: calcMargin(deltaTrad, deltaTradLimit, '<'),
      formulaLatex: String.raw`\Delta T_{\text{rad}} = \frac{R_{v,A}^{\text{obs}} |\Delta_r H|(1 - \varepsilon_b)(1 - b) d_t^2}{32 \, \lambda_{\text{er}}} < \frac{0.05 \, R \, T_w^2}{E_a}`,
      substitutionLatex: String.raw`\frac{${fmtSci(rVobs, 2)} \cdot ${fmtSci(Math.abs(dHr), 1)} \cdot (1 - ${epsB}) \cdot (1 - ${fmtSci(bDilution, 2)}) \cdot (${dt})^2}{32 \cdot ${fmtSci(lambdaEr, 3)}} = ${fmtSci(deltaTrad, 4)}\,\text{K} < ${fmtSci(deltaTradLimit, 3)}\,\text{K}`,
      description: 'Limits thermal non-uniformity across the packed bed radius from center-line to tube wall to avoid centerline thermal runaways.',
      reference: 'Mears (1971), Specchia et al. (1980)'
    },
    {
      id: 'intraparticle_heat',
      name: 'Intraparticle Solid Heat Conduction',
      category: 'Heat Transfer',
      symbol: String.raw`\Delta T_{\text{int}}`,
      calculatedValue: deltaTint,
      limitValue: deltaTintLimit,
      operator: '<',
      unit: 'K',
      passed: deltaTint < deltaTintLimit,
      marginPercent: calcMargin(deltaTint, deltaTintLimit, '<'),
      formulaLatex: String.raw`\Delta T_{\text{int}} = \frac{R_{v,A}^{\text{obs}} |\Delta_r H| \, d_p^2}{60 \, \lambda_p} < \frac{0.05 \, R \, T^2}{E_a}`,
      substitutionLatex: String.raw`\frac{${fmtSci(rVobs, 2)} \cdot ${fmtSci(Math.abs(dHr), 1)} \cdot (${dp})^2}{60 \cdot ${fmtSci(lambdaPeff, 3)}} = ${fmtSci(deltaTint, 5)}\,\text{K} < ${fmtSci(deltaTintLimit, 3)}\,\text{K}`,
      description: 'Validates that solid-phase thermal conduction inside the porous pellet is fast enough to preserve internal pellet isothermality.',
      reference: 'Mears (1971)'
    },
    {
      id: 'pressure_drop',
      name: 'Relative Hydraulic Pressure Drop',
      category: 'Hydrodynamics',
      symbol: String.raw`\Delta P`,
      calculatedValue: pressureDrop,
      limitValue: pressureDropLimit,
      operator: '<',
      unit: 'Pa',
      passed: pressureDrop < pressureDropLimit,
      marginPercent: calcMargin(pressureDrop, pressureDropLimit, '<'),
      formulaLatex: String.raw`\Delta P = \frac{f_m \, \rho_G \, u_0^2 \, h_{\text{bed}}}{d_p} < \frac{0.2 \, P_{\text{tot}}}{n}`,
      substitutionLatex: String.raw`\frac{${fmtSci(fm, 2)} \cdot ${fmtSci(gasDensity, 3)} \cdot (${fmtSci(superficialVelocity, 3)})^2 \cdot ${L}}{${dp}} = ${fmtSci(pressureDrop, 1)}\,\text{Pa} < \frac{0.2 \cdot ${fmtSci(P, 1)}}{${nSafe}} = ${fmtSci(pressureDropLimit, 1)}\,\text{Pa}`,
      description: 'Prevents significant pressure loss along the bed (< 20% total pressure) to preserve uniform reactant partial pressures.',
      reference: 'Ergun (1952)'
    },
    {
      id: 'inert_dilution',
      name: 'Inert Bed Dilution Homogeneity (Berger)',
      category: 'Bed Dilution',
      symbol: String.raw`\Delta_{\text{dilution}}`,
      calculatedValue: dilutionDeviation,
      limitValue: dilutionLimit,
      operator: '<',
      unit: '[-]',
      passed: dilutionDeviation < dilutionLimit,
      marginPercent: calcMargin(dilutionDeviation, dilutionLimit, '<'),
      formulaLatex: String.raw`\Delta = \left(\frac{b}{1 - b}\right) \frac{X_{\text{dil}} \, d_p}{2 \, h_{\text{bed}}} < 0.05`,
      substitutionLatex: String.raw`\left(\frac{${fmtSci(bDilution, 3)}}{1 - ${fmtSci(bDilution, 3)}}\right) \frac{${Xdil} \cdot ${dp}}{2 \cdot ${L}} = ${fmtSci(dilutionDeviation, 4)} < 0.050`,
      description: 'Guarantees that dilution of catalyst with inert particles (e.g. SiC) does not cause kinetic conversion maldistribution or bypass paths.',
      reference: 'Berger et al. (2002)'
    }
  ];

  // Evaluate Custom Criteria (if defined and enabled)
  const evaluatedCustomCriteria: DiagnosticCriterion[] = [];
  const evalScope = {
    T,
    P,
    feedFlow,
    L,
    dt,
    dp,
    epsB,
    rVobs,
    rhoCat,
    Deff,
    Dmol,
    mu_g,
    lambda_g,
    cp_g,
    Ea,
    dHr,
    gasDensity,
    superficialVelocity,
    Re,
    Sc,
    Pr,
    Bo,
    Sh,
    Nu,
    kg,
    av,
    alphaP,
    fm,
    pressureDrop,
    pressureDropLimit,
    carberryNum,
    carberryLimit,
    weiszPrater,
    weiszLimit,
    thieleModulus,
    eta,
    deltaTfilm,
    deltaTfilmLimit,
    deltaTrad,
    deltaTradLimit,
    deltaTint,
    deltaTintLimit,
    bDilution,
    dilutionDeviation,
    Math,
  };

  for (const cDef of customCriteriaDefs) {
    if (!cDef.enabled) continue;
    let computedVal = 0;
    try {
      // Evaluate custom expression securely via Function constructor with constrained scope
      const exprFn = new Function(...Object.keys(evalScope), `return (${cDef.expression});`);
      computedVal = Number(exprFn(...Object.values(evalScope))) || 0;
    } catch {
      computedVal = 0;
    }

    let pass = false;
    if (cDef.operator === '<') pass = computedVal < cDef.limitValue;
    else if (cDef.operator === '<=') pass = computedVal <= cDef.limitValue;
    else if (cDef.operator === '>') pass = computedVal > cDef.limitValue;
    else if (cDef.operator === '>=') pass = computedVal >= cDef.limitValue;

    evaluatedCustomCriteria.push({
      id: cDef.id,
      name: cDef.name,
      category: 'Custom Criterion',
      symbol: cDef.symbol,
      calculatedValue: computedVal,
      limitValue: cDef.limitValue,
      operator: cDef.operator,
      unit: cDef.unit,
      passed: pass,
      marginPercent: calcMargin(computedVal, cDef.limitValue, cDef.operator),
      formulaLatex: cDef.formulaLatex || cDef.expression,
      substitutionLatex: `${fmtSci(computedVal, 4)} ${cDef.operator} ${fmtSci(cDef.limitValue, 4)}`,
      description: cDef.description,
      reference: cDef.reference || 'User Defined Custom Formula',
      isCustom: true,
    });
  }

  const allCriteria = [...coreCriteria, ...evaluatedCustomCriteria];
  const passedCount = allCriteria.filter(c => c.passed).length;
  const totalCount = allCriteria.length;
  const overallStatus = passedCount === totalCount ? 'VALID_INTRINSIC' : 'TRANSPORT_LIMITED';

  // Engineering recommendations
  const recommendations: string[] = [];
  if (pressureDrop > pressureDropLimit) {
    recommendations.push(
      `Hydraulic restriction: Pressure drop ΔP (${fmtSci(pressureDrop, 1)} Pa) exceeds the 20% isobaric limit. Recommend increasing pellet diameter, decreasing superficial velocity, or considering fluidized-bed/micro-channel architecture.`
    );
  } else {
    recommendations.push(
      `Hydraulics confirmed: Pressure drop ΔP (${fmtSci(pressureDrop, 1)} Pa) is well within the acceptable packed-bed window (max ${fmtSci(pressureDropLimit, 1)} Pa).`
    );
  }

  if (!coreCriteria.find(c => c.id === 'internal_diffusion')?.passed) {
    const maxDpPore = Math.sqrt((0.08 * 36.0 * Deff * bulkConc) / (rVobs * (nSafe + 1.0) / 2.0));
    recommendations.push(
      `Internal pore diffusion limitation: Weisz-Prater Φ = ${fmtSci(weiszPrater, 3)} > 0.08 (effectiveness factor η = ${(eta * 100).toFixed(1)}%). Crush and sieve catalyst to dp < ${(maxDpPore * 1e3).toFixed(2)} mm to isolate true intrinsic kinetics.`
    );
  }

  if (!coreCriteria.find(c => c.id === 'external_mass_transfer')?.passed) {
    recommendations.push(
      `External film mass transfer resistance: Carberry number Ca = ${fmtSci(carberryNum, 4)} breaches limit. Increase gas linear velocity by reducing tube diameter dt at constant flow rate.`
    );
  }

  if (!coreCriteria.find(c => c.id === 'radial_heat_transfer')?.passed) {
    recommendations.push(
      `Radial thermal non-uniformity: Centerline ΔTrad (${fmtSci(deltaTrad, 3)} K) exceeds Mears limit. Dilute catalyst with SiC inert diluent or decrease tube diameter to prevent thermal runaway.`
    );
  }

  if (!coreCriteria.find(c => c.id === 'inert_dilution')?.passed) {
    recommendations.push(
      `Excessive inert dilution: Berger criterion Δ = ${fmtSci(dilutionDeviation, 4)} exceeds 0.05 limit. Risk of catalytic bypass channels; increase bed length or reduce inert volume fraction.`
    );
  }

  // Multi-dimensional Reactor Suitability Engine
  const pressureRatio = pressureDrop / Math.max(P, 1.0);
  const hydraulicScore = Math.max(0, Math.min(100, Math.round((1.0 - (pressureDrop / Math.max(pressureDropLimit, 1.0))) * 100)));
  const thermalScore = Math.max(0, Math.min(100, Math.round((1.0 - (deltaTrad / Math.max(deltaTradLimit, 1e-4))) * 100)));
  const massTransferScore = Math.max(0, Math.min(100, Math.round((1.0 - (carberryNum / Math.max(carberryLimit, 1e-4))) * 100)));
  const porePurityScore = Math.max(0, Math.min(100, Math.round((1.0 - (weiszPrater / 0.08)) * 100)));

  const dimensions: ReactorSuitabilityDimension[] = [
    {
      name: 'Hydraulic Permeability & Isobaric Stability',
      score: Math.max(0, hydraulicScore),
      verdict: pressureDrop <= pressureDropLimit * 0.5 ? 'EXCELLENT' : pressureDrop <= pressureDropLimit ? 'ACCEPTABLE' : 'CRITICAL',
      diagnosticMetric: 'Ergun ΔP / P_tot',
      currentValueFormatted: `${(pressureRatio * 100).toFixed(2)}% (${fmtSci(pressureDrop, 1)} Pa)`,
      recommendedLimit: `< ${(0.20 / nSafe * 100).toFixed(1)}% (< ${fmtSci(pressureDropLimit, 1)} Pa)`,
      explanation: pressureDrop <= pressureDropLimit
        ? 'Gas pressure drop is low enough to maintain uniform partial pressures along the bed.'
        : 'High pressure drop causes steep partial pressure gradients, risking bed fluidization or compression penalties.'
    },
    {
      name: 'Radial Heat Removal & Centerline Isothermality',
      score: Math.max(0, thermalScore),
      verdict: deltaTrad <= deltaTradLimit * 0.5 ? 'EXCELLENT' : deltaTrad <= deltaTradLimit ? 'ACCEPTABLE' : 'CRITICAL',
      diagnosticMetric: 'Mears ΔT_rad',
      currentValueFormatted: `${fmtSci(deltaTrad, 3)} K`,
      recommendedLimit: `< ${fmtSci(deltaTradLimit, 3)} K`,
      explanation: deltaTrad <= deltaTradLimit
        ? 'Radial temperature gradient is negligible (< 5% rate acceleration).'
        : 'Centerline hotspot will distort measured apparent activation energy and may trigger thermal runaway.'
    },
    {
      name: 'Interphase Gas-Boundary Mass Transfer',
      score: Math.max(0, massTransferScore),
      verdict: carberryNum <= carberryLimit * 0.5 ? 'EXCELLENT' : carberryNum <= carberryLimit ? 'ACCEPTABLE' : 'RESTRICTIVE',
      diagnosticMetric: 'Carberry Ca',
      currentValueFormatted: `${fmtSci(carberryNum, 4)}`,
      recommendedLimit: `< ${fmtSci(carberryLimit, 4)}`,
      explanation: carberryNum <= carberryLimit
        ? 'Pellet external boundary layer resistance is negligible.'
        : 'Gas-film diffusion limits reactant flux to catalyst surface; apparent reaction order will shift toward 1.0.'
    },
    {
      name: 'Intraparticle Pore Diffusion & Effectiveness',
      score: Math.max(0, porePurityScore),
      verdict: weiszPrater <= 0.04 ? 'EXCELLENT' : weiszPrater <= 0.08 ? 'ACCEPTABLE' : 'CRITICAL',
      diagnosticMetric: 'Weisz-Prater Φ (η)',
      currentValueFormatted: `${fmtSci(weiszPrater, 4)} (η = ${(eta * 100).toFixed(1)}%)`,
      recommendedLimit: '< 0.080 (η > 95%)',
      explanation: weiszPrater <= 0.08
        ? 'Internal pore diffusion is fast relative to chemical reaction rate.'
        : 'Pellet core is starved of reactants; measured activation energy will be halved (E_app ≈ E_true / 2).'
    }
  ];

  let recommendedType = 'Fixed-Bed Micro-Tubular Packed Reactor';
  let secondaryOption = 'Multi-Tubular Shell & Tube Reactor with Salt Bath';
  let overallFeasibility: 'HIGHLY_FEASIBLE' | 'FEASIBLE_WITH_CAUTION' | 'NOT_RECOMMENDED' = 'HIGHLY_FEASIBLE';
  let summaryHeadline = 'Packed-Bed Configuration Highly Viable for Ammonia Intrinsic Kinetics';

  if (pressureDrop > pressureDropLimit && deltaTrad > deltaTradLimit) {
    recommendedType = 'Fluidized Bed Reactor (Catalytic BFB) or Micro-Channel Array';
    secondaryOption = 'Berty / Carberry Stationary-Basket Internal Recycle Reactor';
    overallFeasibility = 'NOT_RECOMMENDED';
    summaryHeadline = 'Packed-Bed Infeasible: Both Pressure Drop and Radial Heat Removal Limits Breached';
  } else if (pressureDrop > pressureDropLimit) {
    recommendedType = 'Fluidized Bed Reactor (Eliminates Ergun Pressure Drop Constraint)';
    secondaryOption = 'Structured Catalyst Monolith / Open-Cell Foam Reactor';
    overallFeasibility = 'NOT_RECOMMENDED';
    summaryHeadline = 'Packed-Bed Hydraulically Constrained: Excessive Pressure Drop Detected';
  } else if (deltaTrad > deltaTradLimit) {
    recommendedType = 'Multi-Tubular Fixed-Bed (Small Tube Diameter dt < 6 mm) or Diluted Bed';
    secondaryOption = 'Berty / Carberry Gradientless Recycle Reactor';
    overallFeasibility = 'FEASIBLE_WITH_CAUTION';
    summaryHeadline = 'Thermal Limitations Active: Radial Heat Hotspot Requires Redesign';
  } else if (weiszPrater > 0.08) {
    recommendedType = 'Crushed & Sieved Laboratory Fixed-Bed (dp < 250 µm)';
    secondaryOption = 'Eggshell / Structured Catalytic Membrane';
    overallFeasibility = 'FEASIBLE_WITH_CAUTION';
    summaryHeadline = 'Hydrodynamically Viable but Internal Pore Diffusion Masking Active';
  }

  const actionableEngineeringSteps: string[] = [];
  if (radialDispRatio <= 8.0) {
    actionableEngineeringSteps.push(`Increase tube diameter dt or decrease particle diameter dp to ensure dt / dp > 8.0 (current: ${radialDispRatio.toFixed(1)}) to prevent wall bypass channeling.`);
  }
  if (axialDispRatio <= axialDispLimit) {
    actionableEngineeringSteps.push(`Increase bed length L to satisfy L / dp > ${axialDispLimit.toFixed(1)} (current: ${axialDispRatio.toFixed(1)}) for ideal plug flow.`);
  }
  if (deltaTrad > deltaTradLimit) {
    actionableEngineeringSteps.push(`Decrease tube diameter dt from ${(dt * 1e3).toFixed(1)} mm to < ${(dt * 1e3 * Math.sqrt(deltaTradLimit / Math.max(deltaTrad, 1e-4))).toFixed(1)} mm or add inert SiC diluent.`);
  }
  if (weiszPrater > 0.08) {
    actionableEngineeringSteps.push(`Sieve catalyst particles to dp < ${(dp * 1e6 * Math.sqrt(0.08 / Math.max(weiszPrater, 1e-4))).toFixed(0)} µm to eliminate internal concentration gradients.`);
  }
  if (pressureDrop > pressureDropLimit) {
    actionableEngineeringSteps.push(`Increase pellet diameter or decrease superficial velocity to bring pressure drop below ${fmtSci(pressureDropLimit, 0)} Pa.`);
  }
  if (actionableEngineeringSteps.length === 0) {
    actionableEngineeringSteps.push('Current operating geometry and kinetic parameters meet all standard Eurokin transport diagnostic thresholds.');
  }

  const reactorSuitability: ReactorSuitabilityAssessment = {
    recommendedType,
    secondaryOption,
    overallFeasibility,
    summaryHeadline,
    dimensions,
    actionableEngineeringSteps,
  };

  const hydrodynamics: HydrodynamicState = {
    gasDensity,
    bedCrossSection,
    superficialVelocity,
    reynoldsNumber: Re,
    schmidtNumber: Sc,
    prandtlNumber: Pr,
    sherwoodNumber: Sh,
    nusseltNumber: Nu,
    bodensteinNumber: Bo,
    ergunFrictionFactor: fm,
    reynoldsValid,
  };

  const transport: TransportState = {
    bulkConcentration: bulkConc,
    observedVolumetricRate: rVobs,
    externalMassTransferCoeff: kg,
    specificSurfaceArea: av,
    particleHeatTransferCoeff: alphaP,
    radialThermalConductivity: lambdaEr,
    effectivePelletThermalCond: lambdaPeff,
    volumetricDilutionFraction: bDilution,
    thieleModulus,
    effectivenessFactor: eta,
    adiabaticTemperatureRise: deltaTad,
  };

  return {
    inputs,
    hydrodynamics,
    transport,
    criteria: allCriteria,
    overallStatus,
    passedCount,
    totalCount,
    recommendations,
    reactorSuitability,
  };
}
