import { PresetScenario } from '../types/eurokin';

export const PRESET_SCENARIOS: PresetScenario[] = [
  {
    id: 'ammonia_industrial_baseline',
    name: 'Industrial Haber-Bosch High-Pressure Fixed-Bed',
    catalyst: 'Promoted Magnetite / Wüstite Iron (K₂O-Al₂O₃-CaO)',
    reactionEquation: '0.5 N₂ + 1.5 H₂ ⇌ NH₃  (ΔH°₂₉₈ = -45.9 kJ/mol)',
    description: 'Commercial industrial operating regime (400 °C, 100 bar, stoichiometric syngas). High gas density keeps pressure drop low while pore diffusion requires fine pellet sieving.',
    operatingRegime: 'High Pressure (100 bar) / High Density',
    sourceReference: 'NIST Chemistry WebBook (SRD 69) & Dyson & Baddour (1968) Ind. Eng. Chem. Fundam.',
    notes: 'Properties mapped directly from NIST Chemistry WebBook: molar mass M = 8.515 g/mol, Cp = 3950 J/(kg·K), |ΔrH| = 52.5 kJ/mol at 673 K. Sieve pellets to avoid internal pore limitation.',
    inputs: {
      bulkGasType: 'syngas_stoichiometric',
      temperature: 673.15, // 400 °C
      totalPressure: 10000000.0, // 100 bar = 10 MPa
      feedFlow: 1.5e-5, // 15 mg/s
      bedHeight: 0.040, // 40 mm bed
      tubeDiameter: 0.008, // 8 mm inner diameter
      particleDiameter: 0.00035, // 350 µm sieved catalyst
      bedPorosity: 0.40,
      catalystDensity: 2750.0, // Iron catalyst grain density
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
  },
  {
    id: 'ammonia_intrinsic_microreactor',
    name: 'Laboratory Microreactor: Pure Intrinsic Kinetics',
    catalyst: 'Sieved KM1 Promoted Iron (150-250 µm) diluted 1:3 with SiC',
    reactionEquation: '0.5 N₂ + 1.5 H₂ ⇌ NH₃',
    description: 'Designed according to Eurokin diagnostic guidelines to guarantee true intrinsic chemical kinetics with 0% transport distortion (all 9 criteria fulfilled).',
    operatingRegime: 'Intermediate Pressure (20 bar) / Diluted Micro-Bed',
    sourceReference: 'Eurokin Consortium Diagnostic Protocol & NIST WebBook SRD 69',
    notes: 'High SiC dilution (1:3 volume) eliminates radial exothermicity while small particle diameter (200 µm) maintains Weisz-Prater Φ < 0.08.',
    inputs: {
      bulkGasType: 'syngas_stoichiometric',
      temperature: 648.15, // 375 °C
      totalPressure: 2000000.0, // 20 bar = 2.0 MPa
      feedFlow: 8.0e-6, // 8 mg/s
      bedHeight: 0.035, // 35 mm
      tubeDiameter: 0.006, // 6 mm microreactor tube
      particleDiameter: 0.00020, // 200 µm sieved
      bedPorosity: 0.42,
      catalystDensity: 2750.0,
      catalystMass: 0.00008, // 80 mg catalyst
      catalystThermalCond: 1.35,
      pelletPorosity: 0.38,
      pelletTortuosity: 3.3,
      inertMass: 0.00024, // 240 mg SiC
      inertDensity: 3200.0,
      inertThermalCond: 25.0,
      dilutedConversion: 0.08,
      reactionRate: 9.5e-5,
      reactionOrder: 1.0,
      activationEnergy: 95000.0,
      reactionEnthalpy: 51800.0, // J/mol at 648 K
      conversion: 0.08,
      reactantMoleFraction: 0.035,
      gasMolecularWeight: 0.008515,
      gasViscosity: 2.18e-5,
      gasHeatCapacity: 3880.0,
      gasConductivity: 0.245,
      effectiveDiffusivity: 1.15e-6,
      molecularDiffusivity: 1.0e-5, // Higher diffusivity at 20 bar vs 100 bar
    }
  },
  {
    id: 'ammonia_ruthenium_low_pressure',
    name: 'Low-Pressure Ruthenium Catalyst Evaluation',
    catalyst: 'Ru / Ba / Active Carbon (High activity at mild pressures)',
    reactionEquation: '0.5 N₂ + 1.5 H₂ ⇌ NH₃',
    description: 'Modern renewable green-ammonia process operating at mild pressure (5 bar, 425 °C). Tests whether lower gas density induces gas-film Carberry mass transfer or pressure drop bottlenecks.',
    operatingRegime: 'Mild Pressure (5 bar) / Ru High Activity',
    sourceReference: 'Aika, K. et al., J. Catalysis / NIST SRD 69 Thermophysical Data',
    notes: 'Ruthenium enables lower synthesis pressure for direct coupling with renewable green hydrogen electrolyzers.',
    inputs: {
      bulkGasType: 'syngas_stoichiometric',
      temperature: 698.15, // 425 °C
      totalPressure: 500000.0, // 5 bar
      feedFlow: 5.0e-6, // 5 mg/s
      bedHeight: 0.030, // 30 mm
      tubeDiameter: 0.007, // 7 mm
      particleDiameter: 0.00030, // 300 µm
      bedPorosity: 0.43,
      catalystDensity: 1450.0, // Carbon-supported Ru catalyst
      catalystMass: 0.00006, // 60 mg
      catalystThermalCond: 0.45,
      pelletPorosity: 0.55,
      pelletTortuosity: 3.5,
      inertMass: 0.00018, // 180 mg SiC
      inertDensity: 3200.0,
      inertThermalCond: 25.0,
      dilutedConversion: 0.09,
      reactionRate: 1.2e-4,
      reactionOrder: 0.9,
      activationEnergy: 85000.0,
      reactionEnthalpy: 53100.0,
      conversion: 0.09,
      reactantMoleFraction: 0.04,
      gasMolecularWeight: 0.008515,
      gasViscosity: 2.29e-5,
      gasHeatCapacity: 4020.0,
      gasConductivity: 0.252,
      effectiveDiffusivity: 6.2e-6,
      molecularDiffusivity: 3.9e-5, // High molecular diffusivity at 5 bar
    }
  },
  {
    id: 'ammonia_transport_limited_pellet',
    name: 'Transport-Limited Commercial Pellet (Diagnostic Stress Test)',
    catalyst: 'Full-size Uncrushed Fe Pellets (dp = 2.5 mm, Undiluted Bed)',
    reactionEquation: '0.5 N₂ + 1.5 H₂ ⇌ NH₃',
    description: 'Demonstration of severe transport limitations: large pellet diameter (2.5 mm) triggers severe intraparticle pore diffusion resistance and radial thermal gradients.',
    operatingRegime: 'High Transport Resistance / Diffusion Masking',
    sourceReference: 'Eurokin Diagnostic Benchmark Case Study & NIST SRD 69',
    notes: 'Triggers Weisz-Prater failure (apparent activation energy halved by pore diffusion) and Mears radial temperature limit violation.',
    inputs: {
      bulkGasType: 'syngas_stoichiometric',
      temperature: 723.15, // 450 °C
      totalPressure: 8000000.0, // 80 bar
      feedFlow: 2.5e-5,
      bedHeight: 0.060, // 60 mm
      tubeDiameter: 0.015, // 15 mm wide tube
      particleDiameter: 0.0025, // 2.5 mm uncrushed pellet
      bedPorosity: 0.38,
      catalystDensity: 2750.0,
      catalystMass: 0.0012, // 1.2 g catalyst
      catalystThermalCond: 1.35,
      pelletPorosity: 0.38,
      pelletTortuosity: 3.3,
      inertMass: 0.0, // Undiluted bed
      inertDensity: 3200.0,
      inertThermalCond: 25.0,
      dilutedConversion: 0.22,
      reactionRate: 3.2e-4, // High observed rate
      reactionOrder: 1.2,
      activationEnergy: 92000.0,
      reactionEnthalpy: 53600.0,
      conversion: 0.22,
      reactantMoleFraction: 0.08,
      gasMolecularWeight: 0.008515,
      gasViscosity: 2.34e-5,
      gasHeatCapacity: 4080.0,
      gasConductivity: 0.260,
      effectiveDiffusivity: 3.0e-7,
      molecularDiffusivity: 2.6e-6,
    }
  }
];
