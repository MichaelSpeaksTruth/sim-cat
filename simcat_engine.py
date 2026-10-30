"""
SIM-CAT Fixed-Bed Gas-Solid Reactor Diagnostic Engine & Intrinsic Kinetics Assessment.
System: Ammonia Synthesis & Decomposition (0.5 N2 + 1.5 H2 <=> NH3)
Thermophysical Source: NIST Chemistry WebBook (SRD 69)
Note: Eurokin's documentations have been used to develop this prototype.

Key Diagnostics:
 1. Pressure Drop Criterion (Ergun Equation)
 2. Axial Dispersion Criterion (Mears & Gierman, Wakao Bo correlation)
 3. Radial Dispersion Criterion (Chu & Ng)
 4. Inert Bed Dilution Criterion (Berger et al.)
 5. External Mass Transfer Criterion (Carberry Number, Wakao Sh correlation)
 6. Internal Pore Diffusion Limitation (Weisz-Prater Modulus & Thiele Modulus)
 7. External Heat Transfer Limitation (Mears Film Criterion, Wakao Nu correlation)
 8. Radial Heat Transfer Limitation (Mears Bed Criterion, Specchia et al.)
 9. Intraparticle Heat Conduction Limitation (Mears Particle Gradient)
 10. Adiabatic Temperature Rise (Safety & Runaway potential)
"""

import math
from dataclasses import dataclass, asdict
from typing import Dict, List, Any, Optional

@dataclass
class ReactorParameters:
    # Bulk Gas Feed
    bulk_gas_type: str = "syngas_stoichiometric" # Syngas 3:1 H2:N2

    # Operating Conditions (NIST Baseline: Industrial Ammonia Synthesis)
    temperature: float = 673.15            # Bed temperature [K] (400 °C)
    total_pressure: float = 10000000.0     # Total pressure [Pa] (100 bar)
    feed_flow: float = 1.5e-5              # Mass flow rate [kg/s] (15 mg/s)
    
    # Reactor Geometry
    bed_height: float = 0.040              # Bed length [m] (40 mm)
    tube_diameter: float = 0.008           # Tube inner diameter [m] (8 mm)
    
    # Catalyst Bed & Pellet
    particle_diameter: float = 0.00035     # Catalyst pellet diameter [m] (350 µm)
    bed_porosity: float = 0.40             # Bed void fraction [-]
    catalyst_density: float = 2750.0       # Promoted Fe pellet density [kg/m³]
    pellet_porosity: float = 0.38          # Internal pellet porosity [-]
    pellet_tortuosity: float = 3.3         # Pellet internal tortuosity [-]
    catalyst_thermal_cond: float = 1.35    # Catalyst thermal conductivity [W/m-K]
    
    # Kinetic Parameters
    reaction_rate: float = 1.6e-4          # Observed reaction rate [mol/kg-cat-s]
    reaction_order: float = 1.1            # Apparent reaction order [-]
    activation_energy: float = 92000.0     # Activation energy [J/mol] (92 kJ/mol)
    reaction_enthalpy: float = 52500.0     # NIST reaction enthalpy at 673 K [J/mol]
    conversion: float = 0.16               # Fractional conversion [-]
    reactant_mole_fraction: float = 0.06   # Reactant mole fraction in feed [-]
    
    # Gas Mixture Transport Properties (NIST WebBook SRD 69 Mapped)
    gas_molecular_weight: float = 0.008515 # Stoichiometric syngas mean molar mass [kg/mol]
    gas_viscosity: float = 2.24e-5         # Gas viscosity [kg/m-s] (Wilke mixture)
    gas_heat_capacity: float = 3950.0      # Gas heat capacity [J/kg-K] (NIST Shomate)
    gas_conductivity: float = 0.235        # Gas thermal conductivity [W/m-K] (Mason-Saxena)
    effective_diffusivity: float = 2.4e-7  # Effective pore diffusivity [m²/s]
    molecular_diffusivity: float = 2.1e-6  # Fuller binary diffusivity at 100 bar [m²/s]
    
    # Dilution Parameters (SiC inert diluent)
    catalyst_mass: float = 0.00025         # Catalyst mass [kg] (250 mg)
    inert_mass: float = 0.00035            # Inert diluent mass [kg] (350 mg SiC)
    inert_density: float = 3200.0          # Inert particle density [kg/m³] (SiC)
    diluted_conversion: float = 0.16       # Conversion with diluted bed [0 to 1]
    inert_thermal_cond: float = 25.0       # Inert thermal conductivity [W/m-K]


