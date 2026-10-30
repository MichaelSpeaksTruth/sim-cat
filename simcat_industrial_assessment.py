#!/usr/bin/env python3
"""
SIM-CAT INDUSTRIAL-GRADE FIXED-BED INTRINSIC KINETICS ASSESSMENT ENGINE
Consortium Guideline: Eurokin Consortium Gas-Solid Fixed-Bed Protocol
Reference: Berger et al., Eurokin Industrial Consortium, 2012
Thermophysical Database: NIST Chemistry WebBook (SRD 69) - Ammonia Synthesis System

Industrial Specifications:
 - 24 fully validated primary user inputs across 4 industrial categories.
 - Pre-calibrated default industrial parameters; press Enter to retain defaults.
 - Complete transport limitation diagnostics (Axial/Radial dispersion, Carberry,
   Weisz-Prater, Mears film/radial/intraparticle heat, Ergun, Berger dilution).
 - Rigorous engineering validation (positive physical quantities, n > 0, void fraction in (0,1)).
"""

import sys
import math

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

R_GAS = 8.314462  # Universal gas constant [J/(mol·K)]

def get_input(prompt_text: str, default_val: float, val_min=None, val_max=None) -> float:
    while True:
        try:
            user_str = input(f"{prompt_text} [{default_val}]: ").strip()
            if not user_str:
                val = float(default_val)
            else:
                val = float(user_str)

            if val_min is not None and val <= val_min:
                print(f"  [Validation Alert] Parameter must be strictly > {val_min}. Please re-enter.")
                continue
            if val_max is not None and val >= val_max:
                print(f"  [Validation Alert] Parameter must be strictly < {val_max}. Please re-enter.")
                continue

            return val
        except ValueError:
            print("  [Validation Alert] Invalid numerical entry. Please re-enter.")


