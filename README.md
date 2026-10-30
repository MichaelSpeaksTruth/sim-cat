# Sim-Cat
### Gas-Solid Fixed-Bed Diagnostic Suite for Reaction Kinetics
**Specialized System Focus: Ammonia Synthesis & Decomposition ($0.5\,\text{N}_2 + 1.5\,\text{H}_2 \rightleftharpoons \text{NH}_3$)**
**Thermophysical & Kinetic Mapping: NIST Reference Thermophysics & Temkin-Pyzhev Kinetics**

Sim-Cat is an industrial and laboratory simulation platform for assessing transport limitations in catalytic fixed-bed reactors. 

> Developed according to Eurokin Consortium transport criteria and standard chemical reaction engineering principles.

Engineered with authentic chemical engineering standards: clean white industrial layout, high-contrast tabular readouts, interactive 2D packed bed with dynamic interstitial gas fluid streamlines and tracer particle flow animation, live mathematical derivations, NIST property mapping, and custom formula authoring.

---

## 1. Core Engineering Capabilities

When measuring catalytic reaction rates in laboratory and pilot fixed beds, observed kinetics often deviate from true intrinsic kinetics due to transport resistances:
- Axial and radial flow dispersion (non-ideal plug flow and bypass channeling)
- External gas-film boundary layer mass transfer limitations
- Internal intraparticle pore diffusion limitations (Thiele modulus and Weisz-Prater criterion)
- External gas-film temperature jumps and intraparticle temperature gradients
- Radial bed temperature gradients from centerline to tube wall (Mears criteria)
- Excessive inert bed dilution causing conversion maldistribution (Berger criterion)
- Excessive bed pressure drop violating isobaric operation (Ergun equation)

Sim-Cat assesses all 9 core criteria simultaneously, requiring all transport perturbations to cause less than 5% error on the reaction rate (< 5% tolerance threshold) for true intrinsic kinetic validity.

---

## 2. NIST Chemistry WebBook (SRD 69) Thermophysical Mapping

For Ammonia synthesis, all thermophysical properties are mapped directly from NIST Standard Reference Database 69:
- **Species**: $\text{NH}_3$ (CAS 7664-41-7), $\text{N}_2$ (CAS 7727-37-9), $\text{H}_2$ (CAS 1333-74-0), and carriers $\text{He}$ (CAS 7440-59-7), $\text{Ar}$ (CAS 7440-37-1).
- **Molar Masses**: $M(\text{NH}_3) = 17.031\,\text{g/mol}$, $M(\text{N}_2) = 28.013\,\text{g/mol}$, $M(\text{H}_2) = 2.016\,\text{g/mol}$. Stoichiometric syngas ($3:1\,\text{H}_2:\text{N}_2$): $M = 8.515\,\text{g/mol}$.
- **Heat Capacity**: NIST 5-parameter Shomate polynomials across 298 K to 1400 K:
  $$C_p^\circ(T) = A + B\,t + C\,t^2 + D\,t^3 + \frac{E}{t^2} \quad [t = T / 1000]$$
- **Dynamic Viscosity**: Pure species via Chapman-Enskog / Chung collision integrals, gas mixture dynamic viscosity via Wilke's formulation.
- **Thermal Conductivity**: Polyatomic gas mixture conductivity via Mason & Saxena formulation.
- **Binary Diffusivity**: Fuller, Schettler & Giddings equation for $\text{NH}_3$ in syngas/carrier at process $(T, P)$.
- **Reaction Enthalpy**: Evaluated via Kirchhoff thermochemical integration:
  $$\Delta_r H(T) = \Delta_f H^\circ_{298}(\text{NH}_3) + \int_{298}^T \Delta C_p(T)\,dT \approx -52.5\,\text{kJ/mol-NH}_3 \text{ at } 673\,\text{K}$$

---

## 3. The 9 Core Diagnostic Criteria (Eurokin Protocol)

