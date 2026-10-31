/**
 * Rigorous 1D Spherical Catalyst Pellet Reaction-Diffusion Model
 * Solves the steady-state boundary value problem (BVP) for nonlinear,
 * reversible ammonia synthesis kinetics within porous catalyst granules:
 * 
 * (1/r^2) * d/dr [ r^2 * D_i,eff * dC_i/dr ] + nu_i * rho_pellet * r_obs(C, T, P) = 0
 * 
 * Boundary conditions:
 *   At center  (r = 0):   dC_i/dr = 0  (symmetry)
 *   At surface (r = R_p): C_i = C_i,surf  (Dirichlet) or Robin with external film resistance
 * 
 * Effectiveness factor:
 *   eta = (Actual integrated pellet reaction rate) / (Rate at uniform surface conditions)
 *       = \int_0^{R_p} r_vol(r) * 4*pi*r^2 dr / [ (4/3)*pi*R_p^3 * r_vol(R_p) ]
 */

import { calculatePengRobinsonState } from './nist/equationOfState';

const R_GAS = 8.314462618; // J/(mol·K)
const P_ATM = 101325.0;     // Pa

export interface PelletBvpInputs {
  pelletRadiusM: number;          // R_p [m] (d_p / 2)
  temperatureK: number;           // T [K] (isothermal pellet baseline)
  totalPressurePa: number;        // P [Pa]
  surfaceMoleFractions: {
    N2: number;
    H2: number;
    NH3: number;
    Ar?: number;
  };
  effectiveDiffusivityM2S: number;// D_eff for key component NH3 [m²/s]
  catalystPelletDensityKgM3: number; // rho_p [kg/m³]
  pelletPorosity?: number;        // eps_p [-]
  pelletTortuosity?: number;      // tau_p [-]
  externalMassTransferKgMS?: number; // k_g [m/s] for Robin boundary (optional)
  gridPoints?: number;            // Number of radial grid nodes N_r (default 50)
  tolerance?: number;             // Newton-Raphson convergence tolerance (default 1e-7)
  maxIterations?: number;         // Max iterations (default 50)
  epsilonNH3?: number;            // Regularization floor [atm]
}

export interface RadialNodeResult {
  rNormalized: number;            // r / R_p [0 to 1]
  rM: number;                     // r [m]
  cN2MolM3: number;
  cH2MolM3: number;
  cNH3MolM3: number;
  yNH3: number;
  pNH3Atm: number;
  reactionRateMolKgCatS: number;  // r_obs [mol/(kg-cat·s)]
}

export interface PelletBvpSolution {
  effectivenessFactorEta: number; // True nonlinear effectiveness factor [-]
  surfaceReactionRateMolKgCatS: number; // r(R_p)
  volumeIntegratedRateMolS: number;     // \int r * dV_p [mol/s per pellet]
  surfaceDiffusiveFluxMolS: number;     // 4*pi*R_p^2 * D_eff * (dC_NH3/dr)|_{R_p} [mol/s per pellet]
  massConservationRelativeError: number; // |Flux - IntegratedRate| / IntegratedRate
  centerAmmoniaMoleFraction: number;    // y_NH3 at r = 0
  surfaceAmmoniaMoleFraction: number;   // y_NH3 at r = R_p
  weiszPraterModulusPhi: number;        // Conventional Weisz-Prater parameter
  firstOrderAnalyticalEta: number;      // 3/phi^2 * (phi*coth(phi) - 1) for comparison
  firstOrderDiscrepancyPercent: number; // Discrepancy between true nonlinear eta and 1st-order formula
  radialProfiles: RadialNodeResult[];
  iterations: number;
  converged: boolean;
}

/**
 * Dyson-Baddour Temkin-Pyzhev intrinsic kinetic rate expression:
 * r_NH3 = 2 * k1 * (p_N2 * p_H2^1.5 / max(p_NH3, eps)) * [ 1 - (Q / Kp)^2 ]
 * Rate in mol/(kg-cat · s)
 */
