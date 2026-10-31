/**
 * NIST Chemistry WebBook (SRD 69) & Scientific Property Types
 */

export type DataStatus = 'experimental' | 'evaluated' | 'calculated' | 'correlated' | 'estimated' | 'user-defined';

export interface PropertyMetadata<T = number> {
  value: T;
  symbol: string;
  units: string;
  temperatureRange?: [number, number]; // [T_min, T_max] in K
  pressureRange?: [number, number];    // [P_min, P_max] in Pa
  sourceOrganization: string;
  sourceUrl: string;
  webBookId?: string;
  casNumber?: string;
  referencePublication: string;
  retrievalDate: string;
  uncertainty?: string;
  status: DataStatus;
  notes?: string;
}

export interface ShomateParameters {
  tMin: number; // K
  tMax: number; // K
  A: number;
  B: number;
  C: number;
  D: number;
  E: number;
  F: number;
  G: number;
  H: number;
}

export interface NistSpecies {
  id: 'N2' | 'H2' | 'NH3' | 'Ar' | 'CH4' | 'He';
  name: string;
  chemicalFormula: string;
  casNumber: string;
  webBookUrl: string;
  
  // Thermodynamic fundamental properties
  molarMass: PropertyMetadata<number>;               // kg/mol
  standardEnthalpyFormation298: PropertyMetadata<number>; // J/mol
  standardEntropy298: PropertyMetadata<number>;           // J/(mol·K)
  standardGibbsFormation298: PropertyMetadata<number>;     // J/mol
  shomateGas: PropertyMetadata<ShomateParameters>;
  
  // Critical and Phase Constants
  criticalTemperature: PropertyMetadata<number>;     // K
  criticalPressure: PropertyMetadata<number>;        // Pa
  criticalVolume: PropertyMetadata<number>;          // m³/mol
  acentricFactor: PropertyMetadata<number>;          // [-]
  normalBoilingPoint: PropertyMetadata<number>;      // K
  
  // Transport & Molecular Constants
  lennardJonesSigma: PropertyMetadata<number>;       // Angstroms (Å)
  lennardJonesEpsilonOverK: PropertyMetadata<number>; // K
  fullerDiffusionVolume: PropertyMetadata<number>;   // [-]
  dipoleMomentDebye?: PropertyMetadata<number>;      // Debye
}

export interface RealGasState {
  compressibilityFactorZ: number; // Z = P*V/(R*T)
  densityKgM3: number;            // Real gas mixture density [kg/m³]
  molarVolumeM3Mol: number;       // Molar volume [m³/mol]
  fugacityCoefficients: Record<string, number>; // phi_i [-]
  fugacitiesPa: Record<string, number>;        // f_i = phi_i * y_i * P [Pa]
  departureEnthalpyJouleMol: number; // H - H_ideal [J/mol]
  eosModel: 'Peng-Robinson (1976)' | 'Ideal Gas (Z=1)';
}

export interface MixtureTransportProperties {
  molarMassKgMol: number;
  viscosityPaS: number;           // kg/(m·s)
  thermalConductivityWMK: number; // W/(m·K)
  heatCapacityMassJKgK: number;   // J/(kg·K)
  heatCapacityMolarJMolK: number; // J/(mol·K)
  gasDensityKgM3: number;         // Real gas density [kg/m³]
  compressibilityFactorZ: number; // [-]
  diffusivityNH3MixM2S: number;   // m²/s
  reactionEnthalpyJMol: number;   // J/mol (abs)
  methodologyNotes: string[];
}

export interface ThermodynamicReactionEquilibrium {
  temperatureK: number;
  pressurePa: number;
  deltaReactionEnthalpyJMol: number; // J/mol
  deltaReactionEntropyJMolK: number;  // J/(mol·K)
  deltaReactionGibbsJMol: number;    // J/mol
  equilibriumConstantKpAtm: number;  // atm^-1 for 0.5 N2 + 1.5 H2 <=> NH3
  equilibriumConstantKpPa: number;   // Pa^-1
  reactionQuotientQ: number;         // Actual fugacity / partial pressure quotient
  equilibriumAffinity: number;       // 1 - Q/Kp (thermodynamic driving force)
  equilibriumConversionXeq: number;  // Maximum theoretical conversion [-]
  isAtEquilibrium: boolean;
}

export interface SimulationProvenanceSnapshot {
  timestamp: string;
  version: string;
  speciesIncluded: string[];
  equationOfState: string;
  kineticModel: string;
  sourceDatabases: string[];
  propertiesSnapshot: Record<string, any>;
}

export type ThermodynamicConsistencyStrategy = 
  | 'DYSON_EMPIRICAL_CONSISTENT' 
  | 'NIST_FUNDAMENTAL_CONSISTENT';
