import { BulkGasType } from '../lib/nistAmmoniaData';

export type NavigationSection =
  | 'overview'
  | 'setup'
  | 'catalyst'
  | 'feed'
  | 'operating'
  | 'simulation'
  | 'diagnostics'
  | 'results'
  | 'comparison'
  | 'validation';

export interface ReactorInputs {
  // Bulk Gas & Reaction Mixture Identification
  bulkGasType: BulkGasType;        // Syngas Stoichiometric, H2-Rich, N2-Rich, He-diluted, Ar-diluted
  
  // Operating Conditions
  temperature: number;            // Bed temperature [K]
  totalPressure: number;          // Total pressure [Pa]
  feedFlow: number;               // Mass flow rate [kg/s]
  conversion: number;             // Reactant conversion [0 to 1]
  reactantMoleFraction: number;   // Reactant mole fraction in feed (e.g. y_NH3 or key limiting reactant) [-]
  wallTemperature?: number;       // Cooling wall temperature [K] (default 650 K)
  coolingCoefficientU?: number;   // Overall heat transfer coefficient U [W/(m²·K)] (default 250 W/(m²·K))
  thermalMode?: 'COOLED_WALL' | 'ISOTHERMAL' | 'ADIABATIC'; // Thermal boundary regime
  feedFractions?: {
    yN2: number;
    yH2: number;
    yNH3?: number;
    yNH3_inlet?: number;
    yInerts: number;
  };
  epsilonNH3?: number;            // Regularization parameter [atm] (default 1e-4 atm)
  thermodynamicStrategy?: 'DYSON_EMPIRICAL_CONSISTENT' | 'NIST_FUNDAMENTAL_CONSISTENT';
  energyBalanceModel?: 'IDEAL_SHOMATE' | 'PENG_ROBINSON_REAL_GAS';

  // Reactor & Bed Geometry
  bedHeight: number;              // Bed length [m]
  tubeDiameter: number;           // Tube inner diameter [m]
  particleDiameter: number;       // Catalyst pellet diameter [m]
  bedPorosity: number;            // Bed void fraction [-]

  // Catalyst & Solid Properties (Audited)
  catalystDensity: number;        // Catalyst pellet density [kg/m³]
  catalystMass: number;           // Catalyst mass [kg]
  catalystThermalCond: number;    // Catalyst thermal conductivity [W/m-K]
  pelletPorosity: number;         // Catalyst internal porosity [-]
  pelletTortuosity: number;       // Catalyst internal tortuosity [-]

  // Inert Dilution (Berger Criterion)
  inertMass: number;              // Inert diluent mass [kg]
  inertDensity: number;           // Inert particle density [kg/m³]
  inertThermalCond: number;       // Inert thermal conductivity [W/m-K]
  dilutedConversion: number;      // Conversion with diluted bed [0 to 1]

  // Kinetic Parameters
  reactionRate: number;           // Observed reaction rate [mol/kg-cat-s]
  reactionOrder: number;          // Reaction order [-]
  activationEnergy: number;       // Activation energy [J/mol]
  reactionEnthalpy: number;       // Reaction enthalpy (exothermic/endothermic abs) [J/mol]

  // Gas Mixture Transport Properties (NIST Mapped & Audited)
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
  category: 'Fluid Dynamics' | 'Mass Transfer' | 'Heat Transfer' | 'Hydrodynamics' | 'Bed Dilution' | 'Custom Criterion';
  symbol: string;
  calculatedValue: number;
  limitValue: number;
  operator: '<' | '>' | '<=' | '>=';
  unit: string;
  passed: boolean;
  status?: 'PASS' | 'WARNING' | 'FAIL' | 'NOT_EVALUATED' | 'OUTSIDE_CORRELATION_VALIDITY';
  applicabilityRange?: string;
  isWithinApplicability?: boolean;
  provenance?: string;
  marginPercent: number; // positive = safe margin; negative = breached
  formulaLatex: string;
  substitutionLatex: string;
  description: string;
  reference: string;
  warningNote?: string;
  isCustom?: boolean;
}

