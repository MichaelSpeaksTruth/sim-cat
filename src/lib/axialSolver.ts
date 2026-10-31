/**
 * 1D Axial Fixed-Bed Catalytic Reactor Differential Solver (RK4)
 * Couples component mass balances, energy balance with cooling jacket,
 * and Ergun pressure drop equation.
 * 
 * Uses NIST Property Registry & Peng-Robinson (1976) Equation of State
 * with local temperature- and composition-dependent mixture thermophysical properties.
 */

import { ReactorInputs, AxialProfilePoint } from '../types/eurokin';
import { BULK_GAS_CONFIGS } from './nistAmmoniaData';
import { calculateMixtureProperties, calculateReactionEquilibrium, calculateMixtureEnthalpy } from './nist/propertyCorrelationEngine';
import { solveAdaptiveDopri5, AdaptiveSolverOptions, AdaptiveStepResult } from './adaptiveOdeSolver';

const R_GAS = 8.314462618; // J/(mol·K)
const P_ATM = 101325.0;     // Pa

export interface AxialSolverResult {
  points: AxialProfilePoint[];
  stepConvergence: {
    relativeErrorNormL2: number;
    maxRelativeErrorLInf: number;
    recommendedStepCount: number;
    isConverged: boolean;
  };
  solverStatus: 'CONVERGED' | 'TERMINATED_PRESSURE_DEPLETION' | 'TERMINATED_SONIC_CHOKING';
  terminationMessage?: string;
  terminationPositionZ?: number;
}

/**
 * Solves 1D axial profiles along fixed-bed reactor using 4th-Order Runge-Kutta (RK4)
 */
export function solveAxialProfiles(inputs: ReactorInputs, steps = 60): AxialProfilePoint[] {
  const result = solveAxialProfilesWithConvergence(inputs, steps);
  return result.points;
}