export function evaluateTemkinRate(
  T: number,
  P: number,
  yN2: number,
  yH2: number,
  yNH3: number,
  epsNH3 = 1e-4
): number {
  const Patm = P / P_ATM;
  const pN2 = Math.max(yN2 * Patm, 0.0);
  const pH2 = Math.max(yH2 * Patm, 0.0);
  const pNH3 = Math.max(yNH3 * Patm, 0.0);

  const k1 = 1.79e4 * Math.exp(-87090.0 / (R_GAS * T));

  // Dyson empirical equilibrium constant K_p
  const log10Kp = -2.691122 * Math.log10(T) - (5.519265e-5 * T) + 
                  (1.848863e-7 * Math.pow(T, 2)) + (2001.6 / T) + 2.6899;
  const Kp = Math.pow(10.0, log10Kp);

  const denomQ = Math.sqrt(Math.max(pN2, 1e-8)) * Math.pow(Math.max(pH2, 1e-8), 1.5);
  const Q = pNH3 / Math.max(denomQ, 1e-12);

  const forward = 2.0 * k1 * (pN2 * Math.pow(pH2, 1.5)) / Math.max(pNH3, epsNH3);
  const drivingForce = 1.0 - Math.pow(Q / Math.max(Kp, 1e-9), 2);

  // Dyson rate in kmol/(m³-bed · h) -> convert to mol/(kg-cat · s)
  // using standard catalyst grain density (rho_cat ~ 2750 kg/m³, bulk voidage eps_b = 0.38)
  const rateKmolM3H = forward * drivingForce;
  const rMolKgS = (rateKmolM3H * 1000.0) / (3600.0 * 2750.0 * (1.0 - 0.38));
  return rMolKgS;
}

/**
 * Solves the nonlinear 1D spherical pellet reaction-diffusion BVP via
 * finite-difference discretization and Newton-Raphson relaxation.
 */
