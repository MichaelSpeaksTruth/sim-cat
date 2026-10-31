/**
 * Rigorous NIST Property Correlation Engine & Reaction Thermodynamics
 * 
 * Sources:
 * 1. NIST Chemistry WebBook (SRD 69) Shomate thermochemical formulations
 * 2. Temkin, M., Pyzhev, V., Acta Physicochim. URSS 12 (1940) 327-356
 * 3. Dyson, D.C., Baddour, R.F., Ind. Eng. Chem. Fundam. 7 (1968) 593-598
 * 4. Wilke, C.R., J. Chem. Phys. 18 (1950) 517-519
 * 5. Mason, E.A., Saxena, S.C., Phys. Fluids 1 (1958) 361-369
 * 6. Fuller, E.N., Schettler, P.D., Giddings, J.C., Ind. Eng. Chem. 58 (1966) 19-27
 */

import { NIST_SPECIES_REGISTRY } from './speciesRegistry';
import { calculatePengRobinsonState } from './equationOfState';
import {
  NistSpecies,
  MixtureTransportProperties,
  ThermodynamicReactionEquilibrium
} from './types';

const R_UNIVERSAL = 8.314462618; // J/(mol·K)
const P_STANDARD = 101325.0;     // Pa (1 atm standard state)

/**
 * Evaluates NIST Shomate molar heat capacity Cp [J/(mol·K)]
 * Cp = A + B*t + C*t^2 + D*t^3 + E/t^2, where t = T / 1000 K
 */
export function evaluateShomateCp(species: NistSpecies, temperatureK: number): number {
  const { tMin, tMax, A, B, C, D, E } = species.shomateGas.value;
  const T = Math.min(Math.max(temperatureK, tMin), tMax);
  const t = T / 1000.0;
  return A + B * t + C * Math.pow(t, 2) + D * Math.pow(t, 3) + E / Math.pow(t, 2);
}

/**
 * Evaluates NIST Shomate molar enthalpy H(T) - H(298.15) [J/mol]
 * H - H298 = A*t + B*t^2/2 + C*t^3/3 + D*t^4/4 - E/t + F - H, where t = T / 1000 K
 */
export function evaluateShomateEnthalpy(species: NistSpecies, temperatureK: number): number {
  const { tMin, tMax, A, B, C, D, E, F, H } = species.shomateGas.value;
  const T = Math.min(Math.max(temperatureK, tMin), tMax);
  const t = T / 1000.0;
  // NIST Shomate returns kJ/mol; convert to J/mol by multiplying by 1000
  const hKJ = A * t + (B / 2.0) * Math.pow(t, 2) + (C / 3.0) * Math.pow(t, 3) + (D / 4.0) * Math.pow(t, 4) - E / t + F - H;
  return hKJ * 1000.0;
}

/**
 * Evaluates NIST Shomate absolute standard molar entropy S(T) [J/(mol·K)]
 * S = A*ln(t) + B*t + C*t^2/2 + D*t^3/3 - E/(2*t^2) + G
 */
export function evaluateShomateEntropy(species: NistSpecies, temperatureK: number): number {
  const { tMin, tMax, A, B, C, D, E, G } = species.shomateGas.value;
  const T = Math.min(Math.max(temperatureK, tMin), tMax);
  const t = T / 1000.0;
  return A * Math.log(t) + B * t + (C / 2.0) * Math.pow(t, 2) + (D / 3.0) * Math.pow(t, 3) - E / (2.0 * Math.pow(t, 2)) + G;
}

/**
 * Computes exact thermodynamic reaction equilibrium for ammonia synthesis:
 * 0.5 N2 + 1.5 H2 <=> NH3
 * 
 * Delta_r H°(T) = H_NH3(T) - 0.5 H_N2(T) - 1.5 H_H2(T)
 * Delta_r S°(T) = S_NH3(T) - 0.5 S_N2(T) - 1.5 S_H2(T)
 * Delta_r G°(T) = Delta_r H°(T) - T * Delta_r S°(T)
 * K_p(T) = exp(-Delta_r G° / RT)
 */