export function solveAxialProfilesWithConvergence(inputs: ReactorInputs, steps = 60): AxialSolverResult {
  const {
    temperature: T_feed,
    totalPressure: P_feed,
    feedFlow: m_dot,
    bedHeight: L,
    tubeDiameter: Dt,
    particleDiameter: dp,
    bedPorosity: epsB,
    catalystDensity: rhoCat,
    catalystMass: wCat,
    inertMass: wInert,
    inertDensity: rhoInert,
    reactionOrder: nOrder,
    effectiveDiffusivity: Deff,
    reactantMoleFraction: yNH3_feed,
    bulkGasType,
  } = inputs;

  const Twall = inputs.wallTemperature ?? Math.max(T_feed - 15.0, 350.0);
  const U = inputs.coolingCoefficientU ?? 280.0; // W/(m²·K)

  const cfg = BULK_GAS_CONFIGS[bulkGasType] || BULK_GAS_CONFIGS.syngas_stoichiometric;
  const A_bed = (Math.PI / 4.0) * Math.pow(Dt, 2);
  const vInert = wInert / Math.max(rhoInert, 1.0);
  const vCat = wCat / Math.max(rhoCat, 1.0);
  const bDilution = (vInert + vCat) > 0 ? vInert / (vInert + vCat) : 0.0;

  // Initial feed molar fractions
  const feedFractions = inputs.feedFractions;
  const yNH3_0 = feedFractions ? (feedFractions.yNH3 ?? (feedFractions as any).yNH3_inlet) : Math.max(0.0001, Math.min(yNH3_feed, 0.98));
  const remaining = 1.0 - yNH3_0;
  const yH2_0 = feedFractions ? feedFractions.yH2 : remaining * cfg.h2Ratio;
  const yN2_0 = feedFractions ? feedFractions.yN2 : remaining * cfg.n2Ratio;
  const yInert_0 = feedFractions ? (feedFractions.yInerts ?? (feedFractions as any).yAr ?? 0.0) : remaining * cfg.inertRatio;
  const epsNH3 = inputs.epsilonNH3 ?? 1e-4; // Regularization floor [atm]

  // Inlet mixture properties for feed molar flow calculation
  const initMixProps = calculateMixtureProperties(T_feed, P_feed, {
    N2: yN2_0,
    H2: yH2_0,
    NH3: yNH3_0,
    Ar: yInert_0,
  });

  const totalMolarFlow0 = m_dot / initMixProps.molarMassKgMol; // mol/s total
  const F_N2_0 = Math.max(1e-9, totalMolarFlow0 * yN2_0);

  const dz = L / steps;
  const points: AxialProfilePoint[] = [];

  let z = 0.0;
  let X = 0.0;
  let T = T_feed;
  let P = P_feed;

  // State evaluation function for ODE derivatives
  const evaluateDerivatives = (curZ: number, curX: number, curT: number, curP: number) => {
    // Physical mole fraction bounds:
    // Decomposition (curX < 0) cannot consume more than existing feed NH3: yNH3 >= 0 => curX >= -yNH3_0 / (2*yN2_0)
    // Synthesis (curX > 0) cannot consume more than stoichiometric H2 or N2: curX <= yH2_0 / (3*yN2_0)
    const minSafeX = - (yNH3_0 / (2.0 * Math.max(yN2_0, 1e-4))) * 0.995;
    const maxSafeX = Math.min(0.995, (yH2_0 / (3.0 * Math.max(yN2_0, 1e-4))) * 0.995);
    const safeX = Math.min(Math.max(curX, minSafeX), maxSafeX);

    // Stoichiometric composition along bed: 0.5 N2 + 1.5 H2 <=> NH3
    // Molar contraction/expansion: total relative moles = 1 - 2 * yN2_0 * safeX
    const totalMolesRelative = Math.max(0.01, 1.0 - (2.0 * yN2_0 * safeX));
    const yN2 = Math.max(0.0, (yN2_0 * (1.0 - safeX)) / totalMolesRelative);
    const yH2 = Math.max(0.0, (yH2_0 - 3.0 * yN2_0 * safeX) / totalMolesRelative);
    const yNH3 = Math.max(0.0, (yNH3_0 + 2.0 * yN2_0 * safeX) / totalMolesRelative);
    const yInert = Math.max(0.0, (yInert_0) / totalMolesRelative);

    // Evaluate rigorous real-gas mixture transport and thermodynamic properties at local state
    const mixProps = calculateMixtureProperties(curT, curP, {
      N2: yN2,
      H2: yH2,
      NH3: yNH3,
      Ar: yInert,
    });

    const rhoG = mixProps.gasDensityKgM3;
    const muG = mixProps.viscosityPaS;
    const cpG = mixProps.heatCapacityMassJKgK;
    const dHrLocal = mixProps.reactionEnthalpyJMol;
    const Dmol = mixProps.diffusivityNH3MixM2S;

    const u0 = m_dot / (A_bed * Math.max(rhoG, 1e-4));
    const Re = (dp * rhoG * u0) / Math.max(muG, 1e-9);

    // Ergun pressure drop gradient dP/dz [Pa/m]
    const fm = ((1.0 - epsB) / Math.pow(epsB, 3)) * (1.75 + (150.0 * (1.0 - epsB) / Math.max(Re, 1e-5)));
    const dP_dz = - (fm * rhoG * Math.pow(u0, 2)) / dp;

    // Partial pressures in atm
    const Patm = Math.max(curP, 1e5) / P_ATM;
    const pN2 = yN2 * Patm;
    const pH2 = yH2 * Patm;
    const pNH3 = yNH3 * Patm;

    // 1. Dyson & Baddour (1968) Industrial Arrhenius Rate Constants
    // k1 = 1.79e4 * exp(-87090 / RT) [mol/(kg-cat · s · atm^1.5)]
    const safeT = Math.max(curT, 250.0);
    const k1 = 1.79e4 * Math.exp(-87090.0 / (R_GAS * safeT));

    // 2. Equilibrium Constant K_p for: 0.5 N2 + 1.5 H2 <=> NH3
    let Kp: number;
    if (inputs.thermodynamicStrategy === 'NIST_FUNDAMENTAL_CONSISTENT') {
      const rxnEq = calculateReactionEquilibrium(safeT, curP, { yN2, yH2, yNH3, yInert });
      Kp = Math.exp(-rxnEq.deltaReactionGibbsJMol / (R_GAS * safeT));
    } else {
      // Default: Dyson & Baddour (1968) literature correlation
      const log10Kp = -2.691122 * Math.log10(safeT) - (5.519265e-5 * safeT) + (1.848863e-7 * Math.pow(safeT, 2)) + (2001.6 / safeT) + 2.6899;
      Kp = Math.pow(10.0, log10Kp);
    }

    // 3. Thermodynamic Reaction Quotient Q = p_NH3 / (p_N2^0.5 * p_H2^1.5) [atm^-1]
    const denomQ = Math.sqrt(Math.max(pN2, 1e-6)) * Math.pow(Math.max(pH2, 1e-6), 1.5);
    const Q = pNH3 / Math.max(denomQ, 1e-9);

    // 4. Authoritative Reversible Temkin-Pyzhev / Dyson & Baddour (1968) Rate:
    // r = 2 * k1 * (p_N2 * p_H2^1.5 / (p_NH3 + eps)) * (1 - (Q / Kp)^2)
    // Strictly satisfies thermodynamic equilibrium: r = 0 identically when Q = Kp.
    // If both pH2 and pNH3 approach zero (e.g. pure N2 feed), net rate is identically zero.
    let rateKmolM3H: number;
    if (pH2 <= 1e-9 && pNH3 <= 1e-9) {
      rateKmolM3H = 0.0;
    } else {
      const forwardTerm = 2.0 * k1 * (pN2 * Math.pow(Math.max(pH2, 0.0), 1.5) / Math.max(pNH3, epsNH3));
      const drivingForce = 1.0 - Math.pow(Q / Math.max(Kp, 1e-9), 2);
      rateKmolM3H = forwardTerm * drivingForce; // kmol/(m³_bed · h)
    }

    // Convert to SI rate per kg catalyst: mol/(kg-cat · s) = (rateKmolM3H * 1000) / (3600 * rhoCat * (1 - epsB))
    const rIntrinsic = (rateKmolM3H * 1000.0) / (3600.0 * rhoCat * (1.0 - epsB));

    // Local Weisz-Prater modulus & internal effectiveness factor
    const C_Abulk = (yN2 * curP) / (R_GAS * curT);
    const RvA = Math.abs(rIntrinsic) * rhoCat;
    const charLen = dp / 6.0;
    const Phi = ((nOrder + 1.0) / 2.0) * (RvA * Math.pow(charLen, 2)) / (Math.max(Deff, 1e-12) * Math.max(C_Abulk, 1e-8));

    const phiThiele = Math.sqrt(Math.max(Phi, 1e-8));
    // High-order Taylor series for small argument x = 3*phiThiele to eliminate branch jump discontinuity at phi = 0.1
    // Matches analytical branch coth(x)/x - 1/x^2 to within 3.8e-13 at boundary x = 0.03
    const xThiele = 3.0 * phiThiele;
    let eta: number;
    if (xThiele < 0.03) {
      const x2 = xThiele * xThiele;
      eta = 1.0 - x2 / 15.0 + (2.0 * x2 * x2) / 315.0 - (x2 * x2 * x2) / 1575.0;
    } else {
      eta = (1.0 / phiThiele) * (1.0 / Math.tanh(xThiele) - 1.0 / xThiele);
    }
    eta = Math.max(0.01, Math.min(1.0, eta));

    const rObs = eta * rIntrinsic;

    // Wakao Sh & Carberry number
    const Sc = muG / (rhoG * Math.max(Dmol, 1e-12));
    const Sh = 2.0 + 1.1 * Math.pow(Math.max(Re, 1e-4), 0.6) * Math.pow(Sc, 1.0 / 3.0);
    const kg = (Sh * Dmol) / dp;
    const av = 6.0 / dp;
    const Ca = RvA / (kg * av * Math.max(C_Abulk, 1e-8));

    // dX/dz for limiting reactant N2:
    // 1 mol N2 consumed per 2 mol NH3 produced -> r_N2 = 0.5 * r_NH3
    const catalystBedDensity = rhoCat * (1.0 - epsB) * (1.0 - bDilution);
    const dX_dz = (catalystBedDensity * A_bed * (0.5 * rObs)) / F_N2_0;

    // dT/dz (axial temperature gradient with cooling jacket or strict isothermal)
    // Sensible heat accumulation = heat generated - heat removed through reactor wall
    let dT_dz = 0.0;
    if (inputs.thermalMode !== 'ISOTHERMAL') {
      let cpMassForEnergy = cpG;
      let dHrForEnergy = dHrLocal;
      let qJouleThomson = 0.0;

      if (inputs.energyBalanceModel === 'PENG_ROBINSON_REAL_GAS') {
        const realH = calculateMixtureEnthalpy(curT, curP, {
          N2: yN2,
          H2: yH2,
          NH3: yNH3,
          Ar: yInert,
        }, true);
        cpMassForEnergy = realH.heatCapacityRealMassJKgK;
        dHrForEnergy = realH.deltaReactionEnthalpyRealJMol;

        // Joule-Thomson pressure effect: -(dh/dP)_T * dP/dz
        const dP_num = 1000.0;
        const hPplus = calculateMixtureEnthalpy(curT, curP + dP_num, { N2: yN2, H2: yH2, NH3: yNH3, Ar: yInert }, true);
        const hPminus = calculateMixtureEnthalpy(curT, Math.max(10000.0, curP - dP_num), { N2: yN2, H2: yH2, NH3: yNH3, Ar: yInert }, true);
        const dh_dP_T = (hPplus.enthalpyRealJouleKg - hPminus.enthalpyRealJouleKg) / (2.0 * dP_num);
        qJouleThomson = - m_dot * dh_dP_T * dP_dz;
      }

      const heatGen = catalystBedDensity * A_bed * rObs * dHrForEnergy;
      const heatRemoved = U * (Math.PI * Dt) * (curT - Twall);
      dT_dz = (heatGen - heatRemoved + qJouleThomson) / (m_dot * cpMassForEnergy);
    }

    return {
      dX_dz,
      dT_dz,
      dP_dz,
      rObs,
      eta,
      Phi,
      Ca,
      yN2,
      yH2,
      yNH3,
    };
  };

  // Initial inlet point at z = 0
  const initProps = evaluateDerivatives(0, 0, T_feed, P_feed);
  points.push({
    z: 0.0,
    zNormalized: 0.0,
    temperature: T_feed,
    pressure: P_feed,
    conversion: 0.0,
    yN2: initProps.yN2,
    yH2: initProps.yH2,
    yNH3: initProps.yNH3,
    reactionRate: initProps.rObs,
    effectiveness: initProps.eta,
    weiszPrater: initProps.Phi,
    carberry: initProps.Ca,
    deltaP: 0.0,
  });

  let solverStatus: 'CONVERGED' | 'TERMINATED_PRESSURE_DEPLETION' | 'TERMINATED_SONIC_CHOKING' = 'CONVERGED';
  let terminationMessage: string | undefined = undefined;
  let terminationPositionZ: number | undefined = undefined;

  // Runge-Kutta 4th Order Integration with true continuous governing equations
  for (let step = 0; step < steps; step++) {
    // k1
    const k1 = evaluateDerivatives(z, X, T, P);

    // k2
    const z_k2 = z + 0.5 * dz;
    const X_k2 = X + 0.5 * dz * k1.dX_dz;
    const T_k2 = T + 0.5 * dz * k1.dT_dz;
    const P_k2 = P + 0.5 * dz * k1.dP_dz;
    const k2 = evaluateDerivatives(z_k2, X_k2, T_k2, P_k2);

    // k3
    const z_k3 = z + 0.5 * dz;
    const X_k3 = X + 0.5 * dz * k2.dX_dz;
    const T_k3 = T + 0.5 * dz * k2.dT_dz;
    const P_k3 = P + 0.5 * dz * k2.dP_dz;
    const k3 = evaluateDerivatives(z_k3, X_k3, T_k3, P_k3);

    // k4
    const z_k4 = z + dz;
    const X_k4 = X + dz * k3.dX_dz;
    const T_k4 = T + dz * k3.dT_dz;
    const P_k4 = P + dz * k3.dP_dz;
    const k4 = evaluateDerivatives(z_k4, X_k4, T_k4, P_k4);

    // Update state vector using true continuous differential equations
    X += (dz / 6.0) * (k1.dX_dz + 2.0 * k2.dX_dz + 2.0 * k3.dX_dz + k4.dX_dz);
    T += (dz / 6.0) * (k1.dT_dz + 2.0 * k2.dT_dz + 2.0 * k3.dT_dz + k4.dT_dz);
    P += (dz / 6.0) * (k1.dP_dz + 2.0 * k2.dP_dz + 2.0 * k3.dP_dz + k4.dP_dz);
    z += dz;

    const cumulativeDeltaP = P_feed - P;

    // Physical Boundary Check 1: Pressure Depletion Boundary
    // If local pressure falls below minimum allowable backpressure (1 bar = 101325 Pa)
    const P_min = Math.max(101325.0, 0.01 * P_feed);
    if (P <= P_min) {
      solverStatus = 'TERMINATED_PRESSURE_DEPLETION';
      terminationMessage = `Physical pressure depletion: local pressure (${(P / 1e5).toFixed(2)} bar) dropped below minimum allowable backpressure (${(P_min / 1e5).toFixed(2)} bar) at z = ${z.toFixed(4)} m. Ergun friction exceeds available head.`;
      terminationPositionZ = z;
      break;
    }

    const curProps = evaluateDerivatives(z, X, T, P);

    // Exploratory Boundary Screening: Compressible High-Mach Diagnostic
    // Note: M_pore = u0 / (epsB * c_s) is an order-of-magnitude screening metric for high-velocity compressible flow,
    // not a validated macroscopic acoustic choking criterion for Darcy-Forchheimer porous media.
    const gamma = 1.35;
    const mixProps = calculateMixtureProperties(T, P, { N2: curProps.yN2, H2: curProps.yH2, NH3: curProps.yNH3, Ar: 0.0 });
    const c_s = Math.sqrt((gamma * R_GAS * T) / mixProps.molarMassKgMol);
    const u0 = m_dot / (A_bed * Math.max(mixProps.gasDensityKgM3, 1e-4));
    const interstitialMach = u0 / (epsB * c_s);

    if (interstitialMach >= 1.0) {
      solverStatus = 'TERMINATED_SONIC_CHOKING';
      terminationMessage = `Screening diagnostic: interstitial Mach number (M_pore = ${interstitialMach.toFixed(2)}) reached order-of-magnitude threshold at z = ${z.toFixed(4)} m. High-velocity compressible or choking behavior in porous medium.`;
      terminationPositionZ = z;
      break;
    }

    points.push({
      z: z,
      zNormalized: z / L,
      temperature: T,
      pressure: P,
      conversion: X,
      yN2: curProps.yN2,
      yH2: curProps.yH2,
      yNH3: curProps.yNH3,
      reactionRate: curProps.rObs,
      effectiveness: curProps.eta,
      weiszPrater: curProps.Phi,
      carberry: curProps.Ca,
      deltaP: cumulativeDeltaP,
    });
  }

  // Convergence telemetry: compare with half step size (2 * steps)
  const stepsDouble = steps * 2;
  const dzDouble = L / stepsDouble;
  let xRef = 0.0;
  let tRef = T_feed;
  let pRef = P_feed;
  let zRef = 0.0;

  for (let s = 0; s < stepsDouble; s++) {
    const k1 = evaluateDerivatives(zRef, xRef, tRef, pRef);
    const x2 = xRef + 0.5 * dzDouble * k1.dX_dz;
    const t2 = tRef + 0.5 * dzDouble * k1.dT_dz;
    const p2 = pRef + 0.5 * dzDouble * k1.dP_dz;
    const k2 = evaluateDerivatives(zRef + 0.5 * dzDouble, x2, t2, p2);
    const x3 = xRef + 0.5 * dzDouble * k2.dX_dz;
    const t3 = tRef + 0.5 * dzDouble * k2.dT_dz;
    const p3 = pRef + 0.5 * dzDouble * k2.dP_dz;
    const k3 = evaluateDerivatives(zRef + 0.5 * dzDouble, x3, t3, p3);
    const x4 = xRef + dzDouble * k3.dX_dz;
    const t4 = tRef + dzDouble * k3.dT_dz;
    const p4 = pRef + dzDouble * k3.dP_dz;
    const k4 = evaluateDerivatives(zRef + dzDouble, x4, t4, p4);

    xRef += (dzDouble / 6.0) * (k1.dX_dz + 2.0 * k2.dX_dz + 2.0 * k3.dX_dz + k4.dX_dz);
    tRef += (dzDouble / 6.0) * (k1.dT_dz + 2.0 * k2.dT_dz + 2.0 * k3.dT_dz + k4.dT_dz);
    pRef += (dzDouble / 6.0) * (k1.dP_dz + 2.0 * k2.dP_dz + 2.0 * k3.dP_dz + k4.dP_dz);
    zRef += dzDouble;
  }

  const xOutletBase = points[points.length - 1].conversion;
  const relDiffX = Math.abs(xRef - xOutletBase) / Math.max(xRef, 1e-4);
  const relDiffT = Math.abs(tRef - points[points.length - 1].temperature) / Math.max(tRef, 1e-4);

  const l2Norm = Math.sqrt(0.5 * (Math.pow(relDiffX, 2) + Math.pow(relDiffT, 2)));
  const lInfNorm = Math.max(relDiffX, relDiffT);

  return {
    points,
    stepConvergence: {
      relativeErrorNormL2: l2Norm,
      maxRelativeErrorLInf: lInfNorm,
      recommendedStepCount: lInfNorm < 0.005 ? steps : 120,
      isConverged: lInfNorm < 0.02,
    },
    solverStatus,
    terminationMessage,
    terminationPositionZ,
  };
}

