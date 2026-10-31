/**
 * Dormand-Prince (DOPRI5 / RK45) Adaptive Step-Size ODE Solver for SIM-CAT
 * 
 * Provides an independent, high-order, embedded Runge-Kutta 5(4) reference solver
 * with adaptive step size control, local error estimation, and stiffness/growth monitoring.
 * Used for rigorous numerical verification and benchmarking against the standard fixed-step RK4 solver.
 */

export interface OdeState {
  z: number;
  X: number; // Conversion [0, 1]
  T: number; // Temperature [K]
  P: number; // Pressure [bar]
}

export type OdeDerivativesFn = (z: number, state: [number, number, number]) => [number, number, number];

export interface AdaptiveStepResult {
  trajectory: OdeState[];
  stepCount: number;
  rejectedSteps: number;
  minStepSize: number;
  maxStepSize: number;
  maxLocalError: number;
  converged: boolean;
}

export interface AdaptiveSolverOptions {
  z0?: number;
  zEnd?: number;
  initialStepSize?: number;
  minStepSize?: number;
  maxStepSize?: number;
  absTol?: number;
  relTol?: number;
  safetyFactor?: number;
  maxSteps?: number;
}

/**
 * Dormand-Prince 5(4) Butcher Tableau coefficients
 */
const C = [0, 1 / 5, 3 / 10, 4 / 5, 8 / 9, 1, 1];

const A: number[][] = [
  [],
  [1 / 5],
  [3 / 40, 9 / 40],
  [44 / 45, -56 / 15, 32 / 9],
  [19372 / 6561, -25360 / 2187, 64448 / 6561, -212 / 729],
  [9017 / 3168, -355 / 33, 46732 / 5247, 49 / 176, -5103 / 18656],
  [35 / 384, 0, 500 / 1113, 125 / 192, -2187 / 6784, 11 / 84]
];

// 5th order solution weights (same as 7th stage FSAL)
const B5 = [35 / 384, 0, 500 / 1113, 125 / 192, -2187 / 6784, 11 / 84, 0];

// 4th order embedded solution weights for error estimation
const B4 = [5179 / 57600, 0, 7571 / 16695, 393 / 640, -92097 / 339200, 187 / 2100, 1 / 40];

// Error estimator coefficients: E = B5 - B4
const E = [
  35 / 384 - 5179 / 57600,
  0,
  500 / 1113 - 7571 / 16695,
  125 / 192 - 393 / 640,
  -2187 / 6784 - (-92097 / 339200),
  11 / 84 - 187 / 2100,
  -1 / 40
];

/**
 * Solves system of ODEs dY/dz = F(z, Y) using Dormand-Prince 5(4) with adaptive step sizing.
 */