export function calculateReactionEquilibrium(
  temperatureK: number,
  pressurePa: number,
  moleFractions: { yN2: number; yH2: number; yNH3: number; yInert?: number }
): ThermodynamicReactionEquilibrium {
  const T = Math.min(Math.max(temperatureK, 298.15), 1200.0);
  const P = Math.max(pressurePa, 10000.0);

  const spNH3 = NIST_SPECIES_REGISTRY.NH3;
  const spN2 = NIST_SPECIES_REGISTRY.N2;
  const spH2 = NIST_SPECIES_REGISTRY.H2;

  // Standard formation enthalpy at 298.15 K
  const deltaHf298 = spNH3.standardEnthalpyFormation298.value; // -45900 J/mol

  // Sensible enthalpy changes integral_298^T Cp dT
  const deltaH_NH3 = evaluateShomateEnthalpy(spNH3, T) - evaluateShomateEnthalpy(spNH3, 298.15);
  const deltaH_N2 = evaluateShomateEnthalpy(spN2, T) - evaluateShomateEnthalpy(spN2, 298.15);
  const deltaH_H2 = evaluateShomateEnthalpy(spH2, T) - evaluateShomateEnthalpy(spH2, 298.15);

  const deltaHr_T = deltaHf298 + (deltaH_NH3 - 0.5 * deltaH_N2 - 1.5 * deltaH_H2);

  // Absolute standard entropies
  const sNH3 = evaluateShomateEntropy(spNH3, T);
  const sN2 = evaluateShomateEntropy(spN2, T);
  const sH2 = evaluateShomateEntropy(spH2, T);

  const deltaSr_T = sNH3 - 0.5 * sN2 - 1.5 * sH2;

  // Gibbs free energy of reaction Delta_r G°(T) [J/mol]
  const deltaGr_T = deltaHr_T - T * deltaSr_T;

  // Thermodynamic equilibrium constant K_p (with standard state P° = 1 atm = 101325 Pa)
  // Dyson & Baddour literature correlation log10(Kp_atm):
  // log10(Kp) = -2.691122*log10(T) - 5.519265e-5*T + 1.848863e-7*T^2 + 2001.6/T + 2.6899
  const log10Kp_Dyson = -2.691122 * Math.log10(T) - (5.519265e-5 * T) + (1.848863e-7 * Math.pow(T, 2)) + (2001.6 / T) + 2.6899;
  const Kp_atm = Math.pow(10.0, log10Kp_Dyson);
  const Kp_Pa = Kp_atm / Math.sqrt(P_STANDARD); // for 0.5 N2 + 1.5 H2 <=> NH3: units are (P)^-1

  // Real-gas Peng-Robinson fugacities
  const prState = calculatePengRobinsonState(T, P, {
    N2: moleFractions.yN2,
    H2: moleFractions.yH2,
    NH3: moleFractions.yNH3,
    Ar: moleFractions.yInert || 0,
  });

  const fNH3_atm = (prState.fugacitiesPa.NH3 || (moleFractions.yNH3 * P)) / P_STANDARD;
  const fN2_atm = (prState.fugacitiesPa.N2 || (moleFractions.yN2 * P)) / P_STANDARD;
  const fH2_atm = (prState.fugacitiesPa.H2 || (moleFractions.yH2 * P)) / P_STANDARD;

  // Reaction quotient Q = f_NH3 / (f_N2^0.5 * f_H2^1.5) in atm^-1
  const denomQ = Math.sqrt(Math.max(fN2_atm, 1e-8)) * Math.pow(Math.max(fH2_atm, 1e-8), 1.5);
  const Q = fNH3_atm / Math.max(denomQ, 1e-12);

  // Thermodynamic driving force / affinity: 1 - Q / Kp
  const affinity = 1.0 - (Q / Math.max(Kp_atm, 1e-12));

  // Analytical maximum equilibrium conversion for stoichiometric feed (3 H2 : 1 N2)
  // At equilibrium: (Xeq / (1 - Xeq)) ~ Kp * (P_atm)
  const Patm = P / P_STANDARD;
  const kpTimesP = Kp_atm * Patm;
  const Xeq = kpTimesP / (1.0 + kpTimesP);

  return {
    temperatureK: T,
    pressurePa: P,
    deltaReactionEnthalpyJMol: deltaHr_T,
    deltaReactionEntropyJMolK: deltaSr_T,
    deltaReactionGibbsJMol: deltaGr_T,
    equilibriumConstantKpAtm: Kp_atm,
    equilibriumConstantKpPa: Kp_Pa,
    reactionQuotientQ: Q,
    equilibriumAffinity: affinity,
    equilibriumConversionXeq: Math.min(0.999, Math.max(0.001, Xeq)),
    isAtEquilibrium: Math.abs(affinity) < 0.005,
  };
}

/**
 * Pure component gas dynamic viscosity via Chapman-Enskog / Chung collision formulation [Pa·s = kg/(m·s)]
 */