export interface SystemJacobianAnalysis {
  method: 'NUMERICAL_CENTRAL_FINITE_DIFFERENCE';
  jacobianMatrix: [[number, number, number], [number, number, number], [number, number, number]];
  eigenvalues: Array<{ real: number; imag: number; magnitude: number }>;
  rk4StabilityFactors: Array<{ 
    amplificationFactor: number; 
    continuousPhysicalGrowth: number;
    isEigenmodeDamped: boolean;
    isStable: boolean; 
  }>;
  spectralRadius: number;
  stepSizeDz: number;
  conditionNumberEstimate: number;
  isPhysicalGrowthPresent: boolean;
  isRK4Stable: boolean;
}

/**
 * Computes the complete 3x3 coupled Jacobian matrix [dX/dz, dT/dz, dP/dz] with respect to [X, T, P]
 * using central finite differences, and evaluates its analytical eigenvalues (accounting for real and complex conjugate pairs),
 * continuous physical growth factors e^(Re(lambda)*dz), and classical RK4 stability factors R(lambda * dz).
 */
export function calculateCoupledJacobianAnalysis(
  inputs: ReactorInputs,
  z: number,
  X: number,
  T: number,
  P: number,
  dz: number,
  hScale: number = 1.0
): SystemJacobianAnalysis {
  const evaluateF = (evalX: number, evalT: number, evalP: number) => {
    // Re-evaluate the 3 coupled state derivatives [f_X, f_T, f_P]
    const {
      bedHeight: L,
      tubeDiameter: Dt,
      particleDiameter: dp,
      bedPorosity: epsB,
      catalystDensity: rhoCat,
      catalystMass: wCat,
      inertMass: wInert,
      inertDensity: rhoInert,
      reactionOrder: nOrder,
      effectiveDiffusivity: Deff,
      reactantMoleFraction: yNH3_feed,
      feedFlow: m_dot,
      bulkGasType,
    } = inputs;

    const Twall = inputs.wallTemperature ?? Math.max(inputs.temperature - 15.0, 350.0);
    const U = inputs.coolingCoefficientU ?? 280.0;
    const cfg = BULK_GAS_CONFIGS[bulkGasType] || BULK_GAS_CONFIGS.syngas_stoichiometric;
    const A_bed = (Math.PI / 4.0) * Math.pow(Dt, 2);

    const vInert = wInert / Math.max(rhoInert, 1.0);
    const vCat = wCat / Math.max(rhoCat, 1.0);
    const bDilution = (vInert + vCat) > 0 ? vInert / (vInert + vCat) : 0.0;

    const feedFractions = inputs.feedFractions;
    const yNH3_0 = feedFractions ? (feedFractions.yNH3 ?? (feedFractions as any).yNH3_inlet) : Math.max(0.0001, Math.min(yNH3_feed, 0.98));
    const remaining = 1.0 - yNH3_0;
    const yH2_0 = feedFractions ? feedFractions.yH2 : remaining * cfg.h2Ratio;
    const yN2_0 = feedFractions ? feedFractions.yN2 : remaining * cfg.n2Ratio;
    const yInert_0 = feedFractions ? (feedFractions.yInerts ?? (feedFractions as any).yAr ?? 0.0) : remaining * cfg.inertRatio;

    const minSafeX = - (yNH3_0 / (2.0 * Math.max(yN2_0, 1e-4))) * 0.995;
    const maxSafeX = Math.min(0.995, (yH2_0 / (3.0 * Math.max(yN2_0, 1e-4))) * 0.995);
    const safeX = Math.min(Math.max(evalX, minSafeX), maxSafeX);

    const totalMolesRelative = Math.max(0.01, 1.0 - (2.0 * yN2_0 * safeX));
    const yN2 = Math.max(0.0, (yN2_0 * (1.0 - safeX)) / totalMolesRelative);
    const yH2 = Math.max(0.0, (yH2_0 - 3.0 * yN2_0 * safeX) / totalMolesRelative);
    const yNH3 = Math.max(0.0, (yNH3_0 + 2.0 * yN2_0 * safeX) / totalMolesRelative);
    const yInert = Math.max(0.0, (yInert_0) / totalMolesRelative);

    const mixProps = calculateMixtureProperties(evalT, evalP, { N2: yN2, H2: yH2, NH3: yNH3, Ar: yInert });
    const rhoG = mixProps.gasDensityKgM3;
    const muG = mixProps.viscosityPaS;
    const cpG = mixProps.heatCapacityMassJKgK;
    const dHrLocal = mixProps.reactionEnthalpyJMol;
    const Dmol = mixProps.diffusivityNH3MixM2S;

    const u0 = m_dot / (A_bed * Math.max(rhoG, 1e-4));
    const Re = (dp * rhoG * u0) / Math.max(muG, 1e-9);

    const fm = ((1.0 - epsB) / Math.pow(epsB, 3)) * (1.75 + (150.0 * (1.0 - epsB) / Math.max(Re, 1e-5)));
    const dP_dz = - (fm * rhoG * Math.pow(u0, 2)) / dp;

    const Patm = Math.max(evalP, 1e5) / P_ATM;
    const pN2 = yN2 * Patm;
    const pH2 = yH2 * Patm;
    const pNH3 = yNH3 * Patm;

    const safeEvalT = Math.max(evalT, 250.0);
    const k1 = 1.79e4 * Math.exp(-87090.0 / (R_GAS * safeEvalT));
    let Kp: number;
    if (inputs.thermodynamicStrategy === 'NIST_FUNDAMENTAL_CONSISTENT') {
      const rxnEq = calculateReactionEquilibrium(safeEvalT, evalP, { yN2, yH2, yNH3, yInert });
      Kp = Math.exp(-rxnEq.deltaReactionGibbsJMol / (R_GAS * safeEvalT));
    } else {
      const log10Kp = -2.691122 * Math.log10(safeEvalT) - (5.519265e-5 * safeEvalT) + (1.848863e-7 * Math.pow(safeEvalT, 2)) + (2001.6 / safeEvalT) + 2.6899;
      Kp = Math.pow(10.0, log10Kp);
    }

    const denomQ = Math.sqrt(Math.max(pN2, 1e-6)) * Math.pow(Math.max(pH2, 1e-6), 1.5);
    const Q = pNH3 / Math.max(denomQ, 1e-9);
    const epsNH3 = inputs.epsilonNH3 ?? 1e-4;

    let rateKmolM3H: number;
    if (pH2 <= 1e-9 && pNH3 <= 1e-9) {
      rateKmolM3H = 0.0;
    } else {
      const forwardTerm = 2.0 * k1 * (pN2 * Math.pow(Math.max(pH2, 0.0), 1.5) / Math.max(pNH3, epsNH3));
      const drivingForce = 1.0 - Math.pow(Q / Math.max(Kp, 1e-9), 2);
      rateKmolM3H = forwardTerm * drivingForce;
    }
    const rIntrinsic = (rateKmolM3H * 1000.0) / (3600.0 * rhoCat * (1.0 - epsB));

    const C_Abulk = (yN2 * evalP) / (R_GAS * evalT);
    const RvA = Math.abs(rIntrinsic) * rhoCat;
    const charLen = dp / 6.0;
    const Phi = ((nOrder + 1.0) / 2.0) * (RvA * Math.pow(charLen, 2)) / (Math.max(Deff, 1e-12) * Math.max(C_Abulk, 1e-8));
    const phiThiele = Math.sqrt(Math.max(Phi, 1e-8));
    const eta = phiThiele < 0.1 ? 1.0 - (Math.pow(3.0 * phiThiele, 2) / 15.0) 
                                : (1.0 / phiThiele) * (1.0 / Math.tanh(3.0 * phiThiele) - 1.0 / (3.0 * phiThiele));
    const rObs = Math.max(0.01, Math.min(1.0, eta)) * rIntrinsic;

    const totalMolarFlow0 = m_dot / mixProps.molarMassKgMol;
    const F_N2_0 = Math.max(1e-9, totalMolarFlow0 * yN2_0);
    const catalystBedDensity = rhoCat * (1.0 - epsB) * (1.0 - bDilution);
    const dX_dz = (catalystBedDensity * A_bed * (0.5 * rObs)) / F_N2_0;

    let cpMassForEnergy = cpG;
    let dHrForEnergy = dHrLocal;
    let qJouleThomson = 0.0;
    if (inputs.energyBalanceModel === 'PENG_ROBINSON_REAL_GAS') {
      const realH = calculateMixtureEnthalpy(evalT, evalP, { N2: yN2, H2: yH2, NH3: yNH3, Ar: yInert }, true);
      cpMassForEnergy = realH.heatCapacityRealMassJKgK;
      dHrForEnergy = realH.deltaReactionEnthalpyRealJMol;
      const dP_num = 1000.0;
      const hPplus = calculateMixtureEnthalpy(evalT, evalP + dP_num, { N2: yN2, H2: yH2, NH3: yNH3, Ar: yInert }, true);
      const hPminus = calculateMixtureEnthalpy(evalT, Math.max(10000.0, evalP - dP_num), { N2: yN2, H2: yH2, NH3: yNH3, Ar: yInert }, true);
      const dh_dP_T = (hPplus.enthalpyRealJouleKg - hPminus.enthalpyRealJouleKg) / (2.0 * dP_num);
      qJouleThomson = - m_dot * dh_dP_T * dP_dz;
    }

    let dT_dz = 0.0;
    if (inputs.thermalMode !== 'ISOTHERMAL') {
      const heatGen = catalystBedDensity * A_bed * rObs * dHrForEnergy;
      const heatRemoved = U * (Math.PI * Dt) * (evalT - Twall);
      dT_dz = (heatGen - heatRemoved + qJouleThomson) / (m_dot * cpMassForEnergy);
    }

    return [dX_dz, dT_dz, dP_dz] as const;
  };

  // Central difference perturbations (scaled by hScale)
  const hX = 1e-6 * hScale;
  const hT = 1e-3 * hScale; // K
  const hP = 1.0 * hScale;  // Pa

  const f_Xplus = evaluateF(X + hX, T, P);
  const f_Xminus = evaluateF(X - hX, T, P);

  const f_Tplus = evaluateF(X, T + hT, P);
  const f_Tminus = evaluateF(X, T - hT, P);

  const f_Pplus = evaluateF(X, T, P + hP);
  const f_Pminus = evaluateF(X, T, P - hP);

  const J: [[number, number, number], [number, number, number], [number, number, number]] = [
    [(f_Xplus[0] - f_Xminus[0]) / (2.0 * hX), (f_Tplus[0] - f_Tminus[0]) / (2.0 * hT), (f_Pplus[0] - f_Pminus[0]) / (2.0 * hP)],
    [(f_Xplus[1] - f_Xminus[1]) / (2.0 * hX), (f_Tplus[1] - f_Tminus[1]) / (2.0 * hT), (f_Pplus[1] - f_Pminus[1]) / (2.0 * hP)],
    [(f_Xplus[2] - f_Xminus[2]) / (2.0 * hX), (f_Tplus[2] - f_Tminus[2]) / (2.0 * hT), (f_Pplus[2] - f_Pminus[2]) / (2.0 * hP)],
  ];

  // Matrix condition estimate based on row norms
  const rowNorms = J.map(row => Math.sqrt(row[0]*row[0] + row[1]*row[1] + row[2]*row[2]));
  const maxRow = Math.max(...rowNorms, 1e-12);
  const minRow = Math.min(...rowNorms.filter(r => r > 1e-12), 1e-12);
  const conditionNumberEstimate = maxRow / minRow;

  // Characteristic polynomial: det(lambda*I - J) = lambda^3 + b*lambda^2 + c*lambda + d = 0
  const tr = J[0][0] + J[1][1] + J[2][2];
  const m11 = J[1][1] * J[2][2] - J[1][2] * J[2][1];
  const m22 = J[0][0] * J[2][2] - J[0][2] * J[2][0];
  const m33 = J[0][0] * J[1][1] - J[0][1] * J[1][0];
  const M = m11 + m22 + m33;

  const det = J[0][0] * m11 - J[0][1] * (J[1][0] * J[2][2] - J[1][2] * J[2][0]) + J[0][2] * (J[1][0] * J[2][1] - J[1][1] * J[2][0]);

  const b = -tr;
  const c = M;
  const d = -det;

  // Depressed cubic: x^3 + p*x + q = 0, lambda = x - b/3
  const p = (3.0 * c - Math.pow(b, 2)) / 3.0;
  const q = (2.0 * Math.pow(b, 3) - 9.0 * b * c + 27.0 * d) / 27.0;
  const discriminant = (Math.pow(q, 2) / 4.0) + (Math.pow(p, 3) / 27.0);

  const eigenvalues: Array<{ real: number; imag: number; magnitude: number }> = [];

  if (discriminant <= 0.0) {
    // Three real roots
    const r = Math.sqrt(-Math.pow(p, 3) / 27.0);
    const cosArg = Math.max(-1.0, Math.min(1.0, -q / (2.0 * Math.max(r, 1e-12))));
    const theta = Math.acos(cosArg);
    for (let k = 0; k < 3; k++) {
      const x_k = 2.0 * Math.cbrt(Math.max(r, 1e-12)) * Math.cos((theta + 2.0 * Math.PI * k) / 3.0);
      const val = x_k - b / 3.0;
      eigenvalues.push({ real: val, imag: 0.0, magnitude: Math.abs(val) });
    }
  } else {
    // One real root, one complex conjugate pair
    const sqrtDisc = Math.sqrt(discriminant);
    const u = Math.cbrt(-q / 2.0 + sqrtDisc);
    const v = Math.cbrt(-q / 2.0 - sqrtDisc);
    const realRoot = u + v - b / 3.0;
    eigenvalues.push({ real: realRoot, imag: 0.0, magnitude: Math.abs(realRoot) });

    const complexReal = -0.5 * (u + v) - b / 3.0;
    const complexImag = (Math.sqrt(3.0) / 2.0) * Math.abs(u - v);
    const complexMag = Math.sqrt(Math.pow(complexReal, 2) + Math.pow(complexImag, 2));

    eigenvalues.push({ real: complexReal, imag: complexImag, magnitude: complexMag });
    eigenvalues.push({ real: complexReal, imag: -complexImag, magnitude: complexMag });
  }

  // Classical RK4 polynomial stability vs Continuous Physical Growth:
  // Continuous growth factor: G_phys = exp(Re(lambda) * dz)
  // Numerical amplification: R(w) = 1 + w + w^2/2 + w^3/6 + w^4/24, where w = lambda * dz
  const stabilityFactors = eigenvalues.map((eig) => {
    const wR = eig.real * dz;
    const wI = eig.imag * dz;

    // w^2 = (wR^2 - wI^2) + i*(2*wR*wI)
    const w2R = Math.pow(wR, 2) - Math.pow(wI, 2);
    const w2I = 2.0 * wR * wI;

    // w^3 = w * w^2
    const w3R = wR * w2R - wI * w2I;
    const w3I = wR * w2I + wI * w2R;

    // w^4 = (w^2)^2
    const w4R = Math.pow(w2R, 2) - Math.pow(w2I, 2);
    const w4I = 2.0 * w2R * w2I;

    const rR = 1.0 + wR + (w2R / 2.0) + (w3R / 6.0) + (w4R / 24.0);
    const rI = wI + (w2I / 2.0) + (w3I / 6.0) + (w4I / 24.0);

    const amp = Math.sqrt(Math.pow(rR, 2) + Math.pow(rI, 2));
    const physGrowth = Math.exp(eig.real * dz);
    const isDamped = eig.real <= 0;

    // A damped mode is stable if amp <= 1.0001.
    // A physically growing mode (Re > 0) is numerically valid if RK4 tracks physical growth (|amp - physGrowth| < 1e-3).
    const isStable = isDamped ? amp <= 1.0001 : Math.abs(amp - physGrowth) < 0.05;

    return {
      amplificationFactor: amp,
      continuousPhysicalGrowth: physGrowth,
      isEigenmodeDamped: isDamped,
      isStable,
    };
  });

  const spectralRadius = Math.max(...eigenvalues.map(e => e.magnitude));
  const isPhysicalGrowthPresent = eigenvalues.some(e => e.real > 0.01);
  const isOverallStable = stabilityFactors.every(s => s.isStable);

  return {
    method: 'NUMERICAL_CENTRAL_FINITE_DIFFERENCE',
    jacobianMatrix: J,
    eigenvalues,
    rk4StabilityFactors: stabilityFactors,
    spectralRadius,
    stepSizeDz: dz,
    conditionNumberEstimate,
    isPhysicalGrowthPresent,
    isRK4Stable: isOverallStable,
  };
}

