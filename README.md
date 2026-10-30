# SIM-CAT
### Gas-Solid Fixed-Bed Diagnostic Suite for Reaction Kinetics & Transport Phenomena
**Chemical System Focus: Industrial Haber-Bosch Ammonia Synthesis ($0.5\,\text{N}_2 + 1.5\,\text{H}_2 \rightleftharpoons \text{NH}_3$)**  
**Catalyst Specification: Promoted Magnetite / Wüstite Iron ($\text{K}_2\text{O}\text{-}\text{Al}_2\text{O}_3\text{-}\text{CaO}$)**  
**Thermophysical & Kinetic Mapping: NIST Reference Thermophysics & Temkin-Pyzhev Kinetics**

---

## 1. Overview & Industrial Engineering Scope

**SIM-CAT** is a chemical reaction engineering diagnostic platform built to assess transport limitations and verify intrinsic kinetic validity in catalytic fixed-bed reactors. Developed in accordance with the **Eurokin Consortium** diagnostic protocols and established transport phenomena criteria, SIM-CAT evaluates whether observed laboratory or pilot reaction rates reflect true intrinsic chemical kinetics or are corrupted by heat and mass transfer resistances.

The software is configured exclusively for the **Industrial Haber-Bosch Ammonia Synthesis** system operating under commercial high-pressure conditions (100 bar, 400 °C, stoichiometric syngas feed).

```
          Feed Syngas: 0.5 N₂ + 1.5 H₂  (u₀, T, P)
                         │
                         ▼
        ┌───────────────────────────────────┐
        │ ── ── ── ── ── ── ── ── ── ── ──  │  Inlet Flow
        │   ●   ○   ●   ○   ●   ○   ●   ○   │  
        │     ●   ●   ○   ●   ○   ●   ○     │  Interstitial
        │   ○   ●   ●   ○   ●   ○   ●   ○   │  Velocity Vectors
        │     ○   ●   ○   ●   ●   ○   ●     │  & Tracer Packets
        │   ●   ○   ●   ●   ○   ●   ○   ●   │  
        │ ── ── ── ── ── ── ── ── ── ── ──  │
        └───────────────────────────────────┘
                         │
                         ▼
       Effluent: NH₃ Product + Unreacted Syngas (X_A, ΔP)
```

---

## 2. Dynamic 2D Reactor Cross-Section & Flow Simulation

The interactive reactor visualizer provides a real-time, 2D hydrodynamic simulation of the packed catalyst bed:
- **Interstitial Fluid Velocity Streamlines**: Tortuous gas streamlines dynamically simulated through void spaces between catalyst pellets using CSS vector animations (`stroke-dashoffset`).
- **Descending Gas Tracer Packets**: Glowing fluid flow packets entering at superficial velocity $u_0$, navigating interstitial channels, and exiting at the bed outlet.
- **Catalytic Turnover Dynamics**: Active promoted iron catalyst pellets exhibit a dynamic surface reaction shimmer proportional to reaction rate $r_m$, visually distinguishing them from unreactive, static inert diluent pellets ($\text{SiC}$).
- **Flow Control**: Integrated **Flow: Active / Paused** toggle for static inspection or dynamic demonstration.
- **Pellet Boundary & Gradients View**: High-magnification cross-section showing stagnant gas film thickness ($\delta_{\text{film}}$), intraparticle pore diffusion paths ($r=0$ to $r=d_p/2$), effectiveness factor $\eta$, and centerline radial hotspots ($\Delta T_{\text{rad}}$).

---

## 3. The 9 Core Diagnostic Criteria (Eurokin Protocol)

For measured kinetics to be considered intrinsic, transport resistances must cause less than a 5% deviation on the observed reaction rate ($< 5\%$ tolerance threshold). SIM-CAT evaluates all 9 standard criteria simultaneously:

| # | Diagnostic Criterion | Category | Governing Formula | Literature Reference |
|---|----------------------|----------|-------------------|----------------------|
| 1 | Axial Flow Dispersion | Fluid Dynamics | $\frac{L}{d_p} > \frac{8}{Bo} \, n \ln\left(\frac{1}{1-X_A}\right)$ | Mears (1971), Gierman (1988), Wakao (1979) |
| 2 | Radial Dispersion & Wall Effect | Fluid Dynamics | $\frac{D_t}{d_p} > 8.0$ | Chu & Ng (1989) |
| 3 | External Interphase Mass Transfer | Mass Transfer | $Ca = \frac{R_{v,A}^{\text{obs}}}{k_g \, a_v \, C_{A,b}} < \frac{0.05}{n}$ | Mears (1971), Wakao et al. (1979) |
| 4 | Internal Pore Diffusion (Weisz-Prater) | Mass Transfer | $\Phi = \frac{n+1}{2}\frac{R_{v,A}^{\text{obs}}(d_p/6)^2}{D_{A,\text{eff}} C_{A,s}} < 0.08$ | Froment & Bischoff (1990), Anderson & Pratt (1985) |
| 5 | External Gas-Film Heat Transfer | Heat Transfer | $\Delta T_{\text{film}} = \frac{R_{v,A}^{\text{obs}} \|\Delta_r H\| d_p}{6 \alpha_p} < \frac{0.05 R T_G^2}{E_a}$ | Mears (1971), Wakao et al. (1979) |
| 6 | Radial Bed Heat Transfer | Heat Transfer | $\Delta T_{\text{rad}} = \frac{R_{v,A}^{\text{obs}} \|\Delta_r H\|(1-\varepsilon_b)(1-b) D_t^2}{32 \lambda_{\text{er}}} < \frac{0.05 R T_w^2}{E_a}$ | Mears (1971), Specchia et al. (1980) |
| 7 | Intraparticle Solid Conduction | Heat Transfer | $\Delta T_{\text{int}} = \frac{R_{v,A}^{\text{obs}} \|\Delta_r H\| d_p^2}{60 \lambda_p} < \frac{0.05 R T^2}{E_a}$ | Mears (1971) |
| 8 | Relative Pressure Drop | Hydrodynamics | $\Delta P = \frac{f_m \rho_G u_0^2 L}{d_p} < \frac{0.2 P_{\text{tot}}}{n}$ | Ergun (1952) |
| 9 | Inert Bed Dilution Homogeneity | Bed Homogeneity | $\Delta_{\text{dil}} = \left(\frac{b}{1-b}\right)\frac{X_{\text{dil}} d_p}{2 L} < 0.05$ | Berger et al. (2002) |

---

## 4. NIST Thermophysical & Temkin-Pyzhev Kinetics Engine

### Gas Mixture Physical Properties
All gas-phase thermophysical properties are computed dynamically at operating temperature $T$ and pressure $P$:
- **Heat Capacity ($C_{p,g}$)**: NIST 5-parameter Shomate polynomials for $\text{NH}_3$, $\text{N}_2$, and $\text{H}_2$:
  $$C_p^\circ(T) = A + B\,t + C\,t^2 + D\,t^3 + \frac{E}{t^2} \quad [t = T / 1000]$$
- **Dynamic Viscosity ($\mu_g$)**: Pure component viscosity via Chapman-Enskog / Chung collision integrals, combined via Wilke's mixture formulation.
- **Thermal Conductivity ($k_g$)**: Mason & Saxena formulation for polyatomic gas mixtures.
- **Binary Molecular Diffusivity ($D_{AB}$)**: Evaluated at operating $(T, P)$ via the Fuller, Schettler & Giddings method.
- **Effective Pore Diffusivity ($D_{\text{eff}}$)**: Bosanquet and parallel-pore model with pellet porosity $\varepsilon_p$ and tortuosity $\tau_p$:
  $$D_{\text{eff}} = D_{AB} \cdot \frac{\varepsilon_p}{\tau_p}$$
- **Reaction Enthalpy ($|\Delta_r H|$)**: Kirchhoff thermochemical integration:
  $$\Delta_r H(T) = \Delta_f H^\circ_{298}(\text{NH}_3) + \int_{298}^T \Delta C_p(T)\,dT \approx -52.5\,\text{kJ/mol-NH}_3 \text{ at } 673\,\text{K}$$

### Chemical Reaction Rate Law (Temkin-Pyzhev / Dyson-Baddour)
$$r = k_1 \frac{P_{\text{N}_2} P_{\text{H}_2}^{1.5}}{P_{\text{NH}_3}} - k_2 \frac{P_{\text{NH}_3}}{P_{\text{H}_2}^{1.5}}$$
Where $k_1, k_2$ follow Arrhenius temperature dependence and $K_p$ satisfies the thermodynamic equilibrium constant.

---

## 5. The 24 Primary User Inputs (Complete Audit)

The parameter console organizes all required industrial variables into four functional engineering groups with pre-calibrated Haber-Bosch baseline defaults:

| # | Group | Parameter Name | Variable | Default Value | SI Unit |
|---|---|---|:---:|:---:|:---:|
| 1 | Operating & Reactor | Bed Temperature | $T$ | 673.15 | K |
| 2 | Operating & Reactor | Total Operating Pressure | $P$ | 10000000.0 | Pa |
| 3 | Operating & Reactor | Gas Mass Flow Rate | $\dot{m}$ | 1.5e-5 | kg/s |
| 4 | Operating & Reactor | Packed Bed Length | $L$ | 0.040 | m |
| 5 | Operating & Reactor | Tube Inner Diameter | $D_t$ | 0.008 | m |
| 6 | Operating & Reactor | Catalyst Pellet Diameter | $d_p$ | 0.00035 | m |
| 7 | Operating & Reactor | Bed Void Fraction | $\varepsilon_b$ | 0.40 | [-] |
| 8 | Operating & Reactor | Catalyst Pellet Density | $\rho_{\text{cat}}$ | 2750.0 | kg/m³ |
| 9 | Reaction & Kinetics | Measured Reaction Rate | $r_m$ | 1.6e-4 | mol/(kg-cat·s) |
| 10 | Reaction & Kinetics | Apparent Reaction Order | $n$ | 1.1 | [-] |
| 11 | Reaction & Kinetics | Activation Energy | $E_a$ | 92000.0 | J/mol |
| 12 | Reaction & Kinetics | Reaction Enthalpy | $\|\Delta_r H\|$ | 52500.0 | J/mol |
| 13 | Reaction & Kinetics | Feed Reactant Mole Fraction | $y_A$ | 0.06 | [-] |
| 14 | Reaction & Kinetics | Reactant Conversion | $X$ | 0.16 | [-] |
| 15 | Gas Mixture Properties | Gas Mean Molar Mass | $M_g$ | 0.008515 | kg/mol |
| 16 | Gas Mixture Properties | Dynamic Viscosity | $\mu_g$ | 2.24e-5 | kg/(m·s) |
| 17 | Gas Mixture Properties | Specific Heat Capacity | $C_{p,g}$ | 3950.0 | J/(kg·K) |
| 18 | Gas Mixture Properties | Thermal Conductivity | $k_g$ | 0.235 | W/(m·K) |
| 19 | Gas Mixture Properties | Molecular Diffusivity | $D_{AB}$ | 2.1e-6 | m²/s |
| 20 | Gas Mixture Properties | Effective Pore Diffusivity | $D_{\text{eff}}$ | 2.4e-7 | m²/s |
| 21 | Inert Dilution | Catalyst Loaded Mass | $W_{\text{cat}}$ | 0.00025 | kg |
| 22 | Inert Dilution | Inert Diluent (SiC) Mass | $W_{\text{dil}}$ | 0.00035 | kg |
| 23 | Inert Dilution | Inert Particle Density | $\rho_{\text{dil}}$ | 3200.0 | kg/m³ |
| 24 | Inert Dilution | Diluted Bed Conversion | $X_{\text{dil}}$ | 0.16 | [-] |

*All secondary transport properties ($C_{A,b}$, $\rho_G$, $u_0$, $Re$, $Sc$, $Pr$, $Sh$, $Nu$, $Ca$, $\Phi$, $\Delta P$, etc.) are computed autonomously.*

---

## 6. Reactor Architecture & Suitability Decision Bar

Directly on the main page, a mathematical architecture bar validates overall converter viability:
- **Aspect Ratio**: $L/d_p \ge 50$ (eliminates axial dispersion)
- **Tube Ratio**: $D_t/d_p \ge 8$ (suppresses wall channeling)
- **Hydraulic Permeability**: $\Delta P / P < 0.2 / n$ (Ergun pressure drop within isobaric limits)
- **Thermal Uniformity**: $\Delta T_{\text{film}} < \Delta T_{\text{max}}$ and $\Delta T_{\text{rad}} < \Delta T_{\text{max}}$ (Mears criteria)

For in-depth dimensional scores, hydraulic radar profiles, and heat removal analyses, navigate to the dedicated **Reactor Suitability** view.

---

## 7. Custom Formula Studio

Engineers can formulate and test custom transport or empirical diagnostic rules:
- Evaluate custom expressions against live reactor variables (`T`, `P`, `feedFlow`, `dp`, `dt`, `L`, `epsB`, `rVobs`, `Deff`, `Re`, `Pr`, `Sc`, `Bo`, `Ca`, `weiszPrater`, `deltaTfilm`, `deltaTrad`, `pressureDrop`, etc.)
- Specify threshold inequalities (`<`, `<=`, `>`, `>=`), numerical limits, SI units, and LaTeX notation.
- Injects dynamically into the Diagnostic Matrix and official export audit reports.

---

## 8. Development & CLI Execution

### Interactive Web Platform (React + Vite + Tailwind v4 + KaTeX)
```bash
# Install dependencies
npm install

# Start local development server
npm run dev

# Compile production bundle
npm run build
```

### Standalone Python CLI Diagnostic Engine
```bash
# Run interactive CLI assessment (prompts for all 24 inputs; press Enter for defaults)
python simcat_industrial_assessment.py
```

### Production Diagnostic Server
```bash
# Run Flask/Gunicorn backend service
python server.py
# Or using Gunicorn
gunicorn your_application.wsgi
```