export function calculatePureGasViscosity(species: NistSpecies, temperatureK: number): number {
  const T = Math.max(temperatureK, 150.0);
  const M_gmol = species.molarMass.value * 1000.0;
  const sigma = species.lennardJonesSigma.value;
  const epsOverK = species.lennardJonesEpsilonOverK.value;

  const T_star = T / Math.max(epsOverK, 10.0);
  // Neufeld et al. (1972) empirical collision integral for viscosity
  const omegaV = (1.16145 / Math.pow(T_star, 0.14874)) + 
                 (0.52487 / Math.exp(0.7732 * T_star)) + 
                 (2.16178 / Math.exp(2.43787 * T_star));

  // Chapman-Enskog collision formulation: mu [uPa*s] = 2.6693 * sqrt(M * T) / (sigma^2 * omegaV)
  const mu_microPa_s = (2.6693 * Math.sqrt(M_gmol * T)) / (Math.pow(sigma, 2) * omegaV);
  return mu_microPa_s * 1e-6; // Pa·s
}

/**
 * Pure component thermal conductivity via Modified Eucken formula [W/(m·K)]
 */
export function calculatePureGasThermalConductivity(species: NistSpecies, temperatureK: number): number {
  const mu = calculatePureGasViscosity(species, temperatureK);
  const cpMolar = evaluateShomateCp(species, temperatureK);
  const cvMolar = Math.max(cpMolar - R_UNIVERSAL, 1.5 * R_UNIVERSAL);
  const M = species.molarMass.value;
  return (mu / M) * (cvMolar + 2.25 * R_UNIVERSAL);
}

/**
 * Binary molecular diffusivity via Fuller, Schettler, and Giddings (1966) method [m²/s]
 */
export function calculateBinaryDiffusivityFSG(
  speciesA: NistSpecies,
  speciesB: NistSpecies,
  temperatureK: number,
  pressurePa: number
): number {
  const T = Math.max(temperatureK, 200.0);
  const P = Math.max(pressurePa, 10000.0);

  const MA = speciesA.molarMass.value * 1000.0; // g/mol
  const MB = speciesB.molarMass.value * 1000.0;
  const vA = speciesA.fullerDiffusionVolume.value;
  const vB = speciesB.fullerDiffusionVolume.value;

  const numerator = 1.013e-2 * Math.pow(T, 1.75) * Math.sqrt((1.0 / MA) + (1.0 / MB));
  const denominator = P * Math.pow(Math.cbrt(vA) + Math.cbrt(vB), 2);
  return numerator / Math.max(denominator, 1e-12);
}

/**
 * Rigorous Multicomponent Gas Mixture Properties:
 * - Real gas density via Peng-Robinson EOS
 * - Viscosity via Wilke (1950) mixing rule
 * - Thermal conductivity via Mason & Saxena (1958)
 * - Heat capacity via NIST Shomate sum
 * - Diffusion via Fuller-Schettler-Giddings
 */
