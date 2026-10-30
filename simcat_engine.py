"""
SIM-CAT Fixed-Bed Gas-Solid Reactor Diagnostic Engine & Intrinsic Kinetics Assessment.
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
    # Operating Conditions
    temperature: float = 550.0            # Bed temperature [K]
    total_pressure: float = 250000.0       # Total pressure [Pa]
    feed_flow: float = 1.2e-6              # Mass flow rate [kg/s]
    
    # Reactor Geometry
    bed_height: float = 0.03               # Bed length [m]
    tube_diameter: float = 0.008           # Tube inner diameter [m]
    
    # Catalyst Bed & Pellet
    particle_diameter: float = 0.0005      # Catalyst pellet diameter [m]
    bed_porosity: float = 0.40             # Bed void fraction [-]
    catalyst_density: float = 1500.0       # Catalyst pellet density [kg/m³]
    pellet_porosity: float = 0.50          # Internal pellet porosity [-]
    pellet_tortuosity: float = 4.0         # Pellet internal tortuosity [-]
    catalyst_thermal_cond: float = 0.35    # Catalyst thermal conductivity [W/m-K]
    
    # Kinetic Parameters
    reaction_rate: float = 1.0e-4          # Observed reaction rate [mol/kg-cat-s]
    reaction_order: float = 1.0            # Reaction order [-]
    activation_energy: float = 150000.0    # Activation energy [J/mol]
    reaction_enthalpy: float = 81500.0     # Reaction enthalpy (exothermic/endothermic abs) [J/mol]
    conversion: float = 0.50               # Target conversion [0 to 1]
    reactant_mole_fraction: float = 0.0004 # Reactant mole fraction in feed [-]
    
    # Gas Mixture Transport Properties
    gas_molecular_weight: float = 0.004    # Gas mean molar mass [kg/mol] (e.g. He diluted)
    gas_viscosity: float = 2.8e-5          # Gas viscosity [kg/m-s]
    gas_heat_capacity: float = 5190.0      # Gas heat capacity [J/kg-K]
    gas_conductivity: float = 0.25         # Gas thermal conductivity [W/m-K]
    effective_diffusivity: float = 8.0e-7  # Effective pore diffusivity [m²/s]
    molecular_diffusivity: float = 1.2e-5  # Gas molecular diffusivity [m²/s]
    
    # Dilution Parameters
    catalyst_mass: float = 0.00005         # Catalyst mass [kg] (50 mg)
    inert_mass: float = 0.00015            # Inert diluent mass [kg] (150 mg)
    inert_density: float = 3200.0          # Inert particle density [kg/m³] (SiC)
    diluted_conversion: float = 0.50       # Conversion with diluted bed [0 to 1]
    inert_thermal_cond: float = 20.0       # Inert thermal conductivity [W/m-K] (SiC is high)


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
    bed_tortuosity = 1.0 / math.sqrt(params.bed_porosity)
    
    # Bodenstein number (Wakao et al.)
    bodenstein_inv = (params.bed_porosity / (bed_tortuosity * Re * Sc)) + 0.5
    Bo = 1.0 / bodenstein_inv if bodenstein_inv > 0 else 2.0
    
    # Concentrations & reaction rates
    bulk_conc = (params.reactant_mole_fraction * P) / (R * T)
    r_v_obs = params.reaction_rate * params.catalyst_density # mol / m³_cat / s
    
    # External mass transfer (Wakao Sh correlation)
    Sh = 2.0 + 1.1 * (Re ** 0.6) * (Sc ** (1.0 / 3.0))
    k_g = (Sh * params.molecular_diffusivity) / params.particle_diameter
    a_v = 6.0 / params.particle_diameter # specific external surface area [m²/m³_pellet]
    
    # Carberry number
    carberry_num = r_v_obs / (k_g * a_v * bulk_conc) if (k_g * a_v * bulk_conc) > 0 else 0.0
    carberry_limit = 0.05 / max(params.reaction_order, 1e-4)
    
    # Internal diffusion (Weisz-Prater)
    char_length = params.particle_diameter / 6.0
    weisz_prater = ((params.reaction_order + 1.0) / 2.0) * (r_v_obs * (char_length ** 2)) / (params.effective_diffusivity * bulk_conc)
    weisz_limit = 0.08
    
    # Approximate Thiele modulus & internal effectiveness factor
    thiele_modulus = math.sqrt(weisz_prater) if weisz_prater < 0.1 else math.sqrt(weisz_prater)
    effectiveness_factor = 1.0 - (weisz_prater / 3.0) if weisz_prater < 0.3 else (1.0 / (1.0 + weisz_prater))
    effectiveness_factor = max(0.01, min(1.0, effectiveness_factor))
    
    # External heat transfer (Wakao Nu correlation)
    Nu = 2.0 + 1.1 * (Re ** 0.6) * (Pr ** (1.0 / 3.0))
    alpha_p = (Nu * params.gas_conductivity) / params.particle_diameter
    delta_T_film = (r_v_obs * abs(params.reaction_enthalpy) * params.particle_diameter) / (6.0 * alpha_p)
    delta_T_film_limit = (0.05 * R * (T ** 2)) / params.activation_energy
    
    # Pressure drop (Ergun equation)
    eps_b = params.bed_porosity
    f_m = ((1.0 - eps_b) / (eps_b ** 3)) * (1.75 + (150.0 * (1.0 - eps_b) / max(Re, 1e-6)))
    pressure_drop = (f_m * gas_density * (superficial_velocity ** 2) * params.bed_height) / params.particle_diameter
    pressure_drop_limit = (0.2 * P) / max(params.reaction_order, 1e-4)
    
    # Axial dispersion criterion (Mears & Gierman)
    X = min(params.conversion, 0.999)
    axial_disp_ratio = params.bed_height / params.particle_diameter
    axial_disp_limit = (8.0 / Bo) * params.reaction_order * math.log(1.0 / (1.0 - X))
    
    # Radial dispersion (Chu & Ng)
    radial_disp_ratio = params.tube_diameter / params.particle_diameter
    radial_disp_limit = 8.0
    
    # Bed dilution (Berger et al.)
    v_inert = params.inert_mass / params.inert_density
    v_cat = params.catalyst_mass / params.catalyst_density
    b_dilution = v_inert / (v_inert + v_cat) if (v_inert + v_cat) > 0 else 0.0
    
    x_dil = min(params.diluted_conversion, 0.999)
    if b_dilution < 1.0 and params.bed_height > 0:
        dilution_deviation = (b_dilution / (1.0 - b_dilution)) * (x_dil * params.particle_diameter) / (2.0 * params.bed_height)
    else:
        dilution_deviation = 0.0
    dilution_limit = 0.05
    
    # Radial heat transfer & Specchia correlation
    if b_dilution > 0:
        inv_lambda_p = (1.0 - b_dilution) / params.catalyst_thermal_cond + b_dilution / params.inert_thermal_cond
        lambda_p_eff = 1.0 / inv_lambda_p
    else:
        lambda_p_eff = params.catalyst_thermal_cond
        
    lambda_b0_over_lambda_g = eps_b + (1.0 - eps_b) / (0.220 * (eps_b ** 2) + (2.0 / 3.0) * (params.gas_conductivity / lambda_p_eff))
    Pe_rif = 8.65 * (1.0 + 19.4 * ((params.particle_diameter / params.tube_diameter) ** 2))
    lambda_conv_over_lambda_g = (Re * Pr) / Pe_rif
    lambda_er = params.gas_conductivity * (lambda_b0_over_lambda_g + lambda_conv_over_lambda_g)
    
    delta_T_rad = (r_v_obs * abs(params.reaction_enthalpy) * (1.0 - eps_b) * (1.0 - b_dilution) * (params.tube_diameter ** 2)) / (32.0 * lambda_er)
    delta_T_rad_limit = (0.05 * R * (T ** 2)) / params.activation_energy
    
    # Intraparticle heat conduction (Mears)
    delta_T_int = (r_v_obs * abs(params.reaction_enthalpy) * (params.particle_diameter ** 2)) / (60.0 * lambda_p_eff)
    delta_T_int_limit = (0.05 * R * (T ** 2)) / params.activation_energy
    
    # Adiabatic temperature rise
    delta_T_ad = (abs(params.reaction_enthalpy) * params.reactant_mole_fraction * X) / (params.gas_heat_capacity * M_gas)

    def calc_margin(val: float, lim: float, op: str) -> float:
        if lim == 0:
            return 0.0
        if op == "<":
            return ((lim - val) / lim) * 100.0
        else:
            return ((val - lim) / lim) * 100.0

    criteria: List[DiagnosticCriterion] = [
        DiagnosticCriterion(
            id="axial_dispersion",
            name="Axial Dispersion",
            category="Fluid Dynamics",
            symbol="L / d_p",
            calculated_value=axial_disp_ratio,
            limit_value=axial_disp_limit,
            comparison_operator=">",
            unit="[-]",
            passed=axial_disp_ratio > axial_disp_limit,
            margin_percent=calc_margin(axial_disp_ratio, axial_disp_limit, ">"),
            formula_latex=r"\frac{h_{\text{bed}}}{d_p} > \frac{8}{Bo} \, n \ln\left(\frac{1}{1-X_A}\right)",
            description="Ensures plug flow behavior and avoids backmixing along bed length.",
            reference="Mears (1971), Gierman (1988), Wakao et al. (1979)"
        ),
        DiagnosticCriterion(
            id="radial_dispersion",
            name="Radial Dispersion",
            category="Fluid Dynamics",
            symbol="d_t / d_p",
            calculated_value=radial_disp_ratio,
            limit_value=radial_disp_limit,
            comparison_operator=">",
            unit="[-]",
            passed=radial_disp_ratio > radial_disp_limit,
            margin_percent=calc_margin(radial_disp_ratio, radial_disp_limit, ">"),
            formula_latex=r"\frac{d_t}{d_p} > 8.0",
            description="Guarantees absence of wall channeling and uniform velocity/concentration across radius.",
            reference="Chu & Ng (1989)"
        ),
        DiagnosticCriterion(
            id="external_mass_transfer",
            name="External Mass Transfer",
            category="Mass Transfer",
            symbol="Ca (Carberry)",
            calculated_value=carberry_num,
            limit_value=carberry_limit,
            comparison_operator="<",
            unit="[-]",
            passed=carberry_num < carberry_limit,
            margin_percent=calc_margin(carberry_num, carberry_limit, "<"),
            formula_latex=r"Ca = \frac{R_{v,A}^{\text{obs}}}{k_g \, a_v \, C_{A,b}} < \frac{0.05}{n}",
            description="Verifies that boundary film mass transfer resistance alters conversion rate by < 5%.",
            reference="Mears (1971), Wakao et al. (1979)"
        ),
        DiagnosticCriterion(
            id="internal_diffusion",
            name="Internal Pore Diffusion",
            category="Mass Transfer",
            symbol=r"\Phi \text{ (Weisz-Prater)}",
            calculated_value=weisz_prater,
            limit_value=weisz_limit,
            comparison_operator="<",
            unit="[-]",
            passed=weisz_prater < weisz_limit,
            margin_percent=calc_margin(weisz_prater, weisz_limit, "<"),
            formula_latex=r"\Phi = \frac{n+1}{2} \frac{R_{v,A}^{\text{obs}} (d_p/6)^2}{D_{A,\text{eff}} C_{A,s}} < 0.08",
            description="Assures that pore diffusion inside the catalyst pellet does not mask intrinsic kinetics (effectiveness factor η > 0.95).",
            reference="Froment & Bischoff (1990), Anderson & Pratt (1985)"
        ),
        DiagnosticCriterion(
            id="external_heat_transfer",
            name="External Film Heat Transfer",
            category="Heat Transfer",
            symbol=r"\Delta T_{\text{film}}",
            calculated_value=delta_T_film,
            limit_value=delta_T_film_limit,
            comparison_operator="<",
            unit="K",
            passed=delta_T_film < delta_T_film_limit,
            margin_percent=calc_margin(delta_T_film, delta_T_film_limit, "<"),
            formula_latex=r"\Delta T_{\text{film}} = \frac{R_{v,A}^{\text{obs}} |\Delta_r H| d_p}{6 \alpha_p} < \frac{0.05 R T_G^2}{E_a}",
            description="Prevents temperature jump across the stagnant gas boundary layer surrounding the pellet.",
            reference="Mears (1971), Wakao et al. (1979)"
        ),
        DiagnosticCriterion(
            id="radial_heat_transfer",
            name="Radial Bed Heat Transfer",
            category="Heat Transfer",
            symbol=r"\Delta T_{\text{rad}}",
            calculated_value=delta_T_rad,
            limit_value=delta_T_rad_limit,
            comparison_operator="<",
            unit="K",
            passed=delta_T_rad < delta_T_rad_limit,
            margin_percent=calc_margin(delta_T_rad, delta_T_rad_limit, "<"),
            formula_latex=r"\Delta T_{\text{rad}} = \frac{R_{v,A}^{\text{obs}} |\Delta_r H|(1-\varepsilon_b)(1-b) d_t^2}{32 \lambda_{\text{er}}} < \frac{0.05 R T_w^2}{E_a}",
            description="Limits temperature difference between bed centerline and reactor tube wall.",
            reference="Mears (1971), Specchia et al. (1980)"
        ),
        DiagnosticCriterion(
            id="intraparticle_heat",
            name="Intraparticle Heat Conduction",
            category="Heat Transfer",
            symbol=r"\Delta T_{\text{int}}",
            calculated_value=delta_T_int,
            limit_value=delta_T_int_limit,
            comparison_operator="<",
            unit="K",
            passed=delta_T_int < delta_T_int_limit,
            margin_percent=calc_margin(delta_T_int, delta_T_int_limit, "<"),
            formula_latex=r"\Delta T_{\text{int}} = \frac{R_{v,A}^{\text{obs}} |\Delta_r H| d_p^2}{60 \lambda_p} < \frac{0.05 R T^2}{E_a}",
            description="Verifies isothermal pellet interior (negligible thermal gradient within particle).",
            reference="Mears (1971)"
        ),
        DiagnosticCriterion(
            id="pressure_drop",
            name="Bed Pressure Drop",
            category="Hydrodynamics",
            symbol=r"\Delta P",
            calculated_value=pressure_drop,
            limit_value=pressure_drop_limit,
            comparison_operator="<",
            unit="Pa",
            passed=pressure_drop < pressure_drop_limit,
            margin_percent=calc_margin(pressure_drop, pressure_drop_limit, "<"),
            formula_latex=r"\Delta P < \frac{0.2 P_{\text{tot}}}{n} \quad \text{via Ergun Eq.}",
            description="Prevents isobaric assumption breach and reaction rate shift due to total pressure loss.",
            reference="Ergun (1952)"
        ),
        DiagnosticCriterion(
            id="inert_dilution",
            name="Inert Bed Dilution",
            category="Bed Homogeneity",
            symbol=r"\Delta_{\text{dilution}}",
            calculated_value=dilution_deviation,
            limit_value=dilution_limit,
            comparison_operator="<",
            unit="[-]",
            passed=dilution_deviation < dilution_limit,
            margin_percent=calc_margin(dilution_deviation, dilution_limit, "<"),
            formula_latex=r"\Delta = \left(\frac{b}{1-b}\right) \frac{X_{\text{dil}} d_p}{2 h_{\text{bed}}} < 0.05",
            description="Ensures bed dilution does not cause non-uniform conversion distribution.",
            reference="Berger et al. (2002)"
        )
    ]

    all_passed = all(c.passed for c in criteria)
    
    recommendations = []
    if pressure_drop > pressure_drop_limit:
        recommendations.append("High pressure drop detected (> 20% limit). Reduce bed length, increase pellet size, or consider a micro-monolith / structured catalyst.")
    else:
        recommendations.append("Fixed-bed packed reactor is hydraulically viable from pressure drop standpoint.")
        
    if not criteria[3].passed:
        recommendations.append("Severe internal pore diffusion limitation detected! Mill catalyst to smaller pellet diameter (d_p < {:.4f} m) or select larger pore eggshell support to measure true intrinsic kinetics.".format(
            math.sqrt(0.08 * 36.0 * params.effective_diffusivity * bulk_conc / (r_v_obs * (params.reaction_order + 1.0) / 2.0))
        ))
    if not criteria[2].passed:
        recommendations.append("External film mass transfer resistance exceeds 5%. Increase superficial gas velocity or gas flow rate to elevate Sherwood number.")
    if not criteria[4].passed or not criteria[5].passed:
        recommendations.append("Thermal gradients detected (film or radial). Increase inert dilution (SiC), utilize smaller tube diameter, or enhance wall cooling.")

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
        "recommendations": recommendations
    }


if __name__ == "__main__":
    default_params = ReactorParameters()
    results = compute_simcat_assessment(default_params)
    print("=" * 80)
    print("SIM-CAT FIXED-BED INTRINSIC KINETICS ASSESSMENT REPORT")
    print("Eurokin's documentations have been used to develop this prototype.")
    print("=" * 80)
    print(f"Overall Status: {results['overall_status']} ({results['passed_count']}/{results['total_count']} Criteria Fulfilled)")
    print("-" * 80)
    for c in results["criteria"]:
        status = "[ PASS ]" if c["passed"] else "[ FAIL ]"
        print(f"{status:8} | {c['name']:<28} | Calc: {c['calculated_value']:>10.4e} {c['unit']:<4} | Req: {c['comparison_operator']} {c['limit_value']:>10.4e} | Margin: {c['margin_percent']:>6.1f}%")
    print("-" * 80)
    print("Recommendations:")
    for r in results["recommendations"]:
        print(f" - {r}")
    print("=" * 80)
