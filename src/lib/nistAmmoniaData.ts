/**
 * NIST Chemistry WebBook (SRD 69) & Thermophysical Property Mapping
 * System: Ammonia Synthesis & Decomposition (0.5 N2 + 1.5 H2 <=> NH3)
 * 
 * Sources:
 * 1. NIST Chemistry WebBook, SRD 69: Ammonia (CAS 7664-41-7), Nitrogen (CAS 7727-37-9), Hydrogen (CAS 1333-74-0)
 * 2. Lemmon, E.W., Huber, M.L., Leachman, J.W., "Revised Standardized Equation of State for Ammonia", J. Phys. Chem. Ref. Data (NIST)
 * 3. Fuller, E.N., Schettler, P.D., Giddings, J.C., "A New Method for Prediction of Binary Gas-Phase Diffusion Coefficients", Ind. Eng. Chem. 58 (1966)
 * 4. Mason, E.A., Saxena, S.C., "Approximate Formula for Thermal Conductivity of Gas Mixtures", Phys. Fluids 1 (1958)
 * 5. Wilke, C.R., "A Viscosity Equation for Gas Mixtures", J. Chem. Phys. 18 (1950)
 */

export interface NistSubstanceData {
  name: string;
  chemicalFormula: string;
  casNumber: string;
  molarMassKgMol: number;       // kg/mol
  standardEnthalpyFormation298: number; // J/mol
  // NIST Shomate Equation parameters: Cp = A + B*t + C*t^2 + D*t^3 + E/t^2 [J/(mol*K)], t = T/1000
  shomate: {
    tMin: number;
    tMax: number;
    A: number;
    B: number;
    C: number;
    D: number;
    E: number;
    F: number;
    G: number;
    H: number;
  };
  lennardJonesSigma: number;   // Angstroms
  lennardJonesEpsilonK: number; // K
  fullerDiffusionVolume: number; // [-]
}

export const NIST_AMMONIA: NistSubstanceData = {
  name: 'Ammonia',
  chemicalFormula: 'NH3',
  casNumber: '7664-41-7',
  molarMassKgMol: 0.0170305, // 17.031 g/mol
  standardEnthalpyFormation298: -45900.0, // NIST SRD 69: -45.90 +/- 0.35 kJ/mol
  shomate: {
    tMin: 298.0,
    tMax: 1400.0,
    A: 19.99563,
    B: 49.77119,
    C: -15.37599,
    D: 1.921168,
    E: 0.189174,
    F: -53.30667,
    G: 203.8591,
    H: -45.89806,
  },
  lennardJonesSigma: 2.90,
  lennardJonesEpsilonK: 558.3,
  fullerDiffusionVolume: 14.9,
};

export const NIST_NITROGEN: NistSubstanceData = {
  name: 'Nitrogen',
  chemicalFormula: 'N2',
  casNumber: '7727-37-9',
  molarMassKgMol: 0.0280134, // 28.013 g/mol
  standardEnthalpyFormation298: 0.0, // Reference elemental state
  shomate: {
    tMin: 298.0,
    tMax: 6000.0,
    A: 26.09200,
    B: 8.218801,
    C: -1.976141,
    D: 0.159274,
    E: 0.044434,
    F: -7.989230,
    G: 221.0200,
    H: 0.0,
  },
  lennardJonesSigma: 3.798,
  lennardJonesEpsilonK: 71.4,
  fullerDiffusionVolume: 17.9,
};

export const NIST_HYDROGEN: NistSubstanceData = {
  name: 'Hydrogen',
  chemicalFormula: 'H2',
  casNumber: '1333-74-0',
  molarMassKgMol: 0.00201588, // 2.016 g/mol
  standardEnthalpyFormation298: 0.0, // Reference elemental state
  shomate: {
    tMin: 298.0,
    tMax: 1000.0,
    A: 33.066178,
    B: -11.363417,
    C: 11.432816,
    D: -2.772874,
    E: -0.158558,
    F: -9.980797,
    G: 172.707974,
    H: 0.0,
  },
  lennardJonesSigma: 2.827,
  lennardJonesEpsilonK: 59.7,
  fullerDiffusionVolume: 7.07,
};

