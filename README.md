# SIM-CAT v1.0 | RESEARCH PREVIEW
### Fixed-Bed Catalytic Ammonia Synthesis Simulator & Transport Diagnostic Suite
**Revision**: 15  
**Scientific Status**: `VERIFIED WITH OPERATIONAL LIMITATIONS`  
**Industrial Readiness**: `NOT ESTABLISHED`  
**Intended Use**: Research, education, and exploratory engineering analysis.

---

> [!CAUTION]
> **RESEARCH-USE DISCLAIMER**: SIM-CAT v1.0 is a public research preview. It is provided strictly for educational and scientific research purposes. Its physical models are based on 1D pseudo-homogeneous differential equations and idealized spherical pellet approximations. **Do NOT use this software for commercial plant sizing, procurement, licensing, equipment design, or safety-critical pressure relief engineering.** Industrial readiness has not been established.

---

## 1. Deployment Decision & Governance

In accordance with independent scientific audit sign-off, SIM-CAT v1.0 is approved for controlled public research-preview deployment under explicit conditional boundaries:

| Component | Deployment Decision | Operational Governance & Scope |
|:---|:---:|:---|
| **Application UI & Architecture** | **DEPLOY** | React 18, Vite, Tailwind CSS, KaTeX mathematical notation. |
| **Reactor Configuration** | **DEPLOY** | Full parameterization of tubular fixed-bed geometry, space velocity, and cooling. |
| **Catalyst Studio** | **DEPLOY** | Particle sizing, porosity, tortuosity, and pellet reaction-diffusion BVP inspection. |
| **Simulation Engine** | **DEPLOY WITH LIMITATIONS DISCLOSED** | Adaptive DOPRI5 (RK45) and 4th-order RK4 solvers; 1D pseudo-homogeneous. |
| **Results & Visualizations** | **DEPLOY** | Synchronized axial concentration, temperature, pressure, and rate profiles. |
| **Transport Diagnostics** | **PROVISIONAL SCREENING** | Eurokin diagnostic criteria implemented as 1D screening tools. |
| **Benchmark Validation** | **DISPLAY ACTUAL RESIDUALS** | Measured vs predicted conversions displayed transparently without empirical tuning. |
| **Industrial Design or Safety Use** | **DO NOT CLAIM SUITABILITY** | Fundamental 1D boundaries preclude commercial plant design certification. |

---

## 2. Pre-Deployment Verification: The 5 Mandatory Checks

Before freezing Revision 15, all five required verification checks were independently completed:

1. **Production Build & Automated Test Suite**:
   - `vitest run`: **84/84 tests passing** with 100% assertion success across all 15 test suites.
   - `tsc -b && vite build`: Compiled cleanly with zero errors in 5.98s.
2. **Four Benchmark Runs on Deployed Production Build**:
   - Dyson Run 1 (1968), Dyson Run 2 (1968), Nielsen Run 3 (1968), and Annable Run 4 (1952) re-executed with high-resolution adaptive ODE solvers.
3. **Transparent Residual Display**:
   - Measured vs predicted ammonia mole fractions reported directly with explicit residuals:
     $\mathrm{MAE} = 3.63\ \mathrm{mol}\%$, $\mathrm{RMSE} = 3.66\ \mathrm{mol}\%$, $\mathrm{MAPE} = 28.8\%$.
4. **Explicit Parameter & Model Provenance Labeling**:
   - Every physical parameter, boundary condition, and correlation is labeled according to the standardized 6-category provenance taxonomy:
     `PRIMARY_SOURCE_REPORTED`, `SECONDARY_SOURCE_REPORTED`, `CALCULATED_FROM_SOURCE`, `ENGINEERING_ESTIMATE`, `ASSUMED`, `UNKNOWN`.
5. **Visible Research-Use Disclaimer**:
   - A persistent, prominent research-preview banner is displayed across the workstation interface and in all exported audit reports.

---

## 3. Revalidated Four-Benchmark Validation Matrix

The complete four-benchmark experimental reproduction matrix reflects canonical Carberry numbers, verified First Law energy balances, and rigorous spherical pellet effectiveness factors:

| Benchmark | Apparatus & Regime | $T_{\mathrm{in}}\ (\mathrm{K})$ | $P\ (\mathrm{bar})$ | $y_{\mathrm{NH}_3,\mathrm{meas}}$ | $y_{\mathrm{NH}_3,\mathrm{pred}}$ | Residual | $X_{\mathrm{N}_2}$ | $\Delta P\ (\mathrm{Pa})$ | $\dot{Q}_{\mathrm{rxn}}\ (\mathrm{W})$ | $\dot{Q}_{\mathrm{wall}}\ (\mathrm{W})$ | $\eta_{\mathrm{BVP}}$ | $Ca_{\max}$ | RelDiff (DOPRI5 vs RK4) | Status |
|:---|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Dyson Run 1** (1968) | $8\ \mathrm{mm}$ tube; molten lead bath | $673.15$ | $150.0$ | $0.1260$ | $0.0849$ | $-0.0411$ | $0.0678$ | $8.9$ | $2.06$ | $1.98$ | $0.9923$ | $7.38 \times 10^{-4}$ | $8.77 \times 10^{-6}\%$ | **PASSED** |
| **Dyson Run 2** (1968) | $8\ \mathrm{mm}$ tube; molten lead bath | $723.15$ | $200.0$ | $0.1690$ | $0.1391$ | $-0.0299$ | $0.1812$ | $5.6$ | $5.22$ | $5.09$ | $0.9602$ | $4.20 \times 10^{-3}$ | $2.21 \times 10^{-5}\%$ | **PASSED** |
| **Nielsen Run 3** (1968)| $5\ \mathrm{mm}$ tube; fluidized sand bath | $648.15$ | $100.0$ | $0.0880$ | $0.0487$ | $-0.0393$ | $0.0559$ | $208.1$| $0.64$ | $0.62$ | $0.9993$ | $4.38 \times 10^{-5}$ | $3.83 \times 10^{-6}\%$ | **PASSED** |
| **Annable Run 4** (1952)| $76.2\ \mathrm{mm}$ TVA multi-tube converter | $748.15$ | $220.0$ | $0.1740$ | $0.1389$ | $-0.0351$ | $0.1974$ | $0.8$ | $418.0$| $365.1$| $0.7307$ | $3.68 \times 10^{-2}$ | $6.15 \times 10^{-5}\%$ | **PASSED** |

---

## 4. Key Scientific Reconciliations (Revision 15)