export function calculateMixtureProperties(
  temperatureK: number,
  pressurePa: number,
  moleFractions: Record<string, number>
): MixtureTransportProperties {
  const T = Math.max(temperatureK, 200.0);
  const P = Math.max(pressurePa, 10000.0);

  // Filter valid species
  // Always include key reaction species N2, H2, NH3 plus any other specified species (e.g. Ar)
  const candidateKeys = new Set([...Object.keys(moleFractions), 'N2', 'H2', 'NH3']);
  const activeKeys = Array.from(candidateKeys).filter(
    k => k in NIST_SPECIES_REGISTRY
  ) as Array<keyof typeof NIST_SPECIES_REGISTRY>;

  const totalY = activeKeys.reduce((acc, k) => acc + (moleFractions[k] || 0), 0);
  const y: Record<string, number> = {};
  for (const k of activeKeys) {
    y[k] = (moleFractions[k] || 0) / (totalY || 1.0);
  }

  // 1. Mean Molar Mass [kg/mol]
  let meanMolarMass = 0.0;
  for (const k of activeKeys) {
    meanMolarMass += y[k] * NIST_SPECIES_REGISTRY[k].molarMass.value;
  }

  // 2. Real Gas Density & Compressibility via Peng-Robinson EOS
  const prState = calculatePengRobinsonState(T, P, y);
  const gasDensity = prState.densityKgM3;
  const Z = prState.compressibilityFactorZ;

  // 3. Multicomponent Heat Capacity via NIST Shomate [J/(mol·K)] and [J/(kg·K)]
  let cpMolarMix = 0.0;
  for (const k of activeKeys) {
    const cp_i = evaluateShomateCp(NIST_SPECIES_REGISTRY[k], T);
    cpMolarMix += y[k] * cp_i;
  }
  const cpMassMix = cpMolarMix / Math.max(meanMolarMass, 1e-4);

  // 4. Pure viscosities and Wilke mixing rule
  const pureViscosities: Record<string, number> = {};
  const pureConductivities: Record<string, number> = {};

  for (const k of activeKeys) {
    pureViscosities[k] = calculatePureGasViscosity(NIST_SPECIES_REGISTRY[k], T);
    pureConductivities[k] = calculatePureGasThermalConductivity(NIST_SPECIES_REGISTRY[k], T);
  }

  // Wilke interaction parameter phi_ij
  let mixViscosity = 0.0;
  for (const i of activeKeys) {
    const Mi = NIST_SPECIES_REGISTRY[i].molarMass.value;
    const mui = pureViscosities[i];
    let denom = 0.0;

    for (const j of activeKeys) {
      const Mj = NIST_SPECIES_REGISTRY[j].molarMass.value;
      const muj = pureViscosities[j];
      const phi_ij = Math.pow(1.0 + Math.sqrt(mui / muj) * Math.pow(Mj / Mi, 0.25), 2) /
                     Math.sqrt(8.0 * (1.0 + Mi / Mj));
      denom += y[j] * phi_ij;
    }
    mixViscosity += (y[i] * mui) / Math.max(denom, 1e-8);
  }

  // 5. Mason & Saxena Thermal Conductivity
  let mixConductivity = 0.0;
  for (const i of activeKeys) {
    const Mi = NIST_SPECIES_REGISTRY[i].molarMass.value;
    const mui = pureViscosities[i];
    const ki = pureConductivities[i];
    let denom = 0.0;

    for (const j of activeKeys) {
      const Mj = NIST_SPECIES_REGISTRY[j].molarMass.value;
      const muj = pureViscosities[j];
      // Mason & Saxena empirical constant gamma = 1.065
      const phi_ij = 1.065 * Math.pow(1.0 + Math.sqrt(mui / muj) * Math.pow(Mj / Mi, 0.25), 2) /
                     Math.sqrt(8.0 * (1.0 + Mi / Mj));
      denom += y[j] * phi_ij;
    }
    mixConductivity += (y[i] * ki) / Math.max(denom, 1e-8);
  }

  // 6. Ammonia molecular diffusivity into bulk gas mixture
  // Using Blanc's law for effective multicomponent diffusivity: 1 / D_i,mix = sum_{j != i} (y_j / D_ij)
  let invDiffusivityNH3 = 0.0;
  const spNH3 = NIST_SPECIES_REGISTRY.NH3;
  for (const j of activeKeys) {
    if (j !== 'NH3') {
      const D_NH3_j = calculateBinaryDiffusivityFSG(spNH3, NIST_SPECIES_REGISTRY[j], T, P);
      invDiffusivityNH3 += y[j] / Math.max(D_NH3_j, 1e-12);
    }
  }
  const diffusivityNH3Mix = invDiffusivityNH3 > 0 ? (1.0 - (y.NH3 || 0)) / invDiffusivityNH3 : 1e-5;

  // 7. Reaction enthalpy at T
  const rxnEq = calculateReactionEquilibrium(T, P, {
    yN2: y.N2 || 0.25,
    yH2: y.H2 || 0.75,
    yNH3: y.NH3 || 0.05,
    yInert: (y.Ar || 0) + (y.CH4 || 0) + (y.He || 0),
  });

  return {
    molarMassKgMol: meanMolarMass,
    viscosityPaS: mixViscosity,
    thermalConductivityWMK: mixConductivity,
    heatCapacityMassJKgK: cpMassMix,
    heatCapacityMolarJMolK: cpMolarMix,
    gasDensityKgM3: gasDensity,
    compressibilityFactorZ: Z,
    diffusivityNH3MixM2S: diffusivityNH3Mix,
    reactionEnthalpyJMol: Math.abs(rxnEq.deltaReactionEnthalpyJMol),
    methodologyNotes: [
      `Real gas density (${gasDensity.toFixed(2)} kg/m³) calculated via Peng-Robinson (1976) EOS (Z = ${Z.toFixed(3)})`,
      `Multicomponent viscosity (${(mixViscosity * 1e6).toFixed(1)} µPa·s) via Wilke semi-empirical mixing rule with Chapman-Enskog collision integrals`,
      `Thermal conductivity (${(mixConductivity * 1000).toFixed(1)} mW/(m·K)) via Mason & Saxena formulation`,
      `Heat capacity (${(cpMassMix).toFixed(1)} J/(kg·K)) via NIST Shomate polynomials (298 - 1400 K)`,
      `Effective diffusion of NH3 in bulk (${diffusivityNH3Mix.toExponential(3)} m²/s) via Fuller-Schettler-Giddings & Blanc's law`,
    ],
  };
}