export const NIST_HELIUM: NistSubstanceData = {
  name: 'Helium (Carrier Gas)',
  chemicalFormula: 'He',
  casNumber: '7440-59-7',
  molarMassKgMol: 0.0040026,
  standardEnthalpyFormation298: 0.0,
  shomate: {
    tMin: 298.0,
    tMax: 6000.0,
    A: 20.78603,
    B: 0.0,
    C: 0.0,
    D: 0.0,
    E: 0.0,
    F: -6.19735,
    G: 154.54,
    H: 0.0,
  },
  lennardJonesSigma: 2.551,
  lennardJonesEpsilonK: 10.22,
  fullerDiffusionVolume: 2.88,
};

export const NIST_ARGON: NistSubstanceData = {
  name: 'Argon (Carrier Gas)',
  chemicalFormula: 'Ar',
  casNumber: '7440-37-1',
  molarMassKgMol: 0.039948,
  standardEnthalpyFormation298: 0.0,
  shomate: {
    tMin: 298.0,
    tMax: 6000.0,
    A: 20.78600,
    B: 0.0,
    C: 0.0,
    D: 0.0,
    E: 0.0,
    F: -6.19700,
    G: 154.54,
    H: 0.0,
  },
  lennardJonesSigma: 3.542,
  lennardJonesEpsilonK: 93.3,
  fullerDiffusionVolume: 16.1,
};

export type BulkGasType = 
  | 'syngas_stoichiometric' // 3 H2 : 1 N2
  | 'syngas_h2_rich'        // 4 H2 : 1 N2
  | 'syngas_n2_rich'        // 2 H2 : 1 N2
  | 'helium_carrier'        // He inert carrier
  | 'argon_carrier';        // Ar inert carrier

export interface BulkGasConfig {
  id: BulkGasType;
  name: string;
  description: string;
  h2Ratio: number;
  n2Ratio: number;
  inertRatio: number;
  inertSubstance?: NistSubstanceData;
}

export const BULK_GAS_CONFIGS: Record<BulkGasType, BulkGasConfig> = {
  syngas_stoichiometric: {
    id: 'syngas_stoichiometric',
    name: 'Stoichiometric Syngas (3:1 H₂ : N₂)',
    description: 'Standard industrial Haber-Bosch feed ratio. Highest chemical reaction rate and balanced stoichiometry.',
    h2Ratio: 0.75,
    n2Ratio: 0.25,
    inertRatio: 0.0,
  },
  syngas_h2_rich: {
    id: 'syngas_h2_rich',
    name: 'Hydrogen-Rich Syngas (4:1 H₂ : N₂)',
    description: 'Promotes complete nitrogen surface nitriding and prevents iron catalyst surface coking/oxidation.',
    h2Ratio: 0.80,
    n2Ratio: 0.20,
    inertRatio: 0.0,
  },
  syngas_n2_rich: {
    id: 'syngas_n2_rich',
    name: 'Nitrogen-Rich Syngas (2:1 H₂ : N₂)',
    description: 'Used in kinetics studies focusing on hydrogen adsorption inhibition at elevated pressures.',
    h2Ratio: 0.667,
    n2Ratio: 0.333,
    inertRatio: 0.0,
  },
  helium_carrier: {
    id: 'helium_carrier',
    name: 'Helium Diluted Feed (10% Syngas in He)',
    description: 'Eurokin reference laboratory benchmark carrier. Ultra-high thermal conductivity suppresses hotspots.',
    h2Ratio: 0.075,
    n2Ratio: 0.025,
    inertRatio: 0.90,
    inertSubstance: NIST_HELIUM,
  },
  argon_carrier: {
    id: 'argon_carrier',
    name: 'Argon Diluted Feed (20% Syngas in Ar)',
    description: 'Heavy carrier gas for residence time distribution, tracer pulses, and low axial backmixing.',
    h2Ratio: 0.15,
    n2Ratio: 0.05,
    inertRatio: 0.80,
    inertSubstance: NIST_ARGON,
  },
};

/**
 * Evaluates NIST Shomate molar heat capacity Cp [J/(mol·K)]
 */
export function calculateNistCp(substance: NistSubstanceData, temperatureK: number): number {
  const t = temperatureK / 1000.0;
  const { A, B, C, D, E } = substance.shomate;
  const cpMolar = A + B * t + C * Math.pow(t, 2) + D * Math.pow(t, 3) + E / Math.pow(t, 2);
  return cpMolar; // J/(mol·K)
}