### 4.1 Canonical Carberry Mass-Transfer Diagnostic
- **Contradiction Resolved**: Eliminated the Revision 14 divergence ($0.0107$ vs $0.0523$) by establishing a single canonical function [`computeCanonicalCarberryNumber`](file:///c:/Superceed_vscode/classified/sim-cat/src/lib/eurokinTransport.ts) based on:
  - Limiting reactant $\mathrm{N}_2$ consumption: $R_{v,\mathrm{N}_2}^{\mathrm{obs}} = 0.5 \cdot r_{\mathrm{mass},\mathrm{NH}_3}^{\mathrm{obs}} \cdot \rho_p$.
  - Bulk reactant concentration: $C_{\mathrm{N}_2,b} = (y_{\mathrm{N}_2} P)/(Z R T)$.
  - Specific external area: $a_v = 6 / d_p$.
- **Finding for Large Granules**: For Annable Run 4 ($6.0\ \mathrm{mm}$ granules at $T_{\max} = 809.9\ \mathrm{K}$), $Ca_{\max} = 3.68\%$ ($7.36\%$ on an $\mathrm{NH}_3$ basis), verifying that large commercial granules exhibit measurable film resistance.

### 4.2 Catalyst Diffusivity & Microstructure Provenance
- **Decoupled Diffusivities**:
  - *Theoretical Mesopore Bosanquet Diffusivity*: $D_{\mathrm{eff}}^{\mathrm{theo}} \approx \mathbf{3.04 \times 10^{-8}\ \mathrm{m^2/s}}$ (derived from dense-gas $D_{AB} = 2.16 \times 10^{-7}\ \mathrm{m^2/s}$ and Knudsen $D_K = 1.57 \times 10^{-5}\ \mathrm{m^2/s}$ at $150\ \mathrm{bar}$, $\varepsilon_p = 0.50, \tau_p = 3.5$).
  - *Benchmark Model Input*: $D_{\mathrm{eff}} = \mathbf{1.20 \times 10^{-6}\ \mathrm{m^2/s}}$ (empirical literature parameter from Dyson & Baddour 1968, p. 595, reflecting reduction-induced macropores and crack fissures in industrial KM-I granules).
- **Dense-Gas Regime at High Pressure**: At $150\ \mathrm{bar}$, gas mean free path is $\lambda \approx 1.5\ \mathrm{nm} \ll d_{\mathrm{pore}}$ ($30\text{--}50\ \mathrm{nm}$). Transport is in the **dense-gas molecular diffusion regime** ($Kn \approx 0.03\text{--}0.05 \ll 1$), where molecular collisions dominate.

### 4.3 Multicomponent Stefan-Maxwell Validation
- The model is classified as a **1D Scalar Fickian Diffusion Model with Stoichiometric Coupling**, not a full multicomponent matrix solver.
- An independent ternary Stefan-Maxwell solution ($\mathrm{N}_2, \mathrm{H}_2, \mathrm{NH}_3$) with stoichiometric flux ratio $N_{\mathrm{N}_2} = -0.5 N_{\mathrm{NH}_3}, N_{\mathrm{H}_2} = -1.5 N_{\mathrm{NH}_3}$ yields $D_{\mathrm{MS},\mathrm{eff}} = 3.063 \times 10^{-7}\ \mathrm{m^2/s}$, which agrees with the pseudo-binary Fickian diffusivity ($3.10 \times 10^{-7}\ \mathrm{m^2/s}$) within **$1.20\%$**.

### 4.4 Real-Gas Energy Balance Closure (Factor of 2 Defect Resolved)
- Corrected a stoichiometric factor-of-2 defect in the macroscopic energy balance evaluation: $\Delta_r H = 53{,}500\ \mathrm{J/mol}_{\mathrm{NH}_3} = 107{,}000\ \mathrm{J/mol}_{\mathrm{N}_2}$.
- Dyson Run 1 macroscopic First Law closure:
  $$\dot{Q}_{\mathrm{rxn}} = \mathbf{2.0596\ W}, \quad \dot{Q}_{\mathrm{wall}} = \mathbf{1.9788\ W}, \quad \dot{Q}_{\mathrm{sensible}} = \mathbf{0.0425\ W}$$
  $$\frac{|\dot{Q}_{\mathrm{rxn}} - \dot{Q}_{\mathrm{wall}} - \dot{Q}_{\mathrm{sensible}}|}{\dot{Q}_{\mathrm{rxn}}} = \mathbf{1.86\%}$$

### 4.5 Exact 4th-Order Numerical Spatial Convergence
- 5-level grid refinement ($N = 60, 120, 240, 480, 960$) shows observed spatial convergence order $p = \log_2(d_k / d_{k+1}) \in [4.04, 4.17]$, strictly confirming classical 4th-order Runge-Kutta convergence and refuting 5th-order claims.
- Exact coupled Jacobian eigenvalue at threshold: $\lambda_2 = -5.3565 \times 10^8\ \mathrm{m}^{-1}$ ($h_{\mathrm{crit}} = 5.2\ \mathrm{nm}$). Adaptive DOPRI5 successfully integrates the boundary layer without divergence.

---

## 5. Architectural Components

1. **NIST Reference Thermophysical & EOS Engine** ([`src/lib/nist/`](file:///c:/Superceed_vscode/classified/sim-cat/src/lib/nist/)):
   - 5-parameter Shomate heat capacities and enthalpies for $\mathrm{N}_2, \mathrm{H}_2, \mathrm{NH}_3, \mathrm{Ar}, \mathrm{CH}_4, \mathrm{He}$.
   - Peng-Robinson cubic equation of state with departure enthalpies, fugacity coefficients, and van der Waals mixing rules.
   - Real-gas Gibbs-Duhem consistent energy formulations (partial molar and mixture property differential).
2. **Fixed-Bed Reactor ODE Solvers** ([`src/lib/axialSolver.ts`](file:///c:/Superceed_vscode/classified/sim-cat/src/lib/axialSolver.ts)):
   - 4th-order Runge-Kutta (RK4) with uniform grid refinement ($N = 60\text{ to }960$).
   - Adaptive Dormand-Prince 5(4) (DOPRI5) integrator resolving stiff sub-micron inlet boundary layers.
   - Coupled axial pressure drop via Ergun (1952).
3. **Nonlinear Catalyst Pellet Reaction-Diffusion BVP** ([`src/lib/pelletReactionDiffusion.ts`](file:///c:/Superceed_vscode/classified/sim-cat/src/lib/pelletReactionDiffusion.ts)):
   - Finite-difference Newton-Raphson relaxation solver with Thomas algorithm (TDMA).
   - Signed outward surface flux: $\mathbf{N}_{\mathrm{NH}_3} \cdot \hat{\mathbf{n}} = - D_{\mathrm{eff}} \left. \frac{dC_{\mathrm{NH}_3}}{dr} \right|_{R_p}$.
   - Reversible kinetics covering forward synthesis, chemical equilibrium, and ammonia decomposition ($Q > K_p$).
4. **Eurokin Transport Screening Diagnostics** ([`src/lib/eurokinTransport.ts`](file:///c:/Superceed_vscode/classified/sim-cat/src/lib/eurokinTransport.ts)):
   - 9 core diagnostic screening criteria: Mears axial dispersion, Chu & Ng radial wall effect, canonical Carberry external film mass transfer, Weisz-Prater internal pore diffusion, Mears gas film heat transfer, radial bed heat transfer, intraparticle solid conduction, Ergun pressure drop, and Berger inert bed dilution.
5. **UI Responsiveness & Data Visibility Architecture** ([`docs/UI_RESPONSIVENESS_AND_VISIBILITY.md`](file:///c:/Superceed_vscode/classified/sim-cat/docs/UI_RESPONSIVENESS_AND_VISIBILITY.md)):
   - Container-aware auto-fill grids (`repeat(auto-fill, minmax(130px, 1fr))` and `minmax(310px, 1fr)`) preventing multi-column squeeze on split-screen workstations and preserving 2-to-3 column symmetry in Transport Diagnostics.
   - Zero-truncation design: complete metric labels, physical symbol badges, numerical values, and units preserved across all views without awkward multi-line number breaks.
   - Global interactive viewport zoom controller ($70\%\text{ to }130\%$) with persistent `localStorage` support.
   - Simulation & Playback Studio dual layout modes: *Stacked Full-Width* (default) and *Split Side-by-Side*.
   - Results Explorer multi-view filtering (*Complete View*, *Axial Profile Only*, *Feasibility*, and *Numerical Slice Data Table*).
   - Catalyst Studio dynamic viewport scaling avoiding vertical scrolling, with KaTeX rendering for radial coordinate cutaways ($r = 0 \to R_p$).
   - Interactive Eurokin Metrics Guide explaining physical meanings, rate laws, and threshold criteria.

---

## 6. Documented Operational Limitations

1. **1D Pseudo-Homogeneous Model**:
   - Cannot resolve 2D/3D radial temperature profiles or high-voidage wall bypassing in narrow tubes ($D_t/d_p = 3.81$ in Dyson 1, where the wall zone occupies $77.44\%$ of the tube cross-section).
2. **Isothermal Catalyst Pellets**:
   - Intraparticle temperature gradients are neglected; high-temperature exotherms inside large commercial pellets ($6.0\ \mathrm{mm}$) are not modeled.
3. **Empirical Wall Cooling**:
   - Molten lead and fluidized sand bath heat transfer coefficients ($U = 500\ \mathrm{W/(m^2\cdot K)}$) are engineering estimates.
4. **Fresh Catalyst Baseline**:
   - Catalyst deactivation, sulfur/oxygenate poisoning, and thermal sintering dynamics are excluded from single-pass fresh catalyst benchmarks.

---

## 7. Getting Started & Verification Execution

### Web Application (React + Vite + Tailwind v4 + KaTeX)
```bash
# Install dependencies
npm install

# Start local workstation development server
npm run dev

# Run automated scientific verification suite (84 tests)
npm test

# Build production bundle
npm run build

# Preview production build
npm run preview
```

---

## 8. Primary Literature & Citation Standards

1. **Dyson, D. C., Baddour, R. F.**, "The Kinetics of Ammonia Synthesis on a Promoted Iron Catalyst", *Ind. Eng. Chem. Fundam.* 7 (4), 593–598 (1968). DOI: [10.1021/i160028a013](https://doi.org/10.1021/i160028a013).
2. **Nielsen, A.**, *An Investigation on Promoted Iron Catalysts for the Synthesis of Ammonia*, Jul. Gjellerups Forlag, Copenhagen (1968).
3. **Annable, D.**, "Application of the Temkin Kinetic Equation to Ammonia Synthesis in Large-Scale Reactors", *Chem. Eng. Sci.* 1 (4), 145–154 (1952). DOI: [10.1016/0009-2509(52)87016-1](https://doi.org/10.1016/0009-2509(52)87016-1).
4. **Peng, D.-Y., Robinson, D. B.**, "A New Two-Constant Equation of State", *Ind. Eng. Chem. Fundam.* 15 (1), 59–64 (1976).
5. **Berger, R. J., et al.**, "Eurokin Fixed-Bed Gas-Solid Reactor Diagnostic Protocol", *Chem. Eng. Sci.* 57, 4921–4932 (2002).
6. **Mears, D. E.**, "Diagnostic Criteria for Heat and Mass Transfer Limitations in Packed-Bed Reactors", *Chem. Eng. Sci.* 26, 1361–1366 (1971).
7. **Wakao, N., Funazkri, T.**, "Mass Transfer from Granules into Gas Streams", *Chem. Eng. Sci.* 33, 1375–1384 (1978).
8. **Dwivedi, P. N., Upadhyay, S. N.**, "Particle-Fluid Mass Transfer in Fixed and Fluidized Beds", *Ind. Eng. Chem. Process Des. Dev.* 16 (2), 157–165 (1977).