/**
 * Calculates absolute mixture enthalpy (including standard heat of formation and sensible enthalpy)
 * with Peng-Robinson real gas departure.
 */
export function calculateMixtureEnthalpy(
  temperatureK: number,
  pressurePa: number,
  moleFractions: Record<string, number>,
  useRealGas = true
): {
  enthalpyIdealJouleMol: number;
  departureEnthalpyJouleMol: number;
  enthalpyRealJouleMol: number;
  molarMassKgMol: number;
  enthalpyRealJouleKg: number;
  heatCapacityRealMassJKgK: number;
  deltaReactionEnthalpyRealJMol: number;
} {
  const T = Math.max(temperatureK, 200.0);
  const P = Math.max(pressurePa, 10000.0);

  // Always include key reaction species N2, H2, NH3 plus any other specified species (e.g. Ar)
  const candidateKeys = new Set([...Object.keys(moleFractions), 'N2', 'H2', 'NH3']);
  const activeKeys = Array.from(candidateKeys).filter(
    k => k in NIST_SPECIES_REGISTRY
  ) as Array<keyof typeof NIST_SPECIES_REGISTRY>;

  const totalY = activeKeys.reduce((acc, k) => acc + (moleFractions[k] || 0), 0);
  const y: Record<string, number> = {};
  for (const k of activeKeys) {
    y[k] = (moleFractions[k] || 0) / (totalY || 1.0);
  }

  let meanMolarMass = 0.0;
  let hIdealMix = 0.0;

  for (const k of activeKeys) {
    const sp = NIST_SPECIES_REGISTRY[k];
    meanMolarMass += y[k] * sp.molarMass.value;
    const hf298 = sp.standardEnthalpyFormation298?.value ?? 0.0;
    const hSens = evaluateShomateEnthalpy(sp, T) - evaluateShomateEnthalpy(sp, 298.15);
    const hi = hf298 + hSens;
    hIdealMix += y[k] * hi;
  }

  const prState = calculatePengRobinsonState(T, P, y);
  const departureH = useRealGas ? prState.departureEnthalpyJouleMol : 0.0;
  const hRealMix = hIdealMix + departureH;
  const hRealMass = hRealMix / Math.max(meanMolarMass, 1e-4);

  // Compute real heat capacity by central finite difference (deltaT = 0.5 K)
  const deltaT = 0.5;
  const prPlus = calculatePengRobinsonState(T + deltaT, P, y);
  const prMinus = calculatePengRobinsonState(T - deltaT, P, y);
  let cpIdealMolar = 0.0;
  for (const k of activeKeys) {
    cpIdealMolar += y[k] * evaluateShomateCp(NIST_SPECIES_REGISTRY[k], T);
  }
  const dDepartureH_dT = useRealGas
    ? (prPlus.departureEnthalpyJouleMol - prMinus.departureEnthalpyJouleMol) / (2.0 * deltaT)
    : 0.0;
  const cpRealMolar = cpIdealMolar + dDepartureH_dT;
  const cpRealMass = cpRealMolar / Math.max(meanMolarMass, 1e-4);

  // Reaction enthalpy for 0.5 N2 + 1.5 H2 <=> NH3
  const rxnEq = calculateReactionEquilibrium(T, P, {
    yN2: y.N2 || 0.25,
    yH2: y.H2 || 0.75,
    yNH3: y.NH3 || 0.05,
    yInert: (y.Ar || 0) + (y.CH4 || 0) + (y.He || 0),
  });
  const dHrIdeal = rxnEq.deltaReactionEnthalpyJMol; // J/mol NH3

  // Pure component departures for reaction enthalpy correction
  const prNH3 = calculatePengRobinsonState(T, P, { NH3: 1.0 });
  const prN2 = calculatePengRobinsonState(T, P, { N2: 1.0 });
  const prH2 = calculatePengRobinsonState(T, P, { H2: 1.0 });
  const dHrDeparture = useRealGas
    ? prNH3.departureEnthalpyJouleMol - 0.5 * prN2.departureEnthalpyJouleMol - 1.5 * prH2.departureEnthalpyJouleMol
    : 0.0;
  const dHrReal = Math.abs(dHrIdeal + dHrDeparture);

  return {
    enthalpyIdealJouleMol: hIdealMix,
    departureEnthalpyJouleMol: departureH,
    enthalpyRealJouleMol: hRealMix,
    molarMassKgMol: meanMolarMass,
    enthalpyRealJouleKg: hRealMass,
    heatCapacityRealMassJKgK: cpRealMass,
    deltaReactionEnthalpyRealJMol: dHrReal,
  };
}

