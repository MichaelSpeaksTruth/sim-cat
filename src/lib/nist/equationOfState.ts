/**
 * Rigorous Thermodynamic Equation of State: Peng-Robinson (1976)
 * Real-gas compressibility factor Z(T,P), density rho(T,P), and component fugacities f_i(T,P)
 * for high-pressure Haber-Bosch ammonia synthesis (100 - 350 bar, 600 - 800 K)
 * 
 * References:
 * 1. Peng, D.Y., Robinson, D.B., "A New Two-Constant Equation of State", Ind. Eng. Chem. Fundam. 15 (1976) 59-64
 * 2. Poling, B.E., Prausnitz, J.M., O'Connell, J.P., "The Properties of Gases and Liquids", 5th Edition (2001)
 */

import { NIST_SPECIES_REGISTRY } from './speciesRegistry';
import { RealGasState } from './types';

const R_UNIVERSAL = 8.314462618; // J/(mol·K)

// Standard literature binary interaction parameters k_ij for ammonia synthesis components
// (Poling et al., 2001; Dyson & Baddour, 1968)
const BINARY_INTERACTION_K_IJ: Record<string, Record<string, number>> = {
  N2:  { N2: 0.0, H2: 0.00, NH3: 0.080, Ar: 0.000, CH4: 0.030, He: 0.0 },
  H2:  { N2: 0.0, H2: 0.00, NH3: 0.090, Ar: 0.000, CH4: 0.030, He: 0.0 },
  NH3: { N2: 0.080, H2: 0.090, NH3: 0.0, Ar: 0.080, CH4: 0.085, He: 0.0 },
  Ar:  { N2: 0.000, H2: 0.000, NH3: 0.080, Ar: 0.0, CH4: 0.010, He: 0.0 },
  CH4: { N2: 0.030, H2: 0.030, NH3: 0.085, Ar: 0.010, CH4: 0.0, He: 0.0 },
  He:  { N2: 0.0, H2: 0.0, NH3: 0.0, Ar: 0.0, CH4: 0.0, He: 0.0 },
};

/**
 * Solves the Peng-Robinson cubic polynomial:
 * Z^3 + c2 * Z^2 + c1 * Z + c0 = 0
 * Returns the vapor-like root (largest real root) for gases/supercritical fluids.
 */
export function solveCubicPengRobinson(A: number, B: number): number {
  const c2 = -(1.0 - B);
  const c1 = A - 3.0 * Math.pow(B, 2) - 2.0 * B;
  const c0 = -(A * B - Math.pow(B, 2) - Math.pow(B, 3));

  // Depressed cubic form: y^3 + p*y + q = 0, with Z = y - c2/3
  const p = c1 - Math.pow(c2, 2) / 3.0;
  const q = (2.0 * Math.pow(c2, 3)) / 27.0 - (c2 * c1) / 3.0 + c0;
  const discriminant = Math.pow(q / 2.0, 2) + Math.pow(p / 3.0, 3);

  let roots: number[] = [];

  if (discriminant > 1e-12) {
    // One real root
    const sqrtD = Math.sqrt(discriminant);
    const u = Math.cbrt(-q / 2.0 + sqrtD);
    const v = Math.cbrt(-q / 2.0 - sqrtD);
    roots = [u + v - c2 / 3.0];
  } else if (Math.abs(discriminant) <= 1e-12) {
    // Three real roots, at least two are equal
    const u = Math.cbrt(-q / 2.0);
    roots = [2.0 * u - c2 / 3.0, -u - c2 / 3.0];
  } else {
    // Three distinct real roots (trigonometric method)
    const r = Math.sqrt(-Math.pow(p, 3) / 27.0);
    const phi = Math.acos(Math.max(-1.0, Math.min(1.0, -q / (2.0 * r))));
    const m = 2.0 * Math.cbrt(r);
    roots = [
      m * Math.cos(phi / 3.0) - c2 / 3.0,
      m * Math.cos((phi + 2.0 * Math.PI) / 3.0) - c2 / 3.0,
      m * Math.cos((phi + 4.0 * Math.PI) / 3.0) - c2 / 3.0,
    ];
  }

  // Filter physically meaningful roots: Z > B (molar volume v > b)
  const validRoots = roots.filter(r => r > B && r > 0.1 && r < 5.0);
  if (validRoots.length === 0) {
    // Ideal gas fallback if unphysical
    return 1.0;
  }

  // For gas/supercritical ammonia reactor conditions, the largest real root corresponds to the vapor phase
  return Math.max(...validRoots);
}