@dataclass
class DiagnosticCriterion:
    id: str
    name: str
    category: str
    symbol: str
    calculated_value: float
    limit_value: float
    comparison_operator: str               # "<" or ">"
    unit: str
    passed: bool
    margin_percent: float                  # % safety margin relative to limit
    formula_latex: str
    description: str
    reference: str


def compute_simcat_assessment(params: ReactorParameters) -> Dict[str, Any]:
    R = 8.314462  # J/mol-K

    T = params.temperature
    P = params.total_pressure
    M_gas = params.gas_molecular_weight
    
    # 1. Hydrodynamics
    gas_density = (P * M_gas) / (R * T)
    bed_area = (math.pi / 4.0) * (params.tube_diameter ** 2)
    superficial_velocity = params.feed_flow / (bed_area * gas_density)
    
    # Reynolds number (particle based)
    Re = (params.particle_diameter * gas_density * superficial_velocity) / params.gas_viscosity
    
    # Dimensionless transport numbers
    Sc = params.gas_viscosity / (gas_density * params.molecular_diffusivity)
    Pr = (params.gas_heat_capacity * params.gas_viscosity) / params.gas_conductivity
    
    # Bed tortuosity (Puncochar & Drahos: tau_b = 1 / sqrt(eps_b))
    bed_tortuosity = 1.0 / math.sqrt(max(params.bed_porosity, 0.1))
    
    # Bodenstein number (Wakao et al.)
    bodenstein_inv = (params.bed_porosity / (bed_tortuosity * max(Re, 1e-5) * Sc)) + 0.5
    Bo = 1.0 / bodenstein_inv if bodenstein_inv > 0 else 2.0
    
    # Concentrations & reaction rates
    bulk_conc = (params.reactant_mole_fraction * P) / (R * T)
    r_v_obs = params.reaction_rate * params.catalyst_density # mol / m³_cat / s
    
    # External mass transfer (Wakao Sh correlation)
    Sh = 2.0 + 1.1 * (max(Re, 1e-4) ** 0.6) * (Sc ** (1.0 / 3.0))
    k_g = (Sh * params.molecular_diffusivity) / params.particle_diameter
    a_v = 6.0 / params.particle_diameter # specific external surface area [m²/m³_pellet]
    
    # Carberry number
    carberry_num = r_v_obs / (k_g * a_v * max(bulk_conc, 1e-12))
    carberry_limit = 0.05 / max(params.reaction_order, 1e-4)
    
    # Internal pore diffusion (Weisz-Prater Modulus)
    char_length = params.particle_diameter / 6.0 # sphere R_p / 3
    weisz_prater = ((params.reaction_order + 1.0) / 2.0) * (r_v_obs * (char_length ** 2)) / (max(params.effective_diffusivity, 1e-12) * max(bulk_conc, 1e-12))
    weisz_limit = 0.08
    
    # Effectiveness factor estimation (spherical 1st order approximation)
    thiele_modulus = math.sqrt(max(weisz_prater, 1e-8))
    if thiele_modulus < 0.1:
        effectiveness_factor = 1.0 - ((3.0 * thiele_modulus) ** 2) / 15.0
    else:
        arg = 3.0 * thiele_modulus
        tanh_arg = math.tanh(arg)
        effectiveness_factor = (1.0 / thiele_modulus) * (1.0 / tanh_arg - 1.0 / arg)
    effectiveness_factor = max(0.01, min(1.0, effectiveness_factor))
    
    # External heat transfer (Wakao Nu correlation)
    Nu = 2.0 + 1.1 * (max(Re, 1e-4) ** 0.6) * (Pr ** (1.0 / 3.0))
    alpha_p = (Nu * params.gas_conductivity) / params.particle_diameter
    delta_T_film = (r_v_obs * abs(params.reaction_enthalpy) * params.particle_diameter) / (6.0 * alpha_p)
    delta_T_film_limit = (0.05 * R * (T ** 2)) / max(params.activation_energy, 1e-3)
    
    # Pressure drop (Ergun equation)
    f_m = ((1.0 - params.bed_porosity) / (params.bed_porosity ** 3)) * (1.75 + (150.0 * (1.0 - params.bed_porosity) / max(Re, 1e-5)))
    pressure_drop = (f_m * gas_density * (superficial_velocity ** 2) * params.bed_height) / params.particle_diameter
    pressure_drop_limit = (0.2 * P) / max(params.reaction_order, 1e-4)
    
    # Axial dispersion criterion (Mears & Gierman)
    axial_disp_ratio = params.bed_height / params.particle_diameter
    axial_disp_limit = (8.0 / Bo) * params.reaction_order * math.log(1.0 / (1.0 - min(max(params.conversion, 1e-4), 0.999)))
    
    # Radial dispersion criterion (Chu & Ng)
    radial_disp_ratio = params.tube_diameter / params.particle_diameter
    radial_disp_limit = 8.0
    
    # Inert bed dilution (Berger et al.)
    v_inert = params.inert_mass / max(params.inert_density, 1.0)
    v_cat = params.catalyst_mass / max(params.catalyst_density, 1.0)
    b_dilution = v_inert / (v_inert + v_cat) if (v_inert + v_cat) > 0 else 0.0
    dilution_deviation = (b_dilution / (1.0 - b_dilution)) * (params.diluted_conversion * params.particle_diameter) / (2.0 * params.bed_height) if (b_dilution < 1.0 and params.bed_height > 0) else 0.0
    dilution_limit = 0.05
    
    # Radial bed heat transfer (Specchia et al.)
    lambda_p_eff = params.catalyst_thermal_cond
    if 0 < b_dilution < 1.0:
        inv_lambda = ((1.0 - b_dilution) / params.catalyst_thermal_cond) + (b_dilution / params.inert_thermal_cond)
        lambda_p_eff = 1.0 / inv_lambda if inv_lambda > 0 else params.catalyst_thermal_cond
        
    lambda_b0_ratio = params.bed_porosity + (1.0 - params.bed_porosity) / (0.220 * (params.bed_porosity ** 2) + (2.0 / 3.0) * (params.gas_conductivity / max(lambda_p_eff, 1e-6)))
    Pe_rif = 8.65 * (1.0 + 19.4 * ((params.particle_diameter / params.tube_diameter) ** 2))
    lambda_conv_ratio = (Re * Pr) / Pe_rif
    lambda_er = params.gas_conductivity * (lambda_b0_ratio + lambda_conv_ratio)
    
    delta_T_rad = (r_v_obs * abs(params.reaction_enthalpy) * (1.0 - params.bed_porosity) * (1.0 - b_dilution) * (params.tube_diameter ** 2)) / (32.0 * max(lambda_er, 1e-6))
    delta_T_rad_limit = (0.05 * R * (T ** 2)) / max(params.activation_energy, 1e-3)
    
    # Intraparticle heat conduction (Mears)
    delta_T_int = (r_v_obs * abs(params.reaction_enthalpy) * (params.particle_diameter ** 2)) / (60.0 * max(lambda_p_eff, 1e-6))
    delta_T_int_limit = (0.05 * R * (T ** 2)) / max(params.activation_energy, 1e-3)
    
    # Adiabatic temperature rise
    delta_T_ad = (abs(params.reaction_enthalpy) * params.reactant_mole_fraction * params.conversion) / (params.gas_heat_capacity * M_gas)

    def calc_margin(val: float, lim: float, op: str) -> float:
        if lim == 0:
            return 0.0
        return ((lim - val) / lim) * 100.0 if op == "<" else ((val - lim) / lim) * 100.0

    criteria = [
        DiagnosticCriterion(
            id="axial_dispersion",
            name="Axial Dispersion & Plug Flow",
            category="Fluid Dynamics",
            symbol="L / d_p",
            calculated_value=axial_disp_ratio,
            limit_value=axial_disp_limit,
            comparison_operator=">",
            unit="[-]",
            passed=axial_disp_ratio > axial_disp_limit,
            margin_percent=calc_margin(axial_disp_ratio, axial_disp_limit, ">"),
            formula_latex=r"\frac{h_{\text{bed}}}{d_p} > \frac{8}{Bo} n \ln\left(\frac{1}{1 - X_A}\right)",
            description="Prevents axial backmixing from damping apparent reaction order.",
            reference="Mears (1971), Gierman (1988), Wakao et al. (1979)"
        ),
        DiagnosticCriterion(
            id="radial_dispersion",
            name="Radial Dispersion & Wall Effect",
            category="Fluid Dynamics",
            symbol="d_t / d_p",
            calculated_value=radial_disp_ratio,
            limit_value=radial_disp_limit,
            comparison_operator=">",
            unit="[-]",
            passed=radial_disp_ratio > radial_disp_limit,
            margin_percent=calc_margin(radial_disp_ratio, radial_disp_limit, ">"),
            formula_latex=r"\frac{d_t}{d_p} > 8.0",
            description="Prevents tube wall flow bypass channeling.",
            reference="Chu & Ng (1989)"
        ),
        DiagnosticCriterion(
            id="external_mass_transfer",
            name="External Film Mass Transfer (Carberry)",
            category="Mass Transfer",
            symbol="Ca",
            calculated_value=carberry_num,
            limit_value=carberry_limit,
            comparison_operator="<",
            unit="[-]",
            passed=carberry_num < carberry_limit,
            margin_percent=calc_margin(carberry_num, carberry_limit, "<"),
            formula_latex=r"Ca = \frac{R_{v,A}^{\text{obs}}}{k_g a_v C_{A,b}} < \frac{0.05}{n}",
            description="Guarantees concentration drop across laminar boundary layer < 5%.",
            reference="Mears (1971), Wakao et al. (1979)"
        ),
        DiagnosticCriterion(
            id="internal_diffusion",
            name="Internal Pore Diffusion (Weisz-Prater)",
            category="Mass Transfer",
            symbol=r"\Phi",
            calculated_value=weisz_prater,
            limit_value=weisz_limit,
            comparison_operator="<",
            unit="[-]",
            passed=weisz_prater < weisz_limit,
            margin_percent=calc_margin(weisz_prater, weisz_limit, "<"),
            formula_latex=r"\Phi = \frac{n + 1}{2}\frac{R_{v,A}^{\text{obs}}(d_p/6)^2}{D_{A,\text{eff}}C_{A,s}} < 0.08",
            description="Ensures pore diffusion resistance is negligible (effectiveness factor > 95%).",
            reference="Froment & Bischoff (1990), Anderson & Pratt (1985)"
        ),
        DiagnosticCriterion(
            id="external_heat_transfer",
            name="External Boundary Film Heat Transfer",
            category="Heat Transfer",
            symbol=r"\Delta T_{\text{film}}",
            calculated_value=delta_T_film,
            limit_value=delta_T_film_limit,
            comparison_operator="<",
            unit="K",
            passed=delta_T_film < delta_T_film_limit,
            margin_percent=calc_margin(delta_T_film, delta_T_film_limit, "<"),
            formula_latex=r"\Delta T_{\text{film}} = \frac{R_{v,A}^{\text{obs}}|\Delta_r H|d_p}{6 \alpha_p} < \frac{0.05 R T_G^2}{E_a}",
            description="Prevents non-isothermal temperature jumps across gas film.",
            reference="Mears (1971), Wakao et al. (1979)"
        ),
        DiagnosticCriterion(
            id="radial_heat_transfer",
            name="Radial Bed Heat Transfer & Hotspots",
            category="Heat Transfer",
            symbol=r"\Delta T_{\text{rad}}",
            calculated_value=delta_T_rad,
            limit_value=delta_T_rad_limit,
            comparison_operator="<",
            unit="K",
            passed=delta_T_rad < delta_T_rad_limit,
            margin_percent=calc_margin(delta_T_rad, delta_T_rad_limit, "<"),
            formula_latex=r"\Delta T_{\text{rad}} = \frac{R_{v,A}^{\text{obs}}|\Delta_r H|(1-\varepsilon_b)(1-b)d_t^2}{32 \lambda_{\text{er}}} < \frac{0.05 R T_w^2}{E_a}",
            description="Restricts centerline temperature rises to prevent thermal runaway.",
            reference="Mears (1971), Specchia et al. (1980)"
        ),
        DiagnosticCriterion(
            id="intraparticle_heat",
            name="Intraparticle Solid Heat Conduction",
            category="Heat Transfer",
            symbol=r"\Delta T_{\text{int}}",
            calculated_value=delta_T_int,
            limit_value=delta_T_int_limit,
            comparison_operator="<",
            unit="K",
            passed=delta_T_int < delta_T_int_limit,
            margin_percent=calc_margin(delta_T_int, delta_T_int_limit, "<"),
            formula_latex=r"\Delta T_{\text{int}} = \frac{R_{v,A}^{\text{obs}}|\Delta_r H|d_p^2}{60 \lambda_p} < \frac{0.05 R T^2}{E_a}",
            description="Ensures temperature gradients inside catalyst pellet are negligible.",
            reference="Mears (1971)"
        ),
        DiagnosticCriterion(
            id="pressure_drop",
            name="Relative Hydraulic Pressure Drop",
            category="Hydrodynamics",
            symbol=r"\Delta P",
            calculated_value=pressure_drop,
            limit_value=pressure_drop_limit,
            comparison_operator="<",
            unit="Pa",
            passed=pressure_drop < pressure_drop_limit,
            margin_percent=calc_margin(pressure_drop, pressure_drop_limit, "<"),
            formula_latex=r"\Delta P = \frac{f_m \rho_G u_0^2 h_{\text{bed}}}{d_p} < \frac{0.2 P_{\text{tot}}}{n}",
            description="Prevents bed pressure losses > 20% total pressure to maintain isobaric kinetics.",
            reference="Ergun (1952)"
        ),
        DiagnosticCriterion(
            id="inert_dilution",
            name="Inert Bed Dilution Homogeneity (Berger)",
            category="Bed Dilution",
            symbol=r"\Delta_{\text{dilution}}",
            calculated_value=dilution_deviation,
            limit_value=dilution_limit,
            comparison_operator="<",
            unit="[-]",
            passed=dilution_deviation < dilution_limit,
            margin_percent=calc_margin(dilution_deviation, dilution_limit, "<"),
            formula_latex=r"\Delta = \left(\frac{b}{1-b}\right)\frac{X_{\text{dil}} d_p}{2 h_{\text{bed}}} < 0.05",
            description="Guarantees inert dilution does not cause conversion maldistribution.",
            reference="Berger et al. (2002)"
        )
    ]

    all_passed = all(c.passed for c in criteria)
    recommendations = []
    
    if pressure_drop > pressure_drop_limit:
        recommendations.append(f"Pressure drop limitation: ΔP ({pressure_drop:.1f} Pa) exceeds 20% isobaric limit. Recommend increasing pellet diameter, lowering superficial velocity, or considering fluidized bed.")
    else:
        recommendations.append(f"Hydraulics verified: ΔP ({pressure_drop:.1f} Pa) is within isobaric limits.")
        
    weisz_c = next((c for c in criteria if c.id == "internal_diffusion"), None)
    if weisz_c and not weisz_c.passed:
        recommendations.append(f"Internal pore diffusion limitation: Φ = {weisz_prater:.4f} > 0.08. Sieve catalyst to smaller diameter to measure true intrinsic kinetics.")

    rad_c = next((c for c in criteria if c.id == "radial_heat_transfer"), None)
    if rad_c and not rad_c.passed:
        recommendations.append(f"Radial thermal gradient breached: ΔTrad = {delta_T_rad:.3f} K. Dilute bed with SiC or decrease tube diameter.")

    # Front-page reactor recommendation
    if pressure_drop > pressure_drop_limit and delta_T_rad > delta_T_rad_limit:
        rec_reactor = "Fluidized Bed Reactor or Micro-Channel Array"
        feasibility = "NOT_RECOMMENDED"
    elif pressure_drop > pressure_drop_limit:
        rec_reactor = "Fluidized Bed Reactor (Overcomes Ergun Pressure Loss)"
        feasibility = "NOT_RECOMMENDED"
    elif delta_T_rad > delta_T_rad_limit:
        rec_reactor = "Multi-Tubular Fixed-Bed (dt < 6 mm) with Molten Salt Jacket"
        feasibility = "FEASIBLE_WITH_CAUTION"
    elif weisz_prater > 0.08:
        rec_reactor = "Crushed & Sieved Laboratory Micro-Packed Bed (dp < 250 µm)"
        feasibility = "FEASIBLE_WITH_CAUTION"
    else:
        rec_reactor = "Fixed-Bed Packed Micro-Reactor"
        feasibility = "HIGHLY_FEASIBLE"

    return {
        "parameters": asdict(params),
        "hydrodynamics": {
            "gas_density": gas_density,
            "superficial_velocity": superficial_velocity,
            "reynolds_number": Re,
            "schmidt_number": Sc,
            "prandtl_number": Pr,
            "sherwood_number": Sh,
            "nusselt_number": Nu,
            "bodenstein_number": Bo,
            "ergun_friction_factor": f_m
        },
        "kinetics_and_transport": {
            "bulk_concentration": bulk_conc,
            "observed_volumetric_rate": r_v_obs,
            "mass_transfer_coeff_kg": k_g,
            "heat_transfer_coeff_alphap": alpha_p,
            "radial_thermal_cond_lambda_er": lambda_er,
            "effectiveness_factor": effectiveness_factor,
            "thiele_modulus": thiele_modulus,
            "volumetric_dilution_fraction": b_dilution,
            "adiabatic_temp_rise": delta_T_ad
        },
        "criteria": [asdict(c) for c in criteria],
        "overall_status": "VALID_INTRINSIC" if all_passed else "TRANSPORT_LIMITED",
        "passed_count": sum(1 for c in criteria if c.passed),
        "total_count": len(criteria),
        "recommendations": recommendations,
        "reactor_suitability": {
            "recommended_type": rec_reactor,
            "overall_feasibility": feasibility,
            "packed_bed_feasible": pressure_drop <= pressure_drop_limit and delta_T_rad <= delta_T_rad_limit
        }
    }


if __name__ == "__main__":
    import sys
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
    default_params = ReactorParameters()
    results = compute_simcat_assessment(default_params)
    print("=" * 80)
    print("SIM-CAT AMMONIA SYNTHESIS INTRINSIC KINETICS ASSESSMENT REPORT")
    print("Thermophysical Data Mapped from NIST Chemistry WebBook (SRD 69)")
    print("=" * 80)
    print(f"Overall Status: {results['overall_status']} ({results['passed_count']}/{results['total_count']} Criteria Fulfilled)")
    print(f"Recommended Reactor: {results['reactor_suitability']['recommended_type']}")
    print("-" * 80)
    for c in results["criteria"]:
        status = "[ PASS ]" if c["passed"] else "[ FAIL ]"
        print(f"{status:8} | {c['name']:<35} | Calc: {c['calculated_value']:>10.4e} {c['unit']:<4} | Req: {c['comparison_operator']} {c['limit_value']:>10.4e} | Margin: {c['margin_percent']:>6.1f}%")
    print("-" * 80)
    print("Recommendations:")
    for r in results["recommendations"]:
        print(f" - {r}")
    print("=" * 80)
