export interface ReactorInputs {
  // Operating Conditions
  temperature: number;            // Bed temperature [K]
  totalPressure: number;          // Total pressure [Pa]
  feedFlow: number;               // Mass flow rate [kg/s]
  conversion: number;             // Reactant conversion [0 to 1]
  reactantMoleFraction: number;   // Reactant mole fraction in feed [-]

  // Reactor & Bed Geometry
  bedHeight: number;              // Bed length [m]
  tubeDiameter: number;           // Tube inner diameter [m]
  particleDiameter: number;       // Catalyst pellet diameter [m]
  bedPorosity: number;            // Bed void fraction [-]

  // Catalyst & Solid Properties
  catalystDensity: number;        // Catalyst pellet density [kg/m³]
  catalystMass: number;           // Catalyst mass [kg]
  catalystThermalCond: number;    // Catalyst thermal conductivity [W/m-K]
  pelletPorosity: number;         // Catalyst internal porosity [-]
  pelletTortuosity: number;       // Catalyst internal tortuosity [-]

  // Inert Dilution
  inertMass: number;              // Inert diluent mass [kg]
  inertDensity: number;           // Inert particle density [kg/m³]
  inertThermalCond: number;       // Inert thermal conductivity [W/m-K]
  dilutedConversion: number;      // Conversion with diluted bed [0 to 1]

  // Kinetic Parameters
  reactionRate: number;           // Observed reaction rate [mol/kg-cat-s]
  reactionOrder: number;          // Reaction order [-]
  activationEnergy: number;       // Activation energy [J/mol]
  reactionEnthalpy: number;       // Reaction enthalpy (exothermic/endothermic abs) [J/mol]

  // Gas Mixture Transport Properties
  gasMolecularWeight: number;     // Gas mean molar mass [kg/mol]
  gasViscosity: number;           // Gas viscosity [kg/m-s]
  gasHeatCapacity: number;        // Gas heat capacity [J/kg-K]
  gasConductivity: number;        // Gas thermal conductivity [W/m-K]
  effectiveDiffusivity: number;   // Effective pore diffusivity [m²/s]
  molecularDiffusivity: number;   // Gas molecular diffusivity [m²/s]
}

export interface DiagnosticCriterion {
  id: string;
  name: string;
  category: 'Fluid Dynamics' | 'Mass Transfer' | 'Heat Transfer' | 'Hydrodynamics' | 'Bed Dilution';
  symbol: string;
  calculatedValue: number;
  limitValue: number;
  operator: '<' | '>';
  unit: string;
  passed: boolean;
  marginPercent: number; // positive = safe margin; negative = breached
  formulaLatex: string;
  substitutionLatex: string;
  description: string;
  reference: string;
  warningNote?: string;
}

export interface HydrodynamicState {
  gasDensity: number;
  bedCrossSection: number;
  superficialVelocity: number;
  reynoldsNumber: number;
  schmidtNumber: number;
  prandtlNumber: number;
  sherwoodNumber: number;
  nusseltNumber: number;
  bodensteinNumber: number;
  ergunFrictionFactor: number;
  reynoldsValid: boolean;
}

export interface TransportState {
  bulkConcentration: number;
  observedVolumetricRate: number;
  externalMassTransferCoeff: number;
  specificSurfaceArea: number;
  particleHeatTransferCoeff: number;
  radialThermalConductivity: number;
  effectivePelletThermalCond: number;
  volumetricDilutionFraction: number;
  thieleModulus: number;
  effectivenessFactor: number;
  adiabaticTemperatureRise: number;
}

export interface SimulationResult {
  inputs: ReactorInputs;
  hydrodynamics: HydrodynamicState;
  transport: TransportState;
  criteria: DiagnosticCriterion[];
  overallStatus: 'VALID_INTRINSIC' | 'TRANSPORT_LIMITED';
  passedCount: number;
  totalCount: number;
  recommendations: string[];
  reactorSuitability: {
    packedBedFeasible: boolean;
    suggestion: string;
  };
}

export interface PresetScenario {
  id: string;
  name: string;
  catalyst: string;
  reactionEquation: string;
  description: string;
  inputs: ReactorInputs;
  notes: string;
}