export interface CustomCriterionDefinition {
  id: string;
  name: string;
  category: 'Fluid Dynamics' | 'Mass Transfer' | 'Heat Transfer' | 'Hydrodynamics' | 'Bed Dilution' | 'Custom Criterion';
  symbol: string;
  operator: '<' | '>' | '<=' | '>=';
  limitValue: number;
  unit: string;
  description: string;
  reference: string;
  expression: string;
  formulaLatex: string;
  enabled: boolean;
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

export interface ReactorSuitabilityDimension {
  name: string;
  score: number; // 0 to 100
  verdict: 'EXCELLENT' | 'ACCEPTABLE' | 'RESTRICTIVE' | 'CRITICAL';
  diagnosticMetric: string;
  currentValueFormatted: string;
  recommendedLimit: string;
  explanation: string;
}

export interface ReactorSuitabilityAssessment {
  recommendedType: string;
  secondaryOption: string;
  overallFeasibility: 'HIGHLY_FEASIBLE' | 'FEASIBLE_WITH_CAUTION' | 'NOT_RECOMMENDED';
  summaryHeadline: string;
  dimensions: ReactorSuitabilityDimension[];
  actionableEngineeringSteps: string[];
}

export interface AxialProfilePoint {
  z: number;              // Axial coordinate [m]
  zNormalized: number;    // z / L [0 to 1]
  temperature: number;    // Fluid temperature [K]
  pressure: number;       // Pressure [Pa]
  conversion: number;     // Limiting reactant conversion X_A [-]
  yN2: number;            // Mole fraction N2 [-]
  yH2: number;            // Mole fraction H2 [-]
  yNH3: number;           // Mole fraction NH3 [-]
  reactionRate: number;   // Observed reaction rate [mol/(kg-cat·s)]
  effectiveness: number;  // Local effectiveness factor eta [-]
  weiszPrater: number;    // Local Weisz-Prater modulus Phi [-]
  carberry: number;       // Local Carberry number Ca [-]
  deltaP: number;         // Cumulative pressure drop [Pa]
}

export interface SimulationResult {
  inputs: ReactorInputs;
  hydrodynamics: HydrodynamicState;
  transport: TransportState;
  criteria: DiagnosticCriterion[];
  overallStatus: 'VALID_INTRINSIC' | 'TRANSPORT_LIMITED' | 'CORRELATION_EXTRAPOLATION';
  passedCount: number;
  totalCount: number;
  recommendations: string[];
  reactorSuitability: ReactorSuitabilityAssessment;
  transportAssessment?: any;
  axialProfiles: AxialProfilePoint[];
  inletTemperature: number;
  outletTemperature: number;
  maxTemperature: number;
  hotspotLocationZ: number;
  totalDeltaP: number;
  outletConversion: number;
  ammoniaProductionRateKgH: number; // Commercial ammonia rate kg/h
}

export interface PresetScenario {
  id: string;
  name: string;
  catalyst: string;
  reactionEquation: string;
  description: string;
  inputs: ReactorInputs;
  notes: string;
  operatingRegime: string;
  sourceReference: string;
}

export type SimulationStage =
  | 'idle'
  | 'validating'
  | 'initializing'
  | 'evaluating_properties'
  | 'integrating'
  | 'checking_convergence'
  | 'generating_results'
  | 'completed'
  | 'error';

export interface PlaybackState {
  isPlaying: boolean;
  currentZNormalized: number; // 0.0 to 1.0
  speed: number;              // e.g. 0.5, 1.0, 2.0
}

export interface ComparisonScenario {
  id: string;
  name: string;
  catalystName: string;
  inputs: ReactorInputs;
  result: SimulationResult;
  color: string;
}