/**
 * Calculates exact partial molar enthalpies \bar{h}_i(T, P, y) for all active species
 * in the multicomponent mixture using Peng-Robinson EOS and NIST Shomate ideal enthalpies.
 * 
 * By definition: \bar{h}_i = h_i^0(T) + \bar{h}_i^dep(T, P, y)
 * where \bar{h}_i^dep = d(n_tot * H^dep_mix) / dn_i
 */
export function calculateSpeciesPartialMolarEnthalpies(
  temperatureK: number,
  pressurePa: number,
  moleFractions: Record<string, number>,
  useRealGas = true
): {
  partialMolarEnthalpiesJouleMol: Record<string, number>;
  partialMolarDeparturesJouleMol: Record<string, number>;
  pureIdealEnthalpiesJouleMol: Record<string, number>;
  mixtureMolarEnthalpyJouleMol: number;
  eulerSumDiscrepancyJouleMol: number;
  deltaReactionEnthalpyPartialMolarRealJMol: number;
} {
  const T = Math.max(temperatureK, 200.0);
  const P = Math.max(pressurePa, 10000.0);

  // Always include key reaction species N2, H2, NH3 plus any other specified species (e.g. Ar)
  const candidateKeys = new Set([...Object.keys(moleFractions), 'N2', 'H2', 'NH3']);
  const activeKeys = Array.from(candidateKeys).filter(
    k => k in NIST_SPECIES_REGISTRY
  ) as Array<keyof typeof NIST_SPECIES_REGISTRY>;

  const totalY = activeKeys.reduce((acc, k) => acc + (moleFractions[k] || 0), 0);
  const y: Record<string, number> = {};
  for (const k of activeKeys) {
    y[k] = (moleFractions[k] || 0) / (totalY || 1.0);
  }

  // Base state
  const basePR = calculatePengRobinsonState(T, P, y);
  const baseDep = useRealGas ? basePR.departureEnthalpyJouleMol : 0.0;

  const partialMolarEnthalpies: Record<string, number> = {};
  const partialMolarDepartures: Record<string, number> = {};
  const pureIdealEnthalpies: Record<string, number> = {};

  // Compute partial molar departure by central/forward finite perturbation of mole number:
  // n_tot = 1.0 mol base. For species i: n_i +/- delta_n, then re-normalize y
  const deltaN = 1e-6; // 1 micromole perturbation

  for (const k of activeKeys) {
    const sp = NIST_SPECIES_REGISTRY[k];
    const hf298 = sp.standardEnthalpyFormation298?.value ?? 0.0;
    const hSens = evaluateShomateEnthalpy(sp, T) - evaluateShomateEnthalpy(sp, 298.15);
    const hiIdeal = hf298 + hSens;
    pureIdealEnthalpies[k] = hiIdeal;

    let hBarDep = 0.0;
    if (useRealGas) {
      if ((y[k] || 0) >= deltaN) {
        // Central perturbation
        const yPlus: Record<string, number> = {};
        const nTotPlus = 1.0 + deltaN;
        for (const j of activeKeys) {
          const nj = (y[j] || 0) + (j === k ? deltaN : 0.0);
          yPlus[j] = nj / nTotPlus;
        }
        const prPlus = calculatePengRobinsonState(T, P, yPlus);
        const HtotPlus = nTotPlus * prPlus.departureEnthalpyJouleMol;

        const yMinus: Record<string, number> = {};
        const nTotMinus = 1.0 - deltaN;
        for (const j of activeKeys) {
          const nj = Math.max(0.0, (y[j] || 0) - (j === k ? deltaN : 0.0));
          yMinus[j] = nj / nTotMinus;
        }
        const prMinus = calculatePengRobinsonState(T, P, yMinus);
        const HtotMinus = nTotMinus * prMinus.departureEnthalpyJouleMol;

        hBarDep = (HtotPlus - HtotMinus) / (2.0 * deltaN);
      } else {
        // Forward perturbation for species with zero/near-zero mole fraction
        const yPlus: Record<string, number> = {};
        const nTotPlus = 1.0 + deltaN;
        for (const j of activeKeys) {
          const nj = (y[j] || 0) + (j === k ? deltaN : 0.0);
          yPlus[j] = nj / nTotPlus;
        }
        const prPlus = calculatePengRobinsonState(T, P, yPlus);
        const HtotPlus = nTotPlus * prPlus.departureEnthalpyJouleMol;
        const HtotBase = 1.0 * baseDep;

        hBarDep = (HtotPlus - HtotBase) / deltaN;
      }
    }

    partialMolarDepartures[k] = hBarDep;
    partialMolarEnthalpies[k] = hiIdeal + hBarDep;
  }

  // Verify Euler's summation identity: H_mix = sum(y_i * \bar{h}_i)
  let eulerH = 0.0;
  for (const k of activeKeys) {
    eulerH += y[k] * partialMolarEnthalpies[k];
  }
  const mixH = calculateMixtureEnthalpy(T, P, y, useRealGas).enthalpyRealJouleMol;
  const eulerDiff = Math.abs(eulerH - mixH);

  // Exact reaction enthalpy for 0.5 N2 + 1.5 H2 <=> NH3 in real gas mixture
  const hNH3 = partialMolarEnthalpies.NH3 ?? (pureIdealEnthalpies.NH3 ?? -45900.0);
  const hN2 = partialMolarEnthalpies.N2 ?? (pureIdealEnthalpies.N2 ?? 0.0);
  const hH2 = partialMolarEnthalpies.H2 ?? (pureIdealEnthalpies.H2 ?? 0.0);

  // Exothermic synthesis: Delta_r H = h_NH3 - 0.5 h_N2 - 1.5 h_H2
  // We report positive magnitude in J/mol NH3 for consistency with code's energy source term
  const dHrPartialMolarReal = Math.abs(hNH3 - 0.5 * hN2 - 1.5 * hH2);

  return {
    partialMolarEnthalpiesJouleMol: partialMolarEnthalpies,
    partialMolarDeparturesJouleMol: partialMolarDepartures,
    pureIdealEnthalpiesJouleMol: pureIdealEnthalpies,
    mixtureMolarEnthalpyJouleMol: mixH,
    eulerSumDiscrepancyJouleMol: eulerDiff,
    deltaReactionEnthalpyPartialMolarRealJMol: dHrPartialMolarReal,
  };
}