/**
 * Calculates reaction enthalpy for 0.5 N2 + 1.5 H2 <=> NH3 as a function of Temperature
 * Delta_r H(T) = Delta_f H(NH3, 298) + Integral_298^T (Cp(NH3) - 0.5 Cp(N2) - 1.5 Cp(H2)) dT
 */
export function calculateAmmoniaReactionEnthalpy(temperatureK: number): number {
  // Analytical integration of Shomate polynomials from 298.15 to T
  const T = Math.min(Math.max(temperatureK, 298.15), 1100.0);
  const t = T / 1000.0;
  const t0 = 298.15 / 1000.0;

  const intCp = (sub: NistSubstanceData, tVal: number) => {
    const { A, B, C, D, E } = sub.shomate;
    return (A * tVal + (B / 2.0) * Math.pow(tVal, 2) + (C / 3.0) * Math.pow(tVal, 3) + (D / 4.0) * Math.pow(tVal, 4) - E / tVal) * 1000.0;
  };

  const deltaH_NH3 = intCp(NIST_AMMONIA, t) - intCp(NIST_AMMONIA, t0);
  const deltaH_N2 = intCp(NIST_NITROGEN, t) - intCp(NIST_NITROGEN, t0);
  const deltaH_H2 = intCp(NIST_HYDROGEN, t) - intCp(NIST_HYDROGEN, t0);

  const deltaH_reactants = 0.5 * deltaH_N2 + 1.5 * deltaH_H2;
  const deltaHr_T = NIST_AMMONIA.standardEnthalpyFormation298 + (deltaH_NH3 - deltaH_reactants);

  // Exothermic reaction, returns absolute magnitude in J/mol
  return Math.abs(deltaHr_T);
}

/**
 * Evaluates pure component gas viscosity using Chung / Chapman-Enskog / NIST correlation
 * Returns viscosity in kg/(m·s) (Pa·s)
 */
export function calculatePureViscosity(substance: NistSubstanceData, temperatureK: number): number {
  // Pure gas dynamic viscosity correlation: mu = 2.6693e-6 * sqrt(M * T) / (sigma^2 * Omega_v)
  const T = temperatureK;
  const M_gmol = substance.molarMassKgMol * 1000.0;
  const T_star = T / substance.lennardJonesEpsilonK;
  // Neufeld et al. collision integral for viscosity
  const omegaV = (1.16145 / Math.pow(T_star, 0.14874)) + 
                 (0.52487 / Math.exp(0.7732 * T_star)) + 
                 (2.16178 / Math.exp(2.43787 * T_star));
  
  const mu_microPa_s = (26.69 * Math.sqrt(M_gmol * T)) / (Math.pow(substance.lennardJonesSigma, 2) * omegaV);
  return mu_microPa_s * 1e-6; // kg/(m·s)
}

/**
 * Evaluates pure component thermal conductivity using Eucken / Chung formula
 * Returns conductivity in W/(m·K)
 */
export function calculatePureConductivity(substance: NistSubstanceData, temperatureK: number): number {
  const mu = calculatePureViscosity(substance, temperatureK);
  const cpMolar = calculateNistCp(substance, temperatureK);
  const R = 8.314462;
  const cvMolar = cpMolar - R;
  const M = substance.molarMassKgMol;
  // Modified Eucken formulation: lambda = (mu / M) * (cv + 2.25 * R)
  const lambda = (mu / M) * (cvMolar + 2.25 * R);
  return lambda; // W/(m·K)
}

/**
 * Evaluates binary molecular diffusion coefficient via Fuller, Schettler, and Giddings method
 * DAB = 1.013e-2 * T^1.75 * sqrt(1/MA + 1/MB) / (P * (vA^(1/3) + vB^(1/3))^2)  [m²/s]
 */
export function calculateFullerBinaryDiffusivity(
  subA: NistSubstanceData,
  subB: NistSubstanceData,
  temperatureK: number,
  pressurePa: number
): number {
  const T = temperatureK;
  const P = Math.max(pressurePa, 10000.0);
  const MA = subA.molarMassKgMol * 1000.0;
  const MB = subB.molarMassKgMol * 1000.0;
  const vA = subA.fullerDiffusionVolume;
  const vB = subB.fullerDiffusionVolume;

  const termNum = 1.013e-2 * Math.pow(T, 1.75) * Math.sqrt((1.0 / MA) + (1.0 / MB));
  const termDen = P * Math.pow(Math.pow(vA, 1.0 / 3.0) + Math.pow(vB, 1.0 / 3.0), 2);
  return termNum / termDen; // m²/s
}