export function solvePelletReactionDiffusion(inputs: PelletBvpInputs): PelletBvpSolution {
  const Rp = inputs.pelletRadiusM;
  const T = inputs.temperatureK;
  const P = inputs.totalPressurePa;
  const Deff = inputs.effectiveDiffusivityM2S;
  const rhoP = inputs.catalystPelletDensityKgM3;
  const epsNH3 = inputs.epsilonNH3 ?? 1e-4;
  const N = inputs.gridPoints ?? 50;
  const tol = inputs.tolerance ?? 1e-7;
  const maxIter = inputs.maxIterations ?? 60;

  const dr = Rp / N;
  const C_total = P / (R_GAS * T); // Total molar concentration [mol/m³]

  const yN2_surf = inputs.surfaceMoleFractions.N2;
  const yH2_surf = inputs.surfaceMoleFractions.H2;
  const yNH3_surf = inputs.surfaceMoleFractions.NH3;

  const cN2_surf = yN2_surf * C_total;
  const cH2_surf = yH2_surf * C_total;
  const cNH3_surf = yNH3_surf * C_total;

  // Diffusion ratio relative to NH3
  // D_N2 / D_NH3 ~ sqrt(17 / 28) ~ 0.78
  // D_H2 / D_NH3 ~ sqrt(17 / 2) ~ 2.91
  const ratioN2 = 0.78;
  const ratioH2 = 2.91;

  // Key state variable: cNH3 at each node k = 0, ..., N
  // Initial guess: uniform surface concentration
  let cNH3 = new Float64Array(N + 1);
  for (let k = 0; k <= N; k++) {
    cNH3[k] = cNH3_surf;
  }

  // Helper to get coupled concentrations from ammonia via stoichiometry:
  // (C_N2 - C_N2_surf) = - 0.5 * (cNH3 - cNH3_surf) / ratioN2
  // (C_H2 - C_H2_surf) = - 1.5 * (cNH3 - cNH3_surf) / ratioH2
  const getCoupledProps = (c_nh3: number) => {
    const deltaC = c_nh3 - cNH3_surf;
    const c_n2 = Math.max(1e-8, cN2_surf - (0.5 * deltaC) / ratioN2);
    const c_h2 = Math.max(1e-8, cH2_surf - (1.5 * deltaC) / ratioH2);
    const c_tot = c_n2 + c_h2 + c_nh3;
    const y_n2 = c_n2 / c_tot;
    const y_h2 = c_h2 / c_tot;
    const y_nh3 = c_nh3 / c_tot;
    const r_mol_kg_s = evaluateTemkinRate(T, P, y_n2, y_h2, y_nh3, epsNH3);
    const r_vol_mol_m3_s = rhoP * r_mol_kg_s;
    return { c_n2, c_h2, y_n2, y_h2, y_nh3, r_mol_kg_s, r_vol_mol_m3_s };
  };

  let converged = false;
  let iter = 0;

  // Newton-Raphson solver for tridiagonal system
  for (iter = 0; iter < maxIter; iter++) {
    const F = new Float64Array(N + 1);
    const J_sub = new Float64Array(N + 1);  // sub-diagonal (k-1)
    const J_diag = new Float64Array(N + 1); // main diagonal (k)
    const J_sup = new Float64Array(N + 1);  // super-diagonal (k+1)

    // Node 0: Center symmetry (dC/dr = 0)
    // (1/r^2)*d/dr(r^2*dC/dr) at r->0 is 3 * d2C/dr2 = 6 * (C_1 - C_0) / dr^2
    const prop0 = getCoupledProps(cNH3[0]);
    F[0] = (6.0 * Deff / (dr * dr)) * (cNH3[1] - cNH3[0]) + prop0.r_vol_mol_m3_s;

    // Numerical derivative of reaction rate w.r.t cNH3
    const deltaPert = 1e-5 * Math.max(cNH3[0], 1.0);
    const prop0Plus = getCoupledProps(cNH3[0] + deltaPert);
    const drate0_dc = (prop0Plus.r_vol_mol_m3_s - prop0.r_vol_mol_m3_s) / deltaPert;

    J_diag[0] = - (6.0 * Deff / (dr * dr)) + drate0_dc;
    J_sup[0] = (6.0 * Deff / (dr * dr));

    // Interior nodes k = 1, ..., N - 1
    for (let k = 1; k < N; k++) {
      const r_k = k * dr;
      const r_plus = (k + 0.5) * dr;
      const r_minus = (k - 0.5) * dr;

      const propK = getCoupledProps(cNH3[k]);

      // Finite difference of (1/r^2) * d/dr [ r^2 * dC/dr ]
      const diffTerm = (Deff / (r_k * r_k * dr * dr)) * (
        r_plus * r_plus * (cNH3[k + 1] - cNH3[k]) - 
        r_minus * r_minus * (cNH3[k] - cNH3[k - 1])
      );

      F[k] = diffTerm + propK.r_vol_mol_m3_s;

      const pert = 1e-5 * Math.max(cNH3[k], 1.0);
      const propKPlus = getCoupledProps(cNH3[k] + pert);
      const drateK_dc = (propKPlus.r_vol_mol_m3_s - propK.r_vol_mol_m3_s) / pert;

      J_sub[k] = (Deff / (r_k * r_k * dr * dr)) * (r_minus * r_minus);
      J_diag[k] = - (Deff / (r_k * r_k * dr * dr)) * (r_plus * r_plus + r_minus * r_minus) + drateK_dc;
      J_sup[k] = (Deff / (r_k * r_k * dr * dr)) * (r_plus * r_plus);
    }

    // Node N: Surface boundary condition
    if (inputs.externalMassTransferKgMS && inputs.externalMassTransferKgMS > 0) {
      // Robin condition: Deff * (C_N - C_{N-1}) / dr = k_g * (cNH3_surf - C_N)
      const kg = inputs.externalMassTransferKgMS;
      F[N] = (Deff / dr) * (cNH3[N] - cNH3[N - 1]) + kg * (cNH3[N] - cNH3_surf);
      J_sub[N] = - (Deff / dr);
      J_diag[N] = (Deff / dr) + kg;
      J_sup[N] = 0.0;
    } else {
      // Dirichlet condition: C_N = cNH3_surf
      F[N] = cNH3[N] - cNH3_surf;
      J_sub[N] = 0.0;
      J_diag[N] = 1.0;
      J_sup[N] = 0.0;
    }

    // Check convergence: max residual norm
    let maxResidual = 0.0;
    for (let k = 0; k <= N; k++) {
      maxResidual = Math.max(maxResidual, Math.abs(F[k]));
    }

    if (maxResidual < tol) {
      converged = true;
      break;
    }

    // Thomas algorithm (TDMA) to solve J * deltaC = - F
    const c_prime = new Float64Array(N + 1);
    const d_prime = new Float64Array(N + 1);

    c_prime[0] = J_sup[0] / J_diag[0];
    d_prime[0] = - F[0] / J_diag[0];

    for (let k = 1; k <= N; k++) {
      const denom = J_diag[k] - J_sub[k] * c_prime[k - 1];
      c_prime[k] = (k < N) ? J_sup[k] / denom : 0.0;
      d_prime[k] = (- F[k] - J_sub[k] * d_prime[k - 1]) / denom;
    }

    // Back substitution
    const deltaC = new Float64Array(N + 1);
    deltaC[N] = d_prime[N];
    for (let k = N - 1; k >= 0; k--) {
      deltaC[k] = d_prime[k] - c_prime[k] * deltaC[k + 1];
    }

    // Update with relaxation factor
    const relaxation = 0.8;
    for (let k = 0; k <= N; k++) {
      cNH3[k] = Math.max(1e-9, cNH3[k] + relaxation * deltaC[k]);
    }
  }

  // Construct detailed radial profile
  const radialProfiles: RadialNodeResult[] = [];
  let volumeIntegratedRate = 0.0; // \int r_vol * dV [mol/s]
  const surfaceProp = getCoupledProps(cNH3[N]);
  const surfaceRate = surfaceProp.r_mol_kg_s;

  for (let k = 0; k <= N; k++) {
    const r = k * dr;
    const prop = getCoupledProps(cNH3[k]);
    radialProfiles.push({
      rNormalized: r / Rp,
      rM: r,
      cN2MolM3: prop.c_n2,
      cH2MolM3: prop.c_h2,
      cNH3MolM3: cNH3[k],
      yNH3: prop.y_nh3,
      pNH3Atm: prop.y_nh3 * (P / P_ATM),
      reactionRateMolKgCatS: prop.r_mol_kg_s,
    });

    // Shell volume: dV_k = (4/3)*pi * [ (r + dr/2)^3 - (r - dr/2)^3 ]
    let shellVolume: number;
    if (k === 0) {
      shellVolume = (4.0 / 3.0) * Math.PI * Math.pow(dr / 2.0, 3);
    } else if (k === N) {
      shellVolume = (4.0 / 3.0) * Math.PI * (Math.pow(Rp, 3) - Math.pow(Rp - dr / 2.0, 3));
    } else {
      const r_p = (k + 0.5) * dr;
      const r_m = (k - 0.5) * dr;
      shellVolume = (4.0 / 3.0) * Math.PI * (Math.pow(r_p, 3) - Math.pow(r_m, 3));
    }

    volumeIntegratedRate += prop.r_vol_mol_m3_s * shellVolume;
  }

  // Total pellet volume: V_p = (4/3)*pi * Rp^3
  const pelletVolume = (4.0 / 3.0) * Math.PI * Math.pow(Rp, 3);
  const rateIfUniform = rhoP * surfaceRate * pelletVolume; // mol/s

  // Effectiveness factor: defined for reversible kinetics including forward synthesis,
  // equilibrium limit (r -> 0 => eta -> 1), and reverse decomposition (rate < 0)
  let eta: number;
  if (Math.abs(rateIfUniform) > 1e-12) {
    eta = volumeIntegratedRate / rateIfUniform;
  } else {
    // When surface net reaction rate vanishes identically at chemical equilibrium (Q = Kp),
    // intraparticle driving force is zero throughout and eta approaches 1.0 continuously.
    eta = 1.0;
  }

  // Surface diffusive flux of NH3 leaving the spherical pellet:
  // Outward unit normal is n = +e_r.
  // Fickian outward flux: N_NH3 = - D_eff * (dC_NH3/dr)|_{R_p}.
  // In forward synthesis (NH3 produced inside core), C_NH3 decreases outward (dC_NH3/dr <= 0),
  // yielding outward surface flux > 0.
  // In net decomposition (NH3 consumed inside core), C_NH3 increases outward (dC_NH3/dr >= 0),
  // yielding inward surface flux < 0.
  // Total boundary molar flow: F_surf = \oint N_NH3 · n dS = - 4 * pi * R_p^2 * D_eff * (dC_NH3/dr)|_{R_p}.
  // Using 2nd-order one-sided backward difference: (3*C_N - 4*C_{N-1} + C_{N-2}) / (2*dr)
  const dC_dr_surf = (3.0 * cNH3[N] - 4.0 * cNH3[N - 1] + cNH3[N - 2]) / (2.0 * dr);
  const surfaceDiffusiveFlux = - 4.0 * Math.PI * Math.pow(Rp, 2) * Deff * dC_dr_surf;

  // Mass balance closure: Boundary flux vs volume-integrated generation
  const massConservationError = Math.abs(surfaceDiffusiveFlux - volumeIntegratedRate) / 
                                Math.max(Math.abs(volumeIntegratedRate), 1e-12);

  // Comparison with 1st-order analytical Thiele modulus and effectiveness factor
  const charLen = Rp / 3.0; // V_p / S_p for sphere
  const C_bulk = (inputs.surfaceMoleFractions.N2 * P) / (R_GAS * T);
  const RvA = Math.abs(surfaceRate) * rhoP;
  const Phi_WP = (RvA * Math.pow(charLen, 2)) / (Math.max(Deff, 1e-14) * Math.max(C_bulk, 1e-8));
  const phiThiele = Math.sqrt(Math.max(Phi_WP, 1e-8));

  let eta1st: number;
  const x = 3.0 * phiThiele;
  if (x < 0.05) {
    eta1st = 1.0 - (x * x) / 15.0;
  } else {
    eta1st = (1.0 / phiThiele) * (1.0 / Math.tanh(x) - 1.0 / x);
  }
  eta1st = Math.max(0.01, Math.min(1.0, eta1st));

  const discrepancyPercent = Math.abs(eta - eta1st) / Math.max(eta, 1e-4) * 100.0;

  return {
    effectivenessFactorEta: Math.max(0.001, Math.min(1.0, eta)),
    surfaceReactionRateMolKgCatS: surfaceRate,
    volumeIntegratedRateMolS: volumeIntegratedRate,
    surfaceDiffusiveFluxMolS: surfaceDiffusiveFlux,
    massConservationRelativeError: massConservationError,
    centerAmmoniaMoleFraction: radialProfiles[0].yNH3,
    surfaceAmmoniaMoleFraction: radialProfiles[N].yNH3,
    weiszPraterModulusPhi: Phi_WP,
    firstOrderAnalyticalEta: eta1st,
    firstOrderDiscrepancyPercent: discrepancyPercent,
    radialProfiles,
    iterations: iter,
    converged,
  };
}
