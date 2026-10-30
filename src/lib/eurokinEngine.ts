import { ReactorInputs, SimulationResult, DiagnosticCriterion, HydrodynamicState, TransportState } from '../types/eurokin';

export const GAS_CONSTANT = 8.314462618; // J/(mol·K)

export function runEurokinSimulation(inputs: ReactorInputs): SimulationResult {
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
  const Re = (dp * gasDensity * superficialVelocity) / mu_g;
  const reynoldsValid = Re >= 0.1 && Re <= 1000.0;

  // Schmidt & Prandtl numbers
  const Sc = mu_g / (gasDensity * Dmol);
  const Pr = (cp_g * mu_g) / lambda_g;

  // Bed tortuosity (Puncochar & Drahos: tau_b = 1 / sqrt(eps_b))
  const tauB = 1.0 / Math.sqrt(epsB);

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
  // For spherical pellets, phi = (dp/6) * sqrt((n+1)/2 * rVobs / (Deff * CA_s))
  const thieleModulus = Math.sqrt(Math.max(weiszPrater, 1e-8));
  // Analytical 1st order eta: (1/phi) * (1/tanh(3*phi) - 1/(3*phi))
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
  const vInert = wInert / rhoInert;
  const vCat = wCat / rhoCat;
  const bDilution = (vInert + vCat) > 0 ? vInert / (vInert + vCat) : 0.0;
  const dilutionDeviation = (bDilution < 1.0 && L > 0)
    ? (bDilution / (1.0 - bDilution)) * (Xdil * dp) / (2.0 * L)
    : 0.0;
  const dilutionLimit = 0.05;

  // Radial heat transfer & Specchia correlation
  let lambdaPeff = lambdaCat;
  if (bDilution > 0 && bDilution < 1.0) {
    const invLambda = ((1.0 - bDilution) / lambdaCat) + (bDilution / lambdaInert);
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
  const calcMargin = (val: number, lim: number, op: '<' | '>'): number => {
    if (lim === 0) return 0;
    if (op === '<') {
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

  const criteria: DiagnosticCriterion[] = [
    {
      id: 'axial_dispersion',
      name: 'Axial Dispersion',
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
      description: 'Ensures ideal plug-flow regime along the bed length, preventing axial Taylor dispersion from damping apparent reaction order.',
      reference: 'Mears (1971), Gierman (1988), Wakao et al. (1979)'
    },
    {
      id: 'radial_dispersion',
      name: 'Radial Dispersion',
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
      description: 'Guarantees sufficiently high tube-to-pellet ratio to prevent wall flow bypass channeling and maldistribution.',
      reference: 'Chu & Ng (1989)'
    },
    {
      id: 'external_mass_transfer',
      name: 'External Mass Transfer (Carberry)',
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
      name: 'External Film Heat Transfer',
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
      description: 'Prevents non-isothermal boundary film temperature gradient between bulk gas and outer catalyst surface.',
      reference: 'Mears (1971), Wakao et al. (1979)'
    },
    {
      id: 'radial_heat_transfer',
      name: 'Radial Bed Heat Transfer',
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
      description: 'Limits thermal non-uniformity across the packed bed radius from center-line to tube wall.',
      reference: 'Mears (1971), Specchia et al. (1980)'
    },
    {
      id: 'intraparticle_heat',
      name: 'Intraparticle Heat Conduction',
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
      description: 'Validates that temperature gradients inside the solid catalyst pellet are negligible.',
      reference: 'Mears (1971)'
    },
    {
      id: 'pressure_drop',
      name: 'Relative Pressure Drop',
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
      name: 'Inert Bed Dilution Deviation',
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
      description: 'Guarantees that dilution of catalyst with inert particles (e.g. SiC) does not distort kinetic conversion uniformity.',
      reference: 'Berger et al. (2002)'
    }
  ];

  const passedCount = criteria.filter(c => c.passed).length;
  const totalCount = criteria.length;
  const overallStatus = passedCount === totalCount ? 'VALID_INTRINSIC' : 'TRANSPORT_LIMITED';

  // Construct engineering recommendations
  const recommendations: string[] = [];
  if (pressureDrop > pressureDropLimit) {
    recommendations.push(`Hydraulic restriction: Pressure drop ΔP (${fmtSci(pressureDrop, 1)} Pa) exceeds the 20% isobaric limit. Recommend increasing pellet diameter, lowering superficial velocity, or considering structured catalysts.`);
  } else {
    recommendations.push(`Hydraulics confirmed: Pressure drop ΔP is well within the acceptable packed-bed window (${fmtSci(pressureDrop, 1)} Pa vs max ${fmtSci(pressureDropLimit, 1)} Pa).`);
  }

  const weiszCrit = criteria.find(c => c.id === 'internal_diffusion');
  if (weiszCrit && !weiszCrit.passed) {
    const maxDpPore = Math.sqrt((0.08 * 36.0 * Deff * bulkConc) / (rVobs * (nSafe + 1.0) / 2.0));
    recommendations.push(`Internal pore diffusion limitation detected! Weisz-Prater Φ = ${fmtSci(weiszPrater, 3)} > 0.08 (pellet effectiveness η = ${(eta * 100).toFixed(1)}%). To measure true intrinsic kinetics, crush/sieve catalyst to dp < ${(maxDpPore * 1e3).toFixed(2)} mm or synthesize an eggshell catalyst architecture.`);
  }

  const carberryCrit = criteria.find(c => c.id === 'external_mass_transfer');
  if (carberryCrit && !carberryCrit.passed) {
    recommendations.push(`External film mass transfer resistance: Carberry number Ca = ${fmtSci(carberryNum, 4)} exceeds limit. Elevate superficial velocity u₀ by decreasing tube diameter dt at constant mass flow to intensify gas-film turbulence.`);
  }

  const radHeatCrit = criteria.find(c => c.id === 'radial_heat_transfer');
  if (radHeatCrit && !radHeatCrit.passed) {
    recommendations.push(`Radial thermal non-uniformity: ΔTrad (${fmtSci(deltaTrad, 3)} K) breaches the Mears criterion. Dilute bed further with high-conductivity inert particles (e.g. SiC λ = 20 W/m-K) or utilize a multi-tubular micro-reactor.`);
  }

  const dilutionCrit = criteria.find(c => c.id === 'inert_dilution');
  if (dilutionCrit && !dilutionCrit.passed) {
    recommendations.push(`Excessive inert dilution: Berger criterion Δ = ${fmtSci(dilutionDeviation, 4)} exceeds 0.05 limit. Risk of catalytic bypass channels; reduce inert ratio or lengthen the bed.`);
  }

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
    criteria,
    overallStatus,
    passedCount,
    totalCount,
    recommendations,
    reactorSuitability: {
      packedBedFeasible: pressureDrop < pressureDropLimit,
      suggestion: pressureDrop < pressureDropLimit
        ? 'Fixed-bed (packed-bed) catalytic reactor is suitable from hydrodynamics and pressure-drop perspective.'
        : 'High pressure drop detected. Reconsider the packed-bed design. A fluidized-bed or micro-channel reactor may be considered.'
    }
  };
}