export function solveAdaptiveDopri5(
  f: OdeDerivativesFn,
  initialState: [number, number, number],
  options: AdaptiveSolverOptions
): AdaptiveStepResult {
  const z0 = options.z0 ?? 0;
  const zEnd = options.zEnd ?? 1.0;
  let h = options.initialStepSize ?? Math.min((zEnd - z0) / 100, 0.05);
  const hMin = options.minStepSize ?? 1e-7;
  const hMax = options.maxStepSize ?? (zEnd - z0) / 10;
  const atol = options.absTol ?? 1e-6;
  const rtol = options.relTol ?? 1e-5;
  const fac = options.safetyFactor ?? 0.85;
  const maxSteps = options.maxSteps ?? 50000;

  let z = z0;
  let y: [number, number, number] = [...initialState];

  const trajectory: OdeState[] = [{ z, X: y[0], T: y[1], P: y[2] }];

  let rejectedSteps = 0;
  let stepCount = 0;
  let minHUsed = h;
  let maxHUsed = h;
  let maxLocalErr = 0;

  // First evaluation
  let k1 = f(z, y);

  while (z < zEnd && stepCount < maxSteps) {
    if (z + h > zEnd) {
      h = zEnd - z;
    }

    if (h < hMin) {
      h = hMin;
    }

    // Stage 2
    const y2: [number, number, number] = [
      y[0] + h * (A[1][0] * k1[0]),
      y[1] + h * (A[1][0] * k1[1]),
      y[2] + h * (A[1][0] * k1[2])
    ];
    const k2 = f(z + C[1] * h, y2);

    // Stage 3
    const y3: [number, number, number] = [
      y[0] + h * (A[2][0] * k1[0] + A[2][1] * k2[0]),
      y[1] + h * (A[2][0] * k1[1] + A[2][1] * k2[1]),
      y[2] + h * (A[2][0] * k1[2] + A[2][1] * k2[2])
    ];
    const k3 = f(z + C[2] * h, y3);

    // Stage 4
    const y4: [number, number, number] = [
      y[0] + h * (A[3][0] * k1[0] + A[3][1] * k2[0] + A[3][2] * k3[0]),
      y[1] + h * (A[3][0] * k1[1] + A[3][1] * k2[1] + A[3][2] * k3[1]),
      y[2] + h * (A[3][0] * k1[2] + A[3][1] * k2[2] + A[3][2] * k3[2])
    ];
    const k4 = f(z + C[3] * h, y4);

    // Stage 5
    const y5: [number, number, number] = [
      y[0] + h * (A[4][0] * k1[0] + A[4][1] * k2[0] + A[4][2] * k3[0] + A[4][3] * k4[0]),
      y[1] + h * (A[4][0] * k1[1] + A[4][1] * k2[1] + A[4][2] * k3[1] + A[4][3] * k4[1]),
      y[2] + h * (A[4][0] * k1[2] + A[4][1] * k2[2] + A[4][2] * k3[2] + A[4][3] * k4[2])
    ];
    const k5 = f(z + C[4] * h, y5);

    // Stage 6
    const y6: [number, number, number] = [
      y[0] + h * (A[5][0] * k1[0] + A[5][1] * k2[0] + A[5][2] * k3[0] + A[5][3] * k4[0] + A[5][4] * k5[0]),
      y[1] + h * (A[5][0] * k1[1] + A[5][1] * k2[1] + A[5][2] * k3[1] + A[5][3] * k4[1] + A[5][4] * k5[1]),
      y[2] + h * (A[5][0] * k1[2] + A[5][1] * k2[2] + A[5][2] * k3[2] + A[5][3] * k4[2] + A[5][4] * k5[2])
    ];
    const k6 = f(z + C[5] * h, y6);

    // 5th order step
    const yNext: [number, number, number] = [
      y[0] + h * (B5[0] * k1[0] + B5[2] * k3[0] + B5[3] * k4[0] + B5[4] * k5[0] + B5[5] * k6[0]),
      y[1] + h * (B5[0] * k1[1] + B5[2] * k3[1] + B5[3] * k4[1] + B5[4] * k5[1] + B5[5] * k6[1]),
      y[2] + h * (B5[0] * k1[2] + B5[2] * k3[2] + B5[3] * k4[2] + B5[4] * k5[2] + B5[5] * k6[2])
    ];

    // Stage 7 (FSAL property: f at yNext)
    const k7 = f(z + h, yNext);

    // Error estimate using difference between 5th and 4th order:
    // err_i = h * sum(E[j] * k_j)
    const err: [number, number, number] = [
      Math.abs(h * (E[0] * k1[0] + E[2] * k3[0] + E[3] * k4[0] + E[4] * k5[0] + E[5] * k6[0] + E[6] * k7[0])),
      Math.abs(h * (E[0] * k1[1] + E[2] * k3[1] + E[3] * k4[1] + E[4] * k5[1] + E[5] * k6[1] + E[6] * k7[1])),
      Math.abs(h * (E[0] * k1[2] + E[2] * k3[2] + E[3] * k4[2] + E[4] * k5[2] + E[5] * k6[2] + E[6] * k7[2]))
    ];

    // Scaled norm of the error vector (Hairer et al., Solving Ordinary Differential Equations I)
    // scale_i = atol + max(|y_i|, |yNext_i|) * rtol
    let errNormSq = 0;
    for (let i = 0; i < 3; i++) {
      const scale = atol + Math.max(Math.abs(y[i]), Math.abs(yNext[i])) * rtol;
      const ratio = err[i] / scale;
      errNormSq += ratio * ratio;
    }
    const errNorm = Math.sqrt(errNormSq / 3.0);
    if (errNorm > maxLocalErr) maxLocalErr = errNorm;

    // Step acceptance criterion
    if (errNorm <= 1.0 || h <= hMin) {
      // Step accepted
      z += h;
      y = yNext;
      stepCount++;
      if (h < minHUsed) minHUsed = h;
      if (h > maxHUsed) maxHUsed = h;

      trajectory.push({ z, X: y[0], T: y[1], P: y[2] });

      // FSAL: k1 of next step is k7 of current step
      k1 = k7;

      // Compute optimal next step size (PI or standard step size controller)
      // h_new = h * min(max_fac, max(min_fac, fac * (1 / errNorm)^(1/5)))
      let hFactor = fac * Math.pow(1.0 / Math.max(errNorm, 1e-10), 0.2);
      hFactor = Math.min(5.0, Math.max(0.2, hFactor));
      h = Math.min(hMax, Math.max(hMin, h * hFactor));
    } else {
      // Step rejected: decrease step size and retry
      rejectedSteps++;
      let hFactor = fac * Math.pow(1.0 / errNorm, 0.2);
      hFactor = Math.min(1.0, Math.max(0.1, hFactor));
      h = Math.max(hMin, h * hFactor);
    }
  }

  return {
    trajectory,
    stepCount,
    rejectedSteps,
    minStepSize: minHUsed,
    maxStepSize: maxHUsed,
    maxLocalError: maxLocalErr,
    converged: z >= zEnd - 1e-10
  };
}
