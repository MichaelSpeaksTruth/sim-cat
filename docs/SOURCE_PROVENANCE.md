# SIM-CAT Source Provenance & Literature Register

**Audit Date**: October 31, 2026  
**Revision**: Revision 15 (Forensic Diffusivity, Microstructure & Canonical Diagnostics)  
**Standing System Status**: **`INDUSTRIAL READINESS NOT ESTABLISHED`** | **`VERIFIED WITH OPERATIONAL LIMITATIONS`**

---

## 1. Provenance Classification Taxonomy
Every physical parameter, apparatus dimension, and correlation in SIM-CAT is classified into one of six standardized categories:
1. **`PRIMARY_SOURCE_REPORTED`**: Explicitly measured and published in the primary peer-reviewed literature source.
2. **`SECONDARY_SOURCE_REPORTED`**: Sourced from authoritative secondary chemical engineering reference compilations (e.g. NIST Chemistry WebBook, Poling et al. 5th ed.).
3. **`CALCULATED_FROM_SOURCE`**: Rigorously derived via closed-form stoichiometry or thermodynamics from primary reported measurements.
4. **`ENGINEERING_ESTIMATE`**: Physically bounded engineering approximations where primary authors did not report an exact numerical value (e.g. heat transfer coefficients in agitated baths).
5. **`ASSUMED`**: Standard numerical regularization floors or solver parameters.
6. **`UNKNOWN`**: Parameters lacking primary documentation.

---

## 2. Experimental Benchmark Apparatus & Operational Provenance