/**
 * Two Independent Implementations of Axial Temperature Gradient (dT/dz):
 * 
 * Formulation 1: Partial Molar Total Flow Enthalpy Balance
 *   dT/dz = [ -Delta_r H_real * xi' - U*pi*Dt*(T - Tw) - n_tot*(dh/dP)_T * dP/dz ] / (sum n_i * c_p,i)
 * 
 * Formulation 2: Mixture Property Differential Formulation
 *   dT/dz = [ -U*pi*Dt*(T - Tw) - n_tot*(dh/dP)_T * dP/dz - (h*dn_tot/dz + n_tot * sum (dh/dy_j)*dy_j/dz) ] / (n_tot * c_p,mix)
 */
export function evaluateEnergyBalanceBothFormulations(
  T: number,
  P: number,
  moleFractions: Record<string, number>,
  mDotKgS: number,
  dP_dz: number,
  rObsMolKgS: number, // Reaction rate per kg catalyst
  rhoBedKgM3: number, // Catalyst bed active density
  tubeDiameterM: number,
  wallTemperatureK: number,
  coolingCoefficientU: number,
  useRealGas = true
): {
  dT_dz_Formulation1_PartialMolar: number;
  dT_dz_Formulation2_MixtureDifferential: number;
  discrepancyKPerM: number;
  relativeDiscrepancy: number;
  reactionHeatGenWPerM: number;
  compositionTermFormulation2WPerM: number;
  compositionEquivalenceErrorWPerM: number;
  deltaReactionEnthalpyJMol: number;
} {
  // Always include key reaction species N2, H2, NH3 plus any other specified species (e.g. Ar)
  const candidateKeys = new Set([...Object.keys(moleFractions), 'N2', 'H2', 'NH3']);
  const activeKeys = Array.from(candidateKeys).filter(
    k => k in NIST_SPECIES_REGISTRY
  ) as Array<keyof typeof NIST_SPECIES_REGISTRY>;

  const totalY = activeKeys.reduce((acc, k) => acc + (moleFractions[k] || 0), 0);
  const y: Record<string, number> = {};
  for (const k of activeKeys) {
    y[k] = (moleFractions[k] || 0) / (totalY || 1.0);
  }

  const Abed = (Math.PI / 4.0) * Math.pow(tubeDiameterM, 2);
  const xiPrime = rhoBedKgM3 * Abed * rObsMolKgS; // mol NH3 generated / (m · s)

  // Partial molar calculations
  const pmData = calculateSpeciesPartialMolarEnthalpies(T, P, y, useRealGas);
  const mixData = calculateMixtureEnthalpy(T, P, y, useRealGas);

  const meanMolarMass = mixData.molarMassKgMol;
  const nDotTotal = mDotKgS / Math.max(meanMolarMass, 1e-4); // mol/s

  const qWall = coolingCoefficientU * (Math.PI * tubeDiameterM) * (T - wallTemperatureK); // W/m loss

  // Pressure derivative (dh/dP)_T
  const dP_num = 1000.0; // 1 kPa perturbation
  const hPplus = calculateMixtureEnthalpy(T, P + dP_num, y, useRealGas).enthalpyRealJouleMol;
  const hPminus = calculateMixtureEnthalpy(T, Math.max(10000.0, P - dP_num), y, useRealGas).enthalpyRealJouleMol;
  const dh_dP_T_molar = (hPplus - hPminus) / (2.0 * dP_num); // J/(mol·Pa)
  const qJouleThomson = - nDotTotal * dh_dP_T_molar * dP_dz; // W/m

  // --- Formulation 1: Partial Molar ---
  const dHrReal = pmData.deltaReactionEnthalpyPartialMolarRealJMol; // J/mol NH3
  const heatGen1 = xiPrime * dHrReal; // W/m
  const cpMixMolar = mixData.heatCapacityRealMassJKgK * meanMolarMass; // J/(mol·K)
  const totalHeatCapacityFlow = nDotTotal * cpMixMolar; // W/K

  const dT_dz_1 = (heatGen1 - qWall + qJouleThomson) / Math.max(totalHeatCapacityFlow, 1e-8);

  // --- Formulation 2: Mixture Differential with explicit composition derivatives ---
  // Species flow rates: dn_NH3/dz = xiPrime, dn_N2/dz = -0.5*xiPrime, dn_H2/dz = -1.5*xiPrime
  // Total molar flow change: dn_tot/dz = dn_NH3/dz + dn_N2/dz + dn_H2/dz = - xiPrime
  const dnTot_dz = - xiPrime;

  // dy_i/dz = d(n_i / n_tot)/dz = (1/n_tot) * (dn_i/dz - y_i * dn_tot/dz)
  const dy_dz: Record<string, number> = {};
  for (const k of activeKeys) {
    let dni_dz = 0.0;
    if (k === 'NH3') dni_dz = xiPrime;
    else if (k === 'N2') dni_dz = -0.5 * xiPrime;
    else if (k === 'H2') dni_dz = -1.5 * xiPrime;

    dy_dz[k] = (1.0 / nDotTotal) * (dni_dz - y[k] * dnTot_dz);
  }

  // Central difference for (dh/dy_j)_{T,P}
  let sumDhDyTimesDyDz = 0.0;
  const hBase = mixData.enthalpyRealJouleMol;
  const dyPert = 1e-6;

  for (const k of activeKeys) {
    let dh_dy_k = 0.0;
    if ((y[k] || 0) >= dyPert) {
      const yPertPlus: Record<string, number> = { ...y, [k]: y[k] + dyPert };
      const yPertMinus: Record<string, number> = { ...y, [k]: y[k] - dyPert };
      const hPlus = calculateMixtureEnthalpy(T, P, yPertPlus, useRealGas).enthalpyRealJouleMol;
      const hMinus = calculateMixtureEnthalpy(T, P, yPertMinus, useRealGas).enthalpyRealJouleMol;
      dh_dy_k = (hPlus - hMinus) / (2.0 * dyPert);
    } else {
      const yPertPlus: Record<string, number> = { ...y, [k]: (y[k] || 0) + dyPert };
      const hPlus = calculateMixtureEnthalpy(T, P, yPertPlus, useRealGas).enthalpyRealJouleMol;
      dh_dy_k = (hPlus - hBase) / dyPert;
    }

    sumDhDyTimesDyDz += dh_dy_k * (dy_dz[k] || 0.0);
  }

  // Exact identity: Composition enthalpy generation rate = - (h * dn_tot/dz + n_tot * sum(dh/dy_j * dy_j/dz))
  const compositionTerm = - (hBase * dnTot_dz + nDotTotal * sumDhDyTimesDyDz); // W/m

  const dT_dz_2 = (compositionTerm - qWall + qJouleThomson) / Math.max(totalHeatCapacityFlow, 1e-8);

  const discrepancy = Math.abs(dT_dz_1 - dT_dz_2);
  const relDiscrepancy = discrepancy / (Math.abs(dT_dz_1) + 1e-8);
  const compEquivError = Math.abs(heatGen1 - compositionTerm);

  return {
    dT_dz_Formulation1_PartialMolar: dT_dz_1,
    dT_dz_Formulation2_MixtureDifferential: dT_dz_2,
    discrepancyKPerM: discrepancy,
    relativeDiscrepancy: relDiscrepancy,
    reactionHeatGenWPerM: heatGen1,
    compositionTermFormulation2WPerM: compositionTerm,
    compositionEquivalenceErrorWPerM: compEquivError,
    deltaReactionEnthalpyJMol: dHrReal,
  };
}
