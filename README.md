# EUROKIN Catalyst Simulator
### Professional Gas-Solid Fixed-Bed Intrinsic Kinetics Diagnostic Suite

A chemical engineering simulation and diagnostics platform built upon the **EUROKIN Consortium Guidelines** (Rob Berger, Delft University of Technology / Anaproc) for packed-bed catalytic reactors.

Designed with rigorous engineering standards: **bold, serious, intuitive, zero-AI-slop**, and with live mathematical formula derivations and parameter sensitivity sweeps.

---

## 🎯 Purpose & Core Capabilities

When measuring catalytic reaction rates in laboratory and pilot fixed beds, observed kinetics often deviate from true intrinsic kinetics due to transport resistances:
- Axial and radial flow dispersion (non-ideal plug flow & bypass channeling)
- External gas-film boundary layer mass transfer limitations
- Internal intraparticle pore diffusion limitations (Thiele modulus & Weisz-Prater criterion)
- External gas-film temperature jumps & intraparticle temperature gradients
- Radial bed temperature gradients from centerline to tube wall (Mears criteria)
- Excessive inert bed dilution causing conversion maldistribution (Berger criterion)
- Excessive bed pressure drop violating isobaric operation (Ergun equation)

The **EUROKIN Catalyst Simulator** tests all 9 core criteria simultaneously, requiring all transport perturbations to cause less than **5% error** on the reaction rate ($< 5\%$ tolerance threshold) for true intrinsic kinetic validity.

---

## 🔬 The 9 EUROKIN Diagnostic Criteria

| # | Diagnostic Criterion | Category | Governing Formula | Literature Reference |
|---|----------------------|----------|-------------------|----------------------|
| 1 | **Axial Dispersion** | Fluid Dynamics | $\frac{h_{\text{bed}}}{d_p} > \frac{8}{Bo} \, n \ln\left(\frac{1}{1-X_A}\right)$ | Mears (1971), Gierman (1988), Wakao (1979) |
| 2 | **Radial Dispersion** | Fluid Dynamics | $\frac{d_t}{d_p} > 8.0$ | Chu & Ng (1989) |
| 3 | **External Mass Transfer** | Mass Transfer | $Ca = \frac{R_{v,A}^{\text{obs}}}{k_g \, a_v \, C_{A,b}} < \frac{0.05}{n}$ | Mears (1971), Wakao et al. (1979) |
| 4 | **Internal Pore Diffusion** | Mass Transfer | $\Phi = \frac{n+1}{2}\frac{R_{v,A}^{\text{obs}}(d_p/6)^2}{D_{A,\text{eff}} C_{A,s}} < 0.08$ | Froment & Bischoff (1990), Anderson & Pratt (1985) |
| 5 | **External Film Heat Transfer** | Heat Transfer | $\Delta T_{\text{film}} = \frac{R_{v,A}^{\text{obs}} \|\Delta_r H\| d_p}{6 \alpha_p} < \frac{0.05 R T_G^2}{E_a}$ | Mears (1971), Wakao et al. (1979) |
| 6 | **Radial Bed Heat Transfer** | Heat Transfer | $\Delta T_{\text{rad}} = \frac{R_{v,A}^{\text{obs}} \|\Delta_r H\|(1-\varepsilon_b)(1-b) d_t^2}{32 \lambda_{\text{er}}} < \frac{0.05 R T_w^2}{E_a}$ | Mears (1971), Specchia et al. (1980) |
| 7 | **Intraparticle Conduction** | Heat Transfer | $\Delta T_{\text{int}} = \frac{R_{v,A}^{\text{obs}} \|\Delta_r H\| d_p^2}{60 \lambda_p} < \frac{0.05 R T^2}{E_a}$ | Mears (1971) |
| 8 | **Relative Pressure Drop** | Hydrodynamics | $\Delta P = \frac{f_m \rho_G u_0^2 h_{\text{bed}}}{d_p} < \frac{0.2 P_{\text{tot}}}{n}$ | Ergun (1952) |
| 9 | **Inert Bed Dilution** | Bed Homogeneity | $\Delta = \left(\frac{b}{1-b}\right)\frac{X_{\text{dil}} d_p}{2 h_{\text{bed}}} < 0.05$ | Berger et al. (2002) |

---

## 🚀 Getting Started

### 1. Web Interactive Platform (Vite + React + Tailwind + KaTeX)
```bash
# Install dependencies
npm install

# Start local interactive platform
npm run dev

# Open in browser
http://localhost:5173
```

### 2. Standalone Python Calculation Engine (`eurokin_engine.py`)
```bash
# Run terminal benchmark test directly
python eurokin_engine.py
```

---

## 🧪 Built-in Reaction Presets Library
1. **EUROKIN Default**: $N_2O$ decomposition over $Rh/Co_3O_4-Al_2O_3$ diluted with $SiC$ particles (Official 2012 benchmark).
2. **CO Methanation (Sabatier Process)**: Highly exothermic test case over $Ni/Al_2O_3$ testing extreme thermal dissipation limits.
3. **Ammonia Synthesis**: High-pressure (100 bar) Haber-Bosch synthesis over promoted iron catalyst.
4. **Ethylene Epoxidation**: Partial selective oxidation over $Ag/\alpha-Al_2O_3$ carrier.

---

## 🛠 Roadmap to Advanced Features
- [x] Full EUROKIN 9-criteria gas-solid fixed-bed diagnostic engine
- [x] Live mathematical formula inspector with dynamic numerical variable substitution
- [x] 2D packed bed & catalyst pellet microkinetics cross-section visualizer
- [x] Parametric sensitivity sweep curves (Weisz-Prater, Carberry, $\Delta P$, Effectiveness $\eta$)
- [x] Executive audit certificate generator (Markdown, CSV, JSON export)
- [ ] Multiphase trickle-bed & slurry reactor extensions
- [ ] Axial temperature and concentration dynamic ODE numerical integrator (Runge-Kutta 4th order)
- [ ] Multi-component Stefan-Maxwell matrix solver