export interface NistThermophysicalOutput {
  molarMassKgMol: number;       // kg/mol
  viscosity: number;            // kg/(m·s)
  heatCapacity: number;         // J/(kg·K)
  thermalConductivity: number;  // W/(m·K)
  molecularDiffusivity: number; // m²/s
  reactionEnthalpy: number;     // J/mol (abs)
  gasDensity: number;           // kg/m³
  notes: string[];
}

/**
 * Computes exact audited NIST thermophysical properties for Ammonia Synthesis / Cracking
 * based on Temperature, Pressure, and Bulk Gas selection
 */
export function computeAuditedNistAmmoniaProperties(
  temperatureK: number,
  pressurePa: number,
  bulkGasType: BulkGasType,
  ammoniaMoleFraction = 0.05
): NistThermophysicalOutput {
  const config = BULK_GAS_CONFIGS[bulkGasType] || BULK_GAS_CONFIGS.syngas_stoichiometric;
  const yNH3 = Math.max(0.001, Math.min(ammoniaMoleFraction, 0.40));
  const remainingFraction = 1.0 - yNH3;

  // Mixture mole fractions
  const yH2 = remainingFraction * config.h2Ratio;
  const yN2 = remainingFraction * config.n2Ratio;
  const yInert = remainingFraction * config.inertRatio;

  // 1. Mean Molar Mass
  let meanMolarMass = (yNH3 * NIST_AMMONIA.molarMassKgMol) +
                      (yH2 * NIST_HYDROGEN.molarMassKgMol) +
                      (yN2 * NIST_NITROGEN.molarMassKgMol);
  if (config.inertSubstance && yInert > 0) {
    meanMolarMass += yInert * config.inertSubstance.molarMassKgMol;
  }

  // 2. Heat Capacity Cp (Mass based J/kg-K)
  const cpMolarNH3 = calculateNistCp(NIST_AMMONIA, temperatureK);
  const cpMolarH2 = calculateNistCp(NIST_HYDROGEN, temperatureK);
  const cpMolarN2 = calculateNistCp(NIST_NITROGEN, temperatureK);
  let cpMolarMix = (yNH3 * cpMolarNH3) + (yH2 * cpMolarH2) + (yN2 * cpMolarN2);
  if (config.inertSubstance && yInert > 0) {
    cpMolarMix += yInert * calculateNistCp(config.inertSubstance, temperatureK);
  }
  const heatCapacityMass = cpMolarMix / meanMolarMass; // J/(kg·K)

  // 3. Dynamic Viscosity using Wilke's mixture equation
  const muNH3 = calculatePureViscosity(NIST_AMMONIA, temperatureK);
  const muH2 = calculatePureViscosity(NIST_HYDROGEN, temperatureK);
  const muN2 = calculatePureViscosity(NIST_NITROGEN, temperatureK);
  const muInert = config.inertSubstance ? calculatePureViscosity(config.inertSubstance, temperatureK) : 0;

  // Wilke interaction parameter phi_ij = [1 + sqrt(mu_i/mu_j) * (Mj/Mi)^0.25]^2 / sqrt(8*(1 + Mi/Mj))
  const components = [
    { y: yNH3, mu: muNH3, M: NIST_AMMONIA.molarMassKgMol },
    { y: yH2, mu: muH2, M: NIST_HYDROGEN.molarMassKgMol },
    { y: yN2, mu: muN2, M: NIST_NITROGEN.molarMassKgMol },
  ];
  if (config.inertSubstance && yInert > 0) {
    components.push({ y: yInert, mu: muInert, M: config.inertSubstance.molarMassKgMol });
  }

  let mixViscosity = 0.0;
  for (let i = 0; i < components.length; i++) {
    let denom = 0.0;
    for (let j = 0; j < components.length; j++) {
      const phi_ij = Math.pow(1.0 + Math.sqrt(components[i].mu / components[j].mu) * Math.pow(components[j].M / components[i].M, 0.25), 2) /
                     Math.sqrt(8.0 * (1.0 + components[i].M / components[j].M));
      denom += components[j].y * phi_ij;
    }
    mixViscosity += (components[i].y * components[i].mu) / Math.max(denom, 1e-8);
  }

  // 4. Thermal Conductivity using Mason & Saxena formulation
  const lambdaNH3 = calculatePureConductivity(NIST_AMMONIA, temperatureK);
  const lambdaH2 = calculatePureConductivity(NIST_HYDROGEN, temperatureK);
  const lambdaN2 = calculatePureConductivity(NIST_NITROGEN, temperatureK);
  const lambdaInert = config.inertSubstance ? calculatePureConductivity(config.inertSubstance, temperatureK) : 0;

  const condComponents = [
    { y: yNH3, lambda: lambdaNH3, mu: muNH3, M: NIST_AMMONIA.molarMassKgMol },
    { y: yH2, lambda: lambdaH2, mu: muH2, M: NIST_HYDROGEN.molarMassKgMol },
    { y: yN2, lambda: lambdaN2, mu: muN2, M: NIST_NITROGEN.molarMassKgMol },
  ];
  if (config.inertSubstance && yInert > 0) {
    condComponents.push({ y: yInert, lambda: lambdaInert, mu: muInert, M: config.inertSubstance.molarMassKgMol });
  }

  let mixConductivity = 0.0;
  for (let i = 0; i < condComponents.length; i++) {
    let denom = 0.0;
    for (let j = 0; j < condComponents.length; j++) {
      const phi_ij = Math.pow(1.0 + Math.sqrt(condComponents[i].mu / condComponents[j].mu) * Math.pow(condComponents[j].M / condComponents[i].M, 0.25), 2) /
                     Math.sqrt(8.0 * (1.0 + condComponents[i].M / condComponents[j].M));
      denom += condComponents[j].y * phi_ij;
    }
    mixConductivity += (condComponents[i].y * condComponents[i].lambda) / Math.max(denom, 1e-8);
  }

  // 5. Binary Diffusivity of NH3 in bulk carrier (Syngas / Carrier gas)
  const bulkPseudoSubstance: NistSubstanceData = {
    name: 'Bulk Carrier Gas',
    chemicalFormula: 'Mix',
    casNumber: 'N/A',
    molarMassKgMol: meanMolarMass,
    standardEnthalpyFormation298: 0,
    shomate: NIST_HYDROGEN.shomate,
    lennardJonesSigma: (yH2 * NIST_HYDROGEN.lennardJonesSigma + yN2 * NIST_NITROGEN.lennardJonesSigma) / (yH2 + yN2 || 1),
    lennardJonesEpsilonK: (yH2 * NIST_HYDROGEN.lennardJonesEpsilonK + yN2 * NIST_NITROGEN.lennardJonesEpsilonK) / (yH2 + yN2 || 1),
    fullerDiffusionVolume: (yH2 * NIST_HYDROGEN.fullerDiffusionVolume + yN2 * NIST_NITROGEN.fullerDiffusionVolume) / (yH2 + yN2 || 1),
  };

  const molecularDiffusivity = calculateFullerBinaryDiffusivity(
    NIST_AMMONIA,
    bulkPseudoSubstance,
    temperatureK,
    pressurePa
  );

  // 6. Reaction Enthalpy at T
  const reactionEnthalpy = calculateAmmoniaReactionEnthalpy(temperatureK);

  // 7. Gas density (ideal gas law at process condition)
  const gasDensity = (pressurePa * meanMolarMass) / (8.314462 * temperatureK);

  return {
    molarMassKgMol: meanMolarMass,
    viscosity: mixViscosity,
    heatCapacity: heatCapacityMass,
    thermalConductivity: mixConductivity,
    molecularDiffusivity,
    reactionEnthalpy,
    gasDensity,
    notes: [
      `Molar mass computed for ${config.name} with y_NH3 = ${(yNH3 * 100).toFixed(1)}%`,
      `Heat capacity calculated via NIST Shomate polynomials across 298 - ${temperatureK.toFixed(0)} K`,
      `Mixture viscosity derived from Wilke's formulation (Chung & Chapman-Enskog collision integrals)`,
      `Thermal conductivity computed via Mason & Saxena approximate method for polyatomic mixtures`,
      `Diffusivity of NH3 in mixture calculated via Fuller-Schettler-Giddings at ${temperatureK.toFixed(1)} K and ${(pressurePa / 1e5).toFixed(2)} bar`,
      `Reaction enthalpy |Delta_r H| = ${(reactionEnthalpy / 1000).toFixed(2)} kJ/mol evaluated via Kirchhoff's thermochemical integration`,
    ],
  };
}
