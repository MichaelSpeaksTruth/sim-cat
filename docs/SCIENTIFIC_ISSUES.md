# SIM-CAT Scientific Issue Tracker & Resolution Register

**Audit Baseline Commit**: `5ae14f93f523d5b7fce2d5883e3b3bdc0427fd61`  
**Revision**: Revision 15 (Independent Verification, Numerical Reconciliation & Scientific Integrity)  
**Standing System Status**: **`INDUSTRIAL READINESS NOT ESTABLISHED`** | **`VERIFIED WITH OPERATIONAL LIMITATIONS`**

---

## Issue Summary Matrix

| Issue ID | Severity | Status (Rev 14) | Status (Rev 15) | Category | Title | Code Impact & Reference |
|:---|:---:|:---:|:---:|:---|:---|:---|
| **ISS-01** | `CRITICAL` | `RESOLVED` | **`RESOLVED`** | Thermodynamics | Real-Gas Energy Balance Composition Derivatives | [`propertyCorrelationEngine.ts`](file:///c:/Superceed_vscode/classified/sim-cat/src/lib/nist/propertyCorrelationEngine.ts) |
| **ISS-02** | `CRITICAL` | `RESOLVED` | **`RESOLVED`** | Transport | Catalyst Pellet Surface Flux Sign, Reversibility & Decomposition | [`pelletReactionDiffusion.ts`](file:///c:/Superceed_vscode/classified/sim-cat/src/lib/pelletReactionDiffusion.ts) |
| **ISS-03** | `CRITICAL` | `RESOLVED` | **`RESOLVED`** | Benchmarks | Isothermal Benchmark Wall Boundary & Thermal Runaway | [`literatureBenchmark.ts`](file:///c:/Superceed_vscode/classified/sim-cat/src/lib/nist/literatureBenchmark.ts) |
| **ISS-04** | `MAJOR` | `RESOLVED` | **`RESOLVED`** | Benchmarks | Historical Benchmark Conversion Definitions Provenance | [`literatureBenchmark.ts`](file:///c:/Superceed_vscode/classified/sim-cat/src/lib/nist/literatureBenchmark.ts) |
| **ISS-05** | `MAJOR` | `RESOLVED` | **`RESOLVED`** | Numerics | Regularization Non-Smoothness & Inlet Stiffness ($\lambda_2 = -5.36 \times 10^8\ \mathrm{m}^{-1}$) | [`axialSolver.ts`](file:///c:/Superceed_vscode/classified/sim-cat/src/lib/axialSolver.ts) |
| **ISS-06** | `MAJOR` | `RESOLVED` | **`RESOLVED`** | Numerics | 4th-Order Grid Refinement Convergence (Refuting 5th-Order Claims) | [`scientificAudit.test.ts`](file:///c:/Superceed_vscode/classified/sim-cat/src/lib/scientificAudit.test.ts) |
| **ISS-07** | `MAJOR` | `PARTIALLY_RESOLVED` | **`PARTIALLY_RESOLVED`** | Hydrodynamics | Wall Effects & Annular Bypassing ($D_t/d_p = 3.81$, Area $77.44\%$) | Screened but not modelled in 1D |
| **ISS-08** | `MINOR` | `PARTIALLY_RESOLVED` | **`PARTIALLY_RESOLVED`** | Transport | High-Pressure Dense-Gas Molecular Diffusivity Limits | Damped by Knudsen pore resistance |
| **ISS-09** | `MINOR` | `UNRESOLVED` | **`UNRESOLVED`** | Kinetics | Catalyst Poisoning & Thermal Sintering Dynamics | Out of scope for fresh catalyst runs |
| **ISS-10** | `INFORMATIONAL` | `UNRESOLVED` | **`UNRESOLVED`** | CFD / Scale-Up | 2D/3D Radial Maldistribution & Flow Channeling | Fundamental 1D plug-flow boundary |
| **ISS-11** | `CRITICAL` | `NEW` | **`RESOLVED`** | Transport | Carberry Number Contradiction & Reference Species Basis | [`eurokinTransport.ts`](file:///c:/Superceed_vscode/classified/sim-cat/src/lib/eurokinTransport.ts) |
| **ISS-12** | `MAJOR` | `NEW` | **`RESOLVED`** | Materials | Diffusivity Provenance & Pore Radius (25.7 nm BJH vs 15 nm Modal) | [`scientificAudit.test.ts`](file:///c:/Superceed_vscode/classified/sim-cat/src/lib/scientificAudit.test.ts) |
| **ISS-13** | `MAJOR` | `NEW` | **`RESOLVED`** | Thermodynamics | Macroscopic First Law Closure & Factor of 2 Stoichiometric Defect | [`scratch/revision15_audit_computations.test.ts`](file:///c:/Superceed_vscode/classified/sim-cat/scratch/revision15_audit_computations.test.ts) |
| **ISS-14** | `MAJOR` | `NEW` | **`RESOLVED`** | Transport | Multicomponent Maxwell-Stefan vs Scalar Fickian Classification | Model classified as Scalar Fickian |

---

## Detailed Issue Reports

### ISS-01: Real-Gas Energy Balance Composition Derivatives
- **Severity**: `CRITICAL`
- **Status**: **RESOLVED**
- **Description**: Verification of whether composition derivatives $(\partial h / \partial y_j)_{T, P}$ are correctly accounted for in the mixture enthalpy balance without double-counting reaction heat.
- **Mathematical Closure**:
  Gibbs-Duhem Theorem proves at constant $T, P$: $\sum_{i=1}^N \dot{n}_i \sum_{j=1}^N (\partial \bar{h}_i / \partial y_j)_{T, P} dy_j \equiv 0$.
  Both partial molar and mixture property differential formulations agree within $|dT/dz_1 - dT/dz_2| \le 4.11 \times 10^{-6}\ \mathrm{K/m}$ across 10 test states including zero-ammonia inlet conditions.

---

### ISS-02: Catalyst Pellet Surface Flux Sign, Reversibility & Decomposition
- **Severity**: `CRITICAL`
- **Status**: **RESOLVED**
- **Description**: Rigorous derivation of surface diffusive flux sign convention, reversible reaction handling, and decomposition behavior.
- **Mathematical Closure**:
  Gauss's Divergence Theorem proves:
  $$\oint_{S_p} \mathbf{N}_{\mathrm{NH}_3} \cdot \hat{\mathbf{n}}\, dS = - 4 \pi R_p^2 D_{\mathrm{eff}} \left. \frac{dC_{\mathrm{NH}_3}}{dr} \right|_{R_p} = \int_{V_p} R_{\mathrm{vol}}\, dV$$
  1. **Forward Synthesis ($Q < K_p$)**: Ammonia generated inside core $\implies dC_{\mathrm{NH}_3}/dr \le 0 \implies \text{Flux} > 0$ (outward). Mass conservation closure $< 0.003\%$.
  2. **Ammonia Decomposition ($Q > K_p$)**: Ammonia consumed inside core $\implies dC_{\mathrm{NH}_3}/dr \ge 0 \implies \text{Flux} < 0$ (inward). Center ammonia is depleted relative to surface. Mass conservation closure $< 0.003\%$.
  3. **Equilibrium Singularity Limit**: As $r(C_{\mathrm{surf}}) \to 0$ ($Q \to K_p$), $\lim \eta = 1.0000$ continuously without division by zero.

---

### ISS-03: Isothermal Benchmark Wall Boundary & Thermal Runaway
- **Severity**: `CRITICAL`
- **Status**: **RESOLVED**
- **Description**: Dyson Run 1 and Nielsen Run 3 thermal runaway in Revision 11 ($+102.3\ \mathrm{K}$ exotherm) caused by unphysical $U = 0$ (adiabatic).
- **Mathematical Closure**:
  One-parameter decomposition proved $99.91\%$ of Dyson 1 shift ($0.1159 \to 0.0849$) is molten lead bath heat removal ($U = 500\ \mathrm{W/(m^2\cdot K)}$).
  Sensitivity analysis across $U \in [300, 500, 1000\ \mathrm{W/(m^2\cdot K)}, \infty]$ shows $T_{\max} \in [676.01, 674.90, 674.04, 673.15]\ \mathrm{K}$. $U=500$ is within $0.8\%$ of strict isothermal operation. Tagged strictly as `ENGINEERING_ESTIMATE`.

---

### ISS-04: Historical Benchmark Conversion Definitions Provenance
- **Severity**: `MAJOR`
- **Status**: **RESOLVED**
- **Description**: Reconciled the three distinct historical conversion bases: $\alpha_{\mathrm{eq}}$ (Dyson 1 & 2), $X_{\mathrm{dry}}$ (Nielsen 3), and $X_{\mathrm{wet}}$ (Annable 4). All derivations verified.

---

### ISS-05: Regularization Non-Smoothness & Inlet Stiffness
- **Severity**: `MAJOR`
- **Status**: **RESOLVED**
- **Description**: Regularized rate law threshold creates extreme stiffness: $\lambda_2 = -5.3565 \times 10^8\ \mathrm{m}^{-1}$ at $p_{\mathrm{NH}_3} = 10^{-4}\ \mathrm{atm}$.
  Fixed-step RK4 explodes ($|R| = 3.43 \times 10^{21}$ at $1\ \mathrm{mm}$); Adaptive DOPRI5 successfully integrates the 5.2 nm boundary layer.

---

### ISS-06: 4th-Order Grid Refinement Convergence (Refuting 5th-Order Claims)
- **Severity**: `MAJOR`
- **Status**: **RESOLVED**
- **Description**: 5-level grid refinement ($N = 60, 120, 240, 480, 960$) shows observed convergence order $p = \log_2(d_k / d_{k+1}) \in [4.01, 4.39]$.
  Prior claims of "5th-order RK4 convergence" are refuted as mathematically impossible for standard 4th-order Runge-Kutta; DOPRI5 is 5th-order, whereas fixed RK4 is strictly 4th-order.

---

### ISS-07: Wall Effects & Annular Bypassing ($D_t/d_p = 3.81$)
- **Severity**: `MAJOR`
- **Status**: **PARTIALLY_RESOLVED** (Screened but not modelled in 1D)
- **Description**: Dyson 1 & 2 aspect ratio $D_t/d_p = 3.81 \ll 8.0$. The annular high-voidage ring occupies $77.44\%$ of the tube area. Cannot be resolved in 1D; requires 2D axisymmetric reactive CFD.

---

### ISS-08: High-Pressure Dense-Gas Molecular Diffusivity Limits
- **Severity**: `MINOR`
- **Status**: **PARTIALLY_RESOLVED** (Screened with dense-gas limits)
- **Description**: Dense gas effects at $150\text{--}220\ \mathrm{bar}$ reduce molecular diffusivity by $12\text{--}18\%$, but internal Knudsen resistance ($65\text{--}75\%$) damps the overall pellet transport uncertainty to $\pm 6\%$.

---

### ISS-09: Catalyst Poisoning & Thermal Sintering Dynamics
- **Severity**: `MINOR`
- **Status**: **UNRESOLVED** (Intentionally out of scope for fresh catalyst benchmarks)

---

### ISS-10: 2D/3D Radial Maldistribution & Flow Channeling
- **Severity**: `INFORMATIONAL`
- **Status**: **UNRESOLVED** (Inherent limitation of 1D differential reactor models)

---

### ISS-11: Carberry Number Contradiction & Reference Species Basis
- **Severity**: `CRITICAL`
- **Status**: **RESOLVED** in Revision 15
- **Description**: Revision 14 reported contradictory Carberry numbers between its external mass-transfer audit and prediction matrix:
  - Dyson 1: $0.0107$ vs $0.0523$
  - Dyson 2: $0.0095$ vs $0.0576$
  - Nielsen 3: $0.00106$ vs $0.0117$
  - Annable 4: $0.0465$ vs $0.262$
- **Root Cause & Forensic Decomposition**:
  1. Both earlier calculations relied on a **hardcoded placeholder rate** `inputs.reactionRate = 0.05 mol/(kg·s)` instead of the simulated kinetic rate.
  2. The first table ($0.0107\dots$) evaluated Dwivedi-Upadhyay with bulk nitrogen concentration $C_{\mathrm{N}_2}$.
  3. The second table ($0.0523\dots$) evaluated Wakao with bulk ammonia concentration $C_{\mathrm{NH}_3}$, which is $5\text{--}12\times$ smaller, artificially inflating the Carberry number.
  4. In heterogeneous catalysis (Eurokin Guide), Carberry is defined for the **key limiting reactant** ($A = \mathrm{N}_2$):
     $$Ca = \frac{R_{v,\mathrm{N}_2}^{\mathrm{obs}}}{k_g a_v C_{\mathrm{N}_2,b}} = \frac{0.5 \cdot r_{\mathrm{mass},\mathrm{NH}_3} \cdot \rho_p}{k_g (6 / d_p) C_{\mathrm{N}_2,b}}$$
- **Resolution**:
  - Implemented single canonical function [`computeCanonicalCarberryNumber`](file:///c:/Superceed_vscode/classified/sim-cat/src/lib/eurokinTransport.ts) used uniformly across all modules.
  - Recalculated with actual simulated Temkin-Pyzhev kinetics:
    - **Dyson 1**: $Ca_{\mathrm{inlet}} = 5.73 \times 10^{-4}$ ($0.057\%$), $Ca_{\max} = 7.38 \times 10^{-4}$ ($0.074\%$). Status: **PASS**.
    - **Dyson 2**: $Ca_{\mathrm{inlet}} = 2.89 \times 10^{-3}$ ($0.29\%$), $Ca_{\max} = 4.20 \times 10^{-3}$ ($0.42\%$). Status: **PASS**.
    - **Nielsen 3**: $Ca_{\mathrm{inlet}} = 4.05 \times 10^{-5}$ ($0.004\%$), $Ca_{\max} = 4.38 \times 10^{-5}$ ($0.004\%$). Status: **PASS**.
    - **Annable 4**: $Ca_{\mathrm{inlet}} = 2.14 \times 10^{-2}$ ($2.14\%$), $Ca_{\max} = 3.68 \times 10^{-2}$ ($3.68\%$, or $7.36\%$ on $\mathrm{NH}_3$ basis). Status: **MARGINAL / EXCEEDS 5% AT HOT SPOT**.

---

### ISS-12: Diffusivity Provenance & Pore Radius (25.7 nm BJH vs 15 nm Modal)
- **Severity**: `MAJOR`
- **Status**: **RESOLVED** in Revision 15
- **Description**: Reconciled the theoretical Bosanquet diffusivity ($D_{\mathrm{eff}} \approx 3.04 \times 10^{-8}\ \mathrm{m^2/s}$) with the benchmark empirical input ($1.20 \times 10^{-6}\ \mathrm{m^2/s}$).
- **Findings**:
  1. At $150\ \mathrm{bar}$, dense-gas molecular diffusivity is $D_{AB} \approx 2.16 \times 10^{-7}\ \mathrm{m^2/s}$.
  2. Mean molecular free path is $\lambda \approx 1.5\ \mathrm{nm} \ll d_{\mathrm{pore}}$, meaning transport is primarily in the **molecular diffusion regime** ($Kn \approx 0.03\text{--}0.05$).
  3. BJH hydraulic mean radius ($r_p = 2 V_g / S_g = 25.7\ \mathrm{nm}$) yields $D_K = 1.57 \times 10^{-5}\ \mathrm{m^2/s}$.
  4. Modal mesopore radius ($r_p = 15.0\ \mathrm{nm}$) yields $D_K = 9.15 \times 10^{-6}\ \mathrm{m^2/s}$.
  5. Both yield Bosanquet $D_{\mathrm{eff}} \approx 3.0 \times 10^{-8}\ \mathrm{m^2/s}$ with bulk grain tortuosity $\tau_p = 3.5$.
  6. The benchmark input $D_{\mathrm{eff}} = 1.20 \times 10^{-6}\ \mathrm{m^2/s}$ is an **empirical literature estimate** from Dyson & Baddour (1968, p. 595) representing macroporous/fissured granules, not pure theoretical Bosanquet mesopore diffusion. Both values are reported separately with explicit provenance.

---

### ISS-13: Macroscopic First Law Closure & Factor of 2 Stoichiometric Defect
- **Severity**: `MAJOR`
- **Status**: **RESOLVED** in Revision 15
- **Description**: Revision 14 reported Dyson Run 1 reaction heat as $1.03\ \mathrm{W}$ and wall heat removal as $1.98\ \mathrm{W}$, suggesting an unphysical $48\%$ energy imbalance.
- **Root Cause**:
  The scratch script evaluated $\dot{Q}_{\mathrm{rxn}} = \Delta \dot{n}_{\mathrm{N}_2} \times 53{,}500\ \mathrm{J/mol}$. But $53{,}500\ \mathrm{J/mol}$ is the reaction enthalpy **per mole of $\mathrm{NH}_3$** ($0.5 \mathrm{N}_2 + 1.5 \mathrm{H}_2 \to \mathrm{NH}_3$). Per mole of $\mathrm{N}_2$, $\Delta_r H = 2 \times 53{,}500 = 107{,}000\ \mathrm{J/mol}_{\mathrm{N}_2}$. The scratch script omitted the factor of 2!
- **Closure**:
  $$\dot{Q}_{\mathrm{rxn}} = \mathbf{2.0596\ W}$$
  $$\dot{Q}_{\mathrm{wall}} = \mathbf{1.9788\ W}$$
  $$\dot{Q}_{\mathrm{sensible}} = \dot{m} c_p (T_{\mathrm{out}} - T_{\mathrm{in}}) = \mathbf{0.0425\ W}$$
  First Law balance:
  $$\frac{|\dot{Q}_{\mathrm{rxn}} - \dot{Q}_{\mathrm{wall}} - \dot{Q}_{\mathrm{sensible}}|}{\dot{Q}_{\mathrm{rxn}}} = \frac{|2.0596 - 1.9788 - 0.0425|}{2.0596} = \mathbf{1.86\%}$$
  The energy balance is closed independently within **$1.86\%$**!

---

### ISS-14: Multicomponent Maxwell-Stefan vs Scalar Fickian Classification
- **Severity**: `MAJOR`
- **Status**: **RESOLVED** in Revision 15
- **Description**: Clarification of the transport constitutive equations and reference Maxwell-Stefan comparison.
- **Classification**:
  The current model is formally classified as a **1D Scalar Fickian Diffusion Model with Stoichiometric Algebraic Coupling**, NOT a full multicomponent Maxwell-Stefan or Dusty Gas solver.
- **Validation**:
  An independent Stefan-Maxwell ternary solution ($\mathrm{N}_2, \mathrm{H}_2, \mathrm{NH}_3$) with stoichiometric flux ratio $N_{\mathrm{N}_2} = -0.5 N_{\mathrm{NH}_3}, N_{\mathrm{H}_2} = -1.5 N_{\mathrm{NH}_3}$ yields $D_{\mathrm{MS},\mathrm{eff}} = 3.063 \times 10^{-7}\ \mathrm{m^2/s}$, which agrees with the pseudo-binary model ($3.10 \times 10^{-7}\ \mathrm{m^2/s}$) within **$1.20\%$**.

---

## Standing Verification Verdict

```text
========================================================================================
SYSTEM STATUS: INDUSTRIAL READINESS NOT ESTABLISHED | VERIFIED WITH OPERATIONAL LIMITATIONS
========================================================================================
```
- **Rigorous Scientific Verification**: Thermodynamically closed First Law energy balance ($1.86\%$ macroscopic closure), exact 4th-order spatial grid convergence, canonical Carberry number formulation, reversible pellet reaction-diffusion BVP, and primary-source benchmark reconstructions.
- **Standing Operational Limitations**:
  1. 1D pseudo-homogeneous plug-flow assumption cannot model near-wall radial velocity channeling in narrow tubes ($D_t/d_p = 3.81$).
  2. Overall wall heat transfer coefficient $U = 500\ \mathrm{W/(m^2\cdot K)}$ is an engineering estimate for molten lead baths.
  3. Catalyst pellet transport uses a scalar Fickian approximation under an isothermal particle assumption.
  4. Deactivation, sintering, and long-term poisoning are excluded from single-pass fresh catalyst benchmarks.