/**
 * Calculates high-pressure Peng-Robinson real gas mixture state
 * @param temperatureK Temperature in Kelvin
 * @param pressurePa Total absolute pressure in Pa
 * @param moleFractions Map of species ID ('N2', 'H2', 'NH3', 'Ar', 'CH4', 'He') to mole fraction
 */
export function calculatePengRobinsonState(
  temperatureK: number,
  pressurePa: number,
  moleFractions: Record<string, number>
): RealGasState {
  const T = Math.max(temperatureK, 200.0);
  const P = Math.max(pressurePa, 10000.0);

  // Normalize mole fractions
  const keys = Object.keys(moleFractions).filter(k => k in NIST_SPECIES_REGISTRY && moleFractions[k] > 0);
  const totalSum = keys.reduce((acc, k) => acc + (moleFractions[k] || 0), 0);
  const y: Record<string, number> = {};
  for (const k of keys) {
    y[k] = (moleFractions[k] || 0) / (totalSum || 1.0);
  }

  // Pure component Peng-Robinson parameters a_i(T) and b_i
  const a_pure: Record<string, number> = {};
  const b_pure: Record<string, number> = {};
  let meanMolarMass = 0.0;

  for (const k of keys) {
    const sp = NIST_SPECIES_REGISTRY[k as keyof typeof NIST_SPECIES_REGISTRY];
    meanMolarMass += y[k] * sp.molarMass.value;

    const Tc = sp.criticalTemperature.value;
    const Pc = sp.criticalPressure.value;
    const omega = sp.acentricFactor.value;

    const Tr = T / Tc;
    // Peng-Robinson alpha formulation
    const m = 0.37464 + 1.54226 * omega - 0.26992 * Math.pow(omega, 2);
    const alpha = Math.pow(1.0 + m * (1.0 - Math.sqrt(Tr)), 2);

    const a_i = 0.45724 * (Math.pow(R_UNIVERSAL * Tc, 2) / Pc) * alpha;
    const b_i = 0.07780 * (R_UNIVERSAL * Tc / Pc);

    a_pure[k] = a_i;
    b_pure[k] = b_i;
  }

  // Quadratic mixing rules: a_mix and b_mix
  let a_mix = 0.0;
  let b_mix = 0.0;

  for (const i of keys) {
    b_mix += y[i] * b_pure[i];
    for (const j of keys) {
      const kij = BINARY_INTERACTION_K_IJ[i]?.[j] ?? 0.0;
      const a_ij = Math.sqrt(a_pure[i] * a_pure[j]) * (1.0 - kij);
      a_mix += y[i] * y[j] * a_ij;
    }
  }

  // Dimensionless cubic constants
  const A = (a_mix * P) / Math.pow(R_UNIVERSAL * T, 2);
  const B = (b_mix * P) / (R_UNIVERSAL * T);

  // Solve for compressibility factor Z
  const Z = solveCubicPengRobinson(A, B);

  // Molar volume and real gas density
  const v_molar = (Z * R_UNIVERSAL * T) / P; // m³/mol
  const density = meanMolarMass / Math.max(v_molar, 1e-9); // kg/m³

  // Component fugacity coefficients phi_i and fugacities f_i
  const fugacityCoefficients: Record<string, number> = {};
  const fugacitiesPa: Record<string, number> = {};

  const sqrt2 = Math.SQRT2;
  const logTerm = Math.log(Math.max((Z + (1.0 + sqrt2) * B) / (Z + (1.0 - sqrt2) * B), 1e-12));

  for (const i of keys) {
    let sumCrossA = 0.0;
    for (const j of keys) {
      const kij = BINARY_INTERACTION_K_IJ[i]?.[j] ?? 0.0;
      const a_ij = Math.sqrt(a_pure[i] * a_pure[j]) * (1.0 - kij);
      sumCrossA += y[j] * a_ij;
    }

    const biOverB = b_pure[i] / Math.max(b_mix, 1e-12);
    const term1 = biOverB * (Z - 1.0);
    const term2 = Math.log(Math.max(Z - B, 1e-12));
    const term3 = (A / (2.0 * sqrt2 * Math.max(B, 1e-12))) * ((2.0 * sumCrossA / Math.max(a_mix, 1e-12)) - biOverB) * logTerm;

    const lnPhi = term1 - term2 - term3;
    const phi_i = Math.exp(Math.max(-10.0, Math.min(10.0, lnPhi)));
    fugacityCoefficients[i] = phi_i;
    fugacitiesPa[i] = phi_i * y[i] * P;
  }

  // Residual/departure enthalpy H - H_ideal [J/mol]
  // In PR-EOS: (H - H_ideal) = R*T*(Z - 1) + [T*(da/dT) - a] / (2*sqrt(2)*b) * ln(...)
  let da_dT_mix = 0.0;
  for (const i of keys) {
    const spI = NIST_SPECIES_REGISTRY[i as keyof typeof NIST_SPECIES_REGISTRY];
    const TcI = spI.criticalTemperature.value;
    const PcI = spI.criticalPressure.value;
    const omegaI = spI.acentricFactor.value;
    const mI = 0.37464 + 1.54226 * omegaI - 0.26992 * Math.pow(omegaI, 2);
    const dAlpha_dT_i = - (mI / Math.sqrt(T * TcI)) * (1.0 + mI * (1.0 - Math.sqrt(T / TcI)));
    const da_dT_i = 0.45724 * (Math.pow(R_UNIVERSAL * TcI, 2) / PcI) * dAlpha_dT_i;

    for (const j of keys) {
      const spJ = NIST_SPECIES_REGISTRY[j as keyof typeof NIST_SPECIES_REGISTRY];
      const TcJ = spJ.criticalTemperature.value;
      const PcJ = spJ.criticalPressure.value;
      const omegaJ = spJ.acentricFactor.value;
      const mJ = 0.37464 + 1.54226 * omegaJ - 0.26992 * Math.pow(omegaJ, 2);
      const dAlpha_dT_j = - (mJ / Math.sqrt(T * TcJ)) * (1.0 + mJ * (1.0 - Math.sqrt(T / TcJ)));
      const da_dT_j = 0.45724 * (Math.pow(R_UNIVERSAL * TcJ, 2) / PcJ) * dAlpha_dT_j;

      const kij = BINARY_INTERACTION_K_IJ[i]?.[j] ?? 0.0;
      const d_aij_dT = 0.5 * (Math.sqrt(a_pure[j] / Math.max(a_pure[i], 1e-12)) * da_dT_i + 
                              Math.sqrt(a_pure[i] / Math.max(a_pure[j], 1e-12)) * da_dT_j) * (1.0 - kij);
      da_dT_mix += y[i] * y[j] * d_aij_dT;
    }
  }

  const departureEnthalpy = R_UNIVERSAL * T * (Z - 1.0) +
    ((T * da_dT_mix - a_mix) / (2.0 * sqrt2 * Math.max(b_mix, 1e-12))) * logTerm;

  return {
    compressibilityFactorZ: Z,
    densityKgM3: density,
    molarVolumeM3Mol: v_molar,
    fugacityCoefficients,
    fugacitiesPa,
    departureEnthalpyJouleMol: departureEnthalpy,
    eosModel: 'Peng-Robinson (1976)',
  };
}