| Number | Diagnostic Criterion | Category | Governing Formula | Literature Reference |
|---|----------------------|----------|-------------------|----------------------|
| 1 | Axial Dispersion | Fluid Dynamics | $\frac{h_{\text{bed}}}{d_p} > \frac{8}{Bo} \, n \ln\left(\frac{1}{1-X_A}\right)$ | Mears (1971), Gierman (1988), Wakao (1979) |
| 2 | Radial Dispersion | Fluid Dynamics | $\frac{d_t}{d_p} > 8.0$ | Chu & Ng (1989) |
| 3 | External Mass Transfer | Mass Transfer | $Ca = \frac{R_{v,A}^{\text{obs}}}{k_g \, a_v \, C_{A,b}} < \frac{0.05}{n}$ | Mears (1971), Wakao et al. (1979) |
| 4 | Internal Pore Diffusion | Mass Transfer | $\Phi = \frac{n+1}{2}\frac{R_{v,A}^{\text{obs}}(d_p/6)^2}{D_{A,\text{eff}} C_{A,s}} < 0.08$ | Froment & Bischoff (1990), Anderson & Pratt (1985) |
| 5 | External Film Heat Transfer | Heat Transfer | $\Delta T_{\text{film}} = \frac{R_{v,A}^{\text{obs}} \|\Delta_r H\| d_p}{6 \alpha_p} < \frac{0.05 R T_G^2}{E_a}$ | Mears (1971), Wakao et al. (1979) |
| 6 | Radial Bed Heat Transfer | Heat Transfer | $\Delta T_{\text{rad}} = \frac{R_{v,A}^{\text{obs}} \|\Delta_r H\|(1-\varepsilon_b)(1-b) d_t^2}{32 \lambda_{\text{er}}} < \frac{0.05 R T_w^2}{E_a}$ | Mears (1971), Specchia et al. (1980) |
| 7 | Intraparticle Conduction | Heat Transfer | $\Delta T_{\text{int}} = \frac{R_{v,A}^{\text{obs}} \|\Delta_r H\| d_p^2}{60 \lambda_p} < \frac{0.05 R T^2}{E_a}$ | Mears (1971) |
| 8 | Relative Pressure Drop | Hydrodynamics | $\Delta P = \frac{f_m \rho_G u_0^2 h_{\text{bed}}}{d_p} < \frac{0.2 P_{\text{tot}}}{n}$ | Ergun (1952) |
| 9 | Inert Bed Dilution | Bed Homogeneity | $\Delta = \left(\frac{b}{1-b}\right)\frac{X_{\text{dil}} d_p}{2 h_{\text{bed}}} < 0.05$ | Berger et al. (2002) |

---

## 4. Front-Page Reactor Architecture & Suitability Decision Engine

Directly on the main page, Sim-Cat evaluates reactor suitability across four dimensions:
1. **Hydraulic Permeability & Isobaric Stability**: Monitors $\Delta P / P_{\text{tot}}$ via Ergun equation.
2. **Radial Heat Removal & Centerline Isothermality**: Monitors centerline hotspot $\Delta T_{\text{rad}}$ via Mears criterion.
3. **Interphase Gas-Boundary Mass Transfer**: Evaluates Carberry number $Ca$.
4. **Intraparticle Pore Diffusion**: Evaluates Weisz-Prater modulus $\Phi$ and pellet effectiveness factor $\eta$.

### Recommendation Matrix:
- **Packed-Bed Micro-Tubular Reactor**: Viable when all hydraulic and radial thermal criteria are satisfied.
- **Multi-Tubular Fixed-Bed (with Salt Bath cooling)**: Recommended when high exothermicity demands $d_t < 6\,\text{mm}$.
- **Fluidized Bed Reactor (Catalytic BFB)**: Recommended if $\Delta P$ exceeds the 20% isobaric limit.
- **Berty / Carberry Stationary-Basket Internal Recycle Reactor**: Recommended for laboratory intrinsic kinetics when film or pore gradients cannot be completely suppressed in packed beds.

---

## 5. The 24 Required Industrial Inputs (Audited)

All 24 primary parameters are organized into 4 logical industrial categories, each with pre-calibrated baseline defaults:

| # | Category | Parameter | Variable | Default Value | SI Unit |
|---|---|---|:---:|:---:|:---:|
| 1 | Operating & Reactor | Bed Temperature | $T$ | 673.15 | K |
| 2 | Operating & Reactor | Total Pressure | $P$ | 10000000.0 | Pa |
| 3 | Operating & Reactor | Gas Mass Flow Rate | $\dot{m}$ | 1.5e-5 | kg/s |
| 4 | Operating & Reactor | Bed Length | $L$ | 0.040 | m |
| 5 | Operating & Reactor | Tube Inner Diameter | $D_t$ | 0.008 | m |
| 6 | Operating & Reactor | Pellet Diameter | $d_p$ | 0.00035 | m |
| 7 | Operating & Reactor | Bed Void Fraction | $\varepsilon_b$ | 0.40 | [-] |
| 8 | Operating & Reactor | Catalyst Density | $\rho_{\text{cat}}$ | 2750.0 | kg/m³ |
| 9 | Reaction & Kinetics | Measured Reaction Rate | $r_m$ | 1.6e-4 | mol/(kg-cat·s) |
| 10 | Reaction & Kinetics | Reaction Order | $n$ | 1.1 | [-] |
| 11 | Reaction & Kinetics | Activation Energy | $E_a$ | 92000.0 | J/mol |
| 12 | Reaction & Kinetics | Reaction Enthalpy | $|\Delta H_r|$ | 52500.0 | J/mol |
| 13 | Reaction & Kinetics | Feed Reactant Mole Fraction | $y_A$ | 0.06 | [-] |
| 14 | Reaction & Kinetics | Reactant Conversion | $X$ | 0.16 | [-] |
| 15 | Gas Properties (NIST) | Gas Molar Mass | $M_g$ | 0.008515 | kg/mol |
| 16 | Gas Properties (NIST) | Dynamic Viscosity | $\mu_g$ | 2.24e-5 | kg/(m·s) |
| 17 | Gas Properties (NIST) | Specific Heat Capacity | $C_{p,g}$ | 3950.0 | J/(kg·K) |
| 18 | Gas Properties (NIST) | Thermal Conductivity | $k_g$ | 0.235 | W/(m·K) |
| 19 | Gas Properties (NIST) | Molecular Diffusivity | $D_{AB}$ | 2.1e-6 | m²/s |
| 20 | Gas Properties (NIST) | Pore Effective Diffusivity | $D_{\text{eff}}$ | 2.4e-7 | m²/s |
| 21 | Inert Dilution | Catalyst Bed Mass | $W_{\text{cat}}$ | 0.00025 | kg |
| 22 | Inert Dilution | Inert Diluent Mass | $W_{\text{dil}}$ | 0.00035 | kg |
| 23 | Inert Dilution | Inert Particle Density | $\rho_{\text{dil}}$ | 3200.0 | kg/m³ |
| 24 | Inert Dilution | Diluted Bed Conversion | $X_{\text{dil}}$ | 0.16 | [-] |

*All secondary quantities ($C_{A,b}$, $\rho_G$, $u_0$, $Re$, $Sc$, $Pr$, $Sh$, $Nu$, $Ca$, $\Phi$, $\Delta P$, etc.) are computed autonomously.*

---

## 6. Custom Formula Studio

Users can define custom algebraic diagnostic rules:
- Custom JavaScript expression evaluated against live reactor state (`T`, `P`, `feedFlow`, `dp`, `dt`, `L`, `epsB`, `rVobs`, `Deff`, `Re`, `Pr`, `Sc`, `Bo`, `Ca`, `weiszPrater`, `deltaTfilm`, `deltaTrad`, `pressureDrop`, etc.)
- User-specified operator (`<`, `<=`, `>`, `>=`), numerical limit, unit, and LaTeX symbol.
- Evaluated in real-time and injected directly into the main Diagnostic Matrix cards and audit export report.

---

## 7. Local Development & Deployment

### Web Interactive Platform (Vite + React + Tailwind v4 + KaTeX)
```bash
# Install dependencies
npm install

# Run local development server
npm run dev

# Build production bundle
npm run build
```

### Python Industrial CLI Assessment Tool
```bash
# Run standalone CLI assessment (prompts for all 24 inputs; press Enter for defaults)
python simcat_industrial_assessment.py
```

### Python Diagnostic Server (Flask + Gunicorn)
```bash
# Install Python dependencies
pip install -r requirements.txt

# Run Python diagnostic engine
python simcat_engine.py

# Start production web server
python server.py
# Or with Gunicorn
gunicorn your_application.wsgi
```