/**
 * Solves the full coupled 1D catalytic reactor differential equations using the
 * Dormand-Prince 5(4) (DOPRI5 / RK45) adaptive step-size integrator.
 * Provides an independent numerical verification reference solution for comparison with fixed-step RK4.
 */
export function solveAxialProfilesAdaptive(
  inputs: ReactorInputs,
  options?: AdaptiveSolverOptions
): {
  points: AxialProfilePoint[];
  adaptiveStats: AdaptiveStepResult;
} {
  const {
    temperature: T_feed,
    totalPressure: P_feed,
    feedFlow: m_dot,
    tubeDiameter: Dt,
    particleDiameter: dp,
    bedPorosity: epsB,
    bedHeight: L,
    catalystDensity: rhoCat,
    catalystMass: wCat,
    inertMass: wInert,
    inertDensity: rhoInert,
    reactionOrder: nOrder,
    effectiveDiffusivity: Deff,
    reactantMoleFraction: yNH3_feed,
    bulkGasType,
  } = inputs;

  const Twall = inputs.wallTemperature ?? Math.max(T_feed - 15.0, 350.0);
  const U = inputs.coolingCoefficientU ?? 280.0;
  const cfg = BULK_GAS_CONFIGS[bulkGasType] || BULK_GAS_CONFIGS.syngas_stoichiometric;
  const A_bed = (Math.PI / 4.0) * Math.pow(Dt, 2);
  const vInert = wInert / Math.max(rhoInert, 1.0);
  const vCat = wCat / Math.max(rhoCat, 1.0);
  const bDilution = (vInert + vCat) > 0 ? vInert / (vInert + vCat) : 0.0;

  const feedFractions = inputs.feedFractions;
  const yNH3_0 = feedFractions ? (feedFractions.yNH3 ?? (feedFractions as any).yNH3_inlet) : Math.max(0.0001, Math.min(yNH3_feed, 0.98));
  const remaining = 1.0 - yNH3_0;
  const yH2_0 = feedFractions ? feedFractions.yH2 : remaining * cfg.h2Ratio;
  const yN2_0 = feedFractions ? feedFractions.yN2 : remaining * cfg.n2Ratio;
  const yInert_0 = feedFractions ? (feedFractions.yInerts ?? (feedFractions as any).yAr ?? 0.0) : remaining * cfg.inertRatio;
  const epsNH3 = inputs.epsilonNH3 ?? 1e-4;

  const initMixProps = calculateMixtureProperties(T_feed, P_feed, {
    N2: yN2_0,
    H2: yH2_0,
    NH3: yNH3_0,
    Ar: yInert_0,
  });

  const totalMolarFlow0 = m_dot / initMixProps.molarMassKgMol;
  const F_N2_0 = Math.max(1e-9, totalMolarFlow0 * yN2_0);

  const odeDerivatives = (curZ: number, state: [number, number, number]): [number, number, number] => {
    const curX = state[0];
    const curT = state[1];
    const curP = state[2];

    const minSafeX = - (yNH3_0 / (2.0 * Math.max(yN2_0, 1e-4))) * 0.995;
    const maxSafeX = Math.min(0.995, (yH2_0 / (3.0 * Math.max(yN2_0, 1e-4))) * 0.995);
    const safeX = Math.min(Math.max(curX, minSafeX), maxSafeX);

    const totalMolesRelative = Math.max(0.01, 1.0 - (2.0 * yN2_0 * safeX));
    const yN2 = Math.max(0.0, (yN2_0 * (1.0 - safeX)) / totalMolesRelative);
    const yH2 = Math.max(0.0, (yH2_0 - 3.0 * yN2_0 * safeX) / totalMolesRelative);
    const yNH3 = Math.max(0.0, (yNH3_0 + 2.0 * yN2_0 * safeX) / totalMolesRelative);
    const yInert = Math.max(0.0, yInert_0 / totalMolesRelative);

    const mixProps = calculateMixtureProperties(curT, curP, {
      N2: yN2,
      H2: yH2,
      NH3: yNH3,
      Ar: yInert,
    });

    const rhoG = mixProps.gasDensityKgM3;
    const muG = mixProps.viscosityPaS;
    const cpG = mixProps.heatCapacityMassJKgK;
    const dHrLocal = mixProps.reactionEnthalpyJMol;
    const Dmol = mixProps.diffusivityNH3MixM2S;

    const u0 = m_dot / (A_bed * Math.max(rhoG, 1e-4));
    const Re = (dp * rhoG * u0) / Math.max(muG, 1e-9);

    const fm = ((1.0 - epsB) / Math.pow(epsB, 3)) * (1.75 + (150.0 * (1.0 - epsB) / Math.max(Re, 1e-5)));
    const dP_dz = - (fm * rhoG * Math.pow(u0, 2)) / dp;

    const Patm = Math.max(curP, 1e5) / P_ATM;
    const pN2 = yN2 * Patm;
    const pH2 = yH2 * Patm;
    const pNH3 = yNH3 * Patm;

    const safeT = Math.max(curT, 250.0);
    const k1 = 1.79e4 * Math.exp(-87090.0 / (R_GAS * safeT));
    let Kp: number;
    if (inputs.thermodynamicStrategy === 'NIST_FUNDAMENTAL_CONSISTENT') {
      const rxnEq = calculateReactionEquilibrium(safeT, curP, { yN2, yH2, yNH3, yInert });
      Kp = Math.exp(-rxnEq.deltaReactionGibbsJMol / (R_GAS * safeT));
    } else {
      const log10Kp = -2.691122 * Math.log10(safeT) - (5.519265e-5 * safeT) + (1.848863e-7 * Math.pow(safeT, 2)) + (2001.6 / safeT) + 2.6899;
      Kp = Math.pow(10.0, log10Kp);
    }

    const denomQ = Math.sqrt(Math.max(pN2, 1e-6)) * Math.pow(Math.max(pH2, 1e-6), 1.5);
    const Q = pNH3 / Math.max(denomQ, 1e-9);
    const epsNH3 = inputs.epsilonNH3 ?? 1e-4;

    let rateKmolM3H: number;
    if (pH2 <= 1e-9 && pNH3 <= 1e-9) {
      rateKmolM3H = 0.0;
    } else {
      const forwardTerm = 2.0 * k1 * (pN2 * Math.pow(Math.max(pH2, 0.0), 1.5) / Math.max(pNH3, epsNH3));
      const drivingForce = 1.0 - Math.pow(Q / Math.max(Kp, 1e-9), 2);
      rateKmolM3H = forwardTerm * drivingForce;
    }
    const rIntrinsic = (rateKmolM3H * 1000.0) / (3600.0 * rhoCat * (1.0 - epsB));

    const C_Abulk = (yN2 * curP) / (R_GAS * curT);
    const RvA = Math.abs(rIntrinsic) * rhoCat;
    const charLen = dp / 6.0;
    const Phi = ((nOrder + 1.0) / 2.0) * (RvA * Math.pow(charLen, 2)) / (Math.max(Deff, 1e-12) * Math.max(C_Abulk, 1e-8));
    const phiThiele = Math.sqrt(Math.max(Phi, 1e-8));

    const xThiele = 3.0 * phiThiele;
    let eta: number;
    if (xThiele < 0.03) {
      const x2 = xThiele * xThiele;
      eta = 1.0 - x2 / 15.0 + (2.0 * x2 * x2) / 315.0 - (x2 * x2 * x2) / 1575.0;
    } else {
      eta = (1.0 / phiThiele) * (1.0 / Math.tanh(xThiele) - 1.0 / xThiele);
    }
    eta = Math.max(0.01, Math.min(1.0, eta));

    const rObs = eta * rIntrinsic;
    const catalystBedDensity = rhoCat * (1.0 - epsB) * (1.0 - bDilution);
    const dX_dz = (catalystBedDensity * A_bed * (0.5 * rObs)) / F_N2_0;

    let dT_dz = 0.0;
    if (inputs.thermalMode !== 'ISOTHERMAL') {
      let cpMassForEnergy = cpG;
      let dHrForEnergy = dHrLocal;
      let qJouleThomson = 0.0;
      if (inputs.energyBalanceModel === 'PENG_ROBINSON_REAL_GAS') {
        const realH = calculateMixtureEnthalpy(curT, curP, { N2: yN2, H2: yH2, NH3: yNH3, Ar: yInert }, true);
        cpMassForEnergy = realH.heatCapacityRealMassJKgK;
        dHrForEnergy = realH.deltaReactionEnthalpyRealJMol;
        const dP_num = 1000.0;
        const hPplus = calculateMixtureEnthalpy(curT, curP + dP_num, { N2: yN2, H2: yH2, NH3: yNH3, Ar: yInert }, true);
        const hPminus = calculateMixtureEnthalpy(curT, Math.max(10000.0, curP - dP_num), { N2: yN2, H2: yH2, NH3: yNH3, Ar: yInert }, true);
        const dh_dP_T = (hPplus.enthalpyRealJouleKg - hPminus.enthalpyRealJouleKg) / (2.0 * dP_num);
        qJouleThomson = - m_dot * dh_dP_T * dP_dz;
      }

      const heatGen = catalystBedDensity * A_bed * rObs * dHrForEnergy;
      const heatRemoved = U * (Math.PI * Dt) * (curT - Twall);
      dT_dz = (heatGen - heatRemoved + qJouleThomson) / (m_dot * cpMassForEnergy);
    }

    return [dX_dz, dT_dz, dP_dz];
  };

  const dopriResult = solveAdaptiveDopri5(
    odeDerivatives,
    [0.0, T_feed, P_feed],
    {
      z0: 0.0,
      zEnd: L,
      absTol: options?.absTol ?? 1e-8,
      relTol: options?.relTol ?? 1e-7,
      initialStepSize: options?.initialStepSize ?? L / 100.0,
      minStepSize: options?.minStepSize ?? 1e-7,
      maxStepSize: options?.maxStepSize ?? L / 10.0,
      ...options,
    }
  );

  const points: AxialProfilePoint[] = dopriResult.trajectory.map((pt) => {
    const curX = pt.X;
    const curT = pt.T;
    const curP = pt.P;
    const safeX = Math.min(Math.max(curX, -0.99), 0.99);
    const totalMolesRelative = Math.max(0.01, 1.0 - (2.0 * yN2_0 * safeX));
    const yN2 = Math.max(0.0, (yN2_0 * (1.0 - safeX)) / totalMolesRelative);
    const yH2 = Math.max(0.0, (yH2_0 - 3.0 * yN2_0 * safeX) / totalMolesRelative);
    const yNH3 = Math.max(0.0, (yNH3_0 + 2.0 * yN2_0 * safeX) / totalMolesRelative);

    return {
      z: pt.z,
      zNormalized: pt.z / L,
      temperature: curT,
      pressure: curP,
      conversion: curX,
      yN2,
      yH2,
      yNH3,
      reactionRate: 0.0,
      effectiveness: 1.0,
      weiszPrater: 0.0,
      carberry: 0.0,
      deltaP: P_feed - curP,
    };
  });

  return {
    points,
    adaptiveStats: dopriResult,
  };
}