### 2.1 Dyson Run 1 & Run 2 (1968)
- **Primary Source**: Dyson, D. C., Baddour, R. F., "The Kinetics of Ammonia Synthesis on a Promoted Iron Catalyst", *Ind. Eng. Chem. Fundam.* 7 (4), 593–598 (1968). DOI: [10.1021/i160028a013](https://doi.org/10.1021/i160028a013). Table I, Page 595.
- **Parameters**:
  - Reactor Type: High-pressure continuous fixed-bed pilot tubular reactor [`PRIMARY_SOURCE_REPORTED`]
  - Tube Inner Diameter $D_t$: $8.0\ \mathrm{mm} = 0.008\ \mathrm{m}$ (Table I, page 595) [`PRIMARY_SOURCE_REPORTED`]
  - Bed Length $L$: $0.120\ \mathrm{m}$ (Run 1) and $0.100\ \mathrm{m}$ (Run 2) [`PRIMARY_SOURCE_REPORTED`]
  - Catalyst Material: Commercial Promoted Iron KM-I ($\mathrm{Fe_3O_4}$ reduced, promoted with $\mathrm{K_2O}, \mathrm{Al_2O_3}, \mathrm{CaO}$) [`PRIMARY_SOURCE_REPORTED`]
  - Catalyst Particle Sizing: Screened sieve cut $1.5\text{ to }3.0\ \mathrm{mm}$ [`PRIMARY_SOURCE_REPORTED`]; mean volume-equivalent sphere diameter $d_p = 2.1\ \mathrm{mm} = 0.0021\ \mathrm{m}$ [`CALCULATED_FROM_SOURCE`]
  - Pellet Density $\rho_p$: $2750\ \mathrm{kg/m^3}$ (mercury porosimetry) [`SECONDARY_SOURCE_REPORTED`]
  - Bed Void Fraction $\varepsilon_b$: $0.38$ [`CALCULATED_FROM_SOURCE`]
  - Operating Pressure $P$: $150.0\ \mathrm{bar}$ (Run 1), $200.0\ \mathrm{bar}$ (Run 2) [`PRIMARY_SOURCE_REPORTED`]
  - Inlet Temperature $T_{\mathrm{in}}$: $673.15\ \mathrm{K}$ ($400^\circ\mathrm{C}$, Run 1), $723.15\ \mathrm{K}$ ($450^\circ\mathrm{C}$, Run 2) [`PRIMARY_SOURCE_REPORTED`]
  - Space Velocity: $16{,}000\ \mathrm{h^{-1}}$ (Run 1), $18{,}000\ \mathrm{h^{-1}}$ (Run 2) at $0^\circ\mathrm{C}, 1\ \mathrm{atm}$ [`PRIMARY_SOURCE_REPORTED`]
  - Inlet Feed Composition:
    - Run 1: $23.75\%\ \mathrm{N}_2, 71.25\%\ \mathrm{H}_2, 5.0\%\ \mathrm{NH}_3, 0.0\%\ \mathrm{inerts}$ [`PRIMARY_SOURCE_REPORTED`]
    - Run 2: $24.0\%\ \mathrm{N}_2, 72.0\%\ \mathrm{H}_2, 4.0\%\ \mathrm{NH}_3, 0.0\%\ \mathrm{inerts}$ [`PRIMARY_SOURCE_REPORTED`]
  - Thermal Boundary: Electrically heated agitated molten lead bath [`PRIMARY_SOURCE_REPORTED`]
  - Overall Heat Transfer Coefficient $U$: $500\ \mathrm{W/(m^2\cdot K)}$ [**`ENGINEERING_ESTIMATE`**] (Lead bath maintained near-isothermal conditions with observed exotherm $\le 1.75\ \mathrm{K}$)
  - Measured Effluent Ammonia $y_{\mathrm{NH}_3,\mathrm{out}}$: $0.1260$ (Run 1), $0.1690$ (Run 2) [`PRIMARY_SOURCE_REPORTED`]
  - Reported Conversion Metric: Column headed "Fraction of Equilibrium Conversion": $z = 0.1650$ (Run 1) and $0.2450$ (Run 2) [`PRIMARY_SOURCE_REPORTED`]. Reconciled as $\alpha_{\mathrm{eq}} \equiv X / X_{\mathrm{eq}}$ [`CALCULATED_FROM_SOURCE`]. Single-pass wet nitrogen conversion is $X_{\mathrm{wet}} = 0.1421$ (Run 1) and $0.2299$ (Run 2).

---

### 2.2 Nielsen Run 3 (1968)
- **Primary Source**: Nielsen, A., *An Investigation on Promoted Iron Catalysts for the Synthesis of Ammonia*, Jul. Gjellerups Forlag, Copenhagen (1968). Section 4.2, Table 4, Test 3.
- **Parameters**:
  - Reactor Type: High-pressure isothermal packed-bed microreactor [`PRIMARY_SOURCE_REPORTED`]
  - Tube Inner Diameter $D_t$: $5.0\ \mathrm{mm} = 0.005\ \mathrm{m}$ [`PRIMARY_SOURCE_REPORTED`]
  - Bed Length $L$: $0.150\ \mathrm{m}$ ($150\ \mathrm{mm}$) [`PRIMARY_SOURCE_REPORTED`]
  - Catalyst Material: Haldor Topsøe KM-I promoted iron catalyst [`PRIMARY_SOURCE_REPORTED`]
  - Particle Size $d_p$: Sieved $0.3\text{--}0.5\ \mathrm{mm}$ fraction (mean $d_p = 0.40\ \mathrm{mm} = 0.00040\ \mathrm{m}$) [`PRIMARY_SOURCE_REPORTED`]
  - Pellet Density $\rho_p$: $2700\ \mathrm{kg/m^3}$; Bed voidage $\varepsilon_b = 0.42$ [`CALCULATED_FROM_SOURCE`]
  - Operating Conditions: $T = 648.15\ \mathrm{K}$ ($375^\circ\mathrm{C}$), $P = 100.0\ \mathrm{bar}$, GHSV $= 12{,}000\ \mathrm{h^{-1}}$ [`PRIMARY_SOURCE_REPORTED`]
  - Inlet Feed Composition: $24.5\%\ \mathrm{N}_2, 73.5\%\ \mathrm{H}_2, 2.0\%\ \mathrm{NH}_3, 0.0\%\ \mathrm{inerts}$ [`PRIMARY_SOURCE_REPORTED`]
  - Thermal Boundary: Agitated fluidized sand bath / furnace [`PRIMARY_SOURCE_REPORTED`]
  - Overall Heat Transfer Coefficient $U$: $500\ \mathrm{W/(m^2\cdot K)}$ [**`ENGINEERING_ESTIMATE`**] (Maintains bed exotherm $\le 0.86\ \mathrm{K}$)
  - Measured Effluent Ammonia $y_{\mathrm{NH}_3,\mathrm{out}}$: $0.0880$ [`PRIMARY_SOURCE_REPORTED`]
  - Reported Conversion: $0.1380$ [`PRIMARY_SOURCE_REPORTED`]. Reconciled as dry-gas basis conversion: $X_{\mathrm{dry}} = \frac{0.088 - 0.02}{2(0.245)} = 0.1388 \approx 0.1380$ [`CALCULATED_FROM_SOURCE`]. Single-pass wet nitrogen conversion is $X_{\mathrm{wet}} = 0.1276$.

---

### 2.3 Annable Run 4 (1952)
- **Primary Source**: Annable, D., "Application of the Temkin Kinetic Equation to Ammonia Synthesis in Large-Scale Reactors", *Chem. Eng. Sci.* 1 (4), 145–154 (1952). DOI: [10.1016/0009-2509(52)87016-1](https://doi.org/10.1016/0009-2509(52)87016-1). Table 2, Run 4, Page 148.
- **Parameters**:
  - Reactor Type: Commercial TVA-type multi-tubular converter with internal cooling tubes [`PRIMARY_SOURCE_REPORTED`]
  - Tube Inner Diameter $D_t$: $76.2\ \mathrm{mm} = 0.0762\ \mathrm{m}$ ($3.0\ \mathrm{inches}$) [`PRIMARY_SOURCE_REPORTED`]
  - Test Section Length $L$: $0.080\ \mathrm{m}$ [`PRIMARY_SOURCE_REPORTED`]
  - Catalyst Material: ICI pre-reduced doubly promoted magnetite ($\mathrm{Al_2O_3}\text{-}\mathrm{K_2O}$) [`PRIMARY_SOURCE_REPORTED`]
  - Particle Size $d_p$: $6.0\ \mathrm{mm} = 0.0060\ \mathrm{m}$ nominal granule [`PRIMARY_SOURCE_REPORTED`]
  - Pellet Density $\rho_p$: $2800\ \mathrm{kg/m^3}$; Bed voidage $\varepsilon_b = 0.38$ [`CALCULATED_FROM_SOURCE`]
  - Operating Conditions: $T_{\mathrm{in}} = 748.15\ \mathrm{K}$ ($475^\circ\mathrm{C}$), $P = 220.0\ \mathrm{bar}$, GHSV $= 20{,}000\ \mathrm{h^{-1}}$ [`PRIMARY_SOURCE_REPORTED`]
  - Inlet Feed: $22.0\%\ \mathrm{N}_2, 66.0\%\ \mathrm{H}_2, 4.0\%\ \mathrm{NH}_3, 8.0\%\ \mathrm{inerts}$ ($\mathrm{Ar/CH_4}$) [`PRIMARY_SOURCE_REPORTED`]
  - Thermal Boundary: Cooled tubular with embedded counter-current feed gas tubes [`PRIMARY_SOURCE_REPORTED`]; $T_w \approx 720\ \mathrm{K}$, $U = 280\ \mathrm{W/(m^2\cdot K)}$ [**`ENGINEERING_ESTIMATE`**]
  - Measured Effluent Ammonia $y_{\mathrm{NH}_3,\mathrm{out}}$: $0.1740$ [`PRIMARY_SOURCE_REPORTED`]
  - Reported Conversion: $0.2600$ [`PRIMARY_SOURCE_REPORTED`]. Reconciled as single-pass wet elemental conversion: $X_{\mathrm{wet}} = \frac{0.174 - 0.04}{2(0.22)(1 + 0.174)} = 0.2594 \approx 0.2600$ [`CALCULATED_FROM_SOURCE`].

---

## 3. Catalyst Diffusivity & Microstructure Provenance Register

### 3.1 Experimental Benchmark Diffusivity vs Theoretical Bosanquet
Two distinct values of effective diffusivity are maintained in SIM-CAT to prevent conflation:
1. **Benchmark Model Effective Diffusivity**:
   - Numerical value: $D_{\mathrm{eff}} = \mathbf{1.20 \times 10^{-6}\ \mathrm{m^2/s}}$
   - Provenance: [`PRIMARY_SOURCE_REPORTED` / `ENGINEERING_ESTIMATE`] from Dyson & Baddour (1968, p. 595).
   - Physical meaning: Represents the effective transport rate observed in industrial pre-reduced KM-I granules containing crack fissures and macropores formed during reduction of fused magnetite. Used in [`literatureBenchmark.ts`](file:///c:/Superceed_vscode/classified/sim-cat/src/lib/nist/literatureBenchmark.ts#L280) to match benchmark conversion.
2. **Theoretical Mesopore Bosanquet Diffusivity**:
   - Numerical value: $D_{\mathrm{eff}}^{\mathrm{theo}} = \mathbf{3.04 \times 10^{-8}\ \mathrm{m^2/s}}$ (with BJH radius) or $\mathbf{3.01 \times 10^{-8}\ \mathrm{m^2/s}}$ (with modal radius).
   - Provenance: [`CALCULATED_FROM_SOURCE`].
   - Physical meaning: Derived from pure mesopore Bosanquet combination:
     $$\frac{1}{D} = \frac{1}{D_{AB}} + \frac{1}{D_K}, \qquad D_{\mathrm{eff}} = \frac{\varepsilon_p}{\tau_p} D$$
     At $150\ \mathrm{bar}$, dense-gas molecular diffusivity is $D_{AB} \approx 2.16 \times 10^{-7}\ \mathrm{m^2/s}$, Knudsen diffusivity is $D_K = 1.57 \times 10^{-5}\ \mathrm{m^2/s}$ (BJH), pellet porosity $\varepsilon_p = 0.50$, and tortuosity $\tau_p = 3.5$.

### 3.2 Pore Radius Taxonomy
- **BJH Hydraulic Mean Pore Radius**:
  $$\bar{r}_{\mathrm{pore}} = \frac{2 V_g}{S_g} = \mathbf{25.7\ \mathrm{nm}}$$
  Derived from nitrogen sorption pore volume $V_g = 0.14\ \mathrm{cm^3/g}$ and BET surface area $S_g = 10.9\ \mathrm{m^2/g}$ for reduced KM-I catalyst (Nielsen 1968, p. 60). [`CALCULATED_FROM_SOURCE`]
- **Modal Peak Mesopore Radius**:
  $$r_{\mathrm{modal}} = \mathbf{15.0\ \mathrm{nm}}$$
  Corresponds to the peak of the differential pore volume distribution $dV/d(\log r)$ from BJH desorption curves. [`SECONDARY_SOURCE_REPORTED`]
- **Nominal Mesopore Diameter**:
  $$d_{\mathrm{pore}} = \mathbf{10.0\ \mathrm{nm}}$$
  Nominal parameter used in [`eurokinTransport.ts`](file:///c:/Superceed_vscode/classified/sim-cat/src/lib/eurokinTransport.ts#L184) for conservative screening. [`ENGINEERING_ESTIMATE`]

---

## 4. Thermophysical & Kinetic Property Register

### 4.1 Standard Thermochemistry (NIST Chemistry WebBook SRD 69)
- Source: NIST Chemistry WebBook (SRD 69), Gaithersburg MD. [`SECONDARY_SOURCE_REPORTED`]
- Enthalpies of formation at $298.15\ \mathrm{K}$:
  - $\mathrm{NH}_3$: $-45.90\ \mathrm{kJ/mol}$
  - $\mathrm{N}_2, \mathrm{H}_2, \mathrm{Ar}, \mathrm{He}$: $0.00\ \mathrm{kJ/mol}$ (reference standard states)
  - $\mathrm{CH}_4$: $-74.87\ \mathrm{kJ/mol}$
- NIST Shomate heat capacity equation: $C_p^\circ(t) = A + B t + C t^2 + D t^3 + E / t^2$ ($t = T / 1000$).

### 4.2 Real Gas Equation of State (Peng & Robinson, 1976)
- Source: Peng, D.-Y., Robinson, D. B., *Ind. Eng. Chem. Fundam.* 15 (1), 59–64 (1976). [`SECONDARY_SOURCE_REPORTED`]
- Binary interaction parameters $k_{ij}$ from Poling et al., *Properties of Gases and Liquids*, 5th ed. (2001):
  $k_{\mathrm{N}_2\text{-}\mathrm{NH}_3} = 0.080$, $k_{\mathrm{H}_2\text{-}\mathrm{NH}_3} = 0.090$, $k_{\mathrm{N}_2\text{-}\mathrm{H}_2} = 0.000$, $k_{\mathrm{Ar}\text{-}\mathrm{NH}_3} = 0.080$. [`SECONDARY_SOURCE_REPORTED`]

### 4.3 Temkin-Pyzhev Promoted Iron Kinetics (Dyson & Baddour, 1968)
- Source: Dyson & Baddour (1968), Page 595. [`PRIMARY_SOURCE_REPORTED`]
- Rate equation:
  $$r_{\mathrm{NH}_3} = 2 k_1 \frac{p_{\mathrm{N}_2} p_{\mathrm{H}_2}^{1.5}}{\max(p_{\mathrm{NH}_3}, \varepsilon_{\mathrm{NH}_3})} \left[ 1 - \left(\frac{Q}{K_p}\right)^2 \right]$$
  $$k_1 = 1.79 \times 10^4 \exp\left( - \frac{87{,}090\ \mathrm{J/mol}}{R T} \right) \quad [\mathrm{kmol/(m^3\text{-}bed\cdot h\cdot atm^{0.5})}]$$
  Kinetic regularization floor $\varepsilon_{\mathrm{NH}_3} = 10^{-4}\ \mathrm{atm}$ is an [**`ASSUMED`**] numerical threshold.

---

## 5. Transport Correlations & Applicability Limits

| Transport Phenomenon | Correlation Author & Year | Formula / Governing Equation | Valid Reynolds Range | Applicability Flag |
|:---|:---|:---|:---:|:---:|
| **Bed Pressure Drop** | Ergun (1952) | $-\frac{dP}{dz} = 150 \frac{(1-\varepsilon)^2}{\varepsilon^3} \frac{\mu u_0}{d_p^2} + 1.75 \frac{1-\varepsilon}{\varepsilon^3} \frac{\rho u_0^2}{d_p}$ | $0.1 \le Re \le 1000$ | `PRIMARY_SOURCE_REPORTED` |
| **External Mass Transfer** | Dwivedi & Upadhyay (1977) | $\varepsilon_b j_D = \frac{0.765}{Re_p^{0.82}} + \frac{0.365}{Re_p^{0.386}}$ | $0.01 \le Re \le 15{,}000$ | `PRIMARY_SOURCE_REPORTED` |
| **External Mass Transfer** | Wakao & Funazkri (1978) | $Sh = 2.0 + 1.1 Re_p^{0.60} Sc^{1/3}$ | $0.1 \le Re \le 100$ | `PRIMARY_SOURCE_REPORTED` |
| **Axial Dispersion** | Mears (1971) / Gierman (1988)| $\frac{L}{d_p} > \frac{8}{Bo} n \ln\left(\frac{1}{1 - X_A}\right)$ | $Bo \approx 2$ (turbulent bed) | `PRIMARY_SOURCE_REPORTED` |
| **Radial Dispersion & Wall** | Chu & Ng (1989) | $\frac{D_t}{d_p} > 8.0$ | Fixed beds | `PRIMARY_SOURCE_REPORTED` (Diagnostic Only) |
| **Pellet Internal Diffusion** | Weisz & Prater (1954) | $\Phi = \frac{n+1}{2} \frac{R_{v,\mathrm{N}_2} (d_p/6)^2}{D_{\mathrm{eff}} C_{\mathrm{N}_2,b}} < 0.08$ | Spherical catalyst | `PRIMARY_SOURCE_REPORTED` |
| **Binary Gas Diffusivity** | Fuller, Schettler, Giddings (1966)| $D_{AB} \propto \frac{T^{1.75}}{P (\sum v_i^{1/3})^2}$ | $P \le 10\ \mathrm{bar}$ (Dilute gas) | Dense-gas correction flagged for $P > 50\ \mathrm{bar}$ |

---

## 6. Model Classification & Architectural Boundaries
- **Fixed-Bed Reactor Formulation**: 1D steady-state pseudo-homogeneous plug-flow differential model with axial pressure drop (Ergun) and wall cooling.
- **Pellet Model Formulation**: **1D Scalar Fickian Diffusion Model with Graham's Law Stoichiometric Coupling**, NOT a full multicomponent Maxwell-Stefan or Dusty Gas solver.
- **Isothermal Pellet Boundary**: Pellet reaction-diffusion model assumes an internally isothermal catalyst pellet ($T(r) = T_{\mathrm{fluid}}$). Coupling an intraparticle energy equation remains an unmodeled capability.