def run_industrial_assessment():
    print("=" * 88)
    print("SIM-CAT INDUSTRIAL FIXED-BED INTRINSIC KINETICS DIAGNOSTIC SUITE")
    print("Primary Chemical System: Industrial Haber-Bosch Ammonia Synthesis (0.5 N2 + 1.5 H2 <=> NH3)")
    print("Thermophysical Data Source: NIST Reference Thermophysics & Eurokin Diagnostic Protocol")
    print("Note: Press Enter at any parameter prompt to retain calibrated industrial default.")
    print("=" * 88)

    # ---------------------------------------------------------
    # 1. Operating and reactor parameters (Inputs 1 to 8)
    # ---------------------------------------------------------
    print("\n--- 1. Operating & Reactor Parameters (8 Primary Inputs) ---")
    T = get_input(" 1. Bed operating temperature, T (K)", 673.15, val_min=100.0)
    P = get_input(" 2. Total reactor pressure, P (Pa)", 10000000.0, val_min=0.0)
    m_dot = get_input(" 3. Gas mass flow rate, m_dot (kg/s)", 1.5e-5, val_min=0.0)
    L = get_input(" 4. Packed bed length, L (m)", 0.040, val_min=0.0)
    D_t = get_input(" 5. Reactor tube inner diameter, D_t (m)", 0.008, val_min=0.0)
    d_p = get_input(" 6. Catalyst pellet diameter, d_p (m)", 0.00035, val_min=0.0)
    eps_b = get_input(" 7. Bed void fraction, eps_b (dimensionless)", 0.40, val_min=0.01, val_max=0.99)
    rho_cat = get_input(" 8. Catalyst pellet density, rho_cat (kg/m3)", 2750.0, val_min=0.0)

    # ---------------------------------------------------------
    # 2. Reaction and kinetic parameters (Inputs 9 to 14)
    # ---------------------------------------------------------
    print("\n--- 2. Reaction & Kinetic Parameters (6 Primary Inputs) ---")
    r_m = get_input(" 9. Measured reaction rate, r_m (mol/kg-cat·s)", 1.6e-4, val_min=0.0)
    n = get_input("10. Reaction order, n (dimensionless)", 1.1, val_min=0.0)  # Must be > 0
    E_a = get_input("11. Activation energy, E_a (J/mol)", 92000.0, val_min=0.0)
    delta_H_r = get_input("12. Reaction enthalpy, |Delta H_r| (J/mol)", 52500.0, val_min=0.0)
    y_A = get_input("13. Key reactant mole fraction in feed, y_A (dimensionless)", 0.06, val_min=0.0001, val_max=1.0)
    X = get_input("14. Target reactant conversion, X (dimensionless)", 0.16, val_min=0.0001, val_max=0.9999)

    # ---------------------------------------------------------
    # 3. Gas-phase physical properties (Inputs 15 to 20)
    # ---------------------------------------------------------
    print("\n--- 3. Gas-Phase Physical Properties (6 Primary Inputs via NIST) ---")
    M_g = get_input("15. Mean gas molecular weight, M_g (kg/mol)", 0.008515, val_min=0.0)
    mu_g = get_input("16. Dynamic gas viscosity, mu_g (kg/m·s)", 2.24e-5, val_min=0.0)
    C_p_g = get_input("17. Gas specific heat capacity, C_p_g (J/kg·K)", 3950.0, val_min=0.0)
    k_g = get_input("18. Gas thermal conductivity, k_g (W/m·K)", 0.235, val_min=0.0)
    D_AB = get_input("19. Molecular binary diffusivity, D_AB (m2/s)", 2.1e-6, val_min=0.0)
    D_eff = get_input("20. Intraparticle effective diffusivity, D_eff (m2/s)", 2.4e-7, val_min=0.0)

    # ---------------------------------------------------------
    # 4. Inert-bed dilution parameters (Inputs 21 to 24)
    # ---------------------------------------------------------
    print("\n--- 4. Inert-Bed Dilution Parameters (4 Primary Inputs) ---")
    W_cat = get_input("21. Active catalyst mass, W_cat (kg)", 0.00025, val_min=0.0)
    W_dil = get_input("22. Inert diluent mass, W_dil (kg)", 0.00035, val_min=0.0)
    rho_dil = get_input("23. Inert particle density, rho_dil (kg/m3)", 3200.0, val_min=0.0)
    X_dil = get_input("24. Diluted bed conversion, X_dil (dimensionless)", 0.16, val_min=0.0001, val_max=0.9999)

    # =========================================================
    # CALCULATED SECONDARY STATE (Autonomous Engineering Solvers)
    # =========================================================
    rho_G = (P * M_g) / (R_GAS * T)
    A_bed = (math.pi / 4.0) * (D_t ** 2)
    u_0 = m_dot / (A_bed * rho_G)
    Re = (d_p * rho_G * u_0) / mu_g
    Sc = mu_g / (rho_G * D_AB)
    Pr = (C_p_g * mu_g) / k_g
    tau_b = 1.0 / math.sqrt(eps_b)

    bodenstein_inv = (eps_b / (tau_b * max(Re, 1e-6) * Sc)) + 0.5
    Bo = 1.0 / bodenstein_inv if bodenstein_inv > 0 else 2.0

    C_A_b = (y_A * P) / (R_GAS * T)
    R_v_A = r_m * rho_cat

    Sh = 2.0 + 1.1 * (max(Re, 1e-5) ** 0.6) * (Sc ** (1.0 / 3.0))
    k_G = (Sh * D_AB) / d_p
    a_v = 6.0 / d_p

    Ca = R_v_A / (k_G * a_v * max(C_A_b, 1e-12))
    Ca_limit = 0.05 / n

    char_length = d_p / 6.0
    Phi = ((n + 1.0) / 2.0) * (R_v_A * (char_length ** 2)) / (max(D_eff, 1e-12) * max(C_A_b, 1e-12))
    Phi_limit = 0.08

    Nu = 2.0 + 1.1 * (max(Re, 1e-5) ** 0.6) * (Pr ** (1.0 / 3.0))
    alpha_p = (Nu * k_g) / d_p

    Delta_T_film = (R_v_A * abs(delta_H_r) * d_p) / (6.0 * alpha_p)
    Delta_T_film_limit = (0.05 * R_GAS * (T ** 2)) / max(E_a, 1e-3)

    f_m = ((1.0 - eps_b) / (eps_b ** 3)) * (1.75 + (150.0 * (1.0 - eps_b) / max(Re, 1e-6)))
    Delta_P = (f_m * rho_G * (u_0 ** 2) * L) / d_p
    Delta_P_limit = (0.2 * P) / n

    axial_ratio = L / d_p
    axial_limit = (8.0 / Bo) * n * math.log(1.0 / (1.0 - X))

    radial_ratio = D_t / d_p
    radial_limit = 8.0

    v_inert = W_dil / max(rho_dil, 1.0)
    v_cat = W_cat / max(rho_cat, 1.0)
    b_dil = v_inert / (v_inert + v_cat) if (v_inert + v_cat) > 0 else 0.0
    Delta_dil = (b_dil / (1.0 - b_dil)) * (X_dil * d_p) / (2.0 * L) if (b_dil < 1.0 and L > 0) else 0.0
    Delta_dil_limit = 0.05

    lambda_p_eff = 1.35  # Promoted Fe pellet thermal conductivity [W/m-K]
    lambda_b0_ratio = eps_b + (1.0 - eps_b) / (0.220 * (eps_b ** 2) + (2.0 / 3.0) * (k_g / max(lambda_p_eff, 1e-6)))
    Pe_rif = 8.65 * (1.0 + 19.4 * ((d_p / D_t) ** 2))
    lambda_conv_ratio = (Re * Pr) / Pe_rif
    lambda_er = k_g * (lambda_b0_ratio + lambda_conv_ratio)

    Delta_T_rad = (R_v_A * abs(delta_H_r) * (1.0 - eps_b) * (1.0 - b_dil) * (D_t ** 2)) / (32.0 * max(lambda_er, 1e-6))
    Delta_T_rad_limit = (0.05 * R_GAS * (T ** 2)) / max(E_a, 1e-3)

    Delta_T_int = (R_v_A * abs(delta_H_r) * (d_p ** 2)) / (60.0 * max(lambda_p_eff, 1e-6))
    Delta_T_int_limit = (0.05 * R_GAS * (T ** 2)) / max(E_a, 1e-3)

    checks = [
        ("1. Axial Dispersion (Plug Flow)", axial_ratio, ">", axial_limit, "[-]", axial_ratio > axial_limit),
        ("2. Radial Dispersion (Wall Bypass)", radial_ratio, ">", radial_limit, "[-]", radial_ratio > radial_limit),
        ("3. External Mass Transfer (Carberry)", Ca, "<", Ca_limit, "[-]", Ca < Ca_limit),
        ("4. Internal Pore Diffusion (Weisz)", Phi, "<", Phi_limit, "[-]", Phi < Phi_limit),
        ("5. External Film Heat Transfer", Delta_T_film, "<", Delta_T_film_limit, "K", Delta_T_film < Delta_T_film_limit),
        ("6. Radial Bed Heat Transfer", Delta_T_rad, "<", Delta_T_rad_limit, "K", Delta_T_rad < Delta_T_rad_limit),
        ("7. Intraparticle Solid Conduction", Delta_T_int, "<", Delta_T_int_limit, "K", Delta_T_int < Delta_T_int_limit),
        ("8. Relative Pressure Drop (Ergun)", Delta_P, "<", Delta_P_limit, "Pa", Delta_P < Delta_P_limit),
        ("9. Inert Bed Dilution (Berger)", Delta_dil, "<", Delta_dil_limit, "[-]", Delta_dil < Delta_dil_limit),
    ]

    passed_count = sum(1 for c in checks if c[5])
    total_count = len(checks)
    is_valid = passed_count == total_count

    # Dyson & Baddour (1968) / Temkin-Pyzhev Kinetics Telemetry
    P_atm = P / 101325.0
    k1 = 1.79e4 * math.exp(-87090.0 / (R_GAS * T))
    k2 = 2.57e16 * math.exp(-198300.0 / (R_GAS * T))
    log10_Kp = -2.691122 * math.log10(T) - (5.519265e-5 * T) + (1.848863e-7 * (T ** 2)) + (2001.6 / T) + 2.6899
    Kp = 10.0 ** log10_Kp
    X_eq = (Kp * P_atm) / (1.0 + (Kp * P_atm))

    print("\n" + "=" * 88)
    print("SIM-CAT INDUSTRIAL ASSESSMENT: FLUID, THERMAL & KINETIC TELEMETRY")
    print("=" * 88)
    print(f"Gas Density (rho_G):           {rho_G:.4f} kg/m3")
    print(f"Superficial Gas Velocity (u_0): {u_0:.4e} m/s")
    print(f"Particle Reynolds Number (Re): {Re:.2f}")
    print(f"Bulk Reactant Conc. (C_A_b):   {C_A_b:.2f} mol/m3")
    print(f"Volumetric Reaction Rate (Rv): {R_v_A:.2e} mol/(m3_cat·s)")
    print(f"Inert Dilution Fraction (b):   {b_dil:.3f} ({(b_dil*100):.1f}% inert SiC by volume)")
    print(f"NIST Equilibrium Const (K_p):  {Kp:.3e} atm^-1 (Max Equilibrium X_eq = {(X_eq*100):.1f}%)")
    print(f"Dyson-Baddour Rate Constants:  k1 = {k1:.3e}, k2 = {k2:.3e} mol/(kg·s·atm)")
    print("-" * 88)
    print(f"{'Criterion Name':<38} | {'Evaluated':<12} | {'Req':<3} | {'Threshold':<12} | {'Status'}")
    print("-" * 88)
    for name, calc, op, lim, unit, pass_flag in checks:
        status_str = "[ PASS ]" if pass_flag else "[ FAIL ]"
        print(f"{name:<38} | {calc:>10.3e} {unit:<3} | {op:<3} | {lim:>10.3e} {unit:<3} | {status_str}")

    print("-" * 88)
    overall_status = "INTRINSIC KINETIC REGIME VALID" if is_valid else "TRANSPORT LIMITATION ACTIVE"
    print(f"Overall Matrix Verdict: {overall_status} ({passed_count}/{total_count} Criteria Satisfied)")
    
    if Delta_P > Delta_P_limit:
        rec = "Catalytic Fluidized Bed or Structured Monolith (Alleviates Ergun Pressure Loss)"
    elif Delta_T_rad > Delta_T_rad_limit:
        rec = "Multi-Tubular Fixed-Bed (D_t < 6 mm) with Molten Salt Cooling Jacket"
    elif Phi > 0.08:
        rec = "Laboratory Micro-Packed Bed with Sieved Catalyst (d_p < 250 µm)"
    else:
        rec = "Fixed-Bed Packed Micro-Reactor (Intrinsic Plug Flow Regime)"
    print(f"Recommended Reactor Architecture: {rec}")
    print("=" * 88 + "\n")


if __name__ == "__main__":
    run_industrial_assessment()
