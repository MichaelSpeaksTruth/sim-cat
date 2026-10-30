import { PresetScenario } from '../types/eurokin';

export const PRESET_SCENARIOS: PresetScenario[] = [
  {
    id: 'ammonia_industrial_baseline',
    name: 'Industrial Haber-Bosch Fixed-Bed Converter',
    catalyst: 'Promoted Magnetite / Wüstite Iron (K₂O-Al₂O₃-CaO)',
    reactionEquation: '0.5 N₂ + 1.5 H₂ ⇌ NH₃  (ΔH°₂₉₈ = -45.9 kJ/mol)',
    description: 'Commercial industrial operating regime (400 °C, 100 bar, stoichiometric syngas). Evaluates transport limitations and intrinsic kinetic validity under industrial Haber-Bosch conditions.',
    operatingRegime: 'High Pressure (100 bar, 10 MPa) / 400 °C (673.15 K)',
    sourceReference: 'NIST Chemistry WebBook & Dyson & Baddour (1968) Ind. Eng. Chem. Fundam.',
    notes: 'Properties evaluated from NIST Shomate and mixture formulations: M = 8.515 g/mol, Cp = 3950 J/(kg·K), |ΔrH| = 52.5 kJ/mol at 673 K.',
    inputs: {
      bulkGasType: 'syngas_stoichiometric',
      temperature: 673.15, // 400 °C
      totalPressure: 10000000.0, // 100 bar = 10 MPa
      feedFlow: 1.5e-5, // 15 mg/s
      bedHeight: 0.040, // 40 mm bed
      tubeDiameter: 0.008, // 8 mm inner diameter
      particleDiameter: 0.00035, // 350 µm sieved catalyst
      bedPorosity: 0.40,
      catalystDensity: 2750.0, // Iron catalyst grain density [kg/m³]
      catalystMass: 0.00025, // 250 mg catalyst
      catalystThermalCond: 1.35, // W/(m·K)
      pelletPorosity: 0.38,
      pelletTortuosity: 3.3,
      inertMass: 0.00035, // 350 mg SiC diluent
      inertDensity: 3200.0, // SiC density
      inertThermalCond: 25.0, // W/(m·K)
      dilutedConversion: 0.16,
      reactionRate: 1.6e-4, // mol/(kg-cat·s)
      reactionOrder: 1.1, // Apparent Temkin-Pyzhev order
      activationEnergy: 92000.0, // 92 kJ/mol
      reactionEnthalpy: 52500.0, // 52.5 kJ/mol at 673 K (NIST Kirchhoff)
      conversion: 0.16,
      reactantMoleFraction: 0.06, // y_NH3 in bed
      gasMolecularWeight: 0.008515, // Syngas mean molar mass: 8.515 g/mol
      gasViscosity: 2.24e-5, // kg/(m·s) via Wilke mixture
      gasHeatCapacity: 3950.0, // J/(kg·K) via NIST Shomate
      gasConductivity: 0.235, // W/(m·K) via Mason-Saxena
      effectiveDiffusivity: 2.4e-7, // m²/s (D_mol * eps/tau)
      molecularDiffusivity: 2.1e-6, // m²/s via Fuller at 100 bar
    }
  }
];
