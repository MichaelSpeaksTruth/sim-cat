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
import { solveAxialProfiles } from './axialSolver';
import { calculatePengRobinsonState } from './nist/equationOfState';
import { evaluateEurokinTransport } from './eurokinTransport';

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

  // 1. Hydrodynamics via Peng-Robinson (1976) Real-Gas EOS
  const prState = calculatePengRobinsonState(T, P, {
    N2: 0.25 * (1.0 - yA),
    H2: 0.75 * (1.0 - yA),
    NH3: yA,
  });
  const gasDensity = prState.densityKgM3; // kg/m³ real gas
  const Z = prState.compressibilityFactorZ;
  const bedCrossSection = (Math.PI / 4.0) * Math.pow(dt, 2); // m²
  const superficialVelocity = feedFlow / (bedCrossSection * Math.max(gasDensity, 1e-4)); // m/s

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

  // 2. Kinetics & Concentrations (Real-Gas Fugacity / Compressibility Basis)
  const bulkConc = (yA * P) / (Z * GAS_CONSTANT * T); // mol/m³ real gas
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

  // Build the Audited Eurokin Diagnostic Criteria via Dedicated Transport Module
  const transportAssessment = evaluateEurokinTransport(inputs, rObsMass, T, P);
  const coreCriteria: DiagnosticCriterion[] = transportAssessment.criteria.map(c => ({
    id: c.id,
    name: c.name,
    category: c.category,
    symbol: c.symbol,
    calculatedValue: c.calculatedValue,
    limitValue: c.limitValue,
    operator: c.operator,
    unit: c.unit,
    passed: c.passed,
    status: c.status,
    applicabilityRange: c.applicabilityRange,
    isWithinApplicability: c.isWithinApplicability,
    provenance: c.reference,
    marginPercent: c.marginPercent,
    formulaLatex: c.formulaLatex,
    substitutionLatex: c.substitutionLatex,
    description: c.description,
    reference: c.reference,
    warningNote: c.warningNote,
  }));

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

  // Compute full 1D Runge-Kutta numerical axial profiles
  const axialProfiles = solveAxialProfiles(inputs, 60);
  const lastProfile = axialProfiles[axialProfiles.length - 1];
  const maxTemp = Math.max(...axialProfiles.map((p) => p.temperature));
  const hotspotPoint = axialProfiles.find((p) => p.temperature === maxTemp);

  // Ammonia production rate: F_NH3_out [mol/s] * 0.01703 kg/mol * 3600 s/h
  const totalMolarFeed = feedFlow / M_gas;
  const F_N2_feed = totalMolarFeed * 0.25 * (1.0 - yA);
  const ammoniaOutMolS = 2.0 * F_N2_feed * lastProfile.conversion;
  const ammoniaProductionRateKgH = ammoniaOutMolS * 0.0170305 * 3600.0;

  return {
    inputs,
    hydrodynamics,
    transport,
    criteria: allCriteria,
    overallStatus: transportAssessment.overallStatus,
    passedCount,
    totalCount,
    recommendations: [...transportAssessment.recommendations, ...transportAssessment.combinedInteractions],
    reactorSuitability,
    axialProfiles,
    inletTemperature: T,
    outletTemperature: lastProfile.temperature,
    maxTemperature: maxTemp,
    hotspotLocationZ: hotspotPoint ? hotspotPoint.z : 0.0,
    totalDeltaP: lastProfile.deltaP,
    outletConversion: lastProfile.conversion,
    ammoniaProductionRateKgH,
    transportAssessment,
  };
}
